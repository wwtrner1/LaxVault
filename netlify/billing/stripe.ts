import Stripe from "stripe";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appSettings, profiles, stripeEvents } from "../../db/schema.js";
import { APP_HOST, ensurePortal, ensureWebhook, setupCatalogue, WEBHOOK_URL } from "./setup.js";
import { syncLeague } from "./league.js";
import type { TierId } from "../../src/lib/plan.js";

/**
 * Billing through Stripe: Checkout to pay, the customer portal to cancel or change a card, and a
 * webhook that is the only thing that moves a paying coach's plan. Off until STRIPE_SECRET_KEY is set.
 * STRIPE_PRICES maps what we sell to Stripe price ids (not secret), as JSON:
 *   {"solo_month":"price_…","solo_year":"price_…","season":"price_…","crew_month":"…","crew_year":"…","founding":"price_…","league_year":"price_…"}
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

export const OFFER_KEYS = ["solo_month", "solo_year", "season", "crew_month", "crew_year", "founding", "league_year"] as const;
export type OfferKey = (typeof OFFER_KEYS)[number];

/** The plan each thing we sell opens. Founding coaches are Coach at their own price. */
const PLAN_OF: Record<OfferKey, TierId> = { solo_month: "solo", solo_year: "solo", season: "solo", crew_month: "crew", crew_year: "crew", founding: "solo", league_year: "crew" };

/** A secret (sk_) or restricted (rk_) key. Anything else, such as a key's mk_ id pasted by mistake, can't call Stripe. */
const keyLooksRight = () => /^(sk|rk)_(live|test)_/.test(process.env.STRIPE_SECRET_KEY?.trim() ?? "");

export const billingOn = () => Boolean(keyLooksRight() && Object.keys(prices()).length);

/**
 * Price ids and the webhook secret the app set up itself (app_settings), used when STRIPE_PRICES or
 * STRIPE_WEBHOOK_SECRET aren't set. Loaded once per function instance by primeBilling().
 */
const PRICES_SETTING = "stripe_prices";
const HOOK_SETTING = "stripe_webhook_secret";
const PORTAL_SETTING = "stripe_portal";
const stored: { prices: string | null; hook: string | null; portal: string | null } = { prices: null, hook: null, portal: null };
let primed: Promise<void> | null = null;

const saveSetting = (key: string, value: string) =>
  db.insert(appSettings).values({ key, value, updatedAt: new Date() }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });

/**
 * With only STRIPE_SECRET_KEY set, the live app makes its own catalogue and webhook the first time
 * it's asked (idempotent, see setup.ts) and keeps the results, so the owner pastes one key and
 * nothing else. Deploy previews only read what's stored.
 */
export function primeBilling(host: string): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) return Promise.resolve();
  primed ??= (async () => {
    const rows = await db.select().from(appSettings).where(inArray(appSettings.key, [PRICES_SETTING, HOOK_SETTING, PORTAL_SETTING]));
    stored.prices = rows.find((r) => r.key === PRICES_SETTING)?.value ?? null;
    stored.hook = rows.find((r) => r.key === HOOK_SETTING)?.value ?? null;
    stored.portal = rows.find((r) => r.key === PORTAL_SETTING)?.value ?? null;
    if (host !== APP_HOST) return;
    if ((!process.env.STRIPE_PRICES && !stored.prices) || !stored.portal) await runSetup(false);
    if (!process.env.STRIPE_WEBHOOK_SECRET && !stored.hook) await runSetup(true);
  })().catch((e) => {
    primed = null;
    console.error("Stripe auto-setup", e instanceof Error ? e.message : e);
  });
  return primed;
}

/** Makes or reuses the catalogue (and, with `hook`, the webhook) and stores the results. */
export async function runSetup(hook: boolean) {
  const r = await setupCatalogue();
  if ("error" in r) return r;
  await saveSetting(PRICES_SETTING, r.env);
  stored.prices = r.env;
  // The portal on the secret key (a restricted admin key can't write portal settings).
  const portal = process.env.STRIPE_SECRET_KEY ? await ensurePortal(r.products, r.prices) : { error: "STRIPE_SECRET_KEY isn't set." };
  if ("id" in portal) {
    await saveSetting(PORTAL_SETTING, portal.id);
    stored.portal = portal.id;
  }
  let webhook: "made" | "kept" | "env" | "preview" | string = process.env.STRIPE_WEBHOOK_SECRET ? "env" : "preview";
  if (hook && !process.env.STRIPE_WEBHOOK_SECRET) {
    const w = await ensureWebhook(stored.hook);
    if ("error" in w) webhook = w.error;
    else {
      await saveSetting(HOOK_SETTING, w.secret);
      stored.hook = w.secret;
      webhook = w.created ? "made" : "kept";
    }
  }
  return { ...r, webhook, portal: "id" in portal ? "ready" : portal.error };
}

function prices(): Partial<Record<OfferKey, string>> {
  try {
    const raw = JSON.parse(process.env.STRIPE_PRICES || stored.prices || "{}") as Record<string, unknown>;
    return Object.fromEntries(OFFER_KEYS.flatMap((k) => (typeof raw[k] === "string" && raw[k] ? [[k, raw[k] as string]] : [])));
  } catch {
    return {};
  }
}

/** What the owner's Billing tab shows: which keys are set and which prices are mapped. Never the keys themselves. */
export function billingStatus() {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const mapped = prices();
  return {
    on: billingOn(),
    secretKey: key ? (!keyLooksRight() ? "wrong" : key.includes("_live_") ? "live" : "test") : null,
    adminKey: Boolean(process.env.STRIPE_ADMIN_KEY),
    webhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET || stored.hook),
    portal: Boolean(stored.portal),
    pricesFrom: process.env.STRIPE_PRICES ? "env" : stored.prices ? "app" : null,
    prices: OFFER_KEYS.map((k) => ({ key: k, set: Boolean(mapped[k]) })),
    selfServe: process.env.PLAN_SELF_SERVE !== "false",
    webhookUrl: WEBHOOK_URL,
  };
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
  if (row?.sub && offer !== "season") return { error: "You already have a plan. Use Manage billing to change or cancel it." };
  if (offer === "founding" && ((await foundingTaken(true)) ?? 0) >= FOUNDING_CAP) return { error: `All ${FOUNDING_CAP} founding spots are taken. Coach yearly is $39.` };
  // Invited by another coach: a first-time subscriber gets the first month free, and the inviter is credited when they pay.
  const referred = offer !== "season" && !row?.customer && UUID.test(ref) && ref !== me.id ? ref : "";
  const meta = { app: APP, userId: me.id, offer, ...(referred ? { ref: referred } : {}) };
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

/**
 * The Vaults can share one Stripe account, so every checkout (and its subscription) is stamped
 * `app: "laxvault"`. The webhook acts only on objects that carry that stamp: another app's, and
 * anything with no stamp at all (a Dashboard-made subscription, an app that doesn't stamp, the
 * one unpaid checkout from before stamping), is ignored, so no other product's payment can
 * change a LaxVault plan. The founding counter counts only stamped subscriptions too.
 */
export const APP = "laxvault";
export const ours = (meta: Stripe.Metadata | null | undefined) => meta?.app === APP;

/** The last count, so the public "X of 250 left" counter doesn't ask Stripe on every page view. */
let foundingCount: { n: number; at: number } | null = null;
const FOUNDING_TTL = 5 * 60_000;

/** Live founding subscriptions, from Stripe (no table of our own to keep in step); null when Stripe can't say. */
async function foundingTaken(fresh = false): Promise<number | null> {
  if (!fresh && foundingCount && Date.now() - foundingCount.at < FOUNDING_TTL) return foundingCount.n;
  const found = await stripe()
    .subscriptions.search({ query: "metadata['offer']:'founding' AND metadata['app']:'laxvault' AND -status:'canceled' AND -status:'incomplete_expired'", limit: 1, expand: ["total_count"] })
    .catch(() => null);
  const n = (found as unknown as { total_count?: number } | null)?.total_count;
  if (typeof n !== "number") return null;
  foundingCount = { n, at: Date.now() };
  return n;
}

/** The public counter: founding spots left (null when Stripe can't say) and whether checkout is open at all. */
export async function foundingStatus(): Promise<{ cap: number; left: number | null; open: boolean }> {
  if (!billingOn() || !prices().founding) return { cap: FOUNDING_CAP, left: null, open: false };
  const taken = await foundingTaken();
  return { cap: FOUNDING_CAP, left: taken === null ? null : Math.max(0, FOUNDING_CAP - taken), open: true };
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
  if (!ours(sub.metadata)) return;
  const ref = sub.metadata?.ref;
  if (!ref || sub.metadata?.refCredited) return;
  const [inviter] = await db.select({ customer: profiles.stripeCustomerId }).from(profiles).where(eq(profiles.id, ref));
  if (inviter?.customer) {
    // Keyed on the subscription, so two deliveries of the same invoice can't credit twice.
    await stripe().customers.createBalanceTransaction(
      inviter.customer,
      { amount: -REFERRAL_CREDIT_CENTS, currency: "usd", description: "A free month: a coach you invited joined LaxVault" },
      { idempotencyKey: `laxvault-ref-${id}` },
    );
  }
  await stripe().subscriptions.update(id, { metadata: { ...sub.metadata, refCredited: inviter?.customer ? "yes" : "no-customer" } });
}

/** Stripe's page for cancelling, changing a card or downloading receipts. */
export async function openPortal(me: Who): Promise<{ url: string } | { error: string }> {
  if (!billingOn()) return { error: "Billing isn't open yet." };
  const [row] = await db.select({ customer: profiles.stripeCustomerId }).from(profiles).where(eq(profiles.id, me.id));
  if (!row?.customer) return { error: "There's no payment on this account yet. Pick a plan to start." };
  const session = await stripe().billingPortal.sessions.create({
    customer: row.customer,
    return_url: `${SITE}/account`,
    ...(stored.portal ? { configuration: stored.portal } : {}),
  });
  return { url: session.url };
}

/** Does this subscription still entitle the coach to its plan? A late payment keeps access while Stripe retries. */
// past_due and unpaid are deliberately not here: a failed payment drops the coach to Sideline at once, and the next paid invoice (status active) restores the plan.
const PAYING = new Set(["active", "trialing"]);

async function applySubscription(event: Stripe.Subscription) {
  // Events can arrive out of order, so act on the subscription as it is now, not as the event saw it.
  const sub = await stripe().subscriptions.retrieve(event.id);
  if (!ours(sub.metadata)) return;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const offer = offerOfPrice(sub.items.data[0]?.price.id);
  const live = PAYING.has(sub.status) && offer;
  let [row] = await db.select({ id: profiles.id, planEndsAt: profiles.planEndsAt }).from(profiles).where(eq(profiles.stripeCustomerId, customer));
  // Checkout's own event hasn't linked the customer yet (or never arrived): the subscription says whose it is.
  const owner = sub.metadata?.userId;
  if (!row && owner && UUID.test(owner)) {
    [row] = await db.update(profiles).set({ stripeCustomerId: customer }).where(eq(profiles.id, owner)).returning({ id: profiles.id, planEndsAt: profiles.planEndsAt });
  }
  if (!row) return;
  // A League pack's members follow its subscription: live, they have Coach; ended or unpaid, they don't.
  if ((sub.metadata?.offer ?? offer) === "league_year") await syncLeague(row.id, sub.id, Boolean(live));
  // A season pass paid earlier still counts after a subscription ends.
  const season = row.planEndsAt && row.planEndsAt.getTime() > Date.now();
  await db
    .update(profiles)
    .set(live ? { plan: PLAN_OF[offer], stripeSubscriptionId: sub.id } : { plan: season ? "solo" : "free", stripeSubscriptionId: null })
    .where(eq(profiles.stripeCustomerId, customer));
}

async function applyCheckout(s: Stripe.Checkout.Session) {
  if (!ours(s.metadata)) return;
  const userId = s.client_reference_id ?? s.metadata?.userId;
  const offer = s.metadata?.offer as OfferKey | undefined;
  if (!userId || !offer || !(offer in PLAN_OF) || s.payment_status === "unpaid") return;
  const customer = typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null);
  const set: Partial<typeof profiles.$inferInsert> = { plan: PLAN_OF[offer], ...(customer ? { stripeCustomerId: customer } : {}) };
  if (s.mode === "subscription") {
    const sub = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
    if (sub) set.stripeSubscriptionId = sub;
    if (sub && offer === "league_year") await syncLeague(userId, sub, true);
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
  const secret = process.env.STRIPE_WEBHOOK_SECRET || stored.hook;
  const signature = req.headers.get("stripe-signature");
  if (!billingOn() || !secret || !signature) return new Response("not found", { status: 404 });
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), signature, secret, undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    return new Response("bad signature", { status: 400 });
  }
  // Already handled (Stripe resends on timeouts and now and then twice): a second Season Pass would add four more months.
  const [seen] = await db.select({ id: stripeEvents.id }).from(stripeEvents).where(eq(stripeEvents.id, event.id));
  if (seen) return new Response("ok");
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") await applyCheckout(event.data.object);
    else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted")
      await applySubscription(event.data.object);
    else if (event.type === "invoice.paid") await creditReferrer(event.data.object);
    else if (event.type === "charge.refunded") {
      if (event.data.object.refunded) await revokeSeason(event.data.object);
    } else if (event.type === "charge.dispute.created") {
      const c = event.data.object.charge;
      await revokeSeason(typeof c === "string" ? await stripe().charges.retrieve(c) : c);
    }
    await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
  } catch {
    // Stripe retries a 500, so a database blip doesn't lose a payment.
    return new Response("try again", { status: 500 });
  }
  return new Response("ok");
}

/**
 * A Season Pass refunded in full (the 14-day guarantee) or disputed: take its four months back.
 * Stacked passes keep the rest; a subscription beside it keeps the plan. Subscriptions themselves
 * are left alone: cancelling one is the owner's call in Stripe, and its own webhook follows.
 */
async function revokeSeason(charge: Stripe.Charge) {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return;
  const { data } = await stripe().checkout.sessions.list({ payment_intent: pi, limit: 1 });
  const s = data[0];
  if (!s || !ours(s.metadata) || s.metadata?.offer !== "season" || s.mode !== "payment") return;
  const userId = s.client_reference_id ?? s.metadata?.userId;
  if (!userId) return;
  const [row] = await db.select({ planEndsAt: profiles.planEndsAt, sub: profiles.stripeSubscriptionId }).from(profiles).where(eq(profiles.id, userId));
  if (!row?.planEndsAt) return;
  const end = new Date(row.planEndsAt);
  end.setMonth(end.getMonth() - SEASON_MONTHS);
  const left = end.getTime() > Date.now();
  await db
    .update(profiles)
    .set(left ? { planEndsAt: end } : { planEndsAt: null, ...(row.sub ? {} : { plan: "free" }) })
    .where(eq(profiles.id, userId));
}

/** A season pass that has run out, with no subscription behind it: the coach is back on Sideline. */
export async function expireSeason(userId: string) {
  await db
    .update(profiles)
    .set({ plan: "free", planEndsAt: null })
    .where(and(eq(profiles.id, userId), eq(profiles.plan, "solo")));
}

/** An account being deleted stops paying at once, before the account (and its link to Stripe) is gone. */
export async function cancelBilling(userId: string): Promise<boolean> {
  const [row] = await db.select({ sub: profiles.stripeSubscriptionId }).from(profiles).where(eq(profiles.id, userId));
  if (!row?.sub || !process.env.STRIPE_SECRET_KEY) return true;
  try {
    await stripe().subscriptions.cancel(row.sub);
    return true;
  } catch (e) {
    // Already canceled counts as done.
    return (e as { code?: string }).code === "resource_missing" || /canceled/i.test(e instanceof Error ? e.message : "");
  }
}
