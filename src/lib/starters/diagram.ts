import { MENS_FIELD } from "../fieldSpec";
import { laxAt, laxGeom, type LaxView } from "../fieldUnits";
import { LAX_DEFENSE, LAX_OFFENSE, makePlayer, type TokenPreset } from "../presets";
import { baseNode, CANVAS_H, CANVAS_W } from "../types";
import type { EndCap, FieldView, LineStyle, PathNode, PlayerNode, Scene } from "../types";

/**
 * A tiny drawing language for the starter library, so a drill or play reads
 * like a coach's whiteboard sketch instead of canvas numbers. Every spot is in
 * field yards: `a` along the field from the near end line (goal line at 15,
 * restraining line at 35, midfield at 55, far goal line at 95) and `x` across
 * it from the middle (negative = left on the half field).
 */
export type Spot = [a: number, x: number];
/** A player: token code (presets.ts), spot, and an optional letter in place of the token's. */
export type P = [code: string, a: number, x: number, label?: string];
/** A line: kind, where it starts (a player's index or a spot), the spots it runs through, and an optional end tag. */
export type L = [kind: LineKind, from: number | Spot, through: Spot[], tag?: string];
export type LineKind = "cut" | "pass" | "dodge" | "pick" | "shot" | "slide";
export type Sketch = { view: LaxView | Extract<FieldView, "blank">; players: P[]; lines?: L[] };

const INK = "#0B1524";
const SHOT = "#D24B3E";
const SLIDE = "#9E3428";
const LOOK: Record<LineKind, { style: LineStyle; end: EndCap; stroke: string; width: number }> = {
  cut: { style: "solid", end: "arrow", stroke: INK, width: 3.4 },
  pass: { style: "dashed", end: "arrow", stroke: INK, width: 3.4 },
  dodge: { style: "motion", end: "arrow", stroke: INK, width: 3.4 },
  pick: { style: "solid", end: "tee", stroke: INK, width: 3.4 },
  shot: { style: "solid", end: "arrow", stroke: SHOT, width: 4.4 },
  slide: { style: "solid", end: "arrow", stroke: SLIDE, width: 3.4 },
};

const TOKENS = [...LAX_OFFENSE, ...LAX_DEFENSE];
const token = (code: string): TokenPreset => TOKENS.find((t) => t.code === code) ?? LAX_OFFENSE[0];
/** The middle of the field across, in yards. */
export const MID = MENS_FIELD.widthYd.value / 2;

/**
 * The whiteboard has no field to line up with, so a drill drawn there is
 * scaled to fill the board: a 15-yard line drill reads as clearly as a
 * 40-yard one. The goal end stays at the top, as on the half field.
 */
function fitBoard(s: Sketch): (spot: Spot) => { x: number; y: number } {
  const spots: Spot[] = [...s.players.map(([, a, x]) => [a, x] as Spot), ...(s.lines ?? []).flatMap(([, from, through]) => (typeof from === "number" ? through : [from, ...through]))];
  const as = spots.map((p) => p[0]);
  const xs = spots.map((p) => p[1]);
  const [a0, a1, x0, x1] = [Math.min(...as), Math.max(...as), Math.min(...xs), Math.max(...xs)];
  const u = Math.min(760 / Math.max(1, x1 - x0), 480 / Math.max(1, a1 - a0), 34);
  return ([a, x]) => ({ x: CANVAS_W / 2 + (x - (x0 + x1) / 2) * u, y: CANVAS_H / 2 + (a - (a0 + a1) / 2) * u });
}

/** Turn a sketch into a Designer scene. */
export function sketchScene(s: Sketch): Scene {
  const mid = s.view === "blank" ? MID : laxGeom(s.view).width / 2;
  const at = s.view === "blank" ? fitBoard(s) : ([a, x]: Spot) => laxAt(s.view, a, mid + x);
  // The full field is drawn smaller, so its players are too.
  const size = s.view === "lax_full" || s.view === "wlax_full" ? 26 : s.view === "box_full" ? 30 : undefined;
  let z = 1;
  const players: PlayerNode[] = s.players.map(([code, a, x, label]) => {
    const p = at([a, x]);
    const node = { ...makePlayer(token(code), p.x, p.y), z: z++ };
    return { ...node, ...(label !== undefined ? { label } : {}), ...(size && code !== "BALL" && code !== "CONE" ? { size } : {}) };
  });
  const lines: PathNode[] = (s.lines ?? []).map(([kind, from, through, tag]) => {
    const start = typeof from === "number" ? { x: players[from].x, y: players[from].y } : at(from);
    const look = LOOK[kind];
    return {
      ...baseNode({ x: start.x, y: start.y, z: z++, name: kind[0].toUpperCase() + kind.slice(1) }),
      kind: "path",
      points: [{ x: 0, y: 0 }, ...through.map((t) => { const p = at(t); return { x: p.x - start.x, y: p.y - start.y }; })],
      handles: {},
      style: look.style,
      curve: through.length > 1 && kind !== "pick" ? "spline" : "straight",
      startCap: "none",
      endCap: look.end,
      stroke: look.stroke,
      width: look.width,
      closed: false,
      fill: "none",
      fillOpacity: 0,
      fromId: typeof from === "number" ? players[from].id : null,
      toId: null,
      ...(tag ? { tag } : {}),
      // A shot is drawn solid red but carries the ball in Run play.
      ...(kind === "shot" ? { moves: "ball" as const } : {}),
    };
  });
  // Lines under players, so tokens stay readable where a line starts.
  return { version: 2, view: s.view, width: 1040, height: 660, losY: CANVAS_H / 2, pivot: null, nodes: [...lines.map((l, i) => ({ ...l, z: i + 1 })), ...players.map((p, i) => ({ ...p, z: lines.length + i + 1 }))] };
}

const cache = new Map<string, Scene>();
/** The scene for a starter, built once per visit so thumbnails don't redraw on every render. */
export function starterScene(id: string, s: Sketch): Scene {
  let scene = cache.get(id);
  if (!scene) {
    scene = sketchScene(s);
    cache.set(id, scene);
  }
  return scene;
}

