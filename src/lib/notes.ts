import type { PlayerNode, Scene } from "./types";

/** Player notes, with the Player notes panel's defaults applied. */
export const noteShowsOnHover = (p: PlayerNode) => !!p.note?.trim() && p.noteHover !== false;
const notePrints = (p: PlayerNode) => !!p.note?.trim() && p.notePrint !== false;

/** "M — Read the slide early…" lines for a print export. */
export function playerNoteLines(scene: Scene): string[] {
  return scene.nodes
    .filter((n): n is PlayerNode => n.kind === "player" && !n.hidden)
    .filter(notePrints)
    .sort((a, b) => a.x - b.x)
    .map((p) => `${p.label || p.name || "Player"} — ${p.note!.trim()}`);
}
