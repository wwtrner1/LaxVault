export type Point = { x: number; y: number };

/** Football views are inherited and stay drawable for old plays; `lax_*` men's field, `wlax_*` women's field, `box_*` box lacrosse (lib/laxField.tsx). */
export type FieldView = "full" | "half" | "redzone" | "flag" | "blank" | "lax_full" | "lax_half" | "wlax_full" | "wlax_half" | "box_full" | "box_half";

export type PlayerShape =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "cross"
  | "ball";

export type LineStyle = "solid" | "dashed" | "dotted" | "motion";
export type LineCurve = "straight" | "spline" | "bezier";
export type EndCap = "none" | "arrow" | "tee" | "dot" | "chevron";

type NodeCommon = {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  z: number;
  groupId: string | null;
  locked: boolean;
  hidden: boolean;
  name: string;
  /** Multi-frame plays: the frame (Frame.id) this element is drawn in. Unset means every frame. Players never carry it. */
  frame?: string;
};

export type PlayerNode = NodeCommon & {
  kind: "player";
  shape: PlayerShape;
  label: string;
  size: number;
  fill: string;
  stroke: string;
  textColor: string;
  side: "offense" | "defense" | "ball";
  /** Coaching note for this player (Player notes panel). */
  note?: string;
  /** Show the note on hover in the Designer. Default on. */
  noteHover?: boolean;
  /** Print the note under the diagram on letter and half-page exports. Default on. */
  notePrint?: boolean;
  /** Outline style from a player preset. Default solid. */
  outlineStyle?: "solid" | "dash" | "none";
  /** Shade color drawn under the player (player presets). */
  shade?: string;
  /** Set on a faded "ghost" token: where the player with this id lines up before the snap. */
  ghostOf?: string;
};

export type PathNode = NodeCommon & {
  kind: "path";
  points: Point[];
  handles: Record<number, Point>; // bezier control offsets, keyed by point index
  style: LineStyle;
  curve: LineCurve;
  startCap: EndCap;
  endCap: EndCap;
  stroke: string;
  width: number;
  closed: boolean;
  fill: string;
  fillOpacity: number;
  /** Auto-connect lines remember the tokens they join and follow them. */
  fromId: string | null;
  toId: string | null;
  /** The quarterback's first read. Drawn in FIRST_READ; at most one per play. */
  firstRead?: boolean;
  /** The player this route or block belongs to, when a player preset drew it. */
  assignOf?: string;
  /** Short label that rides at the end of the route ("Post", "12 yds", "Hot"); a zone shows it in the middle. */
  tag?: string;
  /** Run play step (1 to 8). Unset: worked out from the drawing (lib/runPlay.ts lineSteps). */
  step?: number;
  /** What runs along this line in Run play. Unset: a dashed line moves the ball, any other line moves its player. */
  moves?: "player" | "ball";
  /** Print only: how much the tag grows so it stays readable on a small card. Never saved. */
  tagScale?: number;
};

export type ShapeNode = NodeCommon & {
  kind: "shape";
  shapeType: "rect" | "ellipse" | "polygon";
  w: number;
  h: number;
  sides: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  width: number;
  dash: LineStyle;
  radius: number;
};

export type TextNode = NodeCommon & {
  kind: "text";
  text: string;
  fontSize: number;
  color: string;
  weight: number;
  align: "start" | "middle" | "end";
  boxed: boolean;
};

export type SceneNode = PlayerNode | PathNode | ShapeNode | TextNode;

export type Scene = {
  version: 2;
  view: FieldView;
  width: number;
  height: number;
  losY: number;
  /** Fixed rotation centre dropped by the Pivot Point tool. */
  pivot: Point | null;
  nodes: SceneNode[];
  /** Film attached in Run play: a Hudl or YouTube link and where the snap is, in seconds. */
  film?: { link?: string; snapAt?: number };
  /**
   * Multi-frame plays (lib/frames.ts): the phases a set is taught in. Frame 1
   * is the nodes as drawn; each later frame keeps only the spots of players
   * who stand somewhere else than in the frame before. Unset or one frame is
   * an ordinary play.
   */
  frames?: Frame[];
  /** Designer only, never saved (settle() strips it): the frame being edited. */
  frameAt?: number;
  /** Designer only, never saved: elements that belong to other frames while one frame is open. */
  offFrame?: SceneNode[];
  /** Designer only, never saved: ids of the non-player elements shown in every frame. */
  everyFrame?: string[];
};

/** One phase of a multi-frame play. */
export type Frame = {
  id: string;
  /** The coach's name for the phase ("Entry", "Skip to X"). Empty shows "Frame n". */
  label: string;
  /** What to teach in this phase. Printed under the frame. */
  note?: string;
  /** Players who move in this frame: their spot, by node id. Frame 1's is always empty. */
  at: Record<string, Point>;
};

export type PlayMeta = {
  name: string;
  formation: string;
  /** Lacrosse types first; pass, run and special are kept for plays from the football build. */
  playType: "offense" | "defense" | "emo" | "mdd" | "transition" | "faceoff" | "pass" | "run" | "special";
  personnel: string;
  description: string;
  tags: string[];
  isPublic: boolean;
};

export type StoredPlay = PlayMeta & {
  id: string;
  ownerName: string;
  fieldView: FieldView;
  scene: Scene;
  preview: string;
  saveCount: number;
  updatedAt: string;
  remote: boolean;
};

export const CANVAS_W = 1040;
export const CANVAS_H = 660;

/** Every formation name a play can carry: the Formation library's, then older names saved plays still use. */
export const FORMATIONS = [
  "Trips Right",
  "Trips Left",
  "Doubles",
  "Bunch Right",
  "Empty",
  "I Formation",
  "Pro Set",
  "Single Back",
  "Pistol",
  "Shotgun Spread",
  "Goal Line",
  "Spread",
  "Bunch",
  "Trips",
  "Trips Stack",
  "Twins",
  "Twins Stack",
  "Double Back",
  "Single Set",
  "Defense",
];

export const ROUTE_TREE = [
  "Flat",
  "Slant",
  "Hitch",
  "Out",
  "In / Dig",
  "Corner",
  "Post",
  "Fly / Go",
  "Drag",
  "Cross",
  "Wheel",
  "Chair",
  "Option",
  "Screen",
  "Jet",
];

export const PALETTE = [
  "#0B1524",
  "#16C8E8",
  "#D24B3E",
  "#F2A63B",
  "#2E9E6B",
  "#7A6BD2",
  "#2E7DBE",
  "#667F94",
  "#FFFFFF",
];

/** Route colour for the first read (design token --cyan-2). */
export const FIRST_READ = "#0FA8C4";

/** LaxVault ink weights — thicker than the old cards so plays read across a huddle. */
export const STROKE_WEIGHTS = [2.6, 3.4, 4.4, 5.6];
export const DEFAULT_STROKE = 3.4;

let counter = 0;
export const uid = (prefix = "n") =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;

export function baseNode(overrides: Partial<NodeCommon> = {}): NodeCommon {
  return {
    id: uid(),
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    z: 0,
    groupId: null,
    locked: false,
    hidden: false,
    name: "",
    ...overrides,
  };
}
