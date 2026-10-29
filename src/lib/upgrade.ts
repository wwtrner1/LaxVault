import type { Gate } from "./plan";

/**
 * The friendly wall: when a free coach hits a limit, one dialog says what
 * happened and what Coach costs, instead of a red toast and a jump to Pricing.
 * Any screen calls `askUpgrade(gate)`; `UpgradePrompt` in App.tsx shows it.
 */
export const UPGRADE_EVENT = "laxvault:upgrade";

export type UpgradeAsk = { reason: string; cta?: string };

export function askUpgrade(gate: Gate | UpgradeAsk) {
  if ("ok" in gate && gate.ok) return;
  const detail: UpgradeAsk = { reason: gate.reason, cta: gate.cta };
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<UpgradeAsk>(UPGRADE_EVENT, { detail }));
}
