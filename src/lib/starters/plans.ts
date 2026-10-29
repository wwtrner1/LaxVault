import type { Level } from "./drills";

/**
 * Ready-made practice plans. Lengths and blocks follow youth and high-school
 * guidance: 60 to 75 minutes for 9 to 12 year olds with small-sided games over
 * lines, 90 to 120 minutes for older players split into warm-up, technique,
 * team and game work. Each period names the starter drills it runs; applying
 * a plan adds any of them the coach doesn't have yet.
 */
export type PlanPeriod = { title: string; minutes: number; note: string; drills: string[] };
export type StarterPlan = { key: string; name: string; level: Level; who: string; summary: string; periods: PlanPeriod[] };

const P = (title: string, minutes: number, note: string, drills: string[] = []): PlanPeriod => ({ title, minutes, note, drills });

export const STARTER_PLANS: StarterPlan[] = [
  {
    key: "first-practice",
    name: "First practice",
    level: "Beginner",
    who: "New players, any age",
    summary: "Names, safety and lots of touches. Ground balls and cradling as games, and a small-sided game to finish so everyone plays.",
    periods: [
      P("Welcome", 5, "Names, gear check, the three rules: listen, hustle, have fun"),
      P("Warm-up", 10, "Line drills at walking speed, then jog", ["line-drills"]),
      P("Ground balls", 10, "Relay first, then steal the bacon", ["gb-relay", "steal-bacon"]),
      P("Cradling", 10, "Two hands on the stick, protect it", ["sharks"]),
      P("Shooting", 10, "Short range, aim at the targets", ["knockdown"]),
      P("Small-sided game", 12, "Let them play; a word or two from the side", ["3v3-game"]),
      P("Huddle", 3, "One thing we did well, one thing for next time"),
    ],
  },
  {
    key: "youth-skills",
    name: "Youth skills night",
    level: "Beginner",
    who: "U10 to U12",
    summary: "Sixty minutes of stations and reps, about two thirds skills and one third play. Every player touches the ball in every block.",
    periods: [
      P("Warm-up", 8, "Line drills, both hands", ["line-drills"]),
      P("Passing", 10, "Follow your pass; switch directions", ["box-passing"]),
      P("Ground balls", 10, "Win it, then move it", ["gb-2v1"]),
      P("Dodging", 10, "Split, roll, face at the cones", ["cone-dodges"]),
      P("Shooting", 10, "On the run, low corners", ["shoot-run"]),
      P("Small-sided game", 12, "3v3, winners stay on", ["3v3-game"]),
    ],
  },
  {
    key: "youth-game-prep",
    name: "Youth game prep",
    level: "Intermediate",
    who: "U12 to U14",
    summary: "The night before a game: sharp warm-up, ground balls and shooting, then the two things that decide youth games, the fast break and the clear.",
    periods: [
      P("Warm-up", 10, "Star drill, two balls once it flows", ["star"]),
      P("Ground balls", 10, "Race to goal, live", ["gb-race"]),
      P("Shooting", 10, "Set the feet, pick a corner", ["time-room"]),
      P("Defense", 10, "Approach and break down", ["approach"]),
      P("Fast break", 10, "Push it, draw, move it", ["3v2"]),
      P("Clears", 10, "Break wide on the save", ["clear-l"]),
      P("Scrimmage", 15, "Start from our set; stop to coach", ["6v6"]),
    ],
  },
  {
    key: "middle-school",
    name: "Middle school practice",
    level: "Intermediate",
    who: "Grades 6 to 8",
    summary: "Ninety minutes: stick work and ground balls first, then 1v1s, feeding, the unsettled box and a 4v4 shell to teach slides.",
    periods: [
      P("Team meeting", 5, "Tonight's plan and one goal"),
      P("Warm-up", 10, "Line drills at game speed", ["line-drills"]),
      P("Stick work", 10, "Passes on the move", ["canadian"]),
      P("Ground balls", 10, "2v1 to goal", ["gb-2v1"]),
      P("Individuals", 15, "Offense 1v1s while the defense works footwork", ["1v1-top", "mirror"]),
      P("Shooting", 10, "Feed from X to the crease", ["feed-crease"]),
      P("Unsettled", 10, "4v3, three passes at most", ["4v3"]),
      P("Team defense", 15, "Name the hot man every dodge", ["shell-4v4"]),
      P("Conditioning", 5, "Cradle shuttles, finish strong", ["cradle-shuttle"]),
    ],
  },
  {
    key: "high-school",
    name: "High school practice",
    level: "Advanced",
    who: "JV and varsity",
    summary: "Two hours: warm-up with the goalie on the arc, face-offs, individuals by position, unsettled, man-up and man-down, clear against ride, then settled 6v6.",
    periods: [
      P("Team meeting", 5, "Film note from the last game, tonight's focus"),
      P("Warm-up", 12, "Star drill; goalies on the arc", ["star", "goalie-arc"]),
      P("Stick work", 10, "Canadian, both hands", ["canadian"]),
      P("Face-offs and wings", 10, "Live off the whistle", ["fo-wings"]),
      P("Individuals", 15, "Attack from X, middies from the top, poles on poke and drop", ["1v1-top", "1v1-x", "poke-drop"]),
      P("Shooting", 10, "Time and room, then rapid fire on the goalie", ["time-room", "rapid-fire"]),
      P("Unsettled", 15, "3v2, then 4v3", ["3v2", "4v3"]),
      P("Man-up and man-down", 15, "Ball moves, the box rotates", ["emo-passing"]),
      P("Clear and ride", 13, "Points for every clear and every turnover", ["clear-ride"]),
      P("Settled 6v6", 10, "Run our set, one slide package", ["6v6"]),
      P("Conditioning", 5, "Shuttles with the ball", ["cradle-shuttle"]),
    ],
  },
  {
    key: "game-day",
    name: "Game-day walkthrough",
    level: "Intermediate",
    who: "Any team, the day of or before a game",
    summary: "Forty-five easy minutes: loosen up, warm the goalie, and walk through face-offs, man-up and man-down, and the clear so everyone knows their spot.",
    periods: [
      P("Warm-up", 10, "Line drills, easy pace", ["line-drills"]),
      P("Goalie warm-up", 8, "Five spots around the arc, soft to game speed", ["goalie-arc"]),
      P("Face-offs", 7, "Clamp and rake reps", ["fo-reps"]),
      P("Man-up and man-down", 10, "Walk it, then half speed", ["emo-passing"]),
      P("Clears", 10, "Walk it, then add riders", ["clear-l"]),
    ],
  },
];

export const planMinutes = (p: StarterPlan) => p.periods.reduce((n, x) => n + x.minutes, 0);
