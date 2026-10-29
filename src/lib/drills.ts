import { uid } from "./types";
import type { SportFormat } from "./fieldSpec";

/**
 * A drill: coaching metadata around a diagram. The diagram is an ordinary Vault
 * play (`playId`), so the Designer, thumbnails and exports work unchanged.
 * Kept in this browser and copied to the account while signed in (lib/docSync.ts).
 */
export const DRILL_CATEGORIES = [
  "Warm-up",
  "Passing and catching",
  "Ground balls",
  "Shooting",
  "Dodging",
  "Defense",
  "Clears and rides",
  "Face-offs",
  "Man-up / man-down",
  "Goalie",
  "Conditioning",
  "Game play",
] as const;
export type DrillCategory = (typeof DRILL_CATEGORIES)[number];

export type Drill = {
  id: string;
  sportFormat: SportFormat;
  name: string;
  category: DrillCategory;
  /** Suggested minutes; a practice period can override it. */
  minutes: number;
  /** Players needed, min to max (0 max = no limit). */
  players: { min: number; max: number };
  equipment: string[];
  /** The setup, in the coach's words. */
  setup: string;
  coachingPoints: string[];
  /** Vault play id holding the diagram, if drawn. */
  playId?: string;
  /** The starter drill this one was added from (lib/starters/drills.ts); its diagram is used when there's no playId. */
  starterId?: string;
  createdAt: number;
  updatedAt: number;
};

const KEY = "laxvault.drills.v1";

export const newDrill = (name: string, category: DrillCategory = "Passing and catching"): Drill => {
  const now = Date.now();
  return {
    id: uid("drl"),
    sportFormat: "mens_field",
    name,
    category,
    minutes: 10,
    players: { min: 2, max: 0 },
    equipment: [],
    setup: "",
    coachingPoints: [],
    createdAt: now,
    updatedAt: now,
  };
};

/** Keep only well-formed drills; storage can hold anything. */
export function cleanDrill(raw: unknown): Drill | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<Drill>;
  if (typeof d.id !== "string" || typeof d.name !== "string" || !d.name.trim()) return null;
  const base = newDrill(d.name.trim().slice(0, 120));
  const strs = (v: unknown, n: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 200)).slice(0, n) : []);
  const num = (v: unknown, lo: number, hi: number, fb: number) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fb);
  return {
    ...base,
    id: d.id,
    category: DRILL_CATEGORIES.includes(d.category as DrillCategory) ? (d.category as DrillCategory) : base.category,
    minutes: num(d.minutes, 1, 180, base.minutes),
    players: { min: num(d.players?.min, 1, 60, base.players.min), max: num(d.players?.max, 0, 60, 0) },
    equipment: strs(d.equipment, 20),
    setup: typeof d.setup === "string" ? d.setup.slice(0, 2000) : "",
    coachingPoints: strs(d.coachingPoints, 20),
    playId: typeof d.playId === "string" ? d.playId : undefined,
    starterId: typeof d.starterId === "string" && d.starterId.length <= 60 ? d.starterId : undefined,
    createdAt: num(d.createdAt, 0, Number.MAX_SAFE_INTEGER, base.createdAt),
    updatedAt: num(d.updatedAt, 0, Number.MAX_SAFE_INTEGER, base.updatedAt),
  };
}

/** Drills plus the ids deleted recently (id → when), so a delete reaches the coach's other devices. */
export type DrillDoc = { drills: Drill[]; gone: Record<string, number> };

const GONE_KEY = "laxvault.drills.gone.v1";
/** A delete is remembered this long; a device away longer than that may bring the drill back. */
const GONE_DAYS = 90;

export function loadDrills(): Drill[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.map(cleanDrill).filter((d): d is Drill => !!d) : [];
  } catch {
    return [];
  }
}

/** Keep only well-formed, recent delete marks. */
export function cleanGone(raw: unknown, now = Date.now()): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  const cutoff = now - GONE_DAYS * 86_400_000;
  for (const [id, at] of Object.entries(raw as Record<string, unknown>).slice(0, 2000)) {
    if (typeof at === "number" && at > cutoff && id.length <= 80) out[id] = at;
  }
  return out;
}

export function loadDrillDoc(): DrillDoc {
  let gone: unknown = {};
  try {
    gone = JSON.parse(localStorage.getItem(GONE_KEY) ?? "{}");
  } catch {
    /* no delete marks */
  }
  return { drills: loadDrills(), gone: cleanGone(gone) };
}

/** Writes both keys; `remote` tells open pages to reload instead of telling sync to push. */
export function writeDrillDoc(doc: DrillDoc, remote = false) {
  try {
    localStorage.setItem(KEY, JSON.stringify(doc.drills));
    localStorage.setItem(GONE_KEY, JSON.stringify(doc.gone));
  } catch {
    /* storage blocked: the drills still hold this visit */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(remote ? DOCS_REMOTE : DOCS_LOCAL));
}

/** The coach saved the library: anything that was there before and isn't now was deleted. */
export function saveDrills(drills: Drill[]) {
  const before = loadDrillDoc();
  const keep = new Set(drills.map((d) => d.id));
  const now = Date.now();
  const gone = { ...before.gone };
  for (const d of before.drills) if (!keep.has(d.id)) gone[d.id] = now;
  for (const id of keep) delete gone[id];
  writeDrillDoc({ drills, gone });
}

/** Two copies of the library made one: the newer edit of each drill wins, and a delete newer than the edit wins over it. */
export function mergeDrills(a: DrillDoc, b: DrillDoc): DrillDoc {
  const gone: Record<string, number> = { ...a.gone };
  for (const [id, at] of Object.entries(b.gone)) gone[id] = Math.max(at, gone[id] ?? 0);
  const byId = new Map<string, Drill>();
  for (const d of [...a.drills, ...b.drills]) {
    const have = byId.get(d.id);
    if (!have || d.updatedAt > have.updatedAt) byId.set(d.id, d);
  }
  const drills = [...byId.values()].filter((d) => !(gone[d.id] >= d.updatedAt)).sort((x, y) => y.updatedAt - x.updatedAt);
  for (const d of drills) delete gone[d.id];
  return { drills, gone };
}

/** Window events: the coach changed a doc here (push it), or sync brought a newer copy (reload it). */
export const DOCS_LOCAL = "laxvault:docs-local";
export const DOCS_REMOTE = "laxvault:docs-remote";
