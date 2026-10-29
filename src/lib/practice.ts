import { uid } from "./types";
import { DOCS_LOCAL, DOCS_REMOTE } from "./drills";

/**
 * A practice script: timed periods, each with the drills and diagrams to rep. Kept in this
 * browser. It prints as the one-page script on the clipboard and as drill
 * cards, one diagram per card, for the coach running each station.
 */
export type Period = { id: string; title: string; minutes: number; note: string; playIds: string[]; drillIds?: string[] };
/** `updatedAt` is stamped on every save so the newest copy wins across devices. */
export type Script = { name: string; start: string; periods: Period[]; updatedAt?: number };

const KEY = "laxvault.practice.v1";

export const newPeriod = (title: string, minutes: number, note = ""): Period => ({ id: uid("per"), title, minutes, note, playIds: [] });

export const freshScript = (): Script => ({
  name: "Practice script",
  start: "",
  periods: [
    newPeriod("Warm-up", 10, "Dynamic stretch, easy catch"),
    newPeriod("Stick work", 10, "Passing, catching, scooping"),
    newPeriod("Individual skills", 15, "Dodging, shooting, defensive footwork"),
    newPeriod("Small-sided", 15, "Ground balls, 2v1, 3v2"),
    newPeriod("Team", 20, "Clears, rides, settled offense and defense"),
    newPeriod("Conditioning", 5, "Finish strong"),
  ],
});

/** Keep only a well-formed script; storage and the network can hold anything. */
export function cleanScript(raw: unknown): Script | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Script>;
  if (!Array.isArray(r.periods)) return null;
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length <= 80).slice(0, 50) : []);
  const periods: Period[] = r.periods.slice(0, 40).flatMap((p) => {
    if (!p || typeof p !== "object" || typeof p.id !== "string") return [];
    const minutes = Number(p.minutes);
    return [{ id: p.id.slice(0, 80), title: str(p.title, 40), minutes: isFinite(minutes) ? Math.min(180, Math.max(0, Math.round(minutes))) : 0, note: str(p.note, 120), playIds: ids(p.playIds), drillIds: ids(p.drillIds) }];
  });
  return {
    name: str(r.name, 60) || "Practice script",
    start: /^\d{1,2}:\d{2}$/.test(String(r.start ?? "")) ? String(r.start) : "",
    periods,
    updatedAt: typeof r.updatedAt === "number" && isFinite(r.updatedAt) ? r.updatedAt : 0,
  };
}

export function loadScript(): Script {
  try {
    const raw = cleanScript(JSON.parse(localStorage.getItem(KEY) ?? "null"));
    if (raw) return raw;
  } catch {
    /* fall through to a fresh script */
  }
  return freshScript();
}

/** The coach changed the script: stamp it and let sync push it. `remote` writes a copy from the account instead. */
export function saveScript(script: Script, remote = false) {
  const stamped = remote ? script : { ...script, updatedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(stamped));
  } catch {
    /* storage blocked: the script still holds this visit */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(remote ? DOCS_REMOTE : DOCS_LOCAL));
}

/** True once the coach has saved a script in this browser (a fresh default isn't worth sending). */
export const hasSavedScript = () => {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
};

export const totalMinutes = (s: Script) => s.periods.reduce((n, p) => n + (p.minutes || 0), 0);

/** Clock times for each period from a "HH:MM" start; empty when no start was set. */
export function clockTimes(s: Script): string[] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.start);
  if (!m) return s.periods.map(() => "");
  let at = Number(m[1]) * 60 + Number(m[2]);
  return s.periods.map((p) => {
    const h = Math.floor(at / 60) % 24;
    const label = `${h % 12 || 12}:${String(at % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
    at += p.minutes || 0;
    return label;
  });
}
