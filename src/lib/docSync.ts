import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import { cleanDrill, cleanGone, DOCS_LOCAL, DOCS_REMOTE, loadDrillDoc, mergeDrills, writeDrillDoc, type Drill, type DrillDoc } from "./drills";
import { cleanSavedDoc, cleanScript, hasSavedScript, loadSavedDoc, loadScript, mergeSaved, saveScript, writeSavedDoc } from "./practice";

/**
 * The drill library and practice script live in the browser first and are
 * copied to the account while the coach is signed in, so a plan made on a
 * laptop is on the phone at the field. Drills merge per drill (newest edit
 * wins, a newer delete wins over an edit), and so do saved practices; the
 * script being worked on is one piece and the newest save wins. Every sync pulls before it pushes, so two devices never
 * overwrite each other's drills.
 */
const PUSH_DELAY_MS = 1500;

const toDrillDoc = (raw: unknown): DrillDoc => {
  const r = (raw ?? {}) as { drills?: unknown; gone?: unknown };
  return { drills: (Array.isArray(r.drills) ? r.drills : []).map(cleanDrill).filter((d): d is Drill => !!d), gone: cleanGone(r.gone) };
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

let running: Promise<void> | null = null;
let again = false;

async function syncOnce() {
  const remote = await api.getDocs();

  // Drills: merge both copies, keep the result here, send it if the account's differs.
  const cloud = toDrillDoc(remote.drills);
  const local = loadDrillDoc();
  const merged = mergeDrills(local, cloud);
  if (!same(merged, local)) writeDrillDoc(merged, true);
  if (!same(merged, cloud) && (merged.drills.length || Object.keys(merged.gone).length)) await api.putDoc("drills", merged);

  // Saved practices merge the same way as drills.
  const shelfCloud = cleanSavedDoc(remote.plans);
  const shelfLocal = loadSavedDoc();
  const shelf = mergeSaved(shelfLocal, shelfCloud);
  if (!same(shelf, shelfLocal)) writeSavedDoc(shelf, true);
  if (!same(shelf, shelfCloud) && (shelf.plans.length || Object.keys(shelf.gone).length)) await api.putDoc("plans", shelf);

  // Practice: the newer save wins. A fresh browser's default script never replaces the account's.
  const theirs = cleanScript(remote.practice);
  const mine = hasSavedScript() ? loadScript() : null;
  if (theirs && (!mine || (theirs.updatedAt ?? 0) > (mine.updatedAt ?? 0))) {
    if (!same(theirs, mine)) saveScript(theirs, true);
  } else if (mine && !same(mine, theirs)) {
    await api.putDoc("practice", mine);
  }
}

/** One sync at a time; a change during a sync runs one more after it. */
function sync() {
  if (running) {
    again = true;
    return running;
  }
  running = syncOnce()
    .catch(() => {
      /* offline or refused: everything still works in this browser, the next change tries again */
    })
    .finally(() => {
      running = null;
      if (again) {
        again = false;
        void sync();
      }
    });
  return running;
}

/** Mounted once, under the sign-in provider. */
export function DocSync() {
  const { account } = useAuth();
  const id = account?.id;

  useEffect(() => {
    if (!id) return;
    let timer: number | undefined;
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void sync(), PUSH_DELAY_MS);
    };
    // Coming back to the tab (phone out of a pocket at the field) picks up changes from other devices.
    const onShow = () => document.visibilityState === "visible" && void sync();
    window.addEventListener(DOCS_LOCAL, soon);
    document.addEventListener("visibilitychange", onShow);
    void sync();
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(DOCS_LOCAL, soon);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [id]);

  return null;
}

/** Bumps when sync writes a newer copy from the account, so a page can read its doc again. */
export function useDocsVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((n) => n + 1);
    window.addEventListener(DOCS_REMOTE, bump);
    return () => window.removeEventListener(DOCS_REMOTE, bump);
  }, []);
  return v;
}
