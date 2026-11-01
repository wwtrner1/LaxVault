import { toWorld } from "./geometry";
import { reconcileConnections } from "./scene";
import type { Frame, PathNode, PlayerNode, Point, Scene, SceneNode } from "./types";
import { CANVAS_W, uid } from "./types";

/*
 * Multi-frame plays: a set taught in phases ("1: entry", "2: skip to X",
 * "3: shot"). Pure and sport-neutral, so Hoops Vault and GridIronVault can
 * take this file as is.
 *
 * Saved shape (Scene.frames):
 *   - scene.nodes hold every element. A player's x/y is where he stands in
 *     frame 1, so anything that doesn't know about frames (old exports, the
 *     server) still draws a sensible frame 1.
 *   - frames[i].at holds the spots of players who stand somewhere else in
 *     frame i than in frame i-1. A player who isn't listed stays put, so moving
 *     him in frame 1 carries into every frame where he hasn't moved.
 *   - a line, label or shape with `frame` set is drawn only in that frame;
 *     without it, in every frame. Players are in every frame.
 *
 * The Designer edits one frame at a time through a "view" (openFrame): only
 * that frame's elements, players at that frame's spots, with the rest kept
 * on the scene in Designer-only fields so undo and redo hold the whole play.
 * settle() turns a view back into the saved shape.
 */

export const FRAME_LIMIT = 12;

/** Field pixels a player covers per second when frames play (a jog, so a coach can talk over it). */
const RUN_SPEED = 150;
/** A pass travels this much faster than a player. */
const PASS_SPEED = 560;
/** Pause on each frame so its label and lines can be read. */
export const FRAME_HOLD = 0.7;
/** A ball this close to a player is in his stick and goes where he goes. */
const CARRY = 30;
/** A line starting this close to a player is his. */
const OWN = 30;

export const frameCount = (scene: Scene) => Math.max(1, scene.frames?.length ?? 1);
export const isFramed = (scene: Scene) => frameCount(scene) > 1;
export const frameName = (frame: Frame | undefined, i: number) => frame?.label.trim() || `Frame ${i + 1}`;

const players = (nodes: SceneNode[]) => nodes.filter((n): n is PlayerNode => n.kind === "player");
/** The ball, not a cone (both sit on the "ball" side). */
const isBall = (n: PlayerNode) => n.side === "ball" && n.shape !== "triangle";
const near = (a: Point, b: Point, d: number) => Math.hypot(a.x - b.x, a.y - b.y) <= d;
const same = (a: Point, b: Point) => near(a, b, 0.5);

/** Drop the Designer-only fields. */
function strip(scene: Scene): Scene {
  const { frameAt: _a, offFrame: _b, everyFrame: _c, ...rest } = scene;
  return rest;
}

/** Every player's spot in frame k of a saved (settled) scene. */
export function spotsAt(scene: Scene, k: number): Map<string, Point> {
  const at = new Map<string, Point>();
  for (const p of players(scene.nodes)) at.set(p.id, { x: p.x, y: p.y });
  const frames = scene.frames ?? [];
  for (let i = 1; i <= Math.min(k, frames.length - 1); i++)
    for (const [id, spot] of Object.entries(frames[i].at)) if (at.has(id)) at.set(id, spot);
  return at;
}

/** Frame k of a saved scene as an ordinary one-frame scene: for prints, thumbnails and playback. */
export function frameScene(scene: Scene, k = 0): Scene {
  const base = strip(scene);
  if (!isFramed(base)) return base;
  const frame = base.frames![Math.min(k, base.frames!.length - 1)];
  const spots = spotsAt(base, k);
  const nodes = base.nodes
    .filter((n) => n.kind === "player" || !n.frame || n.frame === frame.id)
    .map((n) => {
      const s = n.kind === "player" ? spots.get(n.id) : undefined;
      return s ? { ...n, x: s.x, y: s.y } : n;
    });
  const { frames: _f, ...rest } = base;
  return reconcileConnections({ ...rest, nodes });
}

/** Every frame of a play as its own diagram, named "Play · 2/3 Entry"; a one-frame play comes back as it is. */
export function expandFrames<T extends { name: string; description: string; scene: Scene }>(plays: T[]): T[] {
  return plays.flatMap((play) => {
    const n = frameCount(play.scene);
    if (n < 2) return [{ ...play, scene: frameScene(play.scene) }];
    return play.scene.frames!.map((f, i) => ({
      ...play,
      name: `${play.name || "Untitled play"} · ${i + 1}/${n}${f.label.trim() ? ` ${f.label.trim()}` : ""}`,
      description: [f.note?.trim(), i === 0 ? play.description : ""].filter(Boolean).join("\n\n"),
      scene: frameScene(play.scene, i),
    }));
  });
}

/* ---------------------------------------------------------- Designer views */

/** Open frame k of a saved scene for editing. A one-frame play opens as it is. */
export function openFrame(saved: Scene, k = 0): Scene {
  const scene = strip(saved);
  if (!isFramed(scene)) return scene;
  const frames = scene.frames!;
  const at = Math.max(0, Math.min(k, frames.length - 1));
  const frame = frames[at];
  const spots = spotsAt(scene, at);
  const shown: SceneNode[] = [];
  const offFrame: SceneNode[] = [];
  const everyFrame: string[] = [];
  for (const n of scene.nodes) {
    if (n.kind === "player") {
      const s = spots.get(n.id)!;
      shown.push({ ...n, x: s.x, y: s.y });
    } else if (!n.frame) {
      everyFrame.push(n.id);
      shown.push(n);
    } else if (n.frame === frame.id) shown.push(n);
    else offFrame.push(n);
  }
  // The open frame's spots live on the players; frame 1's are parked in frames[0].at meanwhile.
  const base: Record<string, Point> = {};
  if (at > 0) for (const p of players(scene.nodes)) base[p.id] = { x: p.x, y: p.y };
  const parked = frames.map((f, i) => (i === 0 ? { ...f, at: base } : i === at ? { ...f, at: {} } : f));
  return reconcileConnections({ ...scene, nodes: shown, frames: parked, frameAt: at, offFrame, everyFrame });
}

/** The saved shape of a Designer view. Safe on a scene that isn't a view. */
export function settle(view: Scene): Scene {
  if (view.frameAt === undefined || !view.frames?.length) return tidy(strip(view));
  const k = view.frameAt;
  const frames = view.frames.map((f) => ({ ...f, at: { ...f.at } }));
  const frame = frames[k];
  const every = new Set(view.everyFrame ?? []);
  const shown = view.nodes.map((n): SceneNode => {
    if (n.kind === "player") return n.frame ? { ...n, frame: undefined } : n;
    // Anything on the field that wasn't shown in every frame belongs to this one (new, pasted or duplicated).
    const tag = every.has(n.id) ? undefined : frame.id;
    return n.frame === tag ? n : { ...n, frame: tag };
  });
  let nodes: SceneNode[];
  if (k === 0) nodes = shown;
  else {
    const base = frames[0].at;
    // Frame 1 spots back on the players; a player added in a later frame starts there in frame 1 too.
    nodes = shown.map((n) => (n.kind === "player" && base[n.id] ? { ...n, ...base[n.id] } : n));
    frames[0].at = {};
    frames[k].at = {};
    const before = spotsAt({ ...view, nodes, frames }, k - 1);
    for (const p of players(shown)) {
      const was = before.get(p.id);
      if (!was || !same(was, p)) frames[k].at[p.id] = { x: p.x, y: p.y };
    }
  }
  return tidy(strip({ ...view, nodes: [...nodes, ...(view.offFrame ?? [])], frames }));
}

/** A play left with one frame is an ordinary play again; spots of players who are gone are dropped. */
function tidy(scene: Scene): Scene {
  if (!scene.frames) return scene;
  if (scene.frames.length < 2) {
    const { frames: _f, ...rest } = scene;
    return { ...rest, nodes: scene.nodes.map((n) => (n.frame ? { ...n, frame: undefined } : n)) };
  }
  const ids = new Set(players(scene.nodes).map((p) => p.id));
  const frames = scene.frames.map((f) => ({
    ...f,
    at: Object.fromEntries(Object.entries(f.at).filter(([id]) => ids.has(id))),
  }));
  return { ...scene, frames };
}

/** Go to frame j from a view. */
export const goFrame = (view: Scene, j: number) => openFrame(settle(view), j);

/** Rename or annotate the open frame. */
export function patchFrame(view: Scene, patch: Partial<Pick<Frame, "label" | "note">>): Scene {
  if (view.frameAt === undefined || !view.frames) return view;
  return { ...view, frames: view.frames.map((f, i) => (i === view.frameAt ? { ...f, ...patch } : f)) };
}

/**
 * Add a frame after the open one. Players run to the end of their cuts and
 * dodges, the ball follows its pass or its carrier, and the new frame starts
 * with no lines so the next phase can be drawn. Turning a one-frame play into
 * frames gives its lines to frame 1; labels and zones stay in every frame.
 */
export function addFrame(view: Scene): Scene | { error: string } {
  let saved = settle(view);
  const k = view.frameAt ?? 0;
  if (frameCount(saved) >= FRAME_LIMIT) return { error: `A play holds up to ${FRAME_LIMIT} frames.` };
  if (!isFramed(saved)) {
    const first: Frame = { id: uid("fr"), label: "", at: {} };
    saved = {
      ...saved,
      frames: [first],
      nodes: saved.nodes.map((n) => (n.kind === "path" && !n.closed ? { ...n, frame: first.id } : n)),
    };
  }
  const list = framesWithSpots(saved);
  const spots = new Map(list[k].spots);
  for (const [id, p] of Object.entries(advance(saved, k))) spots.set(id, p);
  // Rebuilt from full spot lists, so the frames after the new one look exactly as they did.
  list.splice(k + 1, 0, { frame: { id: uid("fr"), label: "", at: {} }, spots });
  return openFrame(rebuild(saved, list), k + 1);
}

const framesWithSpots = (saved: Scene) => saved.frames!.map((frame, i) => ({ frame, spots: spotsAt(saved, i) }));

/** Copy the open frame: same spots, same lines (new ids), placed right after it. */
export function duplicateFrame(view: Scene): Scene | { error: string } {
  const saved = settle(view);
  const k = view.frameAt ?? 0;
  if (!isFramed(saved)) return addFrame(view);
  if (frameCount(saved) >= FRAME_LIMIT) return { error: `A play holds up to ${FRAME_LIMIT} frames.` };
  const src = saved.frames![k];
  const copy: Frame = { id: uid("fr"), label: src.label ? `${src.label} (copy)` : "", note: src.note, at: {} };
  const groups = new Map<string, string>();
  const lines = saved.nodes
    .filter((n) => n.frame === src.id)
    .map((n) => {
      const groupId = n.groupId ? (groups.get(n.groupId) ?? groups.set(n.groupId, uid("g")).get(n.groupId)!) : null;
      return { ...n, id: uid(), groupId, frame: copy.id };
    });
  const list = framesWithSpots(saved);
  list.splice(k + 1, 0, { frame: copy, spots: list[k].spots });
  return openFrame(rebuild({ ...saved, nodes: [...saved.nodes, ...lines] }, list), k + 1);
}

/** Delete the open frame and its lines. Players keep the spots they had in the frame after it. */
export function deleteFrame(view: Scene): Scene {
  const saved = settle(view);
  const k = view.frameAt ?? 0;
  if (!isFramed(saved)) return view;
  const frames = saved.frames!;
  const gone = frames[k];
  let nodes = saved.nodes.filter((n) => n.frame !== gone.id);
  let rest: Frame[];
  if (k === 0) {
    // Frame 2 becomes frame 1: its spots go onto the players.
    const spots = spotsAt(saved, 1);
    nodes = nodes.map((n) => (n.kind === "player" ? { ...n, ...spots.get(n.id)! } : n));
    rest = [{ ...frames[1], at: {} }, ...frames.slice(2)];
  } else {
    rest = frames.filter((_, i) => i !== k);
    // The next frame inherited from the deleted one; give it those spots so it looks the same.
    if (k < frames.length - 1) rest[k] = { ...rest[k], at: { ...gone.at, ...rest[k].at } };
  }
  return openFrame({ ...saved, nodes, frames: rest }, Math.max(0, k - 1));
}

/** Move the open frame one place earlier (-1) or later (+1). Spots are recomputed so every frame looks as it did. */
export function moveFrame(view: Scene, dir: -1 | 1): Scene {
  const saved = settle(view);
  const k = view.frameAt ?? 0;
  const j = k + dir;
  if (!isFramed(saved) || j < 0 || j >= frameCount(saved)) return view;
  const list = framesWithSpots(saved);
  [list[k], list[j]] = [list[j], list[k]];
  return openFrame(rebuild(saved, list), j);
}

/** A saved scene from frames in a new order, each with its full spot list. */
function rebuild(scene: Scene, list: { frame: Frame; spots: Map<string, Point> }[]): Scene {
  const first = list[0].spots;
  const nodes = scene.nodes.map((n) => (n.kind === "player" && first.get(n.id) ? { ...n, ...first.get(n.id)! } : n));
  const frames = list.map(({ frame, spots }, i) => {
    const at: Record<string, Point> = {};
    if (i > 0) for (const [id, s] of spots) if (!same(s, list[i - 1].spots.get(id) ?? s)) at[id] = s;
    return { ...frame, at };
  });
  return { ...scene, nodes, frames };
}

/** In a view: show the picked elements in every frame (true) or only in the open one (false). */
export function setEveryFrame(view: Scene, ids: string[], every: boolean): Scene {
  if (view.frameAt === undefined) return view;
  const set = new Set(view.everyFrame ?? []);
  for (const id of ids) {
    const n = view.nodes.find((x) => x.id === id);
    if (!n || n.kind === "player") continue;
    if (every) set.add(id);
    else set.delete(id);
  }
  return { ...view, everyFrame: [...set] };
}

/** Where everyone stands at the end of frame k's lines: the starting spots of frame k + 1. */
export function advance(scene: Scene, k: number): Record<string, Point> {
  const step = stepTracks(scene, k, true);
  const out: Record<string, Point> = {};
  for (const t of step) out[t.playerId] = t.pts[t.pts.length - 1];
  return out;
}

/** Mirror every frame's spots left to right (Flip and save as a new play). */
export function mirrorFrames(frames: Frame[] | undefined): Frame[] | undefined {
  return frames?.map((f) => ({
    ...f,
    at: Object.fromEntries(Object.entries(f.at).map(([id, p]) => [id, { x: CANVAS_W - p.x, y: p.y }])),
  }));
}

/* --------------------------------------------------------------- playback */

export type FrameTrack = { playerId: string; pts: Point[]; lengths: number[]; total: number; delay: number; speed: number };
export type FrameMotion = {
  /** Seconds from frame 1 to the end of the last frame. */
  duration: number;
  /** When each frame is reached (its hold starts). */
  marks: { at: number; frame: number; label: string }[];
  steps: { start: number; length: number; tracks: FrameTrack[] }[];
};

const worldPoints = (path: PathNode): Point[] => path.points.map((p) => toWorld(path, p));
const isPass = (p: PathNode) => p.style === "dashed";

function track(playerId: string, pts: Point[], speed: number, delay = 0): FrameTrack {
  const lengths = pts.slice(1).map((q, i) => Math.hypot(q.x - pts[i].x, q.y - pts[i].y));
  return { playerId, pts, lengths, total: lengths.reduce((a, b) => a + b, 0), delay, speed };
}
const ends = (t: FrameTrack) => t.delay + t.total / t.speed;

/**
 * How everyone moves from frame k to frame k + 1. With `guess`, frame k + 1
 * doesn't exist yet and the ends of the lines say where people finish
 * (addFrame); otherwise the lines are the paths and frame k + 1's spots are
 * where they finish.
 */
function stepTracks(scene: Scene, k: number, guess: boolean): FrameTrack[] {
  const from = spotsAt(scene, k);
  const to = guess ? null : spotsAt(scene, k + 1);
  const frameId = scene.frames?.[k]?.id;
  const people = players(scene.nodes).filter((p) => !p.hidden);
  const lines = scene.nodes.filter(
    (n): n is PathNode =>
      n.kind === "path" && !n.hidden && !n.closed && n.points.length > 1 && (!frameId || !n.frame || n.frame === frameId),
  );
  const tracks = new Map<string, FrameTrack>();
  const start = (p: PlayerNode) => from.get(p.id)!;

  // Players without the ball: cuts, dodges, picks.
  for (const line of lines) {
    if (isPass(line)) continue;
    const pts = worldPoints(line);
    const owner =
      people.find((p) => !isBall(p) && (p.id === line.assignOf || p.id === line.fromId)) ??
      people.find((p) => !isBall(p) && p.side !== "ball" && near(start(p), pts[0], OWN));
    if (!owner || tracks.has(owner.id)) continue;
    pts[0] = start(owner);
    const end = to?.get(owner.id) ?? pts[pts.length - 1];
    if (same(end, pts[0])) continue;
    if (near(pts[pts.length - 1], end, 6)) pts[pts.length - 1] = end;
    else pts.push(end);
    tracks.set(owner.id, track(owner.id, pts, RUN_SPEED));
  }
  // Anyone dragged to a new spot with no line runs straight there.
  if (to)
    for (const p of people) {
      if (tracks.has(p.id) || isBall(p)) continue;
      const a = start(p);
      const b = to.get(p.id)!;
      if (!same(a, b)) tracks.set(p.id, track(p.id, [a, b], RUN_SPEED));
    }

  // The ball: along a pass that starts at it or at its carrier, else with its carrier, else straight.
  for (const ball of people.filter(isBall)) {
    const a = start(ball);
    const carrier = people.find((p) => !isBall(p) && p.side !== "ball" && near(start(p), a, CARRY));
    const pass = lines.find((l) => {
      if (!isPass(l)) return false;
      const s = worldPoints(l)[0];
      return near(s, a, OWN + 6) || (!!carrier && (l.fromId === carrier.id || near(s, start(carrier), OWN)));
    });
    if (pass) {
      const pts = worldPoints(pass);
      pts[0] = a;
      const target = pass.toId ? people.find((p) => p.id === pass.toId) : people.find((p) => !isBall(p) && p.id !== carrier?.id && near(start(p), pts[pts.length - 1], OWN + 10));
      // The pass meets the receiver where he finishes his cut, stick side.
      const meet = target ? (tracks.get(target.id)?.pts.at(-1) ?? start(target)) : null;
      const end = to?.get(ball.id) ?? (meet ? { x: meet.x + 10, y: meet.y - 10 } : pts[pts.length - 1]);
      if (to && same(end, a)) continue;
      pts[pts.length - 1] = end;
      const t = track(ball.id, pts, PASS_SPEED);
      // Thrown so it arrives as the receiver gets there.
      const catcher = target && tracks.get(target.id);
      t.delay = catcher ? Math.max(0, ends(catcher) - t.total / t.speed) : 0;
      tracks.set(ball.id, t);
      continue;
    }
    const ride = carrier && tracks.get(carrier.id);
    const b = to?.get(ball.id);
    if (ride) {
      const dx = a.x - ride.pts[0].x;
      const dy = a.y - ride.pts[0].y;
      const pts = ride.pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      if (b) pts[pts.length - 1] = b;
      if (!b || !same(b, a)) tracks.set(ball.id, track(ball.id, pts, ride.speed, ride.delay));
      continue;
    }
    if (b && !same(a, b)) tracks.set(ball.id, track(ball.id, [a, b], PASS_SPEED));
  }
  return [...tracks.values()];
}

/** The whole play in motion: a hold on each frame, then everyone moves to the next. */
export function frameMotion(saved: Scene): FrameMotion {
  const scene = strip(saved);
  const n = frameCount(scene);
  const marks: FrameMotion["marks"] = [];
  const steps: FrameMotion["steps"] = [];
  let t = 0;
  for (let k = 0; k < n; k++) {
    marks.push({ at: t, frame: k, label: String(k + 1) });
    t += FRAME_HOLD;
    if (k === n - 1) break;
    const tracks = stepTracks(scene, k, false);
    const length = Math.max(0.8, ...tracks.map(ends));
    steps.push({ start: t, length, tracks });
    t += length;
  }
  return { duration: t, marks, steps };
}

function trackAt(tr: FrameTrack, t: number): Point {
  let d = Math.max(0, Math.min(tr.total, (t - tr.delay) * tr.speed));
  for (let i = 0; i < tr.lengths.length; i++) {
    const len = tr.lengths[i];
    if (d <= len || i === tr.lengths.length - 1) {
      const f = len ? Math.min(1, d / len) : 1;
      const a = tr.pts[i];
      const b = tr.pts[i + 1];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    d -= len;
  }
  return tr.pts[tr.pts.length - 1];
}

/** Which frame is on screen at time t and where every player is. */
export function motionAt(saved: Scene, motion: FrameMotion, t: number): { frame: number; spots: Map<string, Point> } {
  const scene = strip(saved);
  let frame = 0;
  for (const m of motion.marks) if (t >= m.at) frame = m.frame;
  const spots = spotsAt(scene, frame);
  const step = motion.steps[frame];
  if (step && t > step.start) for (const tr of step.tracks) spots.set(tr.playerId, trackAt(tr, t - step.start));
  return { frame, spots };
}
