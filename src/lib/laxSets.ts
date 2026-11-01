import { laxAt, laxGeom, sportOf, unitsPerYard, type LaxSport } from "./fieldUnits";
import { LAX_DEFENSE, LAX_OFFENSE, makePlayer, type TokenPreset } from "./presets";
import { nextZ } from "./scene";
import { uid } from "./types";
import type { PlayerNode, Scene } from "./types";

/**
 * Lacrosse sets (Designer → Sets): a whole offense or a defense in one tap,
 * placed around the near goal. Each game has its own: six on six for the men's
 * field, seven on seven for the women's field, five on five for box. Spots are in yards from
 * the goal line (`d`, positive toward midfield, negative behind the cage) and
 * from the middle of the field (`x`). Letters are a starting point: coaches
 * swap A and M to match who they put where.
 */
type Spot = { code: string; d: number; x: number; name: string };
export type LaxSet = { id: string; name: string; side: "offense" | "defense"; hint: string; spots: Spot[]; sport?: LaxSport };

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

const MAN: LaxSet = DEFENSE_SETS[0];

/** Women's field: seven attackers against seven defenders and the goalie. Spots in yards from the goal line, as above. */
export const WOMENS_OFFENSE: LaxSet[] = [
  {
    id: "w-142",
    name: "1-4-2",
    side: "offense",
    sport: "womens_field",
    hint: "One at the top, four across the 8-meter arc, two behind the goal. Spreads the defense for a dodge from the top or behind.",
    spots: [O("M", 15, 0, "Top"), O("M", 9, -13, "Left wing"), O("A", 8, -4.5, "Left elbow"), O("A", 8, 4.5, "Right elbow"), O("M", 9, 13, "Right wing"), O("A", -5, -6, "Left behind"), O("A", -5, 6, "Right behind")],
  },
  {
    id: "w-232",
    name: "2-3-2",
    side: "offense",
    sport: "womens_field",
    hint: "Two up top, two wings and a player on the crease, two behind. A balanced start for motion and cuts through the 8.",
    spots: [O("M", 14, -7, "Top left"), O("M", 14, 7, "Top right"), O("M", 7, -13, "Left wing"), O("A", 4, 0, "Crease"), O("A", 7, 13, "Right wing"), O("A", -5, -6, "Left behind"), O("A", -5, 6, "Right behind")],
  },
  {
    id: "w-133",
    name: "1-3-3",
    side: "offense",
    sport: "womens_field",
    hint: "One at the top, three across the middle, three low: two at the goal line extended and one behind. Good for feeding from behind.",
    spots: [O("M", 15, 0, "Top"), O("M", 9, -10, "Left"), O("A", 8, 0, "Middle"), O("M", 9, 10, "Right"), O("A", 1, -9, "Left low"), O("A", -5, 0, "Behind"), O("A", 1, 9, "Right low")],
  },
];

export const WOMENS_DEFENSE: LaxSet[] = [
  { ...MAN, hint: "One defender on every attacker on the field, goal side, plus the goalie. Mind the 3 seconds in the 8-meter arc. Drop an offense first." },
  {
    id: "w-zone",
    name: "Backer zone",
    side: "defense",
    sport: "womens_field",
    hint: "Three high on the 12-meter fan, three on the 8-meter arc and one backer behind the goal. Zone players outside a stick's length stay out of the 8.",
    spots: [GOALIE, O("DM", 13, -8, "Top left"), O("DM", 14, 0, "Top middle"), O("DM", 13, 8, "Top right"), O("DD", 8, -10, "Left"), O("DD", 9, 0, "Middle"), O("DD", 8, 10, "Right"), O("DD", -4, 0, "Backer")],
  },
];

/** Box: five runners and a goalie a side on a small floor. Spots in yards from the goal line (a crease is about 3 yards round). */
export const BOX_OFFENSE: LaxSet[] = [
  {
    id: "b-221",
    name: "2-2-1",
    side: "offense",
    sport: "box",
    hint: "Two creasemen on the pipes, two shooters on the wings and a point man up top. Lefties on the right side, righties on the left.",
    spots: [O("A", 3, -4.5, "Left crease"), O("A", 3, 4.5, "Right crease"), O("M", 8, -8, "Left shooter"), O("M", 8, 8, "Right shooter"), O("M", 13, 0, "Point")],
  },
  {
    id: "b-pp",
    name: "Power play 3-2",
    side: "offense",
    sport: "box",
    hint: "Five on four: three shooters across the top and two on the crease. Move it fast side to side for the open shot.",
    spots: [O("M", 11, -8, "Left shooter"), O("M", 12, 0, "Top"), O("M", 11, 8, "Right shooter"), O("A", 3, -4.5, "Left crease"), O("A", 3, 4.5, "Right crease")],
  },
];

export const BOX_DEFENSE: LaxSet[] = [
  { ...MAN, hint: "One defender on each runner, between him and the net, plus the goalie. Switch on picks. Drop an offense first." },
  {
    id: "b-box",
    name: "Penalty kill box",
    side: "defense",
    sport: "box",
    hint: "Four on five: a tight box in front of the crease, two high and two low, and the goalie.",
    spots: [GOALIE, O("DD", 9, -4.5, "Top left"), O("DD", 9, 4.5, "Top right"), O("DD", 4, -5, "Low left"), O("DD", 4, 5, "Low right")],
  },
];

/** The sets for a field view: men's on the men's field and the whiteboard. */
export function setsFor(view: Scene["view"]): { offense: LaxSet[]; defense: LaxSet[]; players: string } {
  const sport = sportOf(view);
  if (sport === "womens_field") return { offense: WOMENS_OFFENSE, defense: WOMENS_DEFENSE, players: "seven" };
  if (sport === "box") return { offense: BOX_OFFENSE, defense: BOX_DEFENSE, players: "five" };
  return { offense: OFFENSE_SETS, defense: DEFENSE_SETS, players: "six" };
}

export const LAX_SETS = [...OFFENSE_SETS, ...DEFENSE_SETS, ...WOMENS_OFFENSE, ...WOMENS_DEFENSE.slice(1), ...BOX_OFFENSE, ...BOX_DEFENSE.slice(1)];
/** Set names a play can carry in its details. */
export const LAX_SET_NAMES = [
  ...new Set([...OFFENSE_SETS, ...WOMENS_OFFENSE, ...BOX_OFFENSE].map((s) => s.name)),
  "Man-down",
  "Penalty kill",
  "Clear",
  "Ride",
  "Face-off",
  "Draw",
  "Fast break",
  "Drill",
];

const token = (code: string): TokenPreset => [...LAX_OFFENSE, ...LAX_DEFENSE].find((t) => t.code === code) ?? LAX_OFFENSE[0];
/** Where sets sit on a view: its goal line, the middle across, and how much to shrink spots (a box floor is about half a field's width). */
const frame = (view: Scene["view"]) => {
  const g = laxGeom(view);
  return { GOAL: g.goal, MID: g.width / 2, sport: g.sport };
};
/** Earlier drops of a side's set carry this group id prefix, so a new set replaces them. */
const prefix = (side: LaxSet["side"]) => (side === "offense" ? "set-o-" : "set-d-");

/** Which defender covers each kind of offensive player. */
const COVER: Record<string, string> = { A: "DD", M: "DM", L: "DL", F: "DM", D: "DM" };

export type SetResult = { scene: Scene; ids: string[]; message: string } | { error: string };

/** Drop a set on the field. It replaces the last set dropped for the same side; other players stay. */
export function dropSet(scene: Scene, set: LaxSet): SetResult {
  const { GOAL, MID, sport } = frame(scene.view);
  // A set drawn for another game (a men's play moved onto the box floor) is shrunk to fit.
  const k = sport === "box" && set.sport !== "box" ? 0.6 : 1;
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
    // The box floor is tight: defenders play closer, and the crease is smaller.
    const gap = unitsPerYard(scene.view) * (sport === "box" ? 2 : 3.2);
    const lap = unitsPerYard(scene.view) * (sport === "box" ? 3 : 4.5);
    added = shooters.map((p) => {
      const len = Math.hypot(goal.x - p.x, goal.y - p.y) || 1;
      const ux = (goal.x - p.x) / len;
      const uy = (goal.y - p.y) / len;
      // Goal side of the player covered, unless that lands in the goalie's lap: then alongside (a crease attackman).
      const near = len - gap < lap;
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
