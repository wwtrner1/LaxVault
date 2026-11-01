import { laxAt, laxGeom, unitsPerYard } from "./fieldUnits";
import { LAX_DEFENSE, LAX_OFFENSE, makePlayer, type TokenPreset } from "./presets";
import { nextZ } from "./scene";
import { uid } from "./types";
import type { PlayerNode, Scene } from "./types";

/**
 * Lacrosse sets (Designer → Sets): a whole six-man offense or a defense in one
 * tap, placed around the near goal of the men's field. Spots are in yards from
 * the goal line (`d`, positive toward midfield, negative behind the cage) and
 * from the middle of the field (`x`). Letters are a starting point: coaches
 * swap A and M to match who they put where.
 */
type Spot = { code: string; d: number; x: number; name: string };
export type LaxSet = { id: string; name: string; side: "offense" | "defense"; hint: string; spots: Spot[] };

const O = (code: string, d: number, x: number, name: string): Spot => ({ code, d, x, name });

export const OFFENSE_SETS: LaxSet[] = [
  {
    id: "o-231",
    name: "2-3-1",
    side: "offense",
    hint: "Two up top, two wings and a crease, one at X. The base set most teams run motion from.",
    spots: [O("M", 16, -9, "Top left"), O("M", 16, 9, "Top right"), O("M", 6, -15, "Left wing"), O("A", 5, 0, "Crease"), O("A", 6, 15, "Right wing"), O("A", -8, 0, "X")],
  },
  {
    id: "o-141",
    name: "1-4-1",
    side: "offense",
    hint: "One at the top, two wings, two on the crease, one at X. Opens the middle for a top dodger.",
    spots: [O("M", 17, 0, "Top"), O("M", 6, -15, "Left wing"), O("A", 5, -5, "Left crease"), O("A", 5, 5, "Right crease"), O("M", 6, 15, "Right wing"), O("A", -8, 0, "X")],
  },
  {
    id: "o-222",
    name: "2-2-2",
    side: "offense",
    hint: "Two up top, two on the crease, two behind the cage. Good for picks behind and inside.",
    spots: [O("M", 16, -9, "Top left"), O("M", 16, 9, "Top right"), O("M", 5, -5, "Left crease"), O("A", 5, 5, "Right crease"), O("A", -7, -9, "Left behind"), O("A", -7, 9, "Right behind")],
  },
  {
    id: "o-132",
    name: "1-3-2",
    side: "offense",
    hint: "One up top, two wings and a crease, two behind. Two feeders from behind the cage.",
    spots: [O("M", 17, 0, "Top"), O("M", 6, -15, "Left wing"), O("M", 5, 0, "Crease"), O("A", 6, 15, "Right wing"), O("A", -7, -9, "Left behind"), O("A", -7, 9, "Right behind")],
  },
  {
    id: "o-33",
    name: "Man-up 3-3",
    side: "offense",
    hint: "Extra-man offense: three shooters up top, two on the pipes and one on the crease.",
    spots: [O("M", 14, -12, "Top left"), O("M", 15, 0, "Top middle"), O("M", 14, 12, "Top right"), O("A", 2, -9, "Left pipe"), O("A", 5, 0, "Crease"), O("A", 2, 9, "Right pipe")],
  },
];

const GOALIE = O("DG", 1, 0, "Goalie");

export const DEFENSE_SETS: LaxSet[] = [
  {
    id: "d-man",
    name: "Man to man",
    side: "defense",
    hint: "One defender goal side of every offensive player on the field, plus the goalie. Drop an offense first.",
    spots: [],
  },
  {
    id: "d-box",
    name: "Man-down box",
    side: "defense",
    hint: "Five defenders and the goalie against six: a box around the crease with one man inside.",
    spots: [GOALIE, O("DM", 11, -7, "Top left"), O("DL", 11, 7, "Top right"), O("DD", 2.5, -7, "Low left"), O("DD", 2.5, 7, "Low right"), O("DD", 6.5, 0, "Crease")],
  },
  {
    id: "d-zone",
    name: "Backer zone",
    side: "defense",
    hint: "A 2-3-1 shaped zone: two up top, three across the crease line, one backer behind the cage.",
    spots: [GOALIE, O("DM", 13, -8, "Top left"), O("DL", 13, 8, "Top right"), O("DD", 5, -12, "Left"), O("DM", 6.5, 0, "Middle"), O("DD", 5, 12, "Right"), O("DD", -5, 0, "Backer")],
  },
];

export const LAX_SETS = [...OFFENSE_SETS, ...DEFENSE_SETS];
/** Set names a play can carry in its details. */
export const LAX_SET_NAMES = [...OFFENSE_SETS.map((s) => s.name), "Man-down", "Clear", "Ride", "Face-off", "Fast break", "Drill"];

const token = (code: string): TokenPreset => [...LAX_OFFENSE, ...LAX_DEFENSE].find((t) => t.code === code) ?? LAX_OFFENSE[0];
/** Where sets sit on a view: its goal line, the middle across, and how much to shrink spots (a box floor is about half a field's width). */
const frame = (view: Scene["view"]) => {
  const g = laxGeom(view);
  return { GOAL: g.goal, MID: g.width / 2, k: g.sport === "box" ? 0.6 : 1 };
};
/** Earlier drops of a side's set carry this group id prefix, so a new set replaces them. */
const prefix = (side: LaxSet["side"]) => (side === "offense" ? "set-o-" : "set-d-");

/** Which defender covers each kind of offensive player. */
const COVER: Record<string, string> = { A: "DD", M: "DM", L: "DL", F: "DM", D: "DM" };

export type SetResult = { scene: Scene; ids: string[]; message: string } | { error: string };

/** Drop a set on the field. It replaces the last set dropped for the same side; other players stay. */
export function dropSet(scene: Scene, set: LaxSet): SetResult {
  const { GOAL, MID, k } = frame(scene.view);
  const groupId = prefix(set.side) + uid();
  const kept = scene.nodes.filter((n) => !(n.kind === "player" && n.groupId?.startsWith(prefix(set.side))));
  let z = nextZ(scene);
  const place = (code: string, at: { x: number; y: number }, name: string): PlayerNode => ({
    ...makePlayer(token(code), at.x, at.y),
    // The full field is drawn smaller, so its players are too.
    ...(scene.view === "lax_full" || scene.view === "wlax_full" ? { size: 28 } : {}),
    z: z++,
    groupId,
    name,
  });

  let added: PlayerNode[];
  if (set.id === "d-man") {
    const goal = laxAt(scene.view, GOAL, MID);
    const shooters = kept.filter((n): n is PlayerNode => n.kind === "player" && !n.hidden && n.side === "offense" && !!n.label && n.label !== "G");
    if (!shooters.length) return { error: "Man to man covers the offense on the field. Drop an offensive set first, then pick Man to man." };
    const gap = unitsPerYard(scene.view) * 3.2;
    added = shooters.map((p) => {
      const len = Math.hypot(goal.x - p.x, goal.y - p.y) || 1;
      const ux = (goal.x - p.x) / len;
      const uy = (goal.y - p.y) / len;
      // Goal side of the player covered, unless that lands in the goalie's lap: then alongside (a crease attackman).
      const near = len - gap < unitsPerYard(scene.view) * 4.5;
      const at = near ? { x: p.x - uy * gap, y: p.y + ux * gap } : { x: p.x + ux * gap, y: p.y + uy * gap };
      return place(COVER[p.label.toUpperCase()] ?? "DD", at, `On ${p.name || p.label}`);
    });
    const hasGoalie = kept.some((n) => n.kind === "player" && n.side === "defense" && n.label === "G");
    if (!hasGoalie) added.push(place(GOALIE.code, laxAt(scene.view, GOAL + GOALIE.d * k, MID + GOALIE.x * k), GOALIE.name));
  } else {
    added = set.spots.map((s) => place(s.code, laxAt(scene.view, GOAL + s.d * k, MID + s.x * k), s.name));
  }
  const replaced = kept.length < scene.nodes.length;
  return {
    scene: { ...scene, nodes: [...kept, ...added] },
    ids: added.map((n) => n.id),
    message: `${set.name} on the field${replaced ? ", in place of the last set" : ""}. Drag it to move the whole set, or tap a player twice to move only that one.`,
  };
}
