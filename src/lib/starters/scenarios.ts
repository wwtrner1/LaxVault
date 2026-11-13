import { sportOf, type LaxSport } from "../fieldUnits";
import type { FieldView, Scene } from "../types";
import { sketchScene, type Sketch } from "./diagram";
import { STARTER_SKETCHES } from "./plays";

/**
 * Scenarios (Designer → Sets → Scenarios): whole situations a coach teaches,
 * ready on the field with every player and line, to change and save as a
 * play. Grouped the way coaches think about them: starts (face-off and draw
 * alignments by team size), defense (slides and recovery), transition
 * (clears and rides), extra-man (man-up and man-down), and the little things
 * (backing up shots). Spots are in field yards (lib/starters/diagram.ts).
 * The starter plays are part of the list, so every one of them can be put
 * straight on the field too.
 */
export type ScenarioGroup = "Starts" | "Defense" | "Transition" | "Extra-man" | "Settled offense" | "Little things";
export type Scenario = { key: string; name: string; group: ScenarioGroup; hint: string; sketch: Sketch };

const NEW: Scenario[] = [
  /* ------------------------------------------------------- men's field --- */
  {
    key: "m-fo-10",
    name: "Face-off alignment, 10 v 10",
    group: "Starts",
    hint: "Both teams set for a face-off: the face-off men on the X, a wing on each wing line, three attack and three defense behind the restraining lines, goalies in the cage. Circles attack the right goal.",
    sketch: {
      view: "lax_full",
      players: [
        ["FO", 54.2, 0], ["LSM", 54.5, -20], ["M", 54.5, 20],
        ["A", 80, -10], ["A", 80, 10], ["A", 89, 0],
        ["D", 30, -10], ["D", 30, 10], ["D", 22, 0], ["G", 16, 0],
        ["DM", 55.8, 0], ["DL", 55.5, -20], ["DM", 55.5, 20],
        ["DA", 30, -6], ["DA", 30, 6], ["DA", 21, 4],
        ["DD", 80, -6], ["DD", 80, 6], ["DD", 88, 4], ["DG", 94, 0],
        ["BALL", 55, 0.6],
      ],
      lines: [["cut", 1, [[51, -12]]], ["cut", 2, [[51, 12]]]],
    },
  },
  {
    key: "m-fo-wings",
    name: "Face-off: wings on the whistle",
    group: "Starts",
    hint: "On the whistle the wings sprint to the ball side. The near wing goes through the ground ball; the far wing comes across underneath to back it up. Attack and defense stay onside until possession.",
    sketch: {
      view: "lax_full",
      players: [["FO", 54.2, 0], ["LSM", 54.5, -20], ["M", 54.5, 20], ["DM", 55.8, 0], ["DL", 55.5, -20], ["DM", 55.5, 20], ["BALL", 53, -3]],
      lines: [["cut", 1, [[52, -5]]], ["cut", 2, [[50, -1]]], ["slide", 4, [[53, -6]]], ["slide", 5, [[54, 1]]]],
    },
  },
  {
    key: "m-shot-backup",
    name: "Backing up a shot on the end line",
    group: "Little things",
    hint: "Top left shoots. A missed shot that goes out of bounds goes to the team with the player nearest the ball when it crosses, so X sprints to the end line on the side the shot will miss and the far wing drops in behind him. Defense races for the same spot.",
    sketch: {
      view: "lax_half",
      players: [["M", 31, -9], ["M", 31, 9], ["M", 21, -15], ["A", 20, 0], ["A", 21, 15], ["A", 7, 0], ["DD", 10.2, 0], ["DD", 20, 12], ["DG", 16, 0], ["BALL", 31.6, -9.6]],
      lines: [
        ["shot", 0, [[16.5, 2], [2, 11]]],
        ["cut", 5, [[1.5, 9]]],
        ["cut", 4, [[6, 15]]],
        ["slide", 6, [[2.5, 6]]],
      ],
    },
  },
  {
    key: "m-two-slide",
    name: "Slide, fill and recover",
    group: "Defense",
    hint: "Ball dodges from the right wing. The crease defender is the first slide, the backside low defender fills the crease (second slide), and the backside top defender drops to the backside low spot (third). When the ball moves, everyone recovers to the nearest open man.",
    sketch: {
      view: "lax_half",
      players: [
        ["M", 31, -9], ["M", 31, 9], ["M", 21, -15], ["A", 20, 0], ["A", 21, 15], ["A", 7, 0],
        ["DM", 28.3, -7.4], ["DM", 28.3, 7.4], ["DM", 20, -12], ["DD", 17.8, 2], ["DD", 20, 12], ["DD", 10.2, 0], ["DG", 16, 0],
        ["BALL", 21.6, 15.6],
      ],
      lines: [
        ["dodge", 4, [[19, 10], [18, 7]]],
        ["slide", 9, [[18.5, 6]]],
        ["slide", 8, [[18.6, -1]]],
        ["slide", 6, [[21, -11]]],
      ],
    },
  },
  {
    key: "m-clear-43",
    name: "4-3 clear off a save",
    group: "Transition",
    hint: "Goalie makes the save. Two defensemen break to the sidelines at the goal line extended, the third breaks up the middle, and the three middies spread across midfield. Goalie hits the open defender; he runs it up and finds a middie over midfield.",
    sketch: {
      view: "lax_full",
      players: [["G", 16, 0], ["D", 18, -12], ["D", 18, 12], ["D", 22, 0], ["LSM", 30, -8], ["M", 45, -22], ["M", 47, 0], ["M", 45, 22], ["BALL", 16.6, 0.6]],
      lines: [["cut", 1, [[16, -26]]], ["cut", 2, [[16, 26]]], ["cut", 3, [[34, 2]]], ["pass", 0, [[16, 25.4]]], ["dodge", [16, 26], [[34, 26]]], ["pass", [34, 26], [[46, 22]]]],
    },
  },
  {
    key: "m-ride-33",
    name: "3-3 zone ride",
    group: "Transition",
    hint: "After a turnover in your offensive end, the three attackmen spread across the restraining line area to take away the outlets, and three middies hold a line at midfield. Force the ball to one sideline and trap it.",
    sketch: {
      view: "lax_full",
      players: [["G", 16, 0], ["D", 20, -22], ["D", 20, 22], ["D", 26, 0], ["BALL", 20.6, -21.4], ["DA", 24, -18], ["DA", 28, 0], ["DA", 24, 18], ["DM", 48, -18], ["DM", 50, 0], ["DM", 48, 18]],
      lines: [["slide", 5, [[21.5, -20.5]]], ["slide", 6, [[25, -10]]], ["slide", 8, [[40, -24]]]],
    },
  },
  {
    key: "m-emo-141",
    name: "Man-up 1-4-1: skip to the far pipe",
    group: "Extra-man",
    hint: "Top to the left wing pulls the box over; the wing skips across to the far pipe stepping off the crease line for a point-blank shot.",
    sketch: {
      view: "lax_half",
      players: [["M", 31, 0], ["M", 22, -14], ["A", 19, -5], ["A", 19, 5], ["M", 22, 14], ["A", 7, 0], ["DM", 27, -6], ["DL", 27, 6], ["DD", 18, -9], ["DD", 18, 9], ["DD", 20, 0], ["DG", 16, 0], ["BALL", 31.6, -0.6]],
      lines: [["pass", 0, [[22.4, -13.4]]], ["pass", [22, -14], [[19.4, 5.6]]], ["cut", 3, [[18, 7]]], ["shot", [18, 7], [[15.6, 0.7]]]],
    },
  },
  /* ----------------------------------------------------- women's field --- */
  {
    key: "w-draw-12",
    name: "Draw alignment, 12 v 12",
    group: "Starts",
    hint: "The center takes the draw in the circle with four teammates around it; attack and defense wait behind the restraining lines. Circles attack the right goal. Check your league's rules for how many players may stand between the restraining lines.",
    sketch: {
      view: "wlax_full",
      players: [
        ["FO", 59.2, 0], ["M", 56, -11], ["M", 56, 11], ["M", 64, -11], ["M", 64, 11],
        ["A", 86, -12], ["A", 86, 12], ["A", 97, 0],
        ["D", 34, -12], ["D", 34, 12], ["D", 24, 0], ["G", 11, 0],
        ["DM", 60.8, 0], ["DM", 57, -14], ["DM", 57, 14], ["DM", 63, -14], ["DM", 63, 14],
        ["DA", 34, -7], ["DA", 34, 7], ["DA", 23, 5],
        ["DD", 86, -7], ["DD", 86, 7], ["DD", 96, 5], ["DG", 109, 0],
        ["BALL", 60, 0.6],
      ],
    },
  },
  {
    key: "w-draw-10",
    name: "Draw alignment, 10 v 10",
    group: "Starts",
    hint: "Ten a side: the draw taker and two on the circle, three attack and three defense behind the restraining lines and the goalie. Check your league's draw rules.",
    sketch: {
      view: "wlax_full",
      players: [
        ["FO", 59.2, 0], ["M", 56, -11], ["M", 64, 11],
        ["A", 86, -12], ["A", 86, 12], ["A", 97, 0],
        ["D", 34, -12], ["D", 34, 12], ["D", 24, 0], ["G", 11, 0],
        ["DM", 60.8, 0], ["DM", 57, 13], ["DM", 63, -13],
        ["DA", 34, -7], ["DA", 34, 7], ["DA", 23, 5],
        ["DD", 86, -7], ["DD", 86, 7], ["DD", 96, 5], ["DG", 109, 0],
        ["BALL", 60, 0.6],
      ],
    },
  },
  {
    key: "w-free-position",
    name: "8-meter free position",
    group: "Extra-man",
    hint: "The shooter starts on the 8-meter hash; teammates and defenders clear the arc and set up outside it, ready to cut and crash on the whistle. Spacing follows your rule book.",
    sketch: {
      view: "wlax_half",
      players: [["A", 21.6, 0], ["DD", 25.5, 0], ["M", 26, -12], ["M", 26, 12], ["A", 12, -14], ["DD", 24, -14], ["DD", 24, 14], ["DG", 11, 0], ["BALL", 22, 0.6]],
      lines: [["dodge", 0, [[16, -2]]], ["shot", [16, -2], [[10.6, 0.4]]], ["cut", 2, [[18, -8]]], ["slide", 1, [[18, 2]]]],
    },
  },
  {
    key: "w-backer-slide",
    name: "Backer zone: slide from behind",
    group: "Defense",
    hint: "Ball carried from behind the goal. The backer pushes the carrier, the near low defender slides up to meet her at the goal line extended, and the middle defender fills the crease.",
    sketch: {
      view: "wlax_half",
      players: [
        ["M", 25, 0], ["M", 19, -13], ["A", 18, -4.5], ["A", 18, 4.5], ["M", 19, 13], ["A", 5, -6], ["A", 5, 6],
        ["DM", 23, -8], ["DM", 24, 0], ["DM", 23, 8], ["DD", 18, -10], ["DD", 19, 0], ["DD", 18, 10], ["DD", 6, 0], ["DG", 11, 0],
        ["BALL", 5.6, 6.6],
      ],
      lines: [["dodge", 6, [[8, 10], [11, 11]]], ["slide", 13, [[8, 7]]], ["slide", 12, [[12, 10]]], ["slide", 11, [[15, 3]]]],
    },
  },
  /* -------------------------------------------------------------- box --- */
  {
    key: "b-fo-6",
    name: "Box face-off, 6 v 6",
    group: "Starts",
    hint: "Face-off men on the center dot, the other runners spread outside the circle, goalies in. Circles attack the right net. Your league sets where the other runners must stand.",
    sketch: {
      view: "box_full",
      players: [
        ["FO", 32.8, 0], ["M", 28, -8], ["M", 28, 8], ["A", 39, -8], ["A", 39, 8], ["G", 5, 0],
        ["DM", 33.9, 0], ["DM", 38.5, -5], ["DM", 38.5, 5], ["DD", 27.5, -5], ["DD", 27.5, 5], ["DG", 61.7, 0],
        ["BALL", 33.3, 0.5],
      ],
    },
  },
  {
    key: "b-pick-roll",
    name: "Box two-man game: pick and roll",
    group: "Settled offense",
    hint: "The crease comes up to pick for the shooter on the same side. The shooter curls off the pick toward the middle for a shot; if the defense switches, the picker rolls to the net for the feed.",
    sketch: {
      view: "box_half",
      players: [["A", 7, -4.5], ["A", 7, 4.5], ["M", 12, -8], ["M", 12, 8], ["M", 17, 0], ["DD", 8.5, -4], ["DD", 8.5, 4], ["DD", 11, -6.5], ["DD", 11, 6.5], ["DD", 14.5, 0], ["DG", 5, 0], ["BALL", 12.6, -8.6]],
      lines: [["pick", 0, [[10.5, -6.2]]], ["dodge", 2, [[11, -3], [10, 0]]], ["cut", 0, [[6.5, -1]]], ["shot", [10, 0], [[4.6, 0.3]]]],
    },
  },
];

/** The starter plays, grouped by what they teach. */
const STARTER_GROUP: Record<string, ScenarioGroup> = {
  offense: "Settled offense",
  defense: "Defense",
  emo: "Extra-man",
  mdd: "Extra-man",
  transition: "Transition",
  faceoff: "Starts",
};

export const SCENARIOS: Scenario[] = [
  ...NEW,
  ...STARTER_SKETCHES.map((p) => ({ key: `starter-${p.key}`, name: p.name, group: STARTER_GROUP[p.playType] ?? "Settled offense", hint: p.description, sketch: p.sketch })),
];

export const SCENARIO_GROUPS: ScenarioGroup[] = ["Starts", "Defense", "Transition", "Extra-man", "Settled offense", "Little things"];

/** Scenarios for the game on the field now (the whiteboard shows the men's). */
export function scenariosFor(view: FieldView): Scenario[] {
  const sport: LaxSport = sportOf(view) ?? "mens_field";
  return SCENARIOS.filter((s) => (s.sketch.view === "blank" ? "mens_field" : sportOf(s.sketch.view)) === sport);
}

/** A scenario as a fresh scene: new ids every time, so it can be put down twice. */
export const scenarioScene = (s: Scenario): Scene => sketchScene(s.sketch);
