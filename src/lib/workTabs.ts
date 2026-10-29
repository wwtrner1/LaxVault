import type { LocalPlaybook } from "./store";

/**
 * The work tabs (Designer · Playbook)
 * carry one context between pages: the play and playbook last open in the
 * Designer. Kept per browser, like the other prefs.
 */
export type WorkContext = { playId: string | null; bookId: string | null};
export type WorkTabId = "designer" | "playbook";

const KEY = "laxvault.worktabs.v1";
const EMPTY: WorkContext = { playId: null, bookId: null };

export function loadWork(): WorkContext {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && typeof raw === "object") {
      const str = (v: unknown) => (typeof v === "string" && v ? v : null);
      return { playId: str(raw.playId), bookId: str(raw.bookId) };
    }
  } catch {
    /* storage blocked: the tabs fall back to each page's own default */
  }
  return EMPTY;
}

export function rememberWork(patch: Partial<WorkContext>) {
  const next = { ...loadWork(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: the tabs still work for this page */
  }
}

export type WorkTab = { id: WorkTabId; label: string; href: string; hint: string };

/** Where each tab goes, keeping the playbook (and play) the coach is working on. */
export function workTabs(ctx: WorkContext, books: LocalPlaybook[], playIds: Set<string>): WorkTab[] {
  const book = books.find((b) => b.id === ctx.bookId);
  const bookQ = book ? `?book=${encodeURIComponent(book.id)}` : "";
  const play = ctx.playId && playIds.has(ctx.playId) ? ctx.playId : null;
  return [
    {
      id: "designer",
      label: "Designer",
      href: play ? `/build/${play}${bookQ}` : `/build${bookQ}`,
      hint: play ? "Back to the play you were drawing." : "Draw a play.",
    },
    {
      id: "playbook",
      label: "Playbook",
      href: `/playbooks${bookQ}`,
      hint: book ? `Opens ${book.name}: order, add and print its plays.` : "Your playbooks: group plays the way you install them.",
    },
  ];
}
