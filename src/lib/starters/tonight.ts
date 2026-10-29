import { planMinutes, STARTER_PLANS, type PlanPeriod, type StarterPlan } from "./plans";

/**
 * "Build tonight's practice": three taps (age group, minutes, what kind of
 * night) pick the closest starter plan and stretch or squeeze it to the time
 * the coach has. Talks and huddles keep their minutes; the work periods share
 * the rest in proportion, never below a few minutes each.
 */
export type AgeGroup = "u10" | "u12" | "ms" | "hs";
export type NightKind = "practice" | "game" | "first";

export const AGE_GROUPS: { id: AgeGroup; label: string; hint: string }[] = [
  { id: "u10", label: "U8 to U10", hint: "Lots of touches, games over lines" },
  { id: "u12", label: "U11 to U12", hint: "Skills plus the first team concepts" },
  { id: "ms", label: "Middle school", hint: "Grades 6 to 8, U13 to U14" },
  { id: "hs", label: "High school", hint: "JV and varsity" },
];

export const NIGHT_KINDS: { id: NightKind; label: string; hint: string }[] = [
  { id: "practice", label: "A normal practice", hint: "Skills, then team work, then play" },
  { id: "game", label: "Game tomorrow", hint: "Sharp, short, walk through the big moments" },
  { id: "first", label: "First practice", hint: "New players, names, safety, touches" },
];

export const MINUTE_CHOICES = [45, 60, 75, 90, 120];

/** Two hours is a high-school night; younger players, first practices and game eves top out at 90 minutes. */
export const minuteChoices = (age: AgeGroup, kind: NightKind) => (age === "u10" || kind !== "practice" ? MINUTE_CHOICES.filter((m) => m <= 90) : MINUTE_CHOICES);

/** Plans that suit each night, best first; the first wins unless another is much closer to the time. */
const PICK: Record<NightKind, Record<AgeGroup, string[]>> = {
  practice: {
    u10: ["youth-skills"],
    u12: ["youth-game-prep", "youth-skills", "middle-school"],
    ms: ["middle-school", "youth-game-prep"],
    hs: ["high-school", "middle-school"],
  },
  game: { u10: ["game-day", "youth-game-prep"], u12: ["game-day", "youth-game-prep"], ms: ["game-day", "youth-game-prep"], hs: ["game-day", "youth-game-prep"] },
  first: { u10: ["first-practice"], u12: ["first-practice"], ms: ["first-practice"], hs: ["first-practice"] },
};

function basePlan(kind: NightKind, age: AgeGroup, minutes: number): StarterPlan {
  const list = PICK[kind][age].map((k) => STARTER_PLANS.find((p) => p.key === k)).filter((p): p is StarterPlan => !!p);
  const gap = (p: StarterPlan) => Math.abs(planMinutes(p) - minutes);
  if (!list.length) return STARTER_PLANS[0];
  if (gap(list[0]) <= 30) return list[0];
  return list.reduce((a, b) => (gap(b) < gap(a) ? b : a));
}

/** A work period shorter than this isn't worth setting up; past it, periods are dropped instead of squeezed. */
const BLOCK = 7;
/** How far a drill block stretches when there's more time than the plan. */
const GROW = 1.5;
/** Minutes a work period never drops below. */
const FLOOR = 4;

const fixed = (p: PlanPeriod) => p.drills.length === 0;
const keeper = (p: PlanPeriod, i: number, first: number) => i === first || /game|scrimmage|6v6/i.test(p.title);

/**
 * The plan stretched or squeezed to `minutes`. When the time is too short for
 * every period, the shortest ones go first (never the warm-up or the closing
 * game), so the night keeps fewer, real blocks instead of many tiny ones.
 */
export function fitPlan(plan: StarterPlan, minutes: number): StarterPlan {
  let periods = plan.periods.map((p) => ({ ...p }));
  const talk = () => periods.filter(fixed).reduce((n, p) => n + p.minutes, 0);
  const workCount = () => periods.filter((p) => !fixed(p)).length;
  while (workCount() * BLOCK + talk() > minutes && workCount() > 2) {
    const first = periods.findIndex((p) => !fixed(p));
    const options = periods.map((p, i) => ({ p, i })).filter(({ p, i }) => !fixed(p) && !keeper(p, i, first));
    if (!options.length) break;
    const drop = options.reduce((a, b) => (b.p.minutes <= a.p.minutes ? b : a)).i;
    periods = periods.filter((_, i) => i !== drop);
  }
  const work = periods.filter((p) => !fixed(p));
  const had = work.reduce((n, p) => n + p.minutes, 0);
  const room = Math.max(work.length * FLOOR, minutes - talk());
  const first = periods.findIndex((p) => !fixed(p));
  const games = work.filter((p) => keeper(p, periods.indexOf(p), first) && periods.indexOf(p) !== first);
  // Stretching: a drill block grows at most half again; the closing game takes the rest, kids would rather play.
  for (const p of work) {
    const share = Math.round((p.minutes / had) * room);
    p.minutes = Math.max(FLOOR, games.length && !games.includes(p) ? Math.min(share, Math.round(p.minutes * GROW)) : share);
  }
  // Rounding and capped minutes go to (or come off) the closing game, else the longest work period.
  const diff = minutes - periods.reduce((n, p) => n + p.minutes, 0);
  if (diff && work.length) {
    const target = games[games.length - 1] ?? work.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    target.minutes = Math.max(FLOOR, target.minutes + diff);
  }
  return { ...plan, periods };
}

/** The starter plan for this night, fitted to the minutes, and named for it. */
export function tonightsPlan(age: AgeGroup, kind: NightKind, minutes: number): StarterPlan {
  const base = basePlan(kind, age, minutes);
  const group = AGE_GROUPS.find((a) => a.id === age)?.label ?? "";
  const name = kind === "game" ? `Game prep · ${group}` : kind === "first" ? `First practice · ${group}` : `Tonight · ${group}`;
  return { ...fitPlan(base, minutes), name };
}
