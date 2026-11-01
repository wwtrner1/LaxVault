import { cleanTeam, type TeamBrand } from "./team";
import { isFilmLink } from "./runPlay";
import type { Scene, StoredPlay } from "./types";

/**
 * Player links: a playbook frozen into a snapshot behind an unguessable link,
 * so a player opens it on a phone with no account. Shared by the browser and
 * the API function, which re-checks every snapshot it stores.
 */

export type SharedPlay = {
  id: string;
  name: string;
  playType: string;
  description: string;
  tags: string[];
  /** The play's Hudl or YouTube film, when the coach attached one. */
  film?: { link: string; startAt?: number };
  scene: Scene;
};

export type Snapshot = { name: string; plays: SharedPlay[]; team?: TeamBrand };

export const SHARE_LIMITS = {
  /** Plays in one link. */
  plays: 60,
  /** Largest snapshot, in characters of JSON. */
  chars: 1_500_000,
  /** Scores kept per link; the oldest go first. */
  results: 300,
  playerName: 40,
  /** Links one coach may have at once. */
  links: 40,
};

/** The pieces of a stored play a player needs; coach-only fields (owner, saves, preview) stay behind. */
export function toSnapshot(name: string, plays: StoredPlay[], team?: TeamBrand | null): Snapshot {
  return {
    name,
    ...(team && (team.name || team.logo) ? { team } : {}),
    plays: plays.map((p) => ({
      id: p.id,
      name: p.name,
      playType: p.playType,
      description: p.description,
      tags: p.tags,
      ...(p.scene.film?.link ? { film: { link: p.scene.film.link, ...(p.scene.film.snapAt ? { startAt: p.scene.film.snapAt } : {}) } } : {}),
      scene: { ...p.scene, film: undefined },
    })),
  };
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** A coach-facing sentence when the snapshot can't be stored, else the cleaned snapshot. */
export function cleanSnapshot(raw: unknown): Snapshot | string {
  const r = raw as { name?: unknown; plays?: unknown; team?: unknown } | null;
  if (!r || !Array.isArray(r.plays)) return "That playbook couldn't be read. Open it and try the link again.";
  if (!r.plays.length) return "Add at least one play to the playbook before you share it.";
  if (r.plays.length > SHARE_LIMITS.plays) return `A player link holds up to ${SHARE_LIMITS.plays} plays. Split this playbook, or share the plays you install first.`;
  const plays: SharedPlay[] = [];
  for (const p of r.plays as Record<string, unknown>[]) {
    const scene = p?.scene as Scene | undefined;
    if (!scene || scene.version !== 2 || !Array.isArray(scene.nodes)) return "One of the plays couldn't be read. Open it in the Designer, save it, and try again.";
    const film = p.film as { link?: unknown; startAt?: unknown } | undefined;
    const link = typeof film?.link === "string" && isFilmLink(film.link) ? film.link.trim().slice(0, 400) : "";
    const startAt = Number(film?.startAt);
    plays.push({
      id: text(p.id, 80),
      name: text(p.name, 120) || "Untitled play",
      playType: text(p.playType, 20) || "offense",
      description: text(p.description, 600),
      tags: Array.isArray(p.tags) ? (p.tags as unknown[]).map((t) => text(t, 30)).filter(Boolean).slice(0, 12) : [],
      ...(link ? { film: { link, ...(startAt > 0 && startAt < 36000 ? { startAt } : {}) } } : {}),
      scene: { ...scene, film: undefined },
    });
  }
  const team = r.team ? cleanTeam(r.team) : null;
  const snap: Snapshot = { name: text(r.name, 120) || "Playbook", plays, ...(team ? { team } : {}) };
  if (JSON.stringify(snap).length > SHARE_LIMITS.chars) return "That playbook is too large to share in one piece. Share fewer plays, or split it into two playbooks.";
  return snap;
}

/** One score a player sent back. */
export type QuizScore = { id: string; playerName: string; letter: string; score: number; total: number; at: string };

/** A share as the coach sees it. */
export type ShareInfo = { token: string; source: string; name: string; plays: number; updatedAt: string; results: number };

/** The player page's address for a token. */
export const shareUrl = (token: string, origin = typeof location === "undefined" ? "" : location.origin) => `${origin}/team/${token}`;
