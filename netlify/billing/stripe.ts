import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { profiles } from "../../db/schema.js";
import type { TierId } from "../../src/lib/plan.js";

/**
 * Billing through Stripe: Checkout to pay, the customer portal to cancel or change a card, and a
 * webhook that is the only thing that moves a paying coach's plan. Off until STRIPE_SECRET_KEY is set.
 * STRIPE_PRICES maps what we sell to Stripe price ids (not secret), as JSON:
 *   {"solo_month":"price_…","solo_year":"price_…","season":"price_…","crew_month":"…","crew_year":"…","founding":"price_…"}
 * Amounts live in Stripe; this file only knows which plan each price unlocks.
 */
const SITE = "https://app.lax-vault.com";
const SEASON_MONTHS = 4;
/** Founding coaches the rate is open to; past this many live founding subscriptions it closes. */
export const FOUNDING_CAP = 250;
/** A referral gives the new coach this many free days and, once they pay, the coach who invited them a month of Coach. */
const REFERRAL_TRIAL_DAYS = 30;
const REFERRAL_CREDIT_CENTS = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const OFFER_KEYS = ["solo_month", "solo_year", "season", "crew_month", "crew_year", "founding"] as const;
export type OfferKey = (typeof OFFER_KEYS)[number];

/** The plan each thing we sell opens. Founding coaches are Coach at their own price. */
const PLAN_OF: Record<OfferKey, TierId> = { solo_month: "solo", solo_year: "solo", season: "solo", crew_month: "crew", crew_year: "crew", founding: "solo" };

export const billingOn = () => Boolean(process.env.STRIPE_SECRET_KEY && prices());

function prices(): Partial<Record<OfferKey, string>> {
  try {
    const raw = JSON.parse(process.env.STRIPE_PRICES ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(OFFER_KEYS.flatMap((k) => (typeof raw[k] === "string" && raw[k] ? [[k, raw[k] as string]] : [])));
  } catch {
    return {};
  }
}

let client: Stripe | null = null;
const stripe = () => (client ??= new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { httpClient: Stripe.createFetchHttpClient() }));

const offerOfPrice = (priceId: string | undefined) => Object.entries(prices()).find(([, id]) => id === priceId)?.[0] as OfferKey | undefined;

type Who = { id: string; email: string };

/** A Checkout page for one offer; the browser goes to the returned address. */
export async function startCheckout(me: Who, offer: string, ref = ""): Promise<{ url: string } | { error: string }> {
  const price = prices()[offer as OfferKey];
  if (!billingOn() || !price) return { error: "Billing isn't open yet. Your trial and your plays are safe." };
  const [row] = await db
    .select({ plan: profiles.plan, customer: profiles.stripeCustomerId, sub: profiles.stripeSubscriptionId })
    .from(profiles)
    .where(eq(profiles.id, me.id));
  // The founding rate is the beta coaches' promise: only an account that joined in beta can take it.
  if (offer === "founding" && row?.plan !== "beta") return { error: "The founding rate is for coaches who joined during the beta." };
  if (row?.sub && offer !== "season") return { error: "You already have a plan. Use Manage billing to change or cancel it." };
  if (offer === "founding" && (await foundingTaken()) >= FOUNDING_CAP) return { error: `All ${FOUNDING_CAP} founding spots are taken. Coach yearly is $39.` };
  // Invited by another coach: a first-time subscriber gets the first month free, and the inviter is credited when they pay.
  const referred = offer !== "season" && !row?.customer && UUID.test(ref) && ref !== me.id ? ref : "";
  const meta = { userId: me.id, offer, ...(referred ? { ref: referred } : {}) };
  const session = await stripe().checkout.sessions.create({
    mode: offer === "season" ? "payment" : "subscription",
    // A one-time payment makes no customer on its own; without one the portal and later renewals can't find this coach.
    ...(offer === "season" && !row?.customer ? { customer_creation: "always" as const } : {}),
    line_items: [{ price, quantity: 1 }],
    client_reference_id: me.id,
    ...(row?.customer ? { customer: row.customer } : { customer_email: me.email }),
    metadata: meta,
    ...(offer === "season" ? {} : { subscription_data: { metadata: meta, ...(referred ? { trial_period_days: REFERRAL_TRIAL_DAYS } : {}) } }),
    allow_promotion_codes: true,
    success_url: `${SITE}/account?billing=success`,
    cancel_url: `${SITE}/pricing`,
  });
  return session.url ? { url: session.url } : { error: "Stripe didn't open the payment page. Try again in a minute." };
}

/** Live founding subscriptions, from Stripe (no table of our own to keep in step). */
async function foundingTaken(): Promise<number> {
  const found = await stripe()
    .subscriptions.search({ query: "metadata['offer']:'founding' AND -status:'canceled' AND -status:'incomplete_expired'", limit: 1, expand: ["total_count"] })
    .catch(() => null);
  return (found as unknown as { total_count?: number } | null)?.total_count ?? 0;
}

/**
 * A referred coach's first paid invoice: the coach who invited them gets a month of Coach as
 * account credit on their Stripe customer. Marked on the subscription so it happens once.
 */
async function creditReferrer(invoice: Stripe.Invoice) {
  const subId = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  const id = typeof subId === "string" ? subId : subId?.id;
  if (!id || !invoice.amount_paid) return;
  const sub = await stripe().subscriptions.retrieve(id);
  const ref = sub.metadata?.ref;
  if (!ref || sub.metadata?.refCredited) return;
  const [inviter] = await db.select({ customer: profiles.stripeCustomerId }).from(profiles).where(eq(profiles.id, ref));
  if (inviter?.customer) {
    await stripe().customers.createBalanceTransaction(inviter.customer, {
      amount: -REFERRAL_CREDIT_CENTS,
      currency: "usd",
      description: "A free month: a coach you invited joined LaxVault",
    });
  }
  await stripe().subscriptions.update(id, { metadata: { ...sub.metadata, refCredited: inviter?.customer ? "yes" : "no-customer" } });
}

/** Stripe's page for cancelling, changing a card or downloading receipts. */
export async function openPortal(me: Who): Promise<{ url: string } | { error: string }> {
  if (!billingOn()) return { error: "Billing isn't open yet." };
  const [row] = await db.select({ customer: profiles.stripeCustomerId }).from(profiles).where(eq(profiles.id, me.id));
  if (!row?.customer) return { error: "There's no payment on this account yet. Pick a plan to start." };
  const session = await stripe().billingPortal.sessions.create({ customer: row.customer, return_url: `${SITE}/account` });
  return { url: session.url };
}

/** Does this subscription still entitle the coach to its plan? A late payment keeps access while Stripe retries. */
// past_due and unpaid are deliberately not here: a failed payment drops the coach to Sideline at once, and the next paid invoice (status active) restores the plan.
const PAYING = new Set(["active", "trialing"]);

async function applySubscription(sub: Stripe.Subscription) {
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const offer = offerOfPrice(sub.items.data[0]?.price.id);
  const live = PAYING.has(sub.status) && offer;
  const [row] = await db.select({ planEndsAt: profiles.planEndsAt }).from(profiles).where(eq(profiles.stripeCustomerId, customer));
  if (!row) return;
  // A season pass paid earlier still counts after a subscription ends.
  const season = row.planEndsAt && row.planEndsAt.getTime() > Date.now();
  await db
    .update(profiles)
    .set(live ? { plan: PLAN_OF[offer], stripeSubscriptionId: sub.id } : { plan: season ? "solo" : "free", stripeSubscriptionId: null })
    .where(eq(profiles.stripeCustomerId, customer));
}

async function applyCheckout(s: Stripe.Checkout.Session) {
  const userId = s.client_reference_id ?? s.metadata?.userId;
  const offer = s.metadata?.offer as OfferKey | undefined;
  if (!userId || !offer || !(offer in PLAN_OF) || s.payment_status === "unpaid") return;
  const customer = typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null);
  const set: Partial<typeof profiles.$inferInsert> = { plan: PLAN_OF[offer], ...(customer ? { stripeCustomerId: customer } : {}) };
  if (s.mode === "subscription") {
    const sub = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
    if (sub) set.stripeSubscriptionId = sub;
  } else {
    // A one-time pass: four months from today, or from the end of one already running.
    const [row] = await db.select({ planEndsAt: profiles.planEndsAt }).from(profiles).where(eq(profiles.id, userId));
    const from = row?.planEndsAt && row.planEndsAt.getTime() > Date.now() ? row.planEndsAt : new Date();
    const end = new Date(from);
    end.setMonth(end.getMonth() + SEASON_MONTHS);
    set.planEndsAt = end;
  }
  await db.update(profiles).set(set).where(eq(profiles.id, userId));
  // Stripe's own customer record carries our id, so a payment found in the Dashboard says whose it is.
  if (customer) await stripe().customers.update(customer, { metadata: { userId } }).catch(() => undefined);
}

/** One webhook from Stripe, checked against its signature. Anything else is refused. */
export async function handleWebhook(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!billingOn() || !secret || !signature) return new Response("not found", { status: 404 });
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), signature, secret, undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    return new Response("bad signature", { status: 400 });
  }
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") await applyCheckout(event.data.object);
    else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted")
      await applySubscription(event.data.object);
    else if (event.type === "invoice.paid") await creditReferrer(event.data.object);
  } catch {
    // Stripe retries a 500, so a database blip doesn't lose a payment.
    return new Response("try again", { status: 500 });
  }
  return new Response("ok");
}

/** A season pass that has run out, with no subscription behind it: the coach is back on Sideline. */
export async function expireSeason(userId: string) {
  await db
    .update(profiles)
    .set({ plan: "free", planEndsAt: null })
    .where(and(eq(profiles.id, userId), eq(profiles.plan, "solo")));
}
