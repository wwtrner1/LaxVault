import type { Drill, DrillCategory } from "../drills";
import type { Sketch } from "./diagram";

/**
 * Starter drills: the drills youth and high-school programs run most, written
 * for a volunteer coach (setup, what to say, what to watch) with a diagram.
 * A coach adds one to their own library (it keeps `starterId`, so the diagram
 * comes from here and works on every device) and edits it from there.
 *
 * Structure follows USA Lacrosse's athlete development guidance: short
 * blocks, lots of touches, small-sided games over lines. Diagrams use field
 * yards (see diagram.ts): goal line at 15, restraining line at 35, midfield 55.
 */
export type Level = "Beginner" | "Intermediate" | "Advanced";
export type StarterDrill = Omit<Drill, "id" | "sportFormat" | "createdAt" | "updatedAt" | "playId" | "starterId"> & {
  key: string;
  levels: Level[];
  sketch: Sketch;
};

const D = (
  key: string,
  name: string,
  category: DrillCategory,
  minutes: number,
  players: [number, number],
  levels: Level[],
  equipment: string[],
  setup: string,
  coachingPoints: string[],
  sketch: Sketch,
): StarterDrill => ({ key, name, category, minutes, players: { min: players[0], max: players[1] }, levels, equipment, setup, coachingPoints, sketch });

const ALL: Level[] = ["Beginner", "Intermediate", "Advanced"];
const MID_UP: Level[] = ["Intermediate", "Advanced"];

export const STARTER_DRILLS: StarterDrill[] = [
  /* ---------- Warm-up and stick work ---------- */
  D("line-drills", "Line drills", "Warm-up", 10, [6, 0], ALL, ["Balls", "4 cones"],
    "Two lines facing each other 15 yards apart, ball at the front of one line. Pass across, then follow your pass to the back of the other line. Run each variation about a minute.",
    ["Righty, then lefty, then quick stick, then over the shoulder", "Give a target: stick head up by the ear, call for it", "Step toward your target and follow through to the ear", "Catch soft: give with the top hand, then cradle"],
    { view: "blank", players: [["M", 26, -12], ["M", 26, -15], ["M", 26, -18], ["M", 26, 12], ["M", 26, 15], ["M", 26, 18]],
      lines: [["pass", 0, [[26, 11]]], ["cut", 0, [[29, 0], [28, 19]], "Follow"]] }),

  D("star", "Star drill", "Warm-up", 12, [10, 0], MID_UP, ["Balls", "5 cones"],
    "Five lines in a star about 12 yards apart. The ball goes to the line two to the right (skipping the one beside you); follow your pass to the back of that line. Add a second ball once it flows.",
    ["Pass, then sprint to the back of the line you passed to", "Catch on the run with your stick outside, away from the line", "Call the name of the player you pass to", "Two balls: talk, so nobody gets hit"],
    { view: "blank", players: [["M", 20, 0], ["M", 28, 11], ["M", 40, 7], ["M", 40, -7], ["M", 28, -11]],
      lines: [["pass", 0, [[39.5, 6.5]]], ["pass", 2, [[28.5, -10.5]]], ["pass", 4, [[28.5, 10.5]]], ["pass", 1, [[39.5, -6.5]]], ["pass", 3, [[20.5, 0]]]] }),

  D("box-passing", "Four-corner box passing", "Warm-up", 10, [8, 16], ALL, ["Balls", "4 cones"],
    "A 15-yard square with a line at each cone. Pass counterclockwise to the next corner and follow your pass. Switch direction, then add a second ball at the opposite corner.",
    ["Square up your shoulders to your target", "Lead the receiver: pass to where the stick will be", "Catch, take one cradle, move it", "Switch directions so both hands work"],
    { view: "blank", players: [["M", 20, -8], ["M", 20, 8], ["M", 36, 8], ["M", 36, -8], ["CONE", 18, -10], ["CONE", 18, 10], ["CONE", 38, 10], ["CONE", 38, -10]],
      lines: [["pass", 0, [[20, 7]]], ["pass", 1, [[35, 8]]], ["pass", 2, [[36, -7]]], ["pass", 3, [[21, -8]]]] }),

  D("canadian", "Canadian two-line passing", "Passing and catching", 10, [8, 0], MID_UP, ["Balls", "4 cones"],
    "Two lines at the restraining line, 15 yards apart, facing the goal. The left line runs a curl toward the middle and catches from the right line, then the right line cuts. Passes on the move, both directions.",
    ["Catch moving: show the stick, then turn upfield", "Pass to the outside shoulder of the cutter", "Keep spacing: don't drift into the passer's lane", "Switch sides so every player passes left-handed"],
    { view: "lax_half", players: [["M", 38, -10], ["M", 41, -10], ["M", 38, 10], ["M", 41, 10]],
      lines: [["cut", 0, [[30, -6], [25, -2]]], ["pass", 2, [[26, -2.5]]]] }),

  D("wall-ball", "Wall ball routine", "Passing and catching", 15, [1, 0], ALL, ["Ball", "A brick wall or rebounder"],
    "Stand about 5 yards from a wall. 25 reps each: righty, lefty, quick stick each hand, cross-hand, catch and switch hands. Players do it at home most days; check in at practice.",
    ["Same hands every rep: top hand by the ear, bottom hand at the hip", "Hit a spot on the wall about head high", "Quick stick: catch and release with no cradle", "Ten minutes a day beats an hour once a week"],
    { view: "blank", players: [["M", 30, 0], ["CONE", 20, -8], ["CONE", 20, -4], ["CONE", 20, 0], ["CONE", 20, 4], ["CONE", 20, 8]],
      lines: [["pass", 0, [[21, 1]]], ["pass", [21, -1], [[29, -1]]]] }),

  /* ---------- Ground balls ---------- */
  D("gb-race", "Ground ball race to goal (1v1)", "Ground balls", 10, [4, 0], ALL, ["Balls", "Goal"],
    "Two lines side by side at the restraining line. Coach rolls a ball out front. First pair races; whoever scoops it attacks the goal, the other plays defense. Then the next pair.",
    ["Get low: bend the knees, not the back", "Stick parallel to the ground, bottom hand low", "Run through the ball, don't stop at it", "Scoop, two hands, head up, then go"],
    { view: "lax_half", players: [["M", 38, -2], ["DM", 38, 2], ["G", 16, 0, "C"], ["BALL", 30, 0]],
      lines: [["cut", 0, [[30.5, -0.5]]], ["dodge", [30, 0], [[22, -5]]], ["shot", [22, -5], [[15.5, -1]]]] }),

  D("gb-2v1", "2v1 ground ball to goal", "Ground balls", 12, [6, 0], MID_UP, ["Balls", "Goal"],
    "Three players start together at the top of the box, one as the lone defender. Coach rolls a loose ball. The pair that wins it goes to goal as a 2v1; the single defender plays it. Rotate roles.",
    ["Ball first: win it, then think", "Scoop and move it right away to the open teammate", "Defender: play the ball carrier, then recover", "Vary the start: sitting, facing away, on a knee"],
    { view: "lax_half", players: [["M", 34, -2], ["M", 34, 2], ["DD", 34, 0], ["BALL", 29, 3], ["DG", 15.5, 0]],
      lines: [["cut", 1, [[29.5, 3]]], ["pass", [29, 3], [[24, -6]]], ["cut", 0, [[24.5, -6.5]]], ["shot", [24, -6], [[15.5, -1]]]] }),

  D("steal-bacon", "Steal the bacon", "Ground balls", 10, [8, 0], ["Beginner"], ["Balls", "Cones"],
    "Two teams on lines facing each other 20 yards apart, each player with a number. Balls in the middle. Coach calls a number: those players race out, scoop, and cradle back over their line. Call two numbers for a 2v2.",
    ["Scoop on the run and cradle to protect it", "Keep your body between the ball and your opponent", "Cheer your team on: it's a game", "Call two numbers to make them pass"],
    { view: "blank", players: [["M", 20, -6, "1"], ["M", 20, -2, "2"], ["M", 20, 2, "3"], ["M", 20, 6, "4"], ["DM", 40, -6, "1"], ["DM", 40, -2, "2"], ["DM", 40, 2, "3"], ["DM", 40, 6, "4"], ["BALL", 30, 0]],
      lines: [["cut", 1, [[29.5, -0.5]]], ["cut", 5, [[30.5, -0.5]]]] }),

  D("gb-relay", "Ground ball relay", "Ground balls", 8, [6, 0], ["Beginner"], ["Balls", "Cones"],
    "Teams in lines at a start cone, a ball 15 yards out for each team. Run out, scoop, cradle back and hand off to the next player, who rolls it back out. First team through wins.",
    ["Same scoop form at full speed", "Two hands on the stick on the way back", "Bring it back in your stick, never carried in a hand", "Make it a race; losers do it again"],
    { view: "blank", players: [["M", 20, -10], ["M", 17, -10], ["M", 20, 10], ["M", 17, 10], ["BALL", 36, -10], ["BALL", 36, 10]],
      lines: [["cut", 0, [[35.5, -10]]], ["dodge", [36, -9], [[21, -8]]]] }),

  /* ---------- Shooting ---------- */
  D("shoot-run", "Shooting on the run", "Shooting", 12, [6, 0], ALL, ["Balls", "Goal", "2 cones"],
    "Two lines at the top of the box, one on each side. The first player dodges hard down the alley and shoots on the run. Righties from the right, lefties from the left, then switch.",
    ["Shoot on the run toward the goal line extended, not across your body", "Hands away from your body: get your stick outside", "Aim low corners and step through the shot", "Follow your shot and back it up"],
    { view: "lax_half", players: [["M", 34, -12], ["M", 37, -12], ["M", 34, 12], ["M", 37, 12], ["DG", 15.5, 0]],
      lines: [["dodge", 2, [[26, 10], [22, 7]]], ["shot", [22, 7], [[15.5, 1.5]]]] }),

  D("feed-crease", "Feed from X to the crease", "Shooting", 12, [5, 0], MID_UP, ["Balls", "Goal"],
    "A feeder at X with balls, a line of cutters on the wing. The cutter slashes across the crease toward the ball, catches the feed and finishes in close. Rotate feeder every few reps.",
    ["Cutter: stick to the ball side, hands ready before you get there", "Feeder: hit the stick, a soft pass, never a missile", "Finish fast: catch and shoot in one motion", "Fake high, shoot low on the goalie"],
    { view: "lax_half", players: [["A", 8, 0], ["M", 22, -14], ["M", 24, -16], ["DG", 15.5, 0]],
      lines: [["cut", 1, [[19, -6], [19, 1]]], ["pass", 0, [[18.5, 1]]], ["shot", [19, 1], [[15.5, -1]]]] }),

  D("time-room", "Time-and-room shooting", "Shooting", 10, [6, 0], MID_UP, ["Balls", "Goal"],
    "Shooters in a line up top, feeders behind the goal on each side. Shooter steps down, catches the feed and shoots with time: set the feet and pick a corner.",
    ["Step into the catch, feet set before the ball arrives", "Hands back and high, then shoot overhand", "Pick your spot before you catch", "Change level: high to low, low to high"],
    { view: "lax_half", players: [["M", 32, 0], ["M", 35, 0], ["A", 9, -7], ["A", 9, 7], ["DG", 15.5, 0]],
      lines: [["cut", 0, [[27, -3]]], ["pass", 2, [[26.5, -3]]], ["shot", [27, -3], [[15.5, 1]]]] }),

  D("knockdown", "Knockdown targets", "Shooting", 8, [4, 0], ["Beginner"], ["Balls", "Goal", "Cones or plastic bottles"],
    "Set cones or bottles on top of and inside the goal. Shooters take turns from 8 to 10 yards; most targets knocked down wins.",
    ["Shoot with your hands, not just your arms", "Point your front shoulder at the target", "Follow through to the target", "Move back two yards once they hit it easily"],
    { view: "lax_half", players: [["M", 25, -3], ["M", 27, -3], ["M", 29, -3], ["CONE", 15, -1.5], ["CONE", 15, 1.5]],
      lines: [["shot", 0, [[15.5, 1.2]]]] }),

  /* ---------- Dodging ---------- */
  D("1v1-top", "1v1 from the top (alley dodge)", "Dodging", 12, [4, 0], MID_UP, ["Balls", "Goal"],
    "Attackers in a line up top, defenders opposite. Coach passes to the first attacker, the defender approaches, and they play live 1v1 to goal from the top.",
    ["Attack: dodge to beat your defender by a step, then get your hands free", "Change speed and direction before contact, not at it", "Defense: approach under control, break down, stick on the hands", "Make the dodger go to the weak hand and away from the middle"],
    { view: "lax_half", players: [["M", 34, -6], ["DM", 29, -5], ["DG", 15.5, 0], ["G", 40, 0, "C"]],
      lines: [["pass", 3, [[34.5, -5.5]]], ["dodge", 0, [[28, -10], [21, -8]]], ["shot", [21, -8], [[15.5, 1]]]] }),

  D("1v1-x", "1v1 from X", "Dodging", 12, [4, 0], MID_UP, ["Balls", "Goal"],
    "Attacker with the ball at X, a long pole defending. Play live 1v1: the attacker drives topside (around the goal line extended) or rolls back underneath.",
    ["Attack: sell the topside drive, then roll back if the defender overplays", "Keep the stick protected on the far side of your body", "Defense: push the dodger up the field, never let them turn the corner at GLE", "Goalie: talk to your defender, call 'topside' or 'underneath'"],
    { view: "lax_half", players: [["A", 8, 2], ["DD", 10, 2], ["DG", 15.5, 0]],
      lines: [["dodge", 0, [[10, 8], [15, 9], [18, 6]]], ["shot", [18, 6], [[15.5, 1]]]] }),

  D("cone-dodges", "Split, roll and face dodge through cones", "Dodging", 10, [4, 0], ["Beginner", "Intermediate"], ["Balls", "6 cones"],
    "A zig-zag of cones 5 yards apart. Players cradle up to each cone and run a dodge: split at the first, roll at the second, face at the third. Finish with a shot or a pass to a coach.",
    ["Plant the outside foot hard at the cone", "Switch hands on the split and protect the stick", "Roll: drop step and pivot, stick stays tight", "Accelerate out of every dodge"],
    { view: "blank", players: [["M", 44, 0], ["CONE", 38, -4], ["CONE", 33, 4], ["CONE", 28, -4], ["CONE", 23, 4]],
      lines: [["dodge", 0, [[38, -2], [33, 2], [28, -2], [23, 2], [19, 0]]]] }),

  /* ---------- Defense ---------- */
  D("approach", "Approach and break down", "Defense", 10, [4, 0], ALL, ["Balls"],
    "Defenders on the crease, attackers up top. Coach passes to an attacker; the defender sprints out, breaks down 3 to 4 yards away, and steers the attacker away from the middle. Walk it, then live.",
    ["Sprint the first two thirds, then chop your feet", "Break down: knees bent, back straight, stick up", "Arrive with your stick on the gloves, not at the head", "Take away the middle; push the ball carrier to the outside"],
    { view: "lax_half", players: [["DD", 19, -3], ["M", 30, -8], ["G", 38, 0, "C"], ["DG", 15.5, 0]],
      lines: [["pass", 2, [[30.5, -7.5]]], ["cut", 0, [[26.5, -6.5]]]] }),

  D("mirror", "Mirror drill (defensive footwork)", "Defense", 6, [2, 0], ["Beginner", "Intermediate"], ["Cones"],
    "Pairs face each other between two cones 5 yards apart. The attacker shuffles side to side and changes direction; the defender mirrors and stays in front. 20 seconds, then switch.",
    ["Stay low on the balls of your feet", "Shuffle: feet never cross", "Watch the hips, not the head or stick", "Keep the stick out in front, top hand up"],
    { view: "blank", players: [["M", 28, 0], ["DD", 24, 0], ["CONE", 26, -5], ["CONE", 26, 5]],
      lines: [["cut", 0, [[28, 4]]], ["slide", 1, [[24, 4]]]] }),

  D("poke-drop", "Poke and drop", "Defense", 6, [2, 0], ["Beginner"], ["Balls"],
    "Pairs: one cradles in a small box, the other defends. The defender pokes at the stick's bottom hand or head; if the ball drops, scoop and become the attacker.",
    ["Short, quick poke: don't lunge", "Recover your feet after every check", "Never check the head or neck", "Scoop through the loose ball and go"],
    { view: "blank", players: [["M", 28, 0], ["DD", 25, 0], ["CONE", 23, -5], ["CONE", 23, 5], ["CONE", 33, 5], ["CONE", 33, -5]],
      lines: [["dodge", 0, [[30, 4]]], ["slide", 1, [[27, 3]]]] }),

  D("shell-4v4", "4v4 shell: slide and recover", "Defense", 15, [8, 0], MID_UP, ["Balls", "Goal"],
    "Four offensive players on the corners (top and wings), four defenders. Offense passes around and one player dodges; the adjacent defender slides, everyone rotates, then recovers. No shots at first, then live.",
    ["Know your slide: name the hot man before every dodge", "Hot man slides on the dodger's hands, not the body", "Fill: the next defender rotates to the open man", "Talk the whole time: 'I'm hot', 'two', 'ball'"],
    { view: "lax_half", players: [["M", 30, -8], ["M", 30, 8], ["A", 20, -14], ["A", 20, 14], ["DM", 27, -7], ["DM", 27, 7], ["DD", 19, -11], ["DD", 19, 11], ["DG", 15.5, 0]],
      lines: [["dodge", 1, [[24, 6], [21, 3]]], ["slide", 4, [[23, 1]]], ["slide", 6, [[25, -6]]]] }),

  /* ---------- Clears and rides ---------- */
  D("clear-l", "L clear (goalie outlet)", "Clears and rides", 15, [10, 0], MID_UP, ["Balls", "Goals"],
    "Goalie with the ball after a save. Defensemen break wide to the sidelines, midfielders form the long side of an L up the field. Goalie outlets to a defenseman, who looks up for the midfielder breaking free. Walk it, then add riders.",
    ["Break out wide on the save: spread the field", "Goalie: outlet within 4 seconds, look away first", "Ball carrier: run until pressured, then move it", "Get the ball across midfield before the 20-second count"],
    { view: "lax_full", players: [["G", 15.5, 0], ["D", 22, -22], ["D", 22, 22], ["D", 10, 12], ["M", 40, -18], ["M", 52, -10], ["M", 50, 16]],
      lines: [["pass", 0, [[22, -21]]], ["dodge", 1, [[32, -24]]], ["pass", [32, -24], [[51, -10]]], ["cut", 5, [[60, -6]]]] }),

  D("clear-ride", "Clear versus ride (live)", "Clears and rides", 15, [14, 0], MID_UP, ["Balls", "Goals"],
    "Full field. Coach shoots or rolls a ball to the goalie. The defense clears against your attack and two midfielders riding. Score a point for every successful clear and every turnover forced.",
    ["Riders: first man pressures, others take away the short passes", "Clear: the open man is often the one moving away from the ball", "Count the seconds out loud on the bench", "Reset fast and run it again"],
    { view: "lax_full", players: [["G", 15.5, 0], ["D", 22, -20], ["D", 22, 20], ["M", 45, 0], ["DA", 24, -14], ["DA", 26, 12], ["DM", 40, -6]],
      lines: [["pass", 0, [[22, 19]]], ["slide", 4, [[21, -18]]], ["slide", 5, [[23, 17]]]] }),

  /* ---------- Face-offs ---------- */
  D("fo-wings", "Face-off with wings (3v3)", "Face-offs", 12, [6, 0], MID_UP, ["Balls", "Whistle"],
    "Two face-off players on the center X with a wing on each side on the wing lines. Live off the whistle: win it, scoop it, and break toward goal or back to the defense.",
    ["Face-off: clamp, then push or rake out to your wing", "Wings: break on the whistle, run through the ball", "Lose the clamp? Tie up the stick and let your wing win it", "Whoever has it: two hands, head up, go"],
    { view: "lax_full", players: [["FO", 55, -0.8], ["DM", 55, 0.8, "F"], ["M", 55, -20], ["M", 55, 20], ["DM", 58, -20], ["DM", 58, 20], ["BALL", 55, 0]],
      lines: [["pass", 0, [[53, -6]]], ["cut", 2, [[53.5, -6.5]]], ["cut", 4, [[54, -6]]]] }),

  D("fo-reps", "Clamp and rake reps", "Face-offs", 10, [2, 0], ALL, ["Balls", "Whistle"],
    "Pairs at the center X. A coach or teammate blows the whistle; work one move for 10 reps: clamp and pop, rake back, or clamp and push. Then live 1v1 off the whistle.",
    ["Hands: palm up on the bottom, top hand close to the head", "Get low and explode on the whistle", "Win it to a spot, not just anywhere", "Same stance every time; don't tip your move"],
    { view: "blank", players: [["FO", 30, -1], ["DM", 30, 1, "F"], ["BALL", 30, 0], ["G", 26, 0, "C"]],
      lines: [["pass", [30, 0], [[30, -7]], "Rake"]] }),

  /* ---------- Man-up / man-down ---------- */
  D("emo-passing", "Man-up passing around the 3-3", "Man-up / man-down", 12, [11, 0], MID_UP, ["Balls", "Goal"],
    "Six offense in a 3-3 against five defenders and a goalie. Passing only for 30 seconds: the ball moves until the open shot is there, then add shots. Rotate the man-down unit.",
    ["Move the ball fast and the defense breaks", "Catch ready to shoot: the skip pass is the shot", "Pipes stay wide and low, top stays high", "Defense: rotate together, sticks in the passing lanes"],
    { view: "lax_half", players: [["M", 29, -12], ["M", 30, 0], ["M", 29, 12], ["A", 17, -9], ["A", 20, 0], ["A", 17, 9], ["DM", 26, -6], ["DL", 26, 6], ["DD", 18, -5], ["DD", 18, 5], ["DD", 21, 1], ["DG", 15.5, 0]],
      lines: [["pass", 0, [[30, -1]]], ["pass", 1, [[29, 11]]], ["pass", 2, [[17.5, -8.5]]], ["shot", [17, -9], [[15.5, -1]]]] }),

  /* ---------- Goalie ---------- */
  D("goalie-arc", "Goalie arc warm-up", "Goalie", 10, [2, 0], ALL, ["Balls", "Goal"],
    "Coach shoots from five spots around the arc: left GLE, left wing, middle, right wing, right GLE. Goalie steps to each shooter on the arc and saves. Start soft, then game speed.",
    ["Step to the ball with the top leg, stick leads", "Stay on the arc: one step off the pipe at GLE, top of the crease in the middle", "Watch the ball into the stick", "Clear it: every save becomes an outlet pass"],
    { view: "lax_half", players: [["DG", 16.5, 0], ["G", 15, -12, "C"], ["BALL", 24, -9], ["BALL", 27, 0], ["BALL", 24, 9], ["BALL", 15, 12]],
      lines: [["shot", 1, [[15.6, -1.2]]]] }),

  D("rapid-fire", "Rapid fire on the goalie", "Goalie", 8, [4, 0], MID_UP, ["Balls", "Goal"],
    "Shooters in a semicircle 10 to 12 yards out. They shoot one after another, a second or two apart, so the goalie has to reset and find the next shooter.",
    ["Goalie: reset your feet and stick before every shot", "Shooters: wait until the goalie is set, then mix high and low", "Bounce shots too: goalie gets the stick to the ground", "Short bursts: 10 shots, then rest"],
    { view: "lax_half", players: [["DG", 16.5, 0], ["M", 25, -9], ["M", 27, -3], ["M", 27, 3], ["M", 25, 9]],
      lines: [["shot", 1, [[15.8, -1]]], ["shot", 3, [[15.8, 1]]]] }),

  /* ---------- Conditioning ---------- */
  D("sharks", "Sharks and minnows (cradling)", "Conditioning", 8, [8, 0], ["Beginner"], ["Balls", "Cones"],
    "Everyone with a ball (minnows) on one end line, two sharks in the middle without balls. On go, minnows cradle across; sharks poke to knock balls loose. Lose your ball, become a shark.",
    ["Cradle tight and keep your body between the shark and your stick", "Switch hands to protect the stick", "Sharks: poke at the stick, never the body", "Last minnow standing wins"],
    { view: "blank", players: [["M", 22, -10], ["M", 22, -4], ["M", 22, 4], ["M", 22, 10], ["DM", 30, -4, "S"], ["DM", 30, 6, "S"]],
      lines: [["dodge", 0, [[38, -12]]], ["dodge", 2, [[38, 2]]]] }),

  D("cradle-shuttle", "Cradle shuttle sprints", "Conditioning", 6, [4, 0], ALL, ["Balls", "Cones"],
    "Cones at 5, 10 and 15 yards. Cradle out to 5 and back, 10 and back, 15 and back. Switch hands on every turn. Run in waves so players rest while others go.",
    ["Two hands on the stick when you turn", "Switch hands at every cone", "Ball stays in the stick: drop it, start over", "Sprint through the finish line"],
    { view: "blank", players: [["M", 20, 0], ["CONE", 25, 0], ["CONE", 30, 0], ["CONE", 35, 0]],
      lines: [["dodge", 0, [[35, 2], [21, 3]]]] }),

  /* ---------- Game play ---------- */
  D("3v2", "3v2 fast break", "Game play", 12, [6, 0], MID_UP, ["Balls", "Goal"],
    "Three offensive players start at midfield, two defenders and a goalie on the crease. Coach passes in; the offense attacks a 3v2 and finds the open man.",
    ["Push it: make the defense commit", "Ball carrier draws a defender, then moves it", "Spread to a triangle: two low, one high", "Defense: stack, take away the inside, make them throw"],
    { view: "lax_half", players: [["M", 50, 0], ["M", 48, -12], ["M", 48, 12], ["DD", 24, 0], ["DD", 19, 0], ["DG", 15.5, 0]],
      lines: [["dodge", 0, [[32, 0]]], ["cut", 1, [[22, -10]]], ["cut", 2, [[22, 10]]], ["pass", [32, 0], [[22.5, -9.5]]], ["shot", [22, -10], [[15.5, -1]]]] }),

  D("4v3", "4v3 fast break (box)", "Game play", 15, [8, 0], MID_UP, ["Balls", "Goal"],
    "Four offense on the corners of a box (two up top, two at the wings), three defenders in a triangle and a goalie. Ball enters at the top; point to wing, wing to the crease or skip across.",
    ["Offense keeps the box: don't run to the ball", "Move it fast: the open man is always one pass away", "Shoot from close: the best shot is low and near the crease", "Defense: point man takes the ball, others rotate down, sticks in the lanes"],
    { view: "lax_half", players: [["M", 34, -8], ["M", 34, 8], ["A", 22, -9], ["A", 22, 9], ["DD", 28, 0], ["DD", 19, -4], ["DD", 19, 4], ["DG", 15.5, 0]],
      lines: [["pass", 0, [[34, 7]]], ["pass", 1, [[22.5, 8.5]]], ["pass", 3, [[22.5, -8.5]]], ["shot", [22, -9], [[15.5, -1]]]] }),

  D("3v3-game", "3v3 small-sided game", "Game play", 15, [6, 0], ALL, ["Balls", "2 small goals or cones"],
    "Two small goals 30 yards apart, 3v3, no goalies. After a goal, the other team picks it up and goes the other way. Little teaching: let them play and learn.",
    ["Everybody touches the ball", "Move without the ball to get open", "Coach from the side in a word or two, then let it go", "Keep score: winners stay on"],
    { view: "blank", players: [["M", 22, -6], ["M", 26, 4], ["M", 32, -2], ["DM", 24, -3], ["DM", 28, 6], ["DM", 34, 1], ["CONE", 15, -2], ["CONE", 15, 2], ["CONE", 45, -2], ["CONE", 45, 2]],
      lines: [["pass", 2, [[26.5, 3.5]]], ["cut", 0, [[18, -2]]]] }),

  D("6v6", "6v6 settled (controlled scrimmage)", "Game play", 20, [12, 0], MID_UP, ["Balls", "Goal"],
    "Full six against six in the offensive end. Start every possession from the same set (for example 2-3-1). Stop to coach, then restart. Defense clears the ball past the restraining line to win the rep.",
    ["Offense: run your set, then play off one dodge", "Defense: one slide package, said out loud", "Freeze it when it goes wrong, fix it, run it again", "End with the last minutes live"],
    { view: "lax_half", players: [["M", 32, -9], ["M", 32, 9], ["M", 21, -15], ["A", 20, 0], ["A", 21, 15], ["A", 7, 0], ["DM", 29, -8], ["DM", 29, 8], ["DM", 19, -13], ["DD", 18, 2], ["DD", 19, 13], ["DD", 10, 0], ["DG", 15.5, 0]] }),
];

export const starterDrill = (key: string) => STARTER_DRILLS.find((d) => d.key === key);
