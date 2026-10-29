import Stripe from "stripe";
import type { OfferKey } from "./stripe.js";

/**
 * One-shot catalogue setup: creates LaxVault's products and prices in Stripe and returns the
 * price ids to paste into STRIPE_PRICES. Owner-only (reached through /api/admin/billing/setup).
 *
 * Runs on STRIPE_ADMIN_KEY, a restricted key with write access to Products and Prices only, so
 * nothing here can charge, refund or read a customer. Safe to run again: every price carries a
 * lookup_key and an existing one is reused, never duplicated. Amounts here are the launch
 * proposal from plan.ts; change them in Stripe afterwards (make a new price, archive the old one).
 */

type Catalogue = {
  product: { key: string; name: string; description: string };
  prices: { key: OfferKey; amount: number; recurring?: { interval: "month" | "year" } }[];
};

const CATALOGUE: Catalogue[] = [
  {
    product: { key: "coach", name: "LaxVault Coach", description: "One coach, one team, no limits worth thinking about." },
    prices: [
      { key: "solo_month", amount: 700, recurring: { interval: "month" } },
      { key: "solo_year", amount: 5900, recurring: { interval: "year" } },
    ],
  },
  {
    product: { key: "staff", name: "LaxVault Staff", description: "You, plus assistants who run the plan from their own phones." },
    prices: [
      { key: "crew_month", amount: 1500, recurring: { interval: "month" } },
      { key: "crew_year", amount: 12900, recurring: { interval: "year" } },
    ],
  },
  {
    product: { key: "season", name: "LaxVault Season Pass", description: "Coach for one season (four months). Pay once; it does not renew." },
    prices: [{ key: "season", amount: 1900 }],
  },
  {
    product: { key: "founding", name: "LaxVault Founding Coach", description: "Coach at the founding rate for as long as you stay. Beta coaches only." },
    prices: [{ key: "founding", amount: 500, recurring: { interval: "month" } }],
  },
];

const LOOKUP = (key: OfferKey) => `laxvault_${key}`;

export const setupOn = () => Boolean(process.env.STRIPE_ADMIN_KEY);

export type SetupResult =
  | { prices: Record<OfferKey, string>; products: Record<string, string>; created: string[]; reused: string[]; livemode: boolean; env: string }
  | { error: string };

export async function setupCatalogue(): Promise<SetupResult> {
  const key = process.env.STRIPE_ADMIN_KEY;
  if (!key) return { error: "STRIPE_ADMIN_KEY isn't set on this site." };
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
