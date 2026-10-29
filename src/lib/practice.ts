import { uid } from "./types";

/**
 * A practice script: timed periods, each with the drills and diagrams to rep. Kept in this
 * browser. It prints as the one-page script on the clipboard and as drill
 * cards, one diagram per card, for the coach running each station.
 */
export type Period = { id: string; title: string; minutes: number; note: string; playIds: string[]; drillIds?: string[] };
export type Script = { name: string; start: string; periods: Period[] };

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

export function loadScript(): Script {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Script | null;
    if (raw && Array.isArray(raw.periods)) return raw;
  } catch {
    /* fall through to a fresh script */
  }
  return freshScript();
}

export function saveScript(script: Script) {
  try {
    localStorage.setItem(KEY, JSON.stringify(script));
  } catch {
    /* storage blocked: the script still holds this visit */
  }
}

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
