import { baseNode, type Point } from "./types";
import type { EndCap, LineCurve, LineStyle, PathNode } from "./types";

/**
 * Tap to move (the Designer's Move tool): tap a player, tap where he goes, and
 * the line is drawn from his token to that spot. Tap again to add a turn, or
 * tap another player to start his line. The kind of line says what happens:
 * a cut (player runs), a pass (ball flies), a dodge (player carries it), a
 * shot, a pick or a slide. One look per kind, matching the starter library,
 * so a coach's lines and the starters read the same.
 */
export type GoKind = "cut" | "pass" | "dodge" | "shot" | "pick" | "slide";

export const INK = "#0B1524";
const SHOT = "#D24B3E";
const SLIDE = "#9E3428";

export const GO_KINDS: { id: GoKind; label: string; icon: string; hint: string; style: LineStyle; end: EndCap; stroke?: string; width: number; moves?: "ball" | "player" }[] = [
  { id: "cut", label: "Cut", icon: "arrow", hint: "A player runs without the ball.", style: "solid", end: "arrow", width: 3.4 },
  { id: "pass", label: "Pass", icon: "dashed", hint: "The ball flies to a teammate or a spot.", style: "dashed", end: "arrow", width: 3.4, moves: "ball" },
  { id: "dodge", label: "Dodge", icon: "motion", hint: "A player carries the ball: a dodge, a clear or a scoop and go.", style: "motion", end: "arrow", width: 3.4 },
  { id: "shot", label: "Shot", icon: "arrow", hint: "A shot on goal, in red.", style: "solid", end: "arrow", stroke: SHOT, width: 4.4, moves: "ball" },
  { id: "pick", label: "Pick", icon: "block", hint: "Where a player sets a pick.", style: "solid", end: "tee", width: 3.4 },
  { id: "slide", label: "Slide", icon: "arrow", hint: "A defender slides to the ball, in dark red.", style: "solid", end: "arrow", stroke: SLIDE, width: 3.4 },
];

export const goKind = (id: GoKind) => GO_KINDS.find((k) => k.id === id) ?? GO_KINDS[0];

/**
 * A new line from `from` (the player's spot) to `to`, in the kind's look.
 * `color` is the coach's ink for kinds without their own color (shot and slide keep theirs).
 */
export function goPath(kind: GoKind, from: Point, to: Point, opts: { curve: boolean; color?: string; z: number; fromId: string | null; toId?: string | null }): PathNode {
  const k = goKind(kind);
  const curve: LineCurve = opts.curve ? "spline" : "straight";
  const points: Point[] = [{ x: 0, y: 0 }, { x: to.x - from.x, y: to.y - from.y }];
  // A one-leg curve needs a middle point to bend through: a gentle bow to the right of the line.
  if (opts.curve) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const bow = Math.min(60, len * 0.22);
    points.splice(1, 0, { x: dx / 2 - (dy / len) * bow, y: dy / 2 + (dx / len) * bow });
  }
  return {
    ...baseNode({ x: from.x, y: from.y, z: opts.z, name: k.label }),
    kind: "path",
    points,
    handles: {},
    style: k.style,
    curve,
    startCap: "none",
    endCap: k.end,
    stroke: k.stroke ?? opts.color ?? INK,
    width: k.width,
    closed: false,
    fill: "none",
    fillOpacity: 0,
    fromId: opts.fromId,
    toId: opts.toId ?? null,
    ...(k.moves ? { moves: k.moves } : {}),
  };
}

/** Another turn on a line drawn with the Move tool, at `to` (field coordinates). */
export function extendPath(path: PathNode, to: Point): PathNode {
  // A one-leg curve's bow point is dropped once the coach adds real turns, so the line runs through their taps.
  const pts = path.curve === "spline" && path.points.length === 3 && !path.toId ? [path.points[0], path.points[2]] : path.points;
  return { ...path, points: [...pts, { x: to.x - path.x, y: to.y - path.y }], toId: null, curve: path.curve };
}

/** What kind a drawn line reads as, from its look (any tool, starters included). */
export function kindOfPath(p: PathNode): GoKind {
  const ink = p.stroke.toLowerCase();
  if (ink === SHOT.toLowerCase()) return "shot";
  if (ink === SLIDE.toLowerCase()) return "slide";
  if (p.endCap === "tee") return "pick";
  if (p.style === "motion") return "dodge";
  if (p.style === "dashed" || p.style === "dotted") return "pass";
  return "cut";
}

/** Restyle a line to another kind, keeping its shape and where it starts and ends. */
export function restyle(p: PathNode, kind: GoKind, color?: string): PathNode {
  const k = goKind(kind);
  const own = [SHOT, SLIDE].map((c) => c.toLowerCase()).includes(p.stroke.toLowerCase());
  const next: PathNode = { ...p, style: k.style, endCap: k.end, width: k.width, name: k.label, stroke: k.stroke ?? (own ? color ?? INK : p.stroke) };
  if (k.moves) next.moves = k.moves;
  else delete next.moves;
  return next;
}
