import { LAX_FIELDS_ON } from "./fieldSpec";
import { baseNode } from "./types";
import type { PlayerNode, Scene } from "./types";

export type TokenPreset = {
  code: string;
  label: string;
  title: string;
  hint: string;
  shape: PlayerNode["shape"];
  fill: string;
  stroke: string;
  textColor: string;
  side: PlayerNode["side"];
  /** Token size on the canvas; players are 36. */
  size?: number;
};

/**
 * Football tokens, inherited. Still the tray until the men's field spec is
 * approved (`LAX_FIELDS_ON`); recolor.ts keeps using them to update old plays.
 *
 * Default position colors, used everywhere a player appears. Codes are
 * internal ids for formations; labels are the letters coaches see.
 * Q black · C cyan · X blue · Y red · Z green · H orange · S light purple.
 */
export const FOOTBALL_OFFENSE: TokenPreset[] = [
  { code: "QB", label: "Q", title: "Quarterback", hint: "Drop this on the snap point. Every pass route in the play starts from here.", shape: "circle", fill: "#111111", stroke: "#111111", textColor: "#FFFFFF", side: "offense" },
  { code: "C", label: "C", title: "Center", hint: "Snapper. In 5-on-5 the centre is usually eligible once the ball is away.", shape: "square", fill: "#16C8E8", stroke: "#16C8E8", textColor: "#04212A", side: "offense" },
  { code: "X", label: "X", title: "Receiver X", hint: "Backside split end. Drop this on the left edge for Twins and Trips looks.", shape: "circle", fill: "#1E4FD8", stroke: "#1E4FD8", textColor: "#FFFFFF", side: "offense" },
  { code: "Y", label: "Y", title: "Receiver Y", hint: "Slot or tight receiver. Usually the inside man in Bunch and Stack sets.", shape: "circle", fill: "#D24B3E", stroke: "#D24B3E", textColor: "#FFFFFF", side: "offense" },
  { code: "Z", label: "Z", title: "Receiver Z", hint: "Flanker, off the line. Motion this player to build jet and orbit looks.", shape: "circle", fill: "#1D7A50", stroke: "#1D7A50", textColor: "#FFFFFF", side: "offense" },
  { code: "RB", label: "H", title: "Running back (H)", hint: "Backfield runner. Pair it with a handoff line to draw dives and reverses.", shape: "circle", fill: "#F28C28", stroke: "#F28C28", textColor: "#0B1524", side: "offense" },
  { code: "H", label: "S", title: "Second back / wing (S)", hint: "Second back or wing. Good for crossbuck and double-back sets.", shape: "circle", fill: "#C9B8F5", stroke: "#C9B8F5", textColor: "#0B1524", side: "offense" },
  { code: "BALL", label: "", title: "Ball spot", hint: "Marks where the ball is spotted. Line the scrimmage line up with it.", shape: "ball", fill: "#7A5230", stroke: "#41290F", textColor: "#FFFFFF", side: "ball" },
];

const FOOTBALL_DEFENSE: TokenPreset[] = [
  { code: "CB", label: "C", title: "Cornerback", hint: "Outside cover man. Draw a dashed line to show his man-coverage assignment.", shape: "triangle", fill: "#2E7DBE", stroke: "#164A76", textColor: "#FFFFFF", side: "defense" },
  { code: "LB", label: "L", title: "Linebacker", hint: "Underneath defender. Pair with the Coverage zone tool to shade a hook or flat.", shape: "triangle", fill: "#2E7DBE", stroke: "#164A76", textColor: "#FFFFFF", side: "defense" },
  { code: "FS", label: "F", title: "Free safety", hint: "Deep middle. Place him high to show a Cover 1 or Cover 3 shell.", shape: "triangle", fill: "#2E9E6B", stroke: "#1B6845", textColor: "#FFFFFF", side: "defense" },
  { code: "SS", label: "S", title: "Strong safety", hint: "Rolls to the strength of the formation. Useful for Cover 2 halves.", shape: "triangle", fill: "#2E9E6B", stroke: "#1B6845", textColor: "#FFFFFF", side: "defense" },
  { code: "R", label: "R", title: "Rusher", hint: "Blitzer off the edge. Add a solid arrow into the backfield to show the path.", shape: "cross", fill: "none", stroke: "#D24B3E", textColor: "#D24B3E", side: "defense" },
  { code: "X2", label: "X", title: "Generic defender", hint: "Unlabelled defender — rename it in the Properties panel on the right.", shape: "cross", fill: "none", stroke: "#0B1524", textColor: "#0B1524", side: "defense" },
];

/**
 * Men's field lacrosse: the team with the ball draws in lettered circles, the
 * team without it in lettered triangles, plus a plain X for any defender.
 * A attack blue · M midfield green · D defense red · G goalie black ·
 * L long-stick midfielder orange · F face-off cyan. Ball and cone for drills.
 */
export const LAX_OFFENSE: TokenPreset[] = [
  { code: "A", label: "A", title: "Attack", hint: "Attackman. Three live below the restraining line; drop them around the crease and behind the goal (X).", shape: "circle", fill: "#1E4FD8", stroke: "#1E4FD8", textColor: "#FFFFFF", side: "offense" },
  { code: "M", label: "M", title: "Midfield", hint: "Midfielder. Plays both ends; use for top-side dodgers, wings and transition.", shape: "circle", fill: "#1D7A50", stroke: "#1D7A50", textColor: "#FFFFFF", side: "offense" },
  { code: "D", label: "D", title: "Defense", hint: "Close defender with the ball, for clears and fast breaks.", shape: "circle", fill: "#D24B3E", stroke: "#D24B3E", textColor: "#FFFFFF", side: "offense" },
  { code: "G", label: "G", title: "Goalie", hint: "Starts in the crease. The first outlet on every clear.", shape: "circle", fill: "#111111", stroke: "#111111", textColor: "#FFFFFF", side: "offense" },
  { code: "LSM", label: "L", title: "Long-stick midfielder", hint: "Long pole at midfield: wings on face-offs, transition and the man-down top.", shape: "circle", fill: "#F28C28", stroke: "#F28C28", textColor: "#0B1524", side: "offense" },
  { code: "FO", label: "F", title: "Face-off", hint: "Face-off specialist. Drop on the center X for face-off plays.", shape: "circle", fill: "#19C3AE", stroke: "#19C3AE", textColor: "#03201C", side: "offense" },
  { code: "BALL", label: "", title: "Ball", hint: "The ball. Put it in a stick, on the ground for a ground ball, or at the spot of a restart.", shape: "circle", fill: "#F5C518", stroke: "#8A6A00", textColor: "#0B1524", side: "ball", size: 14 },
  { code: "CONE", label: "", title: "Cone", hint: "Marks a line, a gate or a station for the drill.", shape: "triangle", fill: "#F28C28", stroke: "#B45F12", textColor: "#0B1524", side: "ball", size: 22 },
];

export const LAX_DEFENSE: TokenPreset[] = [
  { code: "XD", label: "", title: "Defender", hint: "Any defender. Draw a dashed line to the player it covers.", shape: "cross", fill: "none", stroke: "#0B1524", textColor: "#0B1524", side: "defense" },
  { code: "DD", label: "D", title: "Close defense", hint: "Long pole covering an attackman. Lines up goal side of the attackman.", shape: "triangle", fill: "#D24B3E", stroke: "#9E3428", textColor: "#FFFFFF", side: "defense" },
  { code: "DM", label: "M", title: "Short-stick defensive midfielder", hint: "Covers a midfielder up top. Use for slides and the man-down box.", shape: "triangle", fill: "#1D7A50", stroke: "#13553A", textColor: "#FFFFFF", side: "defense" },
  { code: "DL", label: "L", title: "Long-stick midfielder", hint: "Long pole up top on the best midfield dodger.", shape: "triangle", fill: "#F28C28", stroke: "#B45F12", textColor: "#0B1524", side: "defense" },
  { code: "DG", label: "G", title: "Goalie", hint: "In the crease. Calls the slides.", shape: "triangle", fill: "#111111", stroke: "#111111", textColor: "#FFFFFF", side: "defense" },
  { code: "DA", label: "A", title: "Riding attackman", hint: "Attackman on the ride, pressuring the clear.", shape: "triangle", fill: "#1E4FD8", stroke: "#143A9E", textColor: "#FFFFFF", side: "defense" },
];

export const OFFENSE_TOKENS: TokenPreset[] = LAX_FIELDS_ON ? LAX_OFFENSE : FOOTBALL_OFFENSE;
export const DEFENSE_TOKENS: TokenPreset[] = LAX_FIELDS_ON ? LAX_DEFENSE : FOOTBALL_DEFENSE;

export function makePlayer(preset: TokenPreset, x: number, y: number): PlayerNode {
  return {
    ...baseNode({ x, y, name: preset.title }),
    kind: "player",
    shape: preset.shape,
    label: preset.label,
    size: preset.size ?? 36,
    fill: preset.fill,
    stroke: preset.stroke,
    textColor: preset.textColor,
    side: preset.side,
  };
}

export function emptyScene(losY = 420): Scene {
  return { version: 2, view: LAX_FIELDS_ON ? "lax_half" : "half", width: 1040, height: 660, losY, pivot: null, nodes: [] };
}
