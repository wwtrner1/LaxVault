import type { PlayMeta, StoredPlay } from "../types";
import { starterScene, type Sketch } from "./diagram";

/**
 * Starter plays: the sets, slides, clears and restarts most programs teach
 * first, drawn on the half field around the near goal (goal line at 15) or the
 * full field (midfield at 55). The Vault's Starter plays tab shows them and a
 * coach copies one into their own Vault to change it.
 */
type StarterPlay = { key: string; name: string; formation: string; playType: PlayMeta["playType"]; description: string; tags: string[]; sketch: Sketch };

// The 2-3-1 offense and the man defense goal side of it (one defender beside the crease attackman).
const O231: Sketch["players"] = [["M", 31, -9], ["M", 31, 9], ["M", 21, -15], ["A", 20, 0], ["A", 21, 15], ["A", 7, 0]];
const MAN231: Sketch["players"] = [["DM", 28.3, -7.4], ["DM", 28.3, 7.4], ["DM", 20, -12], ["DD", 17.8, 2], ["DD", 20, 12], ["DD", 10.2, 0], ["DG", 16, 0]];
// Man-up 3-3 and the man-down box against it.
const O33: Sketch["players"] = [["M", 29, -12], ["M", 30, 0], ["M", 29, 12], ["A", 17, -9], ["A", 20, 0], ["A", 17, 9]];
const BOX: Sketch["players"] = [["DM", 26, -7], ["DL", 26, 7], ["DD", 17.5, -7], ["DD", 17.5, 7], ["DD", 21.5, 0], ["DG", 16, 0]];

const PLAYS: StarterPlay[] = [
  {
    key: "231-pick-top",
    name: "2-3-1 pick top",
    formation: "2-3-1",
    playType: "offense",
    description: "Right top sets a pick for the left top. The ball carrier dodges off it into the middle and shoots on the run. The crease pops away to make room, and the right wing is the outlet if the slide comes.",
    tags: ["pick", "dodge", "beginner"],
    sketch: { view: "lax_half", players: [...O231, ["BALL", 31.6, -9.6]], lines: [["pick", 1, [[30.5, -4.5]]], ["dodge", 0, [[28, -4], [24, 1]]], ["cut", 3, [[19, -7]]], ["shot", [24, 1], [[15.6, -0.6]]]] },
  },
  {
    key: "231-x-dodge",
    name: "2-3-1 dodge from X, crease pops",
    formation: "2-3-1",
    playType: "offense",
    description: "X drives topside to the right. The crease steps away to the back side, ball side wing clears up, and X feeds the crease for a close shot, or shoots if nobody slides.",
    tags: ["X", "feed", "crease"],
    sketch: { view: "lax_half", players: [...O231, ["BALL", 6.4, 0.6]], lines: [["dodge", 5, [[9, 9], [14, 10]]], ["cut", 3, [[18.5, -5]]], ["cut", 4, [[26, 15]]], ["pass", [14, 10], [[18.4, -4.6]]], ["shot", [18.5, -5], [[15.6, -0.7]]]] },
  },
  {
    key: "141-top-dodge",
    name: "1-4-1 top dodge",
    formation: "1-4-1",
    playType: "offense",
    description: "Best dodger up top goes hard down the middle. The two crease players split out toward the wings to take their defenders with them, so the slide has to come from far away. Shoot, or move it to the crease player who is left open.",
    tags: ["dodge", "isolation"],
    sketch: { view: "lax_half", players: [["M", 32, 0], ["M", 21, -15], ["A", 20, -5], ["A", 20, 5], ["M", 21, 15], ["A", 7, 0], ["BALL", 32.6, -0.6]], lines: [["dodge", 0, [[28, -2], [23.5, -3.5]]], ["cut", 2, [[23, -11]]], ["cut", 3, [[23, 11]]], ["shot", [23.5, -3.5], [[15.6, -0.6]]]] },
  },
  {
    key: "222-pick-behind",
    name: "2-2-2 pick behind",
    formation: "2-2-2",
    playType: "offense",
    description: "Right behind picks for left behind, who runs across the back of the cage and turns the corner at goal line extended. The near crease player cuts to the ball for the feed if the defender slides.",
    tags: ["pick", "X", "feed"],
    sketch: { view: "lax_half", players: [["M", 31, -9], ["M", 31, 9], ["M", 20, -5], ["A", 20, 5], ["A", 8, -9], ["A", 8, 9], ["BALL", 7.4, -9.6]], lines: [["pick", 5, [[8.5, 3.5]]], ["dodge", 4, [[7.5, -2], [10, 5], [14, 8]]], ["cut", 3, [[18, 2]]], ["shot", [14, 8], [[15.6, 0.8]]]] },
  },
  {
    key: "132-feed",
    name: "1-3-2 feed from behind",
    formation: "1-3-2",
    playType: "offense",
    description: "Ball behind on the left. The crease cuts to the ball side, and the left behind feeds the stick for a catch-and-finish. The right behind fills X to back up the shot.",
    tags: ["feed", "crease"],
    sketch: { view: "lax_half", players: [["M", 32, 0], ["M", 21, -15], ["M", 20, 0], ["A", 21, 15], ["A", 8, -9], ["A", 8, 9], ["BALL", 7.4, -9.6]], lines: [["cut", 2, [[18, -4.5]]], ["pass", 4, [[17.6, -4.2]]], ["cut", 5, [[7, 1]]], ["shot", [18, -4.5], [[15.6, -0.6]]]] },
  },
  {
    key: "33-skip",
    name: "Man-up 3-3 skip",
    formation: "Man-up 3-3",
    playType: "emo",
    description: "Move the ball around the top until the box shifts, then skip it over the middle to the far top shooter. The skip pass beats the rotation; catch ready to shoot and step into it.",
    tags: ["man-up", "skip pass"],
    sketch: { view: "lax_half", players: [...O33, ...BOX, ["BALL", 29.6, -12.6]], lines: [["pass", 0, [[29.6, -0.6]]], ["pass", [30, 0], [[29.4, 11.4]]], ["shot", [29, 12], [[15.6, 0.8]]]] },
  },
  {
    key: "33-crease",
    name: "Man-up pipe to crease",
    formation: "Man-up 3-3",
    playType: "emo",
    description: "Top middle to the left pipe, who draws the low defender, then a quick pass across the face to the crease for a finish. Pipes stay wide and low so the crease has room.",
    tags: ["man-up", "crease"],
    sketch: { view: "lax_half", players: [...O33, ...BOX, ["BALL", 30.6, -0.6]], lines: [["pass", 1, [[17.5, -8.4]]], ["pass", [17, -9], [[19.5, -0.6]]], ["shot", [20, 0], [[15.6, 0]]]] },
  },
  {
    key: "box-rotate",
    name: "Man-down box rotation",
    formation: "Man-down",
    playType: "mdd",
    description: "Ball at the top left. The top-left defender plays the ball, top right sinks to the middle to take away the skip lane, the crease defender stays inside, and the low defenders hold the pipes. Sticks in the passing lanes, and rotate together when the ball moves.",
    tags: ["man-down", "rotation"],
    sketch: { view: "lax_half", players: [...O33, ...BOX, ["BALL", 29.6, -12.6]], lines: [["slide", 6, [[27.6, -10.4]]], ["slide", 7, [[25, 2]]], ["slide", 10, [[20.5, -1.5]]]] },
  },
  {
    key: "man-adjacent",
    name: "Man to man: adjacent slide",
    formation: "2-3-1",
    playType: "defense",
    description: "Top left dodges down the alley. The left wing defender (adjacent) slides to the dodger's hands, the crease defender rotates out to the open wing, and the goalie calls it. Recover to your own player when the ball moves.",
    tags: ["slide", "man defense"],
    sketch: { view: "lax_half", players: [...O231, ...MAN231, ["BALL", 31.6, -9.6]], lines: [["dodge", 0, [[27, -12], [24, -12.5]]], ["slide", 8, [[23.5, -11]]], ["slide", 9, [[20, -11]]]] },
  },
  {
    key: "man-crease",
    name: "Man to man: crease slide",
    formation: "2-3-1",
    playType: "defense",
    description: "X drives topside on the left. The crease defender slides to the ball, the far wing defender drops in to cover the crease, and the X defender stays on the hands from behind. Know who is hot before every dodge.",
    tags: ["slide", "man defense", "X"],
    sketch: { view: "lax_half", players: [...O231, ...MAN231, ["BALL", 6.4, 0.6]], lines: [["dodge", 5, [[9, -8], [14, -10]]], ["slide", 9, [[14.5, -7.5]]], ["slide", 10, [[19, 4]]], ["slide", 11, [[11, -8]]]] },
  },
  {
    key: "l-clear",
    name: "L clear",
    formation: "Clear",
    playType: "transition",
    description: "On the save, the defensemen break wide to the sidelines and the goalie outlets to one of them. That defender runs up the sideline while the middies form the long side of the L, then hits the first open middie to get it over midfield.",
    tags: ["clear", "goalie outlet"],
    sketch: { view: "lax_full", players: [["G", 16, 0], ["D", 22, -24], ["D", 22, 24], ["D", 30, -2], ["M", 44, -24], ["M", 49, -10], ["M", 57, 4], ["BALL", 16.6, 0.6]], lines: [["pass", 0, [[21.6, -23.6]]], ["cut", 1, [[34, -25]]], ["cut", 4, [[52, -25]]], ["pass", [34, -25], [[51.4, -24.6]]]] },
  },
  {
    key: "ride-10",
    name: "10-man ride",
    formation: "Ride",
    playType: "transition",
    description: "After a turnover, the attack pressures the defenseman with the ball and takes away the short pass back, while the middies deny the sideline and the long pass. The goal: make them throw it away or burn the count.",
    tags: ["ride", "pressure"],
    sketch: { view: "lax_full", players: [["G", 16, 0], ["D", 22, -24], ["D", 22, 24], ["D", 30, -2], ["BALL", 22.6, -23.4], ["DA", 25, -20], ["DA", 24, 18], ["DA", 30, 2], ["DM", 40, -22], ["DM", 42, 0], ["DM", 40, 20]], lines: [["slide", 5, [[23.4, -22.6]]], ["slide", 7, [[25.5, -12]]], ["slide", 8, [[34, -24]]]] },
  },
  {
    key: "fo-wing",
    name: "Face-off: clamp to the wing",
    formation: "Face-off",
    playType: "faceoff",
    description: "Face-off player clamps and pops the ball out to the left. The left wing breaks on the whistle and runs through the ground ball, the right wing comes across to back it up, and whoever has it pushes toward goal.",
    tags: ["face-off", "wings"],
    sketch: { view: "lax_full", players: [["FO", 54.2, 0], ["DM", 55.8, 0], ["LSM", 54.5, -20], ["M", 54.5, 20], ["DL", 55.5, -20], ["DM", 55.5, 20], ["BALL", 55, 0.5]], lines: [["pass", [55, 0], [[52, -7]]], ["cut", 2, [[52, -8]]], ["cut", 3, [[50, -4]]], ["dodge", [52, -8], [[40, -6]]]] },
  },
  {
    key: "4v3-break",
    name: "4v3 fast break",
    formation: "Fast break",
    playType: "transition",
    description: "Four offense square up in a box, two high and two low. The defense sets a triangle. Point to wing, wing to the crease or skip across, and shoot close and low. Three passes at most.",
    tags: ["fast break", "unsettled"],
    sketch: { view: "lax_half", players: [["M", 34, -8], ["M", 34, 8], ["A", 22, -9], ["A", 22, 9], ["DD", 28, 0], ["DD", 19, -4], ["DD", 19, 4], ["DG", 16, 0], ["BALL", 34.6, -8.6]], lines: [["pass", 0, [[34, 7.4]]], ["pass", [34, 8], [[22.6, 8.6]]], ["pass", [22, 9], [[22.4, -8.4]]], ["shot", [22, -9], [[15.6, -0.8]]]] },
  },
];

const STAMP = "2026-10-29T00:00:00.000Z";

/** The starter plays as Vault records. Their ids start with `starter-`, so they never collide with a coach's own plays. */
export const STARTER_PLAYS: StoredPlay[] = PLAYS.map((p) => {
  const scene = starterScene(`play-${p.key}`, p.sketch);
  return {
    id: `starter-${p.key}`,
    name: p.name,
    formation: p.formation,
    playType: p.playType,
    personnel: "",
    description: p.description,
    tags: ["starter", ...p.tags],
    isPublic: false,
    ownerName: "LaxVault",
    fieldView: scene.view,
    scene,
    preview: "",
    saveCount: 0,
    updatedAt: STAMP,
    remote: false,
  };
});
