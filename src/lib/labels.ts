import { rosterStore, shortName, type RosterPlayer } from "./roster";
import type { PlayerNode } from "./types";

/**
 * What a player token says: its position (A, M, D, G, LSM, FO), the jersey
 * number of the roster player standing there, or his name. A view choice,
 * kept per browser, so the saved play keeps its position letters and the
 * same drawing reads "A M D" in a team talk and "12 7 22" on game day.
 * Tokens without a roster player keep their position.
 */
export type LabelMode = "pos" | "number" | "name";
export const LABEL_MODES: { id: LabelMode; label: string; hint: string }[] = [
  { id: "pos", label: "Positions", hint: "A, M, D, G, LSM, FO on every token." },
  { id: "number", label: "Numbers", hint: "Jersey numbers from your roster on the players you've named." },
  { id: "name", label: "Names", hint: "Numbers on the tokens and last names under them." },
];

const KEY = "laxvault.labels.v1";
const read = (): LabelMode => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "number" || v === "name" ? v : "pos";
  } catch {
    return "pos";
  }
};
let mode: LabelMode | null = null;
const listeners = new Set<() => void>();
export const labelStore = {
  get: (): LabelMode => (mode ??= typeof localStorage === "undefined" ? "pos" : read()),
  set(next: LabelMode) {
    mode = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice holds this visit */
    }
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    const off = rosterStore.subscribe(l);
    return () => {
      listeners.delete(l);
      off();
    };
  },
};

/** Long position names for the single-letter tokens. */
const LONG: Record<string, string> = { L: "LSM", F: "FO" };

export function rosterPlayerOf(node: PlayerNode): RosterPlayer | undefined {
  if (!node.rosterId) return undefined;
  return rosterStore.get().players.find((p) => p.id === node.rosterId);
}

/** The text inside a token and, in Names mode, the name tag under it. */
export function tokenText(node: PlayerNode, view: LabelMode = labelStore.get()): { inside: string; under?: string } {
  const pos = LONG[node.label] ?? node.label;
  if (view === "pos" || node.side === "ball") return { inside: pos };
  const p = rosterPlayerOf(node);
  if (!p) return { inside: pos };
  if (view === "number") return { inside: p.number || pos };
  return { inside: p.number || pos, under: shortName(p) };
}

/** Roster positions that fit each token letter. */
const FITS: Record<string, string[]> = { A: ["A"], M: ["M", "SSDM"], D: ["D"], G: ["G"], L: ["LSM"], F: ["FO"], LSM: ["LSM"], FO: ["FO"] };

/**
 * Put roster players on the tokens by position: the current lineup's players
 * first (starters in card order), then the rest of the active roster by
 * number. A token that already has a player keeps him; nobody is used twice.
 * `ids` limits it to those tokens; otherwise the team with the ball, or the
 * defense when the field has no team with the ball.
 */
export function fillFromRoster<T extends { kind: string }>(nodes: T[], ids?: string[]): { nodes: T[]; filled: number; missing: string[] } {
  const doc = rosterStore.get();
  const lineup = doc.lineups.find((l) => l.id === doc.current);
  const byId = new Map(doc.players.map((p) => [p.id, p]));
  const order: RosterPlayer[] = [];
  const seen = new Set<string>();
  const push = (p: RosterPlayer | undefined) => {
    if (p && p.status !== "out" && !seen.has(p.id)) {
      seen.add(p.id);
      order.push(p);
    }
  };
  if (lineup) Object.values(lineup.slots).forEach((id) => push(byId.get(id)));
  [...doc.players].sort((a, b) => (Number(a.number) || 999) - (Number(b.number) || 999)).forEach(push);

  const players = nodes.filter((n): n is T & PlayerNode => n.kind === "player") as (T & PlayerNode)[];
  const hasOffense = players.some((n) => n.side === "offense" && n.label);
  const targets = players.filter((n) => (ids ? ids.includes(n.id) : n.side === (hasOffense ? "offense" : "defense")) && n.side !== "ball" && FITS[n.label]);
  const used = new Set(players.map((n) => n.rosterId).filter(Boolean) as string[]);
  const give = new Map<string, string>();
  const missing: string[] = [];
  for (const t of targets) {
    if (t.rosterId && byId.has(t.rosterId)) continue;
    const fit = FITS[t.label];
    const p = order.find((r) => !used.has(r.id) && r.pos.some((x) => fit.includes(x)));
    if (!p) {
      missing.push(LONG[t.label] ?? t.label);
      continue;
    }
    used.add(p.id);
    give.set(t.id, p.id);
  }
  return {
    nodes: nodes.map((n) => (give.has((n as unknown as PlayerNode).id) ? { ...n, rosterId: give.get((n as unknown as PlayerNode).id) } : n)),
    filled: give.size,
    missing,
  };
}
