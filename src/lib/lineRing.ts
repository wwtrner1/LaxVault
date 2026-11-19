import type { Point, Scene, SceneNode } from "./types";
import type { GoKind } from "./goLine";
import { isLax, laxGeom } from "./fieldUnits";

/**
 * The line ring: tap a player and the line kinds fan out around him. A tap on
 * a kind drops a ready-made line in a sensible place (a pass to the nearest
 * teammate, a shot at the goal, a cut toward the cage); a press and drag on a
 * kind pulls the line's end out under the finger. Pure, so the same rules work
 * in every Vault's Designer.
 */

/** How long a dropped cut, dodge or slide is, in canvas units (about 9 yards on the men's half field). */
export const RING_REACH = 100;

type Player = Extract<SceneNode, { kind: "player" }>;

const players = (scene: Scene) => scene.nodes.filter((n): n is Player => n.kind === "player" && !n.hidden && n.side !== "ball");

function nearest(from: Player, list: Player[]) {
  let best: Player | null = null;
  let bestD = Infinity;
  for (const p of list) {
    if (p.id === from.id) continue;
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** The middle of the goal the player is nearest to, on lacrosse fields; null on the whiteboard. */
export function goalFor(scene: Scene, at: Point): Point | null {
  if (!isLax(scene.view)) return null;
  const g = laxGeom(scene.view);
  const spot = (along: number) =>
    g.vertical ? { x: g.x0 + (g.width / 2) * g.u, y: g.y0 + along * g.u } : { x: g.x0 + along * g.u, y: g.y0 + (g.width / 2) * g.u };
  const near = spot(g.goal);
  if (g.lengthShown < g.length) return near; // half field: only one goal on screen
  const far = spot(g.length - g.goal);
  return Math.hypot(near.x - at.x, near.y - at.y) <= Math.hypot(far.x - at.x, far.y - at.y) ? near : far;
}

/** Five yards out in front of the goal (toward the middle of the field), where cuts and dodges head. */
export function frontOfGoal(scene: Scene, at: Point): Point | null {
  const goal = goalFor(scene, at);
  if (!goal || !isLax(scene.view)) return null;
  const g = laxGeom(scene.view);
  const mid = g.vertical ? { x: goal.x, y: g.y0 + (g.lengthShown / 2) * g.u } : { x: g.x0 + (g.lengthShown / 2) * g.u, y: goal.y };
  const dx = mid.x - goal.x;
  const dy = mid.y - goal.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: goal.x + (dx / d) * 5 * g.u, y: goal.y + (dy / d) * 5 * g.u };
}

/** `len` units from `from` toward `to` (or all the way when it's closer), stopping `short` units before it. */
function toward(from: Point, to: Point, len: number, short = 0): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  const go = Math.max(24, Math.min(len, d - short));
  return { x: from.x + (dx / d) * go, y: from.y + (dy / d) * go };
}

const clampToCanvas = (p: Point, w: number, h: number): Point => ({ x: Math.min(w - 12, Math.max(12, p.x)), y: Math.min(h - 12, Math.max(12, p.y)) });

/** Where a line of `kind` dropped from the ring ends, and the player it ends on (a pass to a teammate). */
export function ringEnd(kind: GoKind, from: Player, scene: Scene, canvas: { w: number; h: number }): { to: Point; toId: string | null } {
  const all = players(scene);
  const mates = all.filter((p) => p.side === from.side);
  const others = all.filter((p) => p.side !== from.side);
  const goal = goalFor(scene, from);
  // With no goal on screen, lines run up the board, the way most coaches draw an attack.
  const ahead = goal ?? { x: from.x, y: from.y - 400 };
  let out: { to: Point; toId: string | null };
  switch (kind) {
    case "pass": {
      const mate = nearest(from, mates);
      out = mate ? { to: { x: mate.x, y: mate.y }, toId: mate.id } : { to: toward(from, ahead, RING_REACH * 1.4), toId: null };
      break;
    }
    case "shot":
      out = { to: goal ? { x: goal.x, y: goal.y } : toward(from, ahead, RING_REACH * 1.6), toId: null };
      break;
    case "pick": {
      // A pick is set on a teammate's defender: stop just short of the nearest teammate.
      const mate = nearest(from, mates);
      out = { to: mate ? toward(from, mate, RING_REACH, 26) : toward(from, ahead, RING_REACH * 0.7), toId: null };
      break;
    }
    case "slide": {
      const man = nearest(from, others);
      out = { to: man ? toward(from, man, RING_REACH * 1.6, 22) : toward(from, ahead, RING_REACH), toId: null };
      break;
    }
    default: {
      // Cut and dodge: to the spot just in front of the cage; a player already there goes across the crease instead.
      const front = frontOfGoal(scene, from);
      let target = front ?? ahead;
      if (front && Math.hypot(front.x - from.x, front.y - from.y) < 60) target = { x: 2 * front.x - from.x + 1, y: front.y };
      out = { to: toward(from, target, RING_REACH * (kind === "dodge" ? 1.1 : 1)), toId: null };
    }
  }
  return out.toId ? out : { ...out, to: clampToCanvas(out.to, canvas.w, canvas.h) };
}

/**
 * Where the ring's buttons sit around the player, in screen pixels from his
 * centre: evenly spaced, the first straight up. Near an edge of the field the
 * ring swings away from it, so no button is cut off.
 */
export function ringSpots(count: number, radius: number, center: { x: number; y: number }, box: { w: number; h: number }) {
  const pad = radius + 26;
  const cx = Math.min(Math.max(center.x, pad), Math.max(pad, box.w - pad));
  const cy = Math.min(Math.max(center.y, pad), Math.max(pad, box.h - pad));
  const spots = Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
  });
  return { cx, cy, spots };
}
