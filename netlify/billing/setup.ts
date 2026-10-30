import Stripe from "stripe";
import type { OfferKey } from "./stripe.js";

/**
 * One-shot catalogue setup: creates LaxVault's products and prices in Stripe and returns the
 * price ids to paste into STRIPE_PRICES. Owner-only (reached through /api/admin/billing/setup).
 *
 * Runs on STRIPE_ADMIN_KEY (a restricted key, Products and Prices write) when it is set, else on
 * STRIPE_SECRET_KEY, so pasting the one secret key is enough. With the secret key and on the live
 * app address it also makes the webhook endpoint and hands back its signing secret. Safe to run again: every price carries a
 * lookup_key and an existing one is reused, never duplicated. Amounts match the prices shown in
 * plan.ts; when one changes here, a rerun makes the new price and moves the key to it. The old
 * price is left active, never archived, so current subscribers stay on what they bought.
 */

type Catalogue = {
  product: { key: string; name: string; description: string };
  prices: { key: OfferKey; amount: number; recurring?: { interval: "month" | "year" } }[];
};

const CATALOGUE: Catalogue[] = [
  {
    product: { key: "coach", name: "LaxVault Coach", description: "One coach, one team, no limits worth thinking about." },
    prices: [
      { key: "solo_month", amount: 500, recurring: { interval: "month" } },
      { key: "solo_year", amount: 3900, recurring: { interval: "year" } },
    ],
  },
  {
    product: { key: "staff", name: "LaxVault Staff", description: "You, plus assistants who run the plan from their own phones." },
    prices: [
      { key: "crew_month", amount: 1200, recurring: { interval: "month" } },
      { key: "crew_year", amount: 9900, recurring: { interval: "year" } },
    ],
  },
  {
    product: { key: "season", name: "LaxVault Season Pass", description: "Coach for one season (four months). Pay once; it does not renew." },
    prices: [{ key: "season", amount: 1500 }],
  },
  {
    product: { key: "league", name: "LaxVault League pack", description: "Up to 15 coaches in one club or league, each with Coach. Invite them with a link." },
    prices: [{ key: "league_year", amount: 19900, recurring: { interval: "year" } }],
  },
  {
    product: { key: "founding", name: "LaxVault Founding Coach", description: "Coach at the founding rate for as long as you stay. Beta coaches only." },
    prices: [{ key: "founding", amount: 2900, recurring: { interval: "year" } }],
  },
];

const LOOKUP = (key: OfferKey) => `laxvault_${key}`;

export const setupOn = () => Boolean(process.env.STRIPE_ADMIN_KEY || process.env.STRIPE_SECRET_KEY);

/** The only address Stripe should send events to. Deploy previews never touch the webhook. */
export const APP_HOST = "app.lax-vault.com";
export const WEBHOOK_URL = `https://${APP_HOST}/api/billing/webhook`;
export const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
] as const;

/**
 * The webhook endpoint for the live app. Stripe shows a signing secret only when the endpoint is
 * made, so with no stored secret an old LaxVault endpoint is replaced by a new one.
 */
export async function ensureWebhook(stored: string | null): Promise<{ secret: string; created: boolean } | { error: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { error: "STRIPE_SECRET_KEY isn't set." };
  const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  try {
    const all = await stripe.webhookEndpoints.list({ limit: 100 });
    const ours = all.data.filter((w) => w.url === WEBHOOK_URL);
    if (stored && ours.length) return { secret: stored, created: false };
    for (const w of ours) await stripe.webhookEndpoints.del(w.id);
    const made = await stripe.webhookEndpoints.create({ url: WEBHOOK_URL, enabled_events: [...WEBHOOK_EVENTS], metadata: { laxvault: "1" }, description: "LaxVault billing" });
    return made.secret ? { secret: made.secret, created: true } : { error: "Stripe made the webhook but sent no signing secret." };
  } catch (e) {
    return { error: `Stripe refused the webhook: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export type SetupResult =
  | { prices: Record<OfferKey, string>; products: Record<string, string>; created: string[]; reused: string[]; livemode: boolean; env: string }
  | { error: string };

export async function setupCatalogue(): Promise<SetupResult> {
  const key = process.env.STRIPE_ADMIN_KEY || process.env.STRIPE_SECRET_KEY;
  if (!key) return { error: "No Stripe key is set on this site. Add STRIPE_SECRET_KEY in Netlify." };
  const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  const created: string[] = [];
  const reused: string[] = [];
  const products: Record<string, string> = {};
  const prices = {} as Record<OfferKey, string>;
  let livemode = false;

  try {
    // Existing prices, found by lookup_key so a second run is a no-op.
    const found = await stripe.prices.list({ lookup_keys: CATALOGUE.flatMap((c) => c.prices.map((p) => LOOKUP(p.key))), limit: 100 });
    const byLookup = new Map(found.data.map((p) => [p.lookup_key, p]));
    // Existing products, found by our own tag in metadata.
    const existing = await stripe.products.list({ active: true, limit: 100 });
    const byTag = new Map(existing.data.filter((p) => p.metadata?.laxvault).map((p) => [p.metadata.laxvault, p]));

    for (const { product, prices: wanted } of CATALOGUE) {
      let prod = byTag.get(product.key);
      if (prod) reused.push(`product ${product.name}`);
      else {
        prod = await stripe.products.create({ name: product.name, description: product.description, metadata: { laxvault: product.key } });
        created.push(`product ${product.name}`);
      }
      products[product.key] = prod.id;
      livemode = prod.livemode;

      for (const want of wanted) {
        const lookup = LOOKUP(want.key);
        let price = byLookup.get(lookup);
        if (price && price.product !== prod.id) price = undefined; // same key on another product: make a fresh one here
        // The amount or billing period changed since the last run: a new price takes the key and the
        // old one stays active, so anyone already on it keeps paying what they signed up for.
        if (price && (price.unit_amount !== want.amount || (price.recurring?.interval ?? null) !== (want.recurring?.interval ?? null))) price = undefined;
        if (price) reused.push(`price ${want.key}`);
        else {
          price = await stripe.prices.create({
            product: prod.id,
            currency: "usd",
            unit_amount: want.amount,
            ...(want.recurring ? { recurring: want.recurring } : {}),
            lookup_key: lookup,
            transfer_lookup_key: true,
            nickname: want.key,
            metadata: { laxvault: want.key },
          });
          created.push(`price ${want.key}`);
        }
        prices[want.key] = price.id;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Stripe refused: ${msg}` };
  }

  return { prices, products, created, reused, livemode, env: JSON.stringify(prices) };
}
