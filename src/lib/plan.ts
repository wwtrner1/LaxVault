/**
 * LaxVault plans and entitlements.
 *
 * One module owns every gate so the UI, the export pipeline and the API all
 * read the same rules. Plans are stored per-account; until billing is wired up
 * the tier is read from the workspace so beta coaches can be upgraded by hand.
 *
 * PRICES ARE A PROPOSAL, NOT VALIDATED. They have not been checked against
 * competitors or against what a volunteer youth coach will pay. Amounts that
 * charge money live in Stripe; the numbers here are the display copy.
 */

/** Ids are kept from the football product so the Stripe price keys (solo_*, crew_*, season, founding) still map. */
export type TierId = "master" | "beta" | "trial" | "free" | "solo" | "crew";

export type Tier = {
  id: TierId;
  name: string;
  blurb: string;
  price: string;
  cadence: string;
  seats: string;
  featured?: boolean;
  /** Drills and plays a coach may keep in their Vault. */
  playLimit: number;
  /** Playbooks they may make. Playbooks past a cap (made on a bigger plan) are kept, not deleted. */
  playbookLimit: number;
  /** Public Vault plays they may copy into their own Vault each month. */
  copyLimit: number;
  /** Export sizes unlocked, by id from EXPORT_SIZES. */
  sizes: "starter" | "all";
  /** Highest raster DPI allowed. Free exports stay screen-grade. */
  maxDpi: number;
  /** Stamp a LaxVault watermark across exports. */
  watermark: boolean;
  /** Multi-play PDF sheets. */
  sheets: boolean;
  /** Assistant coaches who can run a practice plan from their own phone, but not edit it. Arrives with live practice mode. */
  assistantSeats: number;
  /** Tools held back on the free tier. */
  lockedTools: string[];
  perks: string[];
};

export const TIERS: Record<TierId, Tier> = {
  // Not a plan anyone can pick or buy: the server gives it to the owner list (netlify/security/owner.ts).
  master: {
    id: "master",
    name: "All-Access Master",
    blurb: "The owner account. Every tool on, no plan limits.",
    price: "—",
    cadence: "owner",
    seats: "Owner",
    playLimit: 1_000_000,
    playbookLimit: 1_000_000,
    copyLimit: 1_000_000,
    sizes: "all",
    maxDpi: 600,
    watermark: false,
    sheets: true,
    assistantSeats: 1_000_000,
    lockedTools: [],
    perks: ["Every tool and export", "No Vault limits", "Owner admin console"],
  },
  beta: {
    id: "beta",
    name: "Beta Coach",
    blurb: "Everything unlocked while we are in beta. Tell us what breaks.",
    price: "Free",
    cadence: "during beta",
    seats: "1 coach",
    playLimit: 200,
    playbookLimit: 1_000_000,
    copyLimit: 100,
    sizes: "all",
    maxDpi: 300,
    watermark: false,
    sheets: true,
    assistantSeats: 3,
    lockedTools: [],
    perks: ["Every tool on", "Full export and print", "Founding-coach pricing for as long as you stay"],
  },
  // Not on the pricing page: the server starts it for a new coach (netlify/security/trial.ts) and drops them to Sideline after TRIAL_DAYS.
  trial: {
    id: "trial",
    name: "Coach trial",
    blurb: "Every Coach tool for 14 days. No card.",
    price: "Free",
    cadence: "for 14 days",
    seats: "1 coach",
    playLimit: 300,
    playbookLimit: 1_000_000,
    copyLimit: 100,
    sizes: "all",
    maxDpi: 300,
    watermark: false,
    sheets: true,
    assistantSeats: 0,
    lockedTools: [],
    perks: ["Every tool and export for 14 days", "Your drills stay when the trial ends", "Then Sideline, free, or Coach"],
  },
  free: {
    id: "free",
    name: "Sideline",
    blurb: "Draw drills, keep a short stack, print a watermarked card.",
    price: "$0",
    cadence: "free, limited",
    seats: "1 coach",
    playLimit: 15,
    playbookLimit: 1,
    copyLimit: 5,
    sizes: "starter",
    maxDpi: 86,
    watermark: true,
    sheets: false,
    assistantSeats: 0,
    lockedTools: ["pen", "polygon", "zone", "motion", "connect"],
    perks: ["15 drills and plays in your Vault", "1 playbook", "Letter-page print, watermarked", "5 copies a month from the public Vault"],
  },
  solo: {
    id: "solo",
    name: "Coach",
    blurb: "One coach, one team, no limits worth thinking about.",
    price: "$5",
    cadence: "per month",
    seats: "1 coach",
    featured: true,
    playLimit: 400,
    playbookLimit: 1_000_000,
    copyLimit: 200,
    sizes: "all",
    maxDpi: 300,
    watermark: false,
    sheets: true,
    assistantSeats: 0,
    lockedTools: [],
    perks: ["400 drills and plays in your Vault", "Every drawing tool and mode", "Clean 300-DPI export and print", "Multi-play print sheets"],
  },
  crew: {
    id: "crew",
    name: "Staff",
    blurb: "You, plus assistants who run the plan from their own phones.",
    price: "$12",
    cadence: "per month",
    seats: "You + 3 assistants",
    playLimit: 1200,
    playbookLimit: 1_000_000,
    copyLimit: 600,
    sizes: "all",
    maxDpi: 600,
    watermark: false,
    sheets: true,
    assistantSeats: 3,
    lockedTools: [],
    perks: [
      "Everything in Coach",
      "3 assistant seats that run plans but cannot edit them (coming soon)",
      "600-DPI print for booklets",
    ],
  },
};

/** Days of full Coach a new coach gets, once per person. */
export const TRIAL_DAYS = 14;

export const PUBLIC_TIERS: Tier[] = [TIERS.free, TIERS.solo, TIERS.crew];

/** Other ways to buy Coach, for coaches who only need it for a season or a year. Ids map to Stripe keys in netlify/billing/stripe.ts. */
/** Yearly prices for the paid plans; the Pricing page shows these first. */
export const YEARLY: Partial<Record<TierId, { price: string; cadence: string; offer: string; saves: string }>> = {
  solo: { price: "$39", cadence: "per year", offer: "solo_year", saves: "$3.25 a month, save $21" },
  crew: { price: "$99", cadence: "per year", offer: "crew_year", saves: "$8.25 a month, save $45" },
};

export const OFFERS: { id: string; name: string; price: string; cadence: string; blurb: string; highlight?: boolean }[] = [
  { id: "season", name: "Season Pass", price: "$15", cadence: "for 4 months", blurb: "Coach for one season. Pay once — it does not renew." },
  { id: "founding", name: "Founding coaches", price: "$29", cadence: "per year, for life", blurb: "Coach with us during the beta and keep Coach at $29 a year for as long as you stay.", highlight: true },
];

/** Sizes a free coach can print, so the product is genuinely usable first. */
export const STARTER_SIZES = ["letter-p"];

export function tierFor(id: string | null | undefined): Tier {
  return TIERS[(id as TierId) ?? "beta"] ?? TIERS.beta;
}

export type Gate =
  | { ok: true }
  | { ok: false; reason: string; cta: string };

/** Public Vault sharing is a paid-plan feature. It is the only use of the old share flag, now that player links are gone. */
export const canShare = (tier: Tier) => !tier.watermark;

export function gateSave(tier: Tier, currentPlays: number): Gate {
  if (currentPlays < tier.playLimit) return { ok: true };
  return {
    ok: false,
    reason: `Your ${tier.name} Vault holds ${tier.playLimit} drills and plays and it is full. Delete one, or move up a plan to keep more.`,
    cta: "See plans",
  };
}

export function gatePlaybook(tier: Tier, currentBooks: number): Gate {
  if (currentBooks < tier.playbookLimit) return { ok: true };
  return {
    ok: false,
    reason: `${tier.name} includes ${tier.playbookLimit} playbook${tier.playbookLimit === 1 ? "" : "s"}. Coach opens as many as you run, one for every unit, age group or season.`,
    cta: "See plans",
  };
}

export function gateSize(tier: Tier, sizeId: string): Gate {
  if (tier.sizes === "all" || STARTER_SIZES.includes(sizeId)) return { ok: true };
  return {
    ok: false,
    reason: "Letter portrait is open on every plan. The rest of the print sizes come with Coach.",
    cta: "Unlock print sizes",
  };
}

export function gateSheets(tier: Tier): Gate {
  if (tier.sheets) return { ok: true };
  return {
    ok: false,
    reason: "Multi-play sheets come with Coach. Single-play export stays free.",
    cta: "Unlock sheets",
  };
}

export function gateTool(tier: Tier, toolId: string): Gate {
  if (!tier.lockedTools.includes(toolId)) return { ok: true };
  return {
    ok: false,
    reason: "Freehand, polygon, zones, motion and auto-connect come with Coach. Lines, shapes and players stay free.",
    cta: "Unlock the full kit",
  };
}

/**
 * SVG export: a vector file's watermark is just text anyone can delete, so
 * plans that watermark their exports don't get SVG (found in Phase 5 testing).
 */
export function gateVector(tier: Tier): Gate {
  if (!tier.watermark) return { ok: true };
  return {
    ok: false,
    reason: "SVG files come with Coach — a vector file can't keep a watermark. PDF and PNG stay open on every plan.",
    cta: "Unlock SVG",
  };
}

/** Export DPI actually used, after the plan cap. */
export const cappedDpi = (tier: Tier, wanted: number) => Math.min(wanted, tier.maxDpi);
