import { LAX_FIELDS_ON } from "./fieldSpec";
import type { PlayMeta } from "./types";

/**
 * What kind of play a drawing is: the Type buttons in the Play panel, the
 * playbook tree's badges and the Vault filter all read this list. Football
 * types stay readable so older plays still show their type.
 */
export type PlayType = PlayMeta["playType"];
type TypeInfo = { id: PlayType; label: string; letter: string };

const LAX_TYPES: TypeInfo[] = [
  { id: "offense", label: "Offense", letter: "O" },
  { id: "defense", label: "Defense", letter: "D" },
  { id: "emo", label: "Man-up", letter: "+" },
  { id: "mdd", label: "Man-down", letter: "−" },
  { id: "transition", label: "Clear · ride", letter: "T" },
  { id: "faceoff", label: "Face-off", letter: "F" },
];
const FOOTBALL_TYPES: TypeInfo[] = [
  { id: "pass", label: "Pass", letter: "P" },
  { id: "run", label: "Run", letter: "R" },
  { id: "defense", label: "Defense", letter: "D" },
  { id: "special", label: "Special teams", letter: "S" },
];

/** The types a coach picks from. */
export const PLAY_TYPES: TypeInfo[] = LAX_FIELDS_ON ? LAX_TYPES : FOOTBALL_TYPES;
export const DEFAULT_PLAY_TYPE: PlayType = PLAY_TYPES[0].id;

const ALL = [...LAX_TYPES, ...FOOTBALL_TYPES];
/** Name and badge letter for any saved type, including ones from older plays. */
export const playTypeInfo = (id: string): TypeInfo => ALL.find((t) => t.id === id) ?? { id: id as PlayType, label: id || "Play", letter: (id[0] ?? "?").toUpperCase() };

/** Label chips under Tags, and ideas for a line's tag. */
export const TAG_CHIPS = LAX_FIELDS_ON
  ? ["Dodge", "Pick", "Feed", "Cut", "Shot", "Slide", "Clear", "Ride"]
  : ["Flat", "Slant", "Hitch", "Out", "In / Dig", "Corner", "Post", "Fly / Go"];
export const LINE_TAG_IDEAS = LAX_FIELDS_ON
  ? ["Feed", "Shot", "Skip", "Dodge", "Pick", "Roll", "Slide", "Hot", "Two", "Fill", "Backer", "Outlet", "Over the top"]
  : ["Hot", "Option", "Read 1", "Read 2", "Check down", "Hook", "Curl/Flat", "Deep 1/3", "Deep 1/2"];
