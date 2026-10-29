import { uid } from "./types";
import type { SportFormat } from "./fieldSpec";

/**
 * A drill: coaching metadata around a diagram. The diagram is an ordinary Vault
 * play (`playId`), so the Designer, thumbnails and exports work unchanged.
 * Kept in this browser; account sync arrives with the Phase 3 database baseline.
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
    createdAt: num(d.createdAt, 0, Number.MAX_SAFE_INTEGER, base.createdAt),
    updatedAt: num(d.updatedAt, 0, Number.MAX_SAFE_INTEGER, base.updatedAt),
  };
}

export function loadDrills(): Drill[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.map(cleanDrill).filter((d): d is Drill => !!d) : [];
  } catch {
    return [];
  }
}

export function saveDrills(drills: Drill[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(drills));
  } catch {
    /* storage blocked: the drills still hold this visit */
  }
}
