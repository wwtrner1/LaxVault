import { DOCS_LOCAL, DOCS_REMOTE } from "./drills";

/**
 * Roster & lineups: the coach's players and who plays where on game day.
 * Lacrosse positions (attack, midfield, defense, goalie, long-stick middie,
 * face-off, short-stick defensive middie), midfield lines, the face-off unit
 * and the man-up and man-down units, for the men's and women's field and box.
 * Kept in this browser and copied to the account as doc kind "roster"
 * (lib/docSync.ts, newest save wins), so the lineup made on a laptop is on
 * the phone at the field. Pure apart from load/save, so the API cleans with
 * the same code.
 */
export const POSITIONS = [
  { id: "A", label: "Attack", short: "A" },
  { id: "M", label: "Midfield", short: "M" },
  { id: "D", label: "Defense", short: "D" },
  { id: "G", label: "Goalie", short: "G" },
  { id: "LSM", label: "Long-stick middie", short: "LSM" },
  { id: "FO", label: "Face-off", short: "FO" },
  { id: "SSDM", label: "Short-stick D middie", short: "SSDM" },
] as const;
export type Pos = (typeof POSITIONS)[number]["id"];
const POS_IDS = POSITIONS.map((p) => p.id) as readonly string[];

export type Status = "active" | "injured" | "out";
export const STATUSES: { id: Status; label: string }[] = [
  { id: "active", label: "Ready" },
  { id: "injured", label: "Injured" },
  { id: "out", label: "Out" },
];

export type RosterPlayer = {
  id: string;
  first: string;
  last: string;
  /** Jersey number as typed ("0", "00", "12"). */
  number: string;
  /** Positions this player plays, the main one first. */
  pos: Pos[];
  /** Graduation year or grade, as typed. */
  grad?: string;
  status: Status;
  note?: string;
};

/** The games a lineup is for, with the number on the field a side. */
export type Format = "mens10" | "mens7" | "womens12" | "womens10" | "womens7" | "box6";
export const FORMATS: { id: Format; label: string; side: number; hint: string }[] = [
  { id: "mens10", label: "Boys' / men's field, 10 v 10", side: 10, hint: "3 attack, 3 middies, 3 defense and a goalie." },
  { id: "mens7", label: "Boys' youth small-sided, 7 v 7", side: 7, hint: "2 attack, 2 middies, 2 defense and a goalie. Many leagues play this at the youngest ages; check yours." },
  { id: "womens12", label: "Girls' / women's field, 12 v 12", side: 12, hint: "3 attack, 5 midfield (center and wings), 3 defense and a goalie." },
  { id: "womens10", label: "Girls' / women's field, 10 v 10", side: 10, hint: "3 attack, 3 midfield, 3 defense and a goalie, as many high school and college games are played." },
  { id: "womens7", label: "Girls' youth small-sided, 7 v 7", side: 7, hint: "2 attack, 2 midfield, 2 defense and a goalie; check your league." },
  { id: "box6", label: "Box, 6 v 6", side: 6, hint: "Five runners and a goalie, in lines." },
];

/** One spot in a unit: a key the lineup stores, the label on the card, and the position that fits it best. */
export type Slot = { key: string; label: string; pos: Pos };
export type Unit = { id: string; name: string; hint: string; slots: Slot[]; /** Starters: the units that take the field first. */ starting?: boolean };

const s = (key: string, label: string, pos: Pos): Slot => ({ key, label, pos });
const many = (unit: string, n: number, label: string, pos: Pos) => Array.from({ length: n }, (_, i) => s(`${unit}${i + 1}`, `${label} ${i + 1}`, pos));

/** The units on a lineup card for each game. */
export function unitsFor(format: Format): Unit[] {
  const goalies: Unit = { id: "g", name: "Goalies", hint: "Starter first, then the backup.", starting: true, slots: [s("g1", "Goalie", "G"), s("g2", "Backup goalie", "G")] };
  if (format === "mens10")
    return [
      { id: "a", name: "Attack", hint: "Your three attackmen.", starting: true, slots: many("a", 3, "Attack", "A") },
      { id: "m1", name: "Midfield line 1", hint: "The starting middies.", starting: true, slots: many("m1-", 3, "Middie", "M") },
      { id: "d", name: "Defense", hint: "Three close defensemen; the long-stick middie runs with the midfield.", starting: true, slots: [...many("d", 3, "Defense", "D"), s("lsm1", "LSM", "LSM")] },
      goalies,
      { id: "m2", name: "Midfield line 2", hint: "Second line in on the fly.", slots: many("m2-", 3, "Middie", "M") },
      { id: "m3", name: "Midfield line 3", hint: "Third line, or a defensive midfield.", slots: many("m3-", 3, "Middie", "M") },
      { id: "dm", name: "D-middies", hint: "Short-stick defensive middies and a second LSM who sub on when you lose the ball.", slots: [s("ssdm1", "SSDM 1", "SSDM"), s("ssdm2", "SSDM 2", "SSDM"), s("lsm2", "LSM 2", "LSM")] },
      { id: "fo", name: "Face-off unit", hint: "The FOGO and the two wings.", slots: [s("fo1", "Face-off", "FO"), s("fo2", "Backup FO", "FO"), s("w1", "Wing", "LSM"), s("w2", "Wing", "M")] },
      { id: "up", name: "Man-up (EMO)", hint: "Six on offense when the other team has a man in the box.", slots: [s("up1", "Attack 1", "A"), s("up2", "Attack 2", "A"), s("up3", "Attack 3", "A"), s("up4", "Shooter 1", "M"), s("up5", "Shooter 2", "M"), s("up6", "Shooter 3", "M")] },
      { id: "down", name: "Man-down (MDD)", hint: "Five in front of your goalie when you have a man in the box.", slots: [s("dn1", "Pole 1", "D"), s("dn2", "Pole 2", "D"), s("dn3", "Pole 3", "LSM"), s("dn4", "Short stick 1", "SSDM"), s("dn5", "Short stick 2", "SSDM")] },
    ];
  if (format === "womens12")
    return [
      { id: "a", name: "Attack", hint: "First, second and third home.", starting: true, slots: [s("a1", "First home", "A"), s("a2", "Second home", "A"), s("a3", "Third home", "A")] },
      { id: "m1", name: "Midfield", hint: "Center and the four wings.", starting: true, slots: [s("c", "Center", "M"), s("aw1", "Attack wing L", "M"), s("aw2", "Attack wing R", "M"), s("dw1", "Defense wing L", "M"), s("dw2", "Defense wing R", "M")] },
      { id: "d", name: "Defense", hint: "Point, cover point and third man.", starting: true, slots: [s("d1", "Point", "D"), s("d2", "Cover point", "D"), s("d3", "Third man", "D")] },
      goalies,
      { id: "draw", name: "Draw unit", hint: "Who takes the draw and who fights for it on the circle.", slots: [s("dr1", "Draw taker", "FO"), s("dr2", "Circle 1", "M"), s("dr3", "Circle 2", "M"), s("dr4", "Circle 3", "M"), s("dr5", "Circle 4", "M")] },
      { id: "subs", name: "Next in", hint: "Your first subs, in order.", slots: many("sub", 5, "Sub", "M") },
      { id: "up", name: "Player up", hint: "On the attack when the other team is down a player.", slots: [...many("up", 3, "Attack", "A"), s("up4", "Midfield 1", "M"), s("up5", "Midfield 2", "M"), s("up6", "Midfield 3", "M"), s("up7", "Midfield 4", "M")] },
      { id: "down", name: "Player down", hint: "Defending a player short.", slots: [...many("dn", 3, "Defense", "D"), s("dn4", "Midfield 1", "M"), s("dn5", "Midfield 2", "M"), s("dn6", "Midfield 3", "M")] },
    ];
  if (format === "womens10")
    return [
      { id: "a", name: "Attack", hint: "", starting: true, slots: many("a", 3, "Attack", "A") },
      { id: "m1", name: "Midfield", hint: "", starting: true, slots: many("m1-", 3, "Midfield", "M") },
      { id: "d", name: "Defense", hint: "", starting: true, slots: many("d", 3, "Defense", "D") },
      goalies,
      { id: "draw", name: "Draw unit", hint: "Who takes the draw and who is on the circle.", slots: [s("dr1", "Draw taker", "FO"), s("dr2", "Circle 1", "M"), s("dr3", "Circle 2", "M")] },
      { id: "m2", name: "Midfield line 2", hint: "", slots: many("m2-", 3, "Midfield", "M") },
      { id: "subs", name: "Next in", hint: "Your first subs, in order.", slots: many("sub", 4, "Sub", "M") },
      { id: "up", name: "Player up", hint: "", slots: [...many("up", 3, "Attack", "A"), s("up4", "Midfield 1", "M"), s("up5", "Midfield 2", "M"), s("up6", "Midfield 3", "M")] },
      { id: "down", name: "Player down", hint: "", slots: [...many("dn", 3, "Defense", "D"), s("dn4", "Midfield 1", "M"), s("dn5", "Midfield 2", "M")] },
    ];
  if (format === "mens7" || format === "womens7")
    return [
      { id: "a", name: "Attack", hint: "", starting: true, slots: many("a", 2, "Attack", "A") },
      { id: "m1", name: "Midfield", hint: "", starting: true, slots: many("m1-", 2, "Middie", "M") },
      { id: "d", name: "Defense", hint: "", starting: true, slots: many("d", 2, "Defense", "D") },
      goalies,
      { id: "m2", name: "Second group", hint: "Next six in, so everyone plays.", slots: [...many("m2a", 2, "Attack", "A"), ...many("m2m", 2, "Middie", "M"), ...many("m2d", 2, "Defense", "D")] },
      { id: format === "mens7" ? "fo" : "draw", name: format === "mens7" ? "Face-offs" : "Draws", hint: "", slots: [s(format === "mens7" ? "fo1" : "dr1", format === "mens7" ? "Face-off" : "Draw taker", "FO"), s(format === "mens7" ? "fo2" : "dr2", "Backup", "FO")] },
    ];
  // Box
  return [
    { id: "l1", name: "Line 1 (offense)", hint: "Two creasemen, two shooters and a point.", starting: true, slots: [s("l1-1", "Left crease", "A"), s("l1-2", "Right crease", "A"), s("l1-3", "Left shooter", "M"), s("l1-4", "Right shooter", "M"), s("l1-5", "Point", "M")] },
    { id: "g", name: "Goalies", hint: "", starting: true, slots: [s("g1", "Goalie", "G"), s("g2", "Backup goalie", "G")] },
    { id: "l2", name: "Line 2 (offense)", hint: "", slots: many("l2-", 5, "Runner", "M") },
    { id: "dl", name: "Defense line", hint: "Who changes on when you lose the ball.", slots: many("dl", 5, "Defender", "D") },
    { id: "fo", name: "Face-offs", hint: "", slots: [s("fo1", "Face-off", "FO"), s("fo2", "Backup FO", "FO")] },
    { id: "up", name: "Power play", hint: "", slots: [s("up1", "Crease 1", "A"), s("up2", "Crease 2", "A"), s("up3", "Shooter 1", "M"), s("up4", "Shooter 2", "M"), s("up5", "Shooter 3", "M")] },
    { id: "down", name: "Penalty kill", hint: "", slots: many("dn", 4, "Penalty kill", "D") },
  ];
}

export type Lineup = {
  id: string;
  name: string;
  opponent?: string;
  /** yyyy-mm-dd as typed in a date box. */
  date?: string;
  format: Format;
  /** Slot key → player id. */
  slots: Record<string, string>;
  note?: string;
};

export type RosterDoc = { players: RosterPlayer[]; lineups: Lineup[]; current: string; updatedAt: number };

const KEY = "laxvault.roster.v1";
export const ROSTER_MAX = 80;
export const LINEUP_MAX = 40;

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function newLineup(format: Format = "mens10", name = "Game day"): Lineup {
  return { id: uid(), name, format, slots: {} };
}

export const EMPTY_ROSTER = (): RosterDoc => {
  const l = newLineup();
  return { players: [], lineups: [l], current: l.id, updatedAt: 0 };
};

function cleanPlayer(raw: unknown): RosterPlayer | null {
  const r = raw as Partial<RosterPlayer> | null;
  if (!r || typeof r !== "object") return null;
  const id = str(r.id, 64);
  const first = str(r.first, 40);
  const last = str(r.last, 40);
  if (!id || (!first && !last && !str(r.number, 4))) return null;
  const pos = (Array.isArray(r.pos) ? r.pos : []).filter((p): p is Pos => POS_IDS.includes(p as string));
  return {
    id,
    first,
    last,
    number: str(r.number, 4).replace(/[^0-9]/g, ""),
    pos: [...new Set(pos)].slice(0, 4),
    ...(str(r.grad, 12) ? { grad: str(r.grad, 12) } : {}),
    status: STATUSES.some((x) => x.id === r.status) ? (r.status as Status) : "active",
    ...(str(r.note, 200) ? { note: str(r.note, 200) } : {}),
  };
}

function cleanLineup(raw: unknown, ids: Set<string>): Lineup | null {
  const r = raw as Partial<Lineup> | null;
  if (!r || typeof r !== "object") return null;
  const id = str(r.id, 64);
  if (!id) return null;
  const format = FORMATS.some((f) => f.id === r.format) ? (r.format as Format) : "mens10";
  const keys = new Set(unitsFor(format).flatMap((u) => u.slots.map((x) => x.key)));
  const slots: Record<string, string> = {};
  if (r.slots && typeof r.slots === "object")
    for (const [k, v] of Object.entries(r.slots)) if (keys.has(k) && typeof v === "string" && ids.has(v)) slots[k] = v;
  return {
    id,
    name: str(r.name, 60) || "Game day",
    ...(str(r.opponent, 60) ? { opponent: str(r.opponent, 60) } : {}),
    ...(/^\d{4}-\d{2}-\d{2}$/.test(str(r.date, 10)) ? { date: str(r.date, 10) } : {}),
    format,
    slots,
    ...(str(r.note, 400) ? { note: str(r.note, 400) } : {}),
  };
}

/** A roster from anywhere (storage, the account), held to its limits; null when it isn't one. */
export function cleanRoster(raw: unknown): RosterDoc | null {
  const r = raw as Partial<RosterDoc> | null;
  if (!r || typeof r !== "object") return null;
  const seen = new Set<string>();
  const players = (Array.isArray(r.players) ? r.players : [])
    .map(cleanPlayer)
    .filter((p): p is RosterPlayer => !!p && !seen.has(p.id) && !!seen.add(p.id))
    .slice(0, ROSTER_MAX);
  const ids = new Set(players.map((p) => p.id));
  const lineups = (Array.isArray(r.lineups) ? r.lineups : []).map((l) => cleanLineup(l, ids)).filter((l): l is Lineup => !!l).slice(0, LINEUP_MAX);
  if (!lineups.length) lineups.push(newLineup());
  const current = lineups.some((l) => l.id === r.current) ? (r.current as string) : lineups[0].id;
  return { players, lineups, current, updatedAt: Number.isFinite(r.updatedAt) ? Number(r.updatedAt) : 0 };
}

export function loadRoster(): RosterDoc {
  try {
    return cleanRoster(JSON.parse(localStorage.getItem(KEY) ?? "null")) ?? EMPTY_ROSTER();
  } catch {
    return EMPTY_ROSTER();
  }
}

/** Has the coach entered anything? An untouched browser never replaces the account's roster. */
export const hasRoster = (r: RosterDoc) => r.updatedAt > 0;

const listeners = new Set<() => void>();
let cached: RosterDoc | null = null;
export const rosterStore = {
  get: () => (cached ??= typeof localStorage === "undefined" ? EMPTY_ROSTER() : loadRoster()),
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/** Save the roster here; `remote` means it came from the account, so it isn't sent back. */
export function saveRoster(doc: RosterDoc, remote = false): RosterDoc {
  const next = remote ? doc : { ...doc, updatedAt: Date.now() };
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: the roster still holds this visit */
  }
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") window.dispatchEvent(new Event(remote ? DOCS_REMOTE : DOCS_LOCAL));
  return next;
}

/* --------------------------------------------------------------- helpers --- */

export const fullName = (p: RosterPlayer) => [p.first, p.last].filter(Boolean).join(" ") || `#${p.number}`;
/** "12 Smith" style, for a slot or a token. */
export const shortName = (p: RosterPlayer) => p.last || p.first || `#${p.number}`;

/** Sort: by jersey number, players without one last. */
export const byNumber = (a: RosterPlayer, b: RosterPlayer) => (a.number === "" ? 1 : 0) - (b.number === "" ? 1 : 0) || Number(a.number) - Number(b.number) || fullName(a).localeCompare(fullName(b));

/** Two or more players wearing the same number. */
export function duplicateNumbers(players: RosterPlayer[]): string[] {
  const count = new Map<string, number>();
  for (const p of players) if (p.number) count.set(p.number, (count.get(p.number) ?? 0) + 1);
  return [...count].filter(([, n]) => n > 1).map(([num]) => num);
}

/**
 * Lines of pasted text into players: "12 Jake Smith A", "Smith, Jake 12 M/FO",
 * a spreadsheet column copy ("12\tJake\tSmith\tLSM"). Numbers are jerseys,
 * position words or letters are positions, the rest is the name.
 */
export function parsePlayers(text: string): RosterPlayer[] {
  const WORDS: Record<string, Pos> = {
    a: "A", att: "A", attack: "A", m: "M", mid: "M", middie: "M", midfield: "M", d: "D", def: "D", defense: "D", g: "G", goalie: "G", goal: "G",
    lsm: "LSM", fo: "FO", fogo: "FO", faceoff: "FO", "face-off": "FO", ssdm: "SSDM", dm: "SSDM", c: "M", center: "M",
  };
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let number = "";
      const pos: Pos[] = [];
      const name: string[] = [];
      for (const raw of line.split(/[\t,;|]+|\s+/).filter(Boolean)) {
        const w = raw.replace(/^#/, "");
        const lower = w.toLowerCase();
        if (/^\d{1,3}$/.test(w) && !number) number = w;
        else if (/^[a-z/-]+$/i.test(w) && lower.split("/").every((x) => WORDS[x]) && (w.length <= 4 || WORDS[lower])) lower.split("/").forEach((x) => pos.push(WORDS[x]));
        else name.push(w);
      }
      // "Smith, Jake" was split on the comma; put the first name first when the line had one.
      const comma = /^[^,\d]+,/.test(line);
      const parts = comma && name.length >= 2 ? [...name.slice(1), name[0]] : name;
      return { id: uid(), first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] ?? "", number, pos: [...new Set(pos)], status: "active" as Status };
    })
    .filter((p) => p.last || p.number);
}

/** Who fits a slot best: ready players who play its position (main position first), then the rest. */
export function rankFor(slot: Slot, players: RosterPlayer[]): RosterPlayer[] {
  const score = (p: RosterPlayer) => (p.status !== "active" ? 9 : p.pos[0] === slot.pos ? 0 : p.pos.includes(slot.pos) ? 1 : slot.pos === "SSDM" && p.pos.includes("M") ? 2 : slot.pos === "LSM" && p.pos.includes("D") ? 2 : 5);
  return [...players].sort((a, b) => score(a) - score(b) || byNumber(a, b));
}

/**
 * Fill the empty spots of a lineup: starters first, each from ready players
 * who play that position and aren't already starting; then the other units,
 * where players may repeat (a middie on line 1 can be on man-up too).
 */
export function autoFill(lineup: Lineup, players: RosterPlayer[]): Lineup {
  const units = unitsFor(lineup.format);
  const slots = { ...lineup.slots };
  const ready = players.filter((p) => p.status === "active");
  const starting = new Set(units.filter((u) => u.starting).flatMap((u) => u.slots.map((x) => slots[x.key]).filter(Boolean)));
  for (const unit of units) {
    const inUnit = new Set(unit.slots.map((x) => slots[x.key]).filter(Boolean));
    for (const slot of unit.slots) {
      if (slots[slot.key]) continue;
      const pick = rankFor(slot, ready).find((p) => {
        if (inUnit.has(p.id)) return false;
        const fits = p.pos.includes(slot.pos) || (slot.pos === "SSDM" && p.pos.includes("M")) || (slot.pos === "LSM" && p.pos.includes("D"));
        if (!fits) return false;
        // Nobody starts twice; midfield lines take players not already on another line.
        if (unit.starting) return !starting.has(p.id);
        if (/^m\d$/.test(unit.id)) return !units.filter((u) => /^m\d$/.test(u.id) || u.starting).some((u) => u.slots.some((x) => slots[x.key] === p.id));
        return true;
      });
      if (pick) {
        slots[slot.key] = pick.id;
        inUnit.add(pick.id);
        if (unit.starting) starting.add(pick.id);
      }
    }
  }
  return { ...lineup, slots };
}

/** Ready players with no spot in the lineup. */
export function unused(lineup: Lineup, players: RosterPlayer[]): RosterPlayer[] {
  const used = new Set(Object.values(lineup.slots));
  return players.filter((p) => p.status === "active" && !used.has(p.id)).sort(byNumber);
}

/** The units a player is in, by name (for "also on man-up"). */
export function unitsOf(lineup: Lineup, playerId: string): string[] {
  return unitsFor(lineup.format)
    .filter((u) => u.slots.some((x) => lineup.slots[x.key] === playerId))
    .map((u) => u.name);
}
