/**
 * Live practice mode clock. The state is a period index plus either the moment
 * the period ends (running) or the seconds left (paused), so a phone that
 * sleeps or reloads mid-practice comes back to the right time. Kept in this
 * browser under `laxvault.live.v1`.
 */
export type LiveState = {
  /** Which period of the script is on. */
  index: number;
  /** Epoch ms when the current period runs out; null while paused. */
  endsAt: number | null;
  /** Seconds left while paused (negative = over time). */
  left: number;
  /** The script the state belongs to, so a different script starts fresh. */
  periodIds: string[];
};

const KEY = "laxvault.live.v1";

export const startState = (periodIds: string[], firstMinutes: number): LiveState => ({ index: 0, endsAt: null, left: firstMinutes * 60, periodIds });

export function loadLive(periodIds: string[]): LiveState | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as LiveState | null;
    if (!raw || !Array.isArray(raw.periodIds) || raw.periodIds.join() !== periodIds.join()) return null;
    if (typeof raw.index !== "number" || raw.index < 0 || raw.index >= periodIds.length) return null;
    return { index: raw.index, endsAt: typeof raw.endsAt === "number" ? raw.endsAt : null, left: Number(raw.left) || 0, periodIds };
  } catch {
    return null;
  }
}

export function saveLive(s: LiveState | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the clock still runs this visit */
  }
}

/** Seconds left in the current period at `now` (negative once over time). */
export const secondsLeft = (s: LiveState, now: number) => (s.endsAt === null ? s.left : Math.ceil((s.endsAt - now) / 1000));

export const play = (s: LiveState, now: number): LiveState => (s.endsAt !== null ? s : { ...s, endsAt: now + s.left * 1000 });
export const pause = (s: LiveState, now: number): LiveState => (s.endsAt === null ? s : { ...s, endsAt: null, left: secondsLeft(s, now) });

/** Add (or take away) time from the current period. */
export const addTime = (s: LiveState, seconds: number): LiveState =>
  s.endsAt === null ? { ...s, left: s.left + seconds } : { ...s, endsAt: s.endsAt + seconds * 1000 };

/** Move to another period with its full time, keeping the clock running if it was. */
export function goTo(s: LiveState, index: number, minutes: number, now: number): LiveState {
  const running = s.endsAt !== null;
  const left = minutes * 60;
  return { ...s, index, left, endsAt: running ? now + left * 1000 : null };
}

/** "12:05", or "+0:42" once over time. */
export function clock(seconds: number): string {
  const over = seconds < 0;
  const t = Math.abs(seconds);
  return `${over ? "+" : ""}${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
