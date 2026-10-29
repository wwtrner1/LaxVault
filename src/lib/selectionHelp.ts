import type { PathNode, PlayerNode, SceneNode } from "./types";

/**
 * The popup over a selection in the Designer: what the coach picked, what they
 * can do with it, and the few actions they reach for most. Actions are ids
 * from the Builder's right-click menu, so the popup and the menu never drift.
 */
export type SelectionHelp = { title: string; hint: string; quick: string[] };

const OFFENSE: Record<string, string> = { A: "Attack", M: "Midfield", D: "Defense", G: "Goalie", L: "Long-stick midfielder", F: "Face-off" };
const DEFENSE: Record<string, string> = { D: "Close defender", M: "Defensive midfielder", L: "Long-stick midfielder", G: "Goalie", A: "Riding attackman" };
const SHOT = "#d24b3e";

function playerTitle(p: PlayerNode): string {
  if (p.side === "ball") return p.shape === "triangle" ? "Cone" : "Ball";
  const role = (p.side === "defense" ? DEFENSE : OFFENSE)[p.label.toUpperCase()] ?? (p.side === "defense" ? "Defender" : "Player");
  const letter = p.label ? ` ${p.label}` : "";
  return p.name && !/^(player|defender)/i.test(p.name) ? `${role}${letter} · ${p.name}` : `${role}${letter}`;
}

/** A line reads as the lacrosse action its look stands for. */
export function lineKind(p: PathNode): string {
  if (p.closed) return "Zone";
  if (p.endCap === "tee") return "Pick";
  if (p.style === "motion") return "Dodge";
  if (p.style === "dashed" || p.style === "dotted") return "Pass";
  if (p.stroke.toLowerCase() === SHOT) return "Shot";
  return "Cut";
}

const LINE_HINT: Record<string, string> = {
  Cut: "A run without the ball. Drag a point to reshape it; the end stays glued to its player.",
  Pass: "Dashed: the ball in the air. Drag the arrow end onto the receiver.",
  Dodge: "Wavy: a dodge with the ball. Drag a point to change its path.",
  Pick: "Flat end: a pick. Set it so the flat end sits where the pick is set.",
  Shot: "Red: a shot on goal. Point it at the corner you want.",
  Zone: "A closed shape: an area or zone. Drag a corner to resize it.",
};

export function describeSelection(nodes: SceneNode[]): SelectionHelp | null {
  if (!nodes.length) return null;
  if (nodes.length === 1) {
    const n = nodes[0];
    if (n.locked) return { title: "Locked", hint: "Locked elements can't move. Unlock it in Selection to change it.", quick: ["details"] };
    if (n.kind === "player") {
      const title = playerTitle(n);
      if (n.side === "ball") return { title, hint: title === "Ball" ? "Drag it into a stick, or onto the ground for a ground ball." : "Marks a line, a gate or a station.", quick: ["duplicate", "delete"] };
      const inSet = n.groupId?.startsWith("set-");
      return {
        title,
        hint: inSet
          ? "Picked on its own from a set: dragging moves only this player. Change the letter in Selection, or draw a cut from here."
          : "Drag to move. Change the letter or color in Selection, or draw a cut from this player.",
        quick: ["draw-route", "note", "duplicate", "delete"],
      };
    }
    if (n.kind === "path") {
      const kind = lineKind(n);
      return { title: kind, hint: LINE_HINT[kind], quick: ["first-read", "tag", "smooth", "delete"] };
    }
    if (n.kind === "text") return { title: "Label", hint: "Double-click to change the words. Drag to move it.", quick: ["duplicate", "delete"] };
    return { title: "Shape", hint: "Drag a corner handle to resize, or the shape to move it.", quick: ["front", "back", "delete"] };
  }
  const group = nodes[0].groupId;
  if (group && nodes.every((n) => n.groupId === group)) {
    const side = group.startsWith("set-o-") ? "Offensive set" : group.startsWith("set-d-") ? "Defensive set" : "Group";
    return {
      title: `${side} · ${nodes.length}`,
      hint:
        side === "Group"
          ? "Moves as one. Ungroup to move each piece on its own."
          : "Drag to move the whole set. Flip mirrors it left to right; a new set from the Sets tab replaces it.",
      quick: ["flip", "duplicate", side === "Group" ? "ungroup" : "delete"],
    };
  }
  const lines = nodes.filter((n) => n.kind === "path").length;
  const people = nodes.filter((n) => n.kind === "player").length;
  const parts = [people && `${people} ${people === 1 ? "player" : "players"}`, lines && `${lines} ${lines === 1 ? "line" : "lines"}`].filter(Boolean).join(", ");
  return { title: parts || `${nodes.length} selected`, hint: "Drag any of them to move them together. Group them to keep them together.", quick: ["group", "flip", "duplicate", "delete"] };
}
