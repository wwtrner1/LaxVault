import { assignmentsFor, jobsFor, type Assignment } from "./assignments";
import { toWorld } from "./geometry";
import type { PathNode, PlayerNode, Scene } from "./types";

/**
 * The play quiz on the player link: questions built from the plays a coach
 * already drew, so a player is tested on the install with nothing for the
 * coach to write. Two kinds: "which line is yours?" (the player's real cut,
 * dodge or pass among teammates' moves, all from his spot) and "which play is
 * this?" (his job spotlighted, four play names). Pure, so the page and a
 * check of it share the code.
 */

type Play = { id: string; name: string; scene: Scene };

export type LineOption = { scene: Scene; correct: boolean };
export type NameOption = { label: string; correct: boolean };

export type Question =
  | { kind: "line"; id: string; prompt: string; options: LineOption[] }
  | { kind: "name"; id: string; prompt: string; scene: Scene; options: NameOption[] };

const INK = "#0B1524";
/** Moves that end within this many field units of each other look the same to a player. */
const SAME_ENDING = 55;

const shuffle = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** A player's drawn lines. More than two usually means a crowd of lines starting on him, which makes a muddled choice. */
const movesIn = (lines: PathNode[]) => {
  const drawn = lines.filter((l) => l.points.length > 1 && !l.closed);
  return drawn.length > 2 ? [] : drawn;
};

/** Lines moved so the player they belong to stands on `to`, restyled so color and labels give nothing away. */
function moved(lines: PathNode[], from: PlayerNode, to: PlayerNode): PathNode[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return lines.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy, fromId: null, toId: null, assignOf: undefined, tag: undefined, firstRead: false, stroke: INK, width: 4 }));
}

/** Where a set of lines ends, relative to its player, for telling two sets apart. */
const ending = (lines: PathNode[], who: PlayerNode) => {
  const last = lines[lines.length - 1];
  const end = toWorld(last, last.points[last.points.length - 1]);
  return { x: end.x - who.x, y: end.y - who.y, n: lines.length };
};

/** "Which is your move?": the player's real lines among lines borrowed from teammates, all from where he stands. */
function lineQuestion(a: Assignment<Play>, others: Assignment<Play>[], n: number): Question | null {
  const real = movesIn(a.lines);
  if (!real.length) return null;
  const want = ending(real, a.player);
  const seen = [want];
  const wrong: PathNode[][] = [];
  for (const o of shuffle(others)) {
    const lines = movesIn(o.lines);
    if (!lines.length) continue;
    const e = ending(lines, o.player);
    if (seen.some((s) => s.n === e.n && Math.hypot(s.x - e.x, s.y - e.y) < SAME_ENDING)) continue;
    seen.push(e);
    wrong.push(moved(lines, o.player, a.player));
    if (wrong.length === 3) break;
  }
  if (!wrong.length) return null;
  const sceneOf = (lines: PathNode[]): Scene => ({ ...a.play.scene, nodes: [{ ...a.player, shade: undefined }, ...lines] });
  const options: LineOption[] = shuffle([
    { scene: sceneOf(moved(real, a.player, a.player)), correct: true },
    ...wrong.map((lines) => ({ scene: sceneOf(lines), correct: false })),
  ]);
  return { kind: "line", id: `line-${a.play.id}-${n}`, prompt: `${a.play.name}: what does the ${a.who} do?`, options };
}

/** "Which play is this?": the position's job on one play, and four play names. */
function nameQuestion(play: Play, scene: Scene, plays: Play[], letter: string, n: number): Question | null {
  const names = [...new Set(plays.filter((p) => p.id !== play.id && p.name !== play.name).map((p) => p.name))];
  if (!names.length) return null;
  const options: NameOption[] = shuffle([{ label: play.name, correct: true }, ...shuffle(names).slice(0, 3).map((label) => ({ label, correct: false }))]);
  return { kind: "name", id: `name-${play.id}-${n}`, prompt: `You're the ${letter}. Which play is this?`, scene, options };
}

/** Every letter on the same side as `letter` in the book, for borrowing wrong answers. */
function teammates(plays: Play[], letter: string): string[] {
  const want = letter.toUpperCase();
  let side: PlayerNode["side"] | undefined;
  const all = new Map<string, PlayerNode["side"]>();
  for (const p of plays)
    for (const n of p.scene.nodes)
      if (n.kind === "player" && n.side !== "ball" && n.label.trim()) {
        const l = n.label.trim().toUpperCase();
        all.set(l, n.side);
        if (l === want) side = n.side;
      }
  return [...all].filter(([, s]) => s === side).map(([l]) => l);
}

/** A round for one position: up to `count` questions, moves and play names mixed. */
export function buildQuiz(plays: Play[], letter: string, count = 8): Question[] {
  const each = assignmentsFor(plays, letter);
  const drawn = each.filter((a) => movesIn(a.lines).length);
  const pool: Assignment<Play>[] = teammates(plays, letter).flatMap((l) => assignmentsFor(plays, l));
  const jobs = jobsFor(plays, letter);
  const out: Question[] = [];
  const lines = shuffle(drawn);
  const names = shuffle(jobs);
  for (let i = 0; out.length < count && (i < lines.length || i < names.length); i++) {
    const a = lines[i];
    if (a) {
      const q = lineQuestion(a, pool.filter((o) => o.play.id !== a.play.id || o.player.id !== a.player.id), i);
      if (q) out.push(q);
    }
    const j = names[i];
    if (j && out.length < count) {
      const q = nameQuestion(j.play, j.scene, plays, letter, i);
      if (q) out.push(q);
    }
  }
  return out.slice(0, count);
}
