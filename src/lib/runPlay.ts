import { frameScene } from "./frames";
import { unitsPerYard } from "./fieldUnits";
import { toWorld } from "./geometry";
import type { PathNode, PlayerNode, Point, Scene } from "./types";

/**
 * Run play: the drawing runs step by step. Every line belongs to a step
 * (PathNode.step, or worked out from the drawing: a line that starts where an
 * earlier line ends goes after it). In each step the players run their cuts,
 * dodges and picks together, then the ball (a pass or shot line, dashed by
 * default) flies so it lands as the cutters arrive, and whoever is nearest
 * where it lands carries it into the next step. Running never changes the scene.
 */

/** Most steps a play can have. */
export const MAX_STEPS = 8;
/** A line starting this close (canvas units) to a player or a line's end belongs to it. */
const NEAR = 30;
/** A player within this distance of where a pass lands catches it. */
const CATCH = 60;
/** Breath between steps, seconds. */
const PAUSE = 0.3;
/** Teaching pace: players at about 6 yards a second, the ball at about 22. */
const RUN_YPS = 6;
const BALL_YPS = 22;

export type Track = { playerId: string; pathId: string; step: number; pts: Point[]; lengths: number[]; total: number; delay: number; speed: number };
export type BallLeg = { pathId: string; step: number; from: Point; to: Point; start: number; end: number };
/** Who holds the ball from `from` seconds on; null = it lies at `spot`. */
type Hold = { from: number; playerId: string | null; offset: Point; spot: Point };
export type StepSpan = { n: number; start: number; end: number };
export type Timeline = {
  tracks: Track[];
  legs: BallLeg[];
  holds: Hold[];
  steps: StepSpan[];
  /** The step each line runs in. */
  stepOf: Map<string, number>;
  /** The ball token, when the drawing has one. */
  ballId: string | null;
  duration: number;
};

const worldPoints = (path: PathNode): Point[] => path.points.map((p) => toWorld(path, p));
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** The ball token: a "ball" side token that isn't a cone. */
export const isBall = (n: PlayerNode) => n.side === "ball" && n.shape !== "triangle";

/** Does this line move the ball (pass or shot) rather than a player? */
export const movesBall = (p: PathNode) => (p.moves ? p.moves === "ball" : p.style === "dashed");

const runnable = (scene: Scene) => scene.nodes.filter((n): n is PathNode => n.kind === "path" && !n.hidden && !n.closed && n.points.length > 1);

/**
 * The step each line runs in. A line with its own step keeps it; any other
 * line goes one step after the latest earlier-drawn line that ends where it
 * starts, so dodge-then-shoot or pass-then-shoot plays in order with no setup.
 */
export function lineSteps(scene: Scene): Map<string, number> {
  const paths = runnable(scene);
  const out = new Map<string, number>();
  paths.forEach((p, i) => {
    if (p.step) return void out.set(p.id, Math.min(MAX_STEPS, Math.max(1, Math.round(p.step))));
    const start = worldPoints(p)[0];
    let s = 1;
    for (let j = 0; j < i; j++) {
      const q = paths[j];
      const qp = worldPoints(q);
      if (dist(start, qp[qp.length - 1]) < NEAR) s = Math.max(s, (out.get(q.id) ?? 1) + 1);
    }
    out.set(p.id, Math.min(MAX_STEPS, s));
  });
  return out;
}

/** How many steps the drawing has (1 when nothing is drawn). */
export const stepCount = (scene: Scene) => Math.max(1, ...lineSteps(scene).values());

function nearest(p: Point, players: PlayerNode[], pos: Map<string, Point>, within: number): PlayerNode | undefined {
  let best: PlayerNode | undefined;
  let d = within;
  for (const m of players) {
    const q = pos.get(m.id) ?? m;
    const e = dist(p, q);
    if (e < d) (d = e), (best = m);
  }
  return best;
}

export function buildTimeline(saved: Scene): Timeline {
  // A multi-frame play runs its first frame here; RunPlay steps through every frame (lib/frames.ts).
  const scene = frameScene(saved);
  const players = scene.nodes.filter((n): n is PlayerNode => n.kind === "player" && !n.hidden);
  const ball = players.find(isBall) ?? null;
  const movers = players.filter((p) => p.side !== "ball");
  const upy = unitsPerYard(scene.view) || 9;
  const run = RUN_YPS * upy;
  const fly = BALL_YPS * upy;
  const stepOf = lineSteps(scene);
  const paths = runnable(scene);
  const pos = new Map<string, Point>(movers.map((p) => [p.id, { x: p.x, y: p.y }]));

  const tracks: Track[] = [];
  const legs: BallLeg[] = [];
  const holds: Hold[] = [];
  const steps: StepSpan[] = [];
  let holder: string | null = null;
  let offset: Point = { x: 0, y: 0 };
  let spot: Point = ball ? { x: ball.x, y: ball.y } : { x: 0, y: 0 };
  if (ball) {
    const c = nearest(ball, movers, pos, 45);
    if (c) (holder = c.id), (offset = { x: ball.x - c.x, y: ball.y - c.y });
  }
  holds.push({ from: 0, playerId: holder, offset, spot });

  let t = 0;
  for (let n = 1; n <= MAX_STEPS; n++) {
    const lines = paths.filter((p) => stepOf.get(p.id) === n);
    if (!lines.length) continue;
    const start = t;
    let end = start + 0.4;
    const mine: Track[] = [];
    for (const path of lines) {
      if (movesBall(path)) continue;
      const pts = worldPoints(path);
      const id = path.assignOf ?? path.fromId;
      const who = (id ? movers.find((m) => m.id === id) : undefined) ?? nearest(pts[0], movers, pos, NEAR);
      if (!who || mine.some((k) => k.playerId === who.id)) continue;
      pts[0] = { ...(pos.get(who.id) ?? who) };
      const lengths = pts.slice(1).map((q, i) => dist(q, pts[i]));
      const total = lengths.reduce((a, b) => a + b, 0);
      if (total < 4) continue;
      mine.push({ playerId: who.id, pathId: path.id, step: n, pts, lengths, total, delay: start, speed: run });
      end = Math.max(end, start + total / run);
    }
    tracks.push(...mine);
    const where = (id: string, time: number): Point => {
      const k = mine.find((x) => x.playerId === id);
      return k ? trackAt(k, time) : (pos.get(id) ?? { x: 0, y: 0 });
    };

    // The ball moves last, timed to land as the runners finish.
    const passes = lines.filter(movesBall).map((p) => ({ path: p, pts: worldPoints(p) }));
    const flights = passes.map(({ pts }) => Math.min(1.2, Math.max(0.35, dist(pts[0], pts[pts.length - 1]) / fly)));
    let at = Math.max(start, end - flights.reduce((a, b) => a + b, 0));
    passes.forEach(({ path, pts }, i) => {
      const now = holder ? { x: where(holder, at).x + offset.x, y: where(holder, at).y + offset.y } : spot;
      const from = dist(now, pts[0]) < NEAR * 2 ? now : pts[0];
      const to = pts[pts.length - 1];
      const done = at + flights[i];
      legs.push({ pathId: path.id, step: n, from, to, start: at, end: done });
      // A pass (dashed) goes to the passer's nearest teammate; a shot (a solid ball line) stays where it lands.
      const side = movers.find((m) => m.id === holder)?.side;
      const mates = path.style === "dashed" ? movers.filter((m) => m.id !== holder && (!side || m.side === side)) : [];
      const catcher = nearest(to, mates, new Map(mates.map((m) => [m.id, where(m.id, done)])), CATCH);
      if (catcher) {
        const c = where(catcher.id, done);
        const off = { x: to.x - c.x, y: to.y - c.y };
        const len = Math.hypot(off.x, off.y);
        holder = catcher.id;
        offset = len > 9 ? { x: (off.x / len) * 9, y: (off.y / len) * 9 } : off;
      } else {
        holder = null;
        spot = to;
      }
      holds.push({ from: done, playerId: holder, offset, spot });
      at = done;
      end = Math.max(end, done);
    });

    steps.push({ n, start, end });
    for (const k of mine) pos.set(k.playerId, k.pts[k.pts.length - 1]);
    t = end + PAUSE;
  }
  const last = steps[steps.length - 1];
  return { tracks, legs, holds, steps, stepOf, ballId: ball?.id ?? null, duration: Math.max(2, (last?.end ?? 0) + 0.4) };
}

/** Where a track's player is at time t. */
export function trackAt(track: Track, t: number): Point {
  let d = Math.max(0, Math.min(track.total, (t - track.delay) * track.speed));
  for (let i = 0; i < track.lengths.length; i++) {
    const len = track.lengths[i];
    if (d <= len || i === track.lengths.length - 1) {
      const k = len ? Math.min(1, d / len) : 1;
      const a = track.pts[i];
      const b = track.pts[i + 1];
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    d -= len;
  }
  return track.pts[track.pts.length - 1];
}

/** Every player's spot at time t; a player runs his latest started line, or stands where he was drawn. */
export function positionsAt(scene: Scene, tl: Timeline, t: number): Map<string, Point> {
  const at = new Map<string, Point>();
  for (const n of scene.nodes) if (n.kind === "player") at.set(n.id, { x: n.x, y: n.y });
  for (const track of tl.tracks) if (track.delay <= t) at.set(track.playerId, trackAt(track, t));
  return at;
}

/** The ball at time t: in flight on a pass, in a stick, or lying where it landed. Null when the drawing has no ball and none is in the air. */
export function ballAt(tl: Timeline, at: Map<string, Point>, t: number): Point | null {
  const leg = tl.legs.find((l) => t >= l.start && t < l.end);
  if (leg) {
    const k = (t - leg.start) / (leg.end - leg.start);
    const lift = Math.min(28, dist(leg.from, leg.to) * 0.12);
    return { x: leg.from.x + (leg.to.x - leg.from.x) * k, y: leg.from.y + (leg.to.y - leg.from.y) * k - Math.sin(Math.PI * k) * lift };
  }
  if (!tl.ballId) return null;
  let hold = tl.holds[0];
  for (const h of tl.holds) if (h.from <= t) hold = h;
  if (!hold) return null;
  if (!hold.playerId) return hold.spot;
  const p = at.get(hold.playerId);
  return p ? { x: p.x + hold.offset.x, y: p.y + hold.offset.y } : hold.spot;
}

/** The step running at time t (the last one once the play is over). */
export function stepAt(tl: Timeline, t: number): number {
  let n = tl.steps[0]?.n ?? 1;
  for (const s of tl.steps) if (s.start <= t + 1e-6) n = s.n;
  return n;
}

/** A Hudl or YouTube link opened at a given second. */
export function linkAt(link: string, seconds: number): string {
  try {
    const u = new URL(link);
    const s = Math.max(0, Math.floor(seconds));
    if (/youtube\.com|youtu\.be/.test(u.hostname)) u.searchParams.set("t", `${s}s`);
    return u.toString();
  } catch {
    return link;
  }
}

export const isFilmLink = (s: string) => /^https:\/\/([a-z0-9-]+\.)*(hudl\.com|youtube\.com|youtu\.be)\//i.test(s.trim());

/** "1:23", "83" or "83s" as seconds; null when it isn't a time. */
export function parseClock(text: string): number | null {
  const t = text.trim().replace(/s$/i, "");
  const m = /^(?:(\d{1,3}):)?(\d{1,2}(?:\.\d)?)$/.exec(t) ?? (/^(\d{1,5}(?:\.\d)?)$/.test(t) ? [t, undefined, t] : null);
  if (!m) return null;
  return (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]);
}

/** Seconds as "m:ss". */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** The YouTube video id in a link, for the embedded player; null for Hudl or anything else. */
export function youtubeId(link: string): string | null {
  try {
    const u = new URL(link);
    if (u.hostname === "youtu.be") return /^[\w-]{6,20}$/.test(u.pathname.slice(1)) ? u.pathname.slice(1) : null;
    if (!/(^|\.)youtube\.com$/.test(u.hostname)) return null;
    const id = u.searchParams.get("v") ?? /^\/(?:embed|shorts|live)\/([\w-]{6,20})/.exec(u.pathname)?.[1] ?? null;
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** A start time carried in a YouTube link (?t=83, ?t=1m23s, &start=83), in seconds. */
export function linkStart(link: string): number {
  try {
    const t = new URL(link).searchParams.get("t") ?? new URL(link).searchParams.get("start") ?? "";
    const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t);
    return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
  } catch {
    return 0;
  }
}

/** The privacy-enhanced YouTube player for a link, starting at a second. */
export const youtubeEmbed = (id: string, start = 0) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${start > 0 ? `&start=${Math.floor(start)}` : ""}`;
