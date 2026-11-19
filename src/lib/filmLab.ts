import { isLax, laxGeom, unitsPerYard } from "./fieldUnits";
import { frameMotion, frameScene, isFramed, motionAt } from "./frames";
import { ballAt, buildTimeline, isBall, movesBall, positionsAt, type Timeline } from "./runPlay";
import type { FieldView, PathNode, PlayerNode, Point, Scene } from "./types";

/**
 * Film Lab's pure half: where a drawing stands in field yards, which goal it
 * attacks, and the "make the read" question for a play. Sport-neutral apart
 * from the goal spots, so another Vault can take it with its own goals.
 * The 3D stage (lib/filmLab3d.ts) and the page (pages/FilmLab.tsx) read it.
 */

/** Canvas units per yard; the whiteboard has no scale, so a drill drawn there is read at a typical whiteboard size. */
export const yardScale = (view: FieldView) => unitsPerYard(view) || 22;

/** A goal on the canvas: the middle of its mouth and the unit direction toward midfield. */
export type Goal = { at: Point; out: Point };

/** The goals on screen for a view (one on a half field, two on a full field, none on the whiteboard). */
export function goalsFor(view: FieldView): Goal[] {
  if (!isLax(view)) return [];
  const g = laxGeom(view);
  const mid = (g.width / 2) * g.u;
  const near = g.vertical ? { at: { x: g.x0 + mid, y: g.y0 + g.goal * g.u }, out: { x: 0, y: 1 } } : { at: { x: g.x0 + g.goal * g.u, y: g.y0 + mid }, out: { x: 1, y: 0 } };
  if (g.lengthShown < g.length) return [near];
  const far = g.vertical
    ? { at: { x: g.x0 + mid, y: g.y0 + (g.length - g.goal) * g.u }, out: { x: 0, y: -1 } }
    : { at: { x: g.x0 + (g.length - g.goal) * g.u, y: g.y0 + mid }, out: { x: -1, y: 0 } };
  return [near, far];
}

type Player = PlayerNode;
const people = (scene: Scene) => scene.nodes.filter((n): n is Player => n.kind === "player" && !n.hidden && n.side !== "ball");
const centroid = (ps: Point[]): Point => (ps.length ? { x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length } : { x: 520, y: 330 });

/**
 * The goal the play attacks: the one nearest the offense (or the ball). With
 * no goal on screen (the whiteboard), the play runs up the board, the way
 * coaches draw it.
 */
export function attackGoal(scene: Scene): Goal {
  const s = frameScene(scene);
  const off = people(s).filter((p) => p.side === "offense");
  const c = centroid(off.length ? off : people(s));
  const goals = goalsFor(s.view);
  if (!goals.length) return { at: { x: c.x, y: Math.max(40, c.y - 300) }, out: { x: 0, y: 1 } };
  return goals.reduce((a, b) => (Math.hypot(a.at.x - c.x, a.at.y - c.y) <= Math.hypot(b.at.x - c.x, b.at.y - c.y) ? a : b));
}

/** Where a canvas spot sits, in a coach's words, from the attack's point of view. */
export function spotName(goal: Goal, p: Point, upy: number): string {
  const rel = { x: (p.x - goal.at.x) / upy, y: (p.y - goal.at.y) / upy };
  const along = rel.x * goal.out.x + rel.y * goal.out.y;
  // Facing the goal from the field, the attack's right hand.
  const across = rel.x * goal.out.y - rel.y * goal.out.x;
  if (along < -1) return "behind the cage";
  if (Math.hypot(along, across) < 6.5) return "on the crease";
  if (along < 9) return across < 0 ? "on the left wing" : "on the right wing";
  if (Math.abs(across) < 4) return "up top";
  return across < 0 ? "top left" : "top right";
}

export type ReadOption = { id: string; text: string };
export type Read = {
  /** Seconds into the play where it stops and asks. */
  at: number;
  question: string;
  options: ReadOption[];
  answer: string;
  /** Said once the coach or player answers. */
  why: string;
  /** The player with the ball when it stops: the one whose eyes the read is seen through. */
  passer: string | null;
};

const SHOOT = "shoot";

/**
 * "Make the read": stop the play just before the last pass or shot and ask
 * where the ball goes. The choices are the right one, the two teammates
 * nearest the ball, and Shoot. Null when the play never moves the ball.
 */
export function readFor(saved: Scene, tl: Timeline): Read | null {
  const scene = frameScene(saved);
  const leg = tl.legs[tl.legs.length - 1];
  if (!leg) return null;
  const path = scene.nodes.find((n): n is PathNode => n.kind === "path" && n.id === leg.pathId);
  if (!path || !movesBall(path)) return null;
  const upy = yardScale(scene.view);
  const goal = attackGoal(scene);
  const at = Math.max(0, leg.start - 0.05);
  const before = positionsAt(scene, tl, at);
  const after = positionsAt(scene, tl, leg.end);
  const all = people(scene);
  const passer = all.reduce<Player | null>((best, p) => {
    const q = before.get(p.id) ?? p;
    const d = Math.hypot(q.x - leg.from.x, q.y - leg.from.y);
    return !best || d < Math.hypot((before.get(best.id) ?? best).x - leg.from.x, (before.get(best.id) ?? best).y - leg.from.y) ? p : best;
  }, null);
  const side = passer?.side ?? "offense";
  const mates = all.filter((p) => p.side === side && p.id !== passer?.id);
  const name = (p: Player, where: Map<string, Point>) => `${p.label || "Player"} ${spotName(goal, where.get(p.id) ?? p, upy)}`;
  const shot = path.style !== "dashed";
  let answer = SHOOT;
  let why = "Shoot it. The look was there: the defense never got a stick on the shooter's hands.";
  if (!shot) {
    const catcher = mates.reduce<Player | null>((best, p) => {
      const q = after.get(p.id) ?? p;
      const d = Math.hypot(q.x - leg.to.x, q.y - leg.to.y);
      return !best || d < Math.hypot((after.get(best.id) ?? best).x - leg.to.x, (after.get(best.id) ?? best).y - leg.to.y) ? p : best;
    }, null);
    if (!catcher) return null;
    answer = catcher.id;
    why = `The ball goes to ${name(catcher, after)}. Read where the slide came from: the open man is the one his defender left.`;
  }
  const near = mates
    .filter((p) => p.id !== answer)
    .sort((a, b) => {
      const pa = before.get(a.id) ?? a;
      const pb = before.get(b.id) ?? b;
      return Math.hypot(pa.x - leg.from.x, pa.y - leg.from.y) - Math.hypot(pb.x - leg.from.x, pb.y - leg.from.y);
    })
    .slice(0, 2);
  const byId = new Map(all.map((p) => [p.id, p]));
  const options: ReadOption[] = [
    ...[answer, ...near.map((p) => p.id)].filter((id) => id !== SHOOT).map((id) => ({ id, text: `Pass to ${name(byId.get(id)!, before)}` })),
    { id: SHOOT, text: "Shoot" },
  ];
  // Keep the right answer out of the first spot, in a stable order per play.
  const seed = leg.pathId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const turned = options.slice(0, -1);
  const k = turned.length ? seed % turned.length : 0;
  const order = [...turned.slice(k), ...turned.slice(0, k), options[options.length - 1]];
  return {
    at,
    question: passer ? `You're ${name(passer, before)} with the ball. Where does it go?` : "Where does the ball go?",
    options: order,
    answer,
    why,
    passer: passer?.id ?? null,
  };
}

/** The ball at a moment: where it is on the canvas, and how far through a pass or shot it is when it's in the air. */
export type BallState = { at: Point | null; flight: { from: Point; to: Point; k: number; shot: boolean } | null; holder?: string | null };

/**
 * The whole play over time, one shape for both kinds of drawing: a one-frame
 * play runs its lines step by step (lib/runPlay.ts), a framed play moves frame
 * to frame (lib/frames.ts), as Run play does.
 */
export type Motion = {
  duration: number;
  /** The step (or frame) marks on the clock, for the scrub bar. */
  marks: number[];
  tl: Timeline;
  spots: (t: number) => Map<string, Point>;
  ball: (t: number, spots: Map<string, Point>) => BallState;
  /** True while a framed play shows its frames rather than its lines. */
  framed: boolean;
};

export function motionFor(saved: Scene): Motion {
  const scene = frameScene(saved);
  const tl = buildTimeline(saved);
  if (isFramed(saved)) {
    const fm = frameMotion(saved);
    const ballId = saved.nodes.find((n): n is PlayerNode => n.kind === "player" && isBall(n))?.id ?? null;
    return {
      duration: fm.duration,
      marks: fm.marks.map((m) => m.at),
      tl,
      framed: true,
      spots: (t) => motionAt(saved, fm, t).spots,
      ball: (_t, spots) => ({ at: ballId ? (spots.get(ballId) ?? null) : null, flight: null }),
    };
  }
  const paths = new Map(scene.nodes.filter((n): n is PathNode => n.kind === "path").map((p) => [p.id, p]));
  return {
    duration: tl.duration,
    marks: tl.steps.map((s) => s.start),
    tl,
    framed: false,
    spots: (t) => positionsAt(scene, tl, t),
    ball: (t, spots) => {
      const leg = tl.legs.find((l) => t >= l.start && t < l.end);
      if (leg) {
        const k = (t - leg.start) / (leg.end - leg.start);
        return { at: { x: leg.from.x + (leg.to.x - leg.from.x) * k, y: leg.from.y + (leg.to.y - leg.from.y) * k }, flight: { from: leg.from, to: leg.to, k, shot: paths.get(leg.pathId)?.style !== "dashed" } };
      }
      let hold = tl.holds[0];
      for (const h of tl.holds) if (h.from <= t) hold = h;
      return { at: ballAt(tl, spots, t), flight: null, holder: hold?.playerId ?? null };
    },
  };
}
