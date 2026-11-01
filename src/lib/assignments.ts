import { toWorld } from "./geometry";
import { LAX_DEFENSE, LAX_OFFENSE } from "./presets";
import type { PathNode, PlayerNode, Scene, SceneNode } from "./types";

/**
 * A position's job on each play, for the player link (pages/Team.tsx) and its
 * quiz (lib/quiz.ts). Lacrosse tokens carry a position letter (A, M, D, G, L,
 * F…) and several players share one, so a "job" is every player with that
 * letter on the play, with the one a quiz asks about told apart by its name or
 * where it stands.
 */

/** How close (field px) a line has to start to a player to count as his, when it isn't glued to him. */
const OWN_REACH = 26;
const FADE = "#C9D3DB";
/** Token names every player starts with ("Attack", "Midfield"): they don't tell two A's apart. */
const GENERIC = new Set([...LAX_OFFENSE, ...LAX_DEFENSE].map((t) => t.title.toLowerCase()));

/** One position's job on one play: the players with that letter, their lines, and the play with everyone else greyed. */
export type Job<P extends { scene: Scene }> = { play: P; players: PlayerNode[]; lines: PathNode[]; scene: Scene };
/** One player's job, for quiz questions: who they are and how to tell them apart from teammates with the same letter. */
export type Assignment<P extends { scene: Scene }> = { play: P; player: PlayerNode; who: string; lines: PathNode[]; scene: Scene };

const people = (scene: Scene) =>
  scene.nodes.filter((n): n is PlayerNode => n.kind === "player" && !n.hidden && !n.ghostOf && n.side !== "ball" && !!n.label.trim());

const letterOf = (n: PlayerNode) => n.label.trim().toUpperCase();

/** The lines that belong to a player: glued to him, drawn by his preset, or starting where he stands. Passes he throws count too. */
export function linesOf(scene: Scene, player: PlayerNode): PathNode[] {
  return scene.nodes.filter((n): n is PathNode => {
    if (n.kind !== "path" || n.hidden || n.closed) return false;
    if (n.fromId === player.id || n.assignOf === player.id) return true;
    if (n.fromId || n.assignOf || !n.points.length) return false;
    const start = toWorld(n, n.points[0]);
    return Math.hypot(start.x - player.x, start.y - player.y) <= OWN_REACH;
  });
}

/** Every letter in these plays, the team with the ball first, then A to Z. */
export function lettersIn(plays: { scene: Scene }[]): { letter: string; side: PlayerNode["side"]; plays: number }[] {
  const seen = new Map<string, { letter: string; side: PlayerNode["side"]; plays: number }>();
  for (const p of plays) {
    const here = new Set<string>();
    for (const n of people(p.scene)) {
      const letter = letterOf(n);
      if (here.has(letter)) continue;
      here.add(letter);
      const row = seen.get(letter) ?? { letter, side: n.side, plays: 0 };
      row.plays++;
      seen.set(letter, row);
    }
  }
  return [...seen.values()].sort((a, b) => (a.side === b.side ? a.letter.localeCompare(b.letter) : a.side === "offense" ? -1 : 1));
}

/** The play with everyone but `keep` greyed out, so the job stands out. */
function spotlight(scene: Scene, players: PlayerNode[], lines: PathNode[]): Scene {
  const keep = new Set([...players.map((p) => p.id), ...lines.map((l) => l.id)]);
  const nodes = scene.nodes.map((n): SceneNode => {
    if (keep.has(n.id)) return n.kind === "path" ? { ...n, width: n.width + 1 } : n;
    if (n.kind === "player") return n.side === "ball" ? n : { ...n, fill: FADE, stroke: FADE, textColor: "#FFFFFF", shade: undefined };
    if (n.kind === "path") return { ...n, stroke: FADE, firstRead: false, tag: undefined, fill: n.fill === "none" ? "none" : FADE };
    if (n.kind === "shape") return { ...n, stroke: FADE, fill: n.fill === "none" ? "none" : FADE };
    return n;
  });
  return { ...scene, nodes };
}

/** What `letter` does on each play, in playbook order; plays without that letter are left out. */
export function jobsFor<P extends { scene: Scene }>(plays: P[], letter: string): Job<P>[] {
  const want = letter.trim().toUpperCase();
  const out: Job<P>[] = [];
  for (const play of plays) {
    const players = people(play.scene).filter((n) => letterOf(n) === want);
    if (!players.length) continue;
    const lines = [...new Set(players.flatMap((p) => linesOf(play.scene, p)))];
    out.push({ play, players, lines, scene: spotlight(play.scene, players, lines) });
  }
  return out;
}

/** "the A on the left", "the M up top": a name the coach gave the token, else where it stands among its letter. */
function describe(player: PlayerNode, same: PlayerNode[], vertical: boolean): string {
  const letter = letterOf(player);
  const named = player.name.trim();
  if (named && named.toUpperCase() !== letter && !GENERIC.has(named.toLowerCase())) return `${letter} (${named})`;
  if (same.length < 2) return letter;
  // Half fields and the whiteboard put the goal at the top; the full field runs goal to goal across.
  const across = (n: PlayerNode) => (vertical ? n.x : n.y);
  const along = (n: PlayerNode) => (vertical ? n.y : n.x);
  const xs = same.map(across);
  const spread = Math.max(...xs) - Math.min(...xs);
  if (spread > 40) {
    if (across(player) === Math.min(...xs)) return `${letter} on the left`;
    if (across(player) === Math.max(...xs)) return `${letter} on the right`;
  }
  const ys = same.map(along);
  if (along(player) === Math.max(...ys)) return vertical ? `${letter} up top` : `${letter} farthest out`;
  if (along(player) === Math.min(...ys)) return vertical ? `${letter} down low` : `${letter} nearest the goal`;
  return `${letter} in the middle`;
}

/** Each player with `letter` on each play, for quiz questions. */
export function assignmentsFor<P extends { scene: Scene }>(plays: P[], letter: string): Assignment<P>[] {
  const want = letter.trim().toUpperCase();
  const out: Assignment<P>[] = [];
  for (const play of plays) {
    const same = people(play.scene).filter((n) => letterOf(n) === want);
    const vertical = !play.scene.view.endsWith("_full") && play.scene.view !== "full";
    for (const player of same) {
      const lines = linesOf(play.scene, player);
      out.push({ play, player, who: describe(player, same, vertical), lines, scene: spotlight(play.scene, [player], lines) });
    }
  }
  return out;
}
