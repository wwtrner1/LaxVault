import type { Drill } from "../drills";

/**
 * Example videos for the starter drills: one YouTube video per drill, made by
 * someone else and only linked (it plays in YouTube's privacy-enhanced
 * player). Every id was checked on 2026-11-17 against YouTube's oEmbed
 * endpoint (the video exists and can be embedded) and its title and channel
 * are recorded as YouTube returned them. Never guess an id: a drill without a
 * checked video simply has none. `note` says what to look for when the video
 * shows the skill rather than our exact setup.
 *
 * A video here does not mean its channel endorses LaxVault, and the drill card says so.
 */
export type DrillVideo = { id: string; title: string; channel: string; note?: string };

export const DRILL_VIDEOS: Record<string, DrillVideo> = {
  "line-drills": { id: "0T3xJ0KI4j0", title: "Laxlife Lacrosse: Warm-Up Drill #2A - Line Shuttles", channel: "Laxlife Lacrosse" },
  star: { id: "n60cV7ZJ9LA", title: "Star Drill Ground Balls and Passing (Men's)", channel: "USA Lacrosse" },
  "box-passing": { id: "HgCinETiLh4", title: "Four Corners With Bill Tierney", channel: "Championship Productions" },
  "wall-ball": { id: "eUzj3EhPBS4", title: "The ULTIMATE Lacrosse WALL BALL Routine", channel: "Lacrosse Training" },
  "gb-race": { id: "ECNb2aAlX_o", title: "1v1 Ground Ball to Finish", channel: "TeamSnap" },
  "gb-2v1": { id: "JWa7K2tR4MM", title: "Titanium Lacrosse - Sideline 2v1 Ground Ball Drill", channel: "Titanium Lacrosse" },
  "steal-bacon": { id: "I9U3Mm5vpP4", title: "Titanium Lacrosse - Steal the Bacon", channel: "Titanium Lacrosse" },
  "gb-relay": { id: "YlozBiQKzZw", title: "5-Yard Scoop Drill (Men's)", channel: "USA Lacrosse", note: "Shows the scoop this relay builds: low hands, run through the ball, protect it." },
  "shoot-run": { id: "DdAv0KNNDFo", title: "Shooting on the Run - Offensive Skills Series by IMG Academy Lacrosse (8 of 10)", channel: "IMG Academy" },
  "feed-crease": { id: "TpC2Hgz7e0k", title: "Lacrosse Drill - Shooting - Teaching Timing on cuts and feeds.", channel: "Souza Lacrosse" },
  "time-room": { id: "LA-qJjaJYLk", title: "Teach Youth Players Time and Room Shooting! - Lacrosse 2016 #21", channel: "Championship Productions" },
  "1v1-top": { id: "NDDQK5lAmes", title: "Practice Alley Dodges with a Drill from John Desko! - Lacrosse 2015 #44", channel: "Championship Productions" },
  "1v1-x": { id: "2qdCfMa6OWE", title: "Rock and Roll from X Dodging Drill (Men's)", channel: "USA Lacrosse" },
  "cone-dodges": { id: "MxY7DHT_X4Q", title: "Split to Roll Dodge Drill (Men's)", channel: "USA Lacrosse" },
  approach: { id: "UQZiBncwZmI", title: "Proper Defensive Approach - Defensive Drills Series by IMG Academy Lacrosse (1 of 3)", channel: "IMG Academy" },
  mirror: { id: "lN9AwUu3IME", title: "Lacrosse Defensive Footwork Drills: How To Keep Top Side Every Time!", channel: "Lacrosse Training", note: "The footwork the mirror drill trains: shuffle, drop step, stay in front." },
  "poke-drop": { id: "55TukBYjQWE", title: "Defense Drills: Poke and Shuffle (Beginner, Intermediate)", channel: "MADLAX & DMVLAX" },
  "shell-4v4": { id: "MIvrkFNPbAs", title: "4v4 Slide & Recover - Pete Toner - Penn State", channel: "Coaching Through Cancellation" },
  "clear-l": { id: "W2v5os9zTPc", title: "Outlets and Clears - Lacrosse Goalies", channel: "PrimeSportsTraining", note: "The goalie's outlet after a save, the first pass of the L clear." },
  "clear-ride": { id: "k0sKtrBVxl0", title: "Dragon Clearing Drill", channel: "Championship Productions" },
  "fo-wings": { id: "AamFex6dQpo", title: "Dominate Possession Time with Coach Phaup's Faceoff Wing Play! (Part VIII)", channel: "CLA Media" },
  "fo-reps": { id: "AmE4tEvPeOk", title: "Your Edge: Faceoff Drills with Mike Poppleton", channel: "US Lacrosse Magazine" },
  "emo-passing": { id: "KUxd3CLFvPI", title: "Move the Ball Within the Man Up Offense! - Lacrosse 2016 #16", channel: "Championship Productions" },
  "goalie-arc": { id: "EuAt_evb0I8", title: "Your Edge: Goalie Warm-Up Drills With Scott Rodgers", channel: "US Lacrosse Magazine" },
  "rapid-fire": { id: "JhLyFeONja0", title: "Berkman's Bank: Rapid Fire Shooting Drill", channel: "USA Lacrosse" },
  sharks: { id: "IYy_fLcdr8o", title: "Laxlife Lacrosse: Games Drill #4 - Sharks & Minnows", channel: "Laxlife Lacrosse" },
  "cradle-shuttle": { id: "Ethcc3Xo9iY", title: "Teach Youth Players to Cradle the Ball! - Lacrosse 2015 #26", channel: "Championship Productions", note: "The cradle to keep on every turn of the shuttle." },
  "3v2": { id: "Cjon7lBxXLw", title: "\"Bring It In:\" feat. John Paul - 3v2 Sides", channel: "PremierLaxGroup" },
  "4v3": { id: "n6EEj6TFL98", title: "Team 91 Box 4 v 3 Drill", channel: "Team 91 Charlotte Lacrosse" },
  "3v3-game": { id: "VgbhxljCMno", title: "West Genny Tutorial- Small Sided Lacrosse Game", channel: "Youth Lacrosse Drills" },
};

export const drillVideo = (key: string | undefined): DrillVideo | undefined => (key ? DRILL_VIDEOS[key] : undefined);

export const videoLink = (v: DrillVideo) => `https://www.youtube.com/watch?v=${v.id}`;

/**
 * The film to show for a drill: the coach's own link wins; a drill added from
 * a starter otherwise shows that starter's example video, with its credit.
 */
export function drillFilm(d: Pick<Drill, "film" | "starterId">): { film: { link: string; startAt?: number }; credit?: DrillVideo } | undefined {
  if (d.film) return { film: d.film };
  const v = drillVideo(d.starterId);
  return v ? { film: { link: videoLink(v) }, credit: v } : undefined;
}
