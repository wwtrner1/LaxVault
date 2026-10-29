import { BLOCKS, ROUTES } from "./routes";
import { baseNode, CANVAS_W } from "./types";
import type { PathNode, Point } from "./types";

/** Ink color for drawn route lines (palette B base). */
const INK = "#070B0B";

export type Assignment = {
  /** Letter as drawn: Q, C, X, Y, Z, H, S, or an extra such as W or T. */
  player: string;
  kind: "route" | "block" | "motion";
  /** A ROUTE_IDS id for routes, a BLOCK_IDS id for blocks, "motion" for motion. */
  action: string;
  /** Break toward the sideline ("out") or the middle ("in"); default follows the route. */
  toward?: "in" | "out";
  /** Which way the route breaks on the field, when a photo shows it; wins over `toward`. */
  breaks?: "left" | "right";
  firstRead?: boolean;
  /** The words in the call that gave this read, shown on the chip. */
  heard: string;
};

/** Routes a back runs from where he stands; every other route from the backfield releases across the line first. */
const BACKFIELD_ROUTES = ["swing", "screen", "bubble", "wheel", "dive", "sweep", "counter", "reverse", "end_around", "keep", "qb_sneak"];

export function assignmentPath(a: Assignment, from: Point, losY: number, z: number): PathNode {
  const cx = CANVAS_W / 2;
  const segs =
    a.kind === "motion"
      ? ([[0, 26], [from.x > cx ? -180 : 180, 8]] as [number, number][])
      : ((a.kind === "block" ? BLOCKS[a.action] : ROUTES[a.action]) ?? ROUTES.go);
  // Shapes are drawn for a receiver on the right, so a left-side player mirrors them:
  // an out still breaks to his sideline and a slant still breaks to the middle.
  let mirror = from.x < cx;
  const last = [...segs].reverse().find(([dx]) => dx !== 0)?.[0] ?? 0;
  // "toward" only flips a route the call breaks the other way from its usual shape (an "out" slant).
  if (a.kind === "route" && a.toward && last !== 0 && (last > 0 ? "out" : "in") !== a.toward) mirror = !mirror;
  // Flip the shape so its last leg points the way the board shows.
  if (a.breaks && last !== 0) mirror = (last > 0) === (a.breaks === "left");
  const points: Point[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  if (a.kind === "route" && from.y - losY > 40 && !BACKFIELD_ROUTES.includes(a.action)) {
    x = mirror ? -80 : 80;
    y = losY - from.y - 12;
    points.push({ x, y });
  }
  for (const [dx, dy] of segs) {
    x += a.kind === "motion" ? dx : mirror ? -dx : dx;
    y += dy;
    // Routes stop at the sideline rather than running off the field.
    const p = { x: Math.min(CANVAS_W - 16 - from.x, Math.max(16 - from.x, x)), y };
    // A leg the sideline squeezed to nothing would hide the route's end, so it's dropped.
    const prev = points[points.length - 1];
    if (Math.hypot(p.x - prev.x, p.y - prev.y) >= 8) points.push(p);
  }
  // Every route ends on a leg long enough to show its arrow or block mark; one cut short
  // at the sideline finishes upfield along it instead.
  if (points.length < 2) points.push({ x: 0, y: a.kind === "block" ? -44 : -60 });
  const end = points[points.length - 1];
  const before = points[points.length - 2];
  if (Math.hypot(end.x - before.x, end.y - before.y) < 26) points[points.length - 1] = { x: end.x, y: before.y - 30 };
  return {
    ...baseNode({ x: from.x, y: from.y, z, name: a.kind === "block" ? "Block" : a.kind === "motion" ? "Motion" : "Route" }),
    kind: "path",
    points,
    handles: {},
    style: a.kind === "motion" ? "motion" : "solid",
    curve: ["wheel", "sweep", "counter", "bubble"].includes(a.action) ? "spline" : "straight",
    startCap: "none",
    endCap: a.kind === "block" && a.action !== "chip" ? "tee" : "arrow",
    stroke: INK,
    width: 3,
    closed: false,
    fill: "none",
    fillOpacity: 0,
    fromId: null,
    toId: null,
    firstRead: a.kind === "route" && a.firstRead ? true : undefined,
  };
}
