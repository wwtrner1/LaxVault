import { randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { playbookShares, quizResults } from "../../db/schema.js";
import { gatePlayerLink, type Gate, type Tier } from "../../src/lib/plan.js";
import { cleanSnapshot, SHARE_LIMITS, type Snapshot } from "../../src/lib/share.js";

/**
 * Player links (Coach and up): a coach freezes a playbook behind an
 * unguessable token; players open it at /team/<token> with no account, see
 * their job on every play, take the play quiz, and the score comes back.
 */
export const SHARE_TOKEN = /^[A-Za-z0-9_-]{16,40}$/;
const newToken = () => randomBytes(16).toString("base64url");

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (message: string, status = 400) => json({ error: message }, status);
const planFail = (gate: Extract<Gate, { ok: false }>) => json({ error: gate.reason, code: "plan_limit", cta: gate.cta }, 403);

/** What a player gets: the frozen playbook and nothing about the coach. A link whose coach dropped below Coach stops opening. */
export async function openShare(token: string, planOfOwner: (ownerId: string) => Promise<Tier>) {
  const [row] = await db.select().from(playbookShares).where(eq(playbookShares.token, token));
  if (!row) return fail("This link isn't active any more. Ask your coach for a new one.", 404);
  if (!gatePlayerLink(await planOfOwner(row.ownerId)).ok) return fail("This link is paused. Ask your coach to turn it back on.", 403);
  const snap = row.snapshot as Snapshot;
  return json({ share: { name: snap.name, plays: snap.plays, team: snap.team ?? null, updatedAt: row.updatedAt } });
}

/** A player's quiz score. Anyone with the link may send one; the numbers are checked, the oldest are dropped. */
export async function sendScore(token: string, body: Record<string, unknown>) {
  const [share] = await db.select({ id: playbookShares.id }).from(playbookShares).where(eq(playbookShares.token, token));
  if (!share) return fail("This link isn't active any more. Ask your coach for a new one.", 404);
  const total = Math.trunc(Number(body.total));
  const score = Math.trunc(Number(body.score));
  const letter = String(body.letter ?? "").trim().toUpperCase();
  if (!(total >= 1 && total <= 30) || !(score >= 0 && score <= total) || !/^[A-Z0-9]{1,3}$/.test(letter)) return fail("That score couldn't be sent.");
  const playerName = String(body.name ?? "").trim().slice(0, SHARE_LIMITS.playerName);
  await db.insert(quizResults).values({ shareId: share.id, playerName, letter, score, total });
  await db.execute(sql`delete from quiz_results where share_id = ${share.id} and id not in (select id from quiz_results where share_id = ${share.id} order by at desc limit ${SHARE_LIMITS.results})`);
  return json({ ok: true }, 201);
}

/** The coach's own links: list, create or refresh, scores, turn off. */
export async function shareRoute(ownerId: string, tier: Tier, method: string, token: string | undefined, action: string | undefined, req: Request) {
  if (method === "GET" && !token) {
    const rows = await db
      .select({
        token: playbookShares.token,
        source: playbookShares.source,
        name: playbookShares.name,
        snapshot: playbookShares.snapshot,
        updatedAt: playbookShares.updatedAt,
        results: sql<number>`(select count(*)::int from quiz_results r where r.share_id = ${playbookShares.id})`,
      })
      .from(playbookShares)
      .where(eq(playbookShares.ownerId, ownerId))
      .orderBy(desc(playbookShares.updatedAt));
    return json({ shares: rows.map((r) => ({ token: r.token, source: r.source, name: r.name, plays: (r.snapshot as Snapshot).plays.length, updatedAt: r.updatedAt, results: r.results })) });
  }

  if (method === "POST" && !token) {
    const gate = gatePlayerLink(tier);
    if (!gate.ok) return planFail(gate);
    const body = (await req.json().catch(() => ({}))) as { snapshot?: unknown; source?: unknown };
    const snap = cleanSnapshot(body.snapshot);
    if (typeof snap === "string") return fail(snap);
    const source = String(body.source ?? "").slice(0, 80);
    // One link per playbook: sharing it again refreshes the plays and keeps the address players already have.
    if (source) {
      const [mine] = await db.select({ id: playbookShares.id, token: playbookShares.token }).from(playbookShares).where(and(eq(playbookShares.ownerId, ownerId), eq(playbookShares.source, source)));
      if (mine) {
        await db.update(playbookShares).set({ name: snap.name, snapshot: snap, updatedAt: new Date() }).where(eq(playbookShares.id, mine.id));
        return json({ token: mine.token });
      }
    }
    const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(playbookShares).where(eq(playbookShares.ownerId, ownerId));
    if ((count?.n ?? 0) >= SHARE_LIMITS.links) return fail(`You have ${SHARE_LIMITS.links} player links. Turn off one you no longer use, then try again.`, 403);
    const created = newToken();
    await db.insert(playbookShares).values({ ownerId, token: created, source, name: snap.name, snapshot: snap });
    return json({ token: created }, 201);
  }

  if (!token || !SHARE_TOKEN.test(token)) return fail("That link isn't one of yours.", 404);
  const [row] = await db.select().from(playbookShares).where(and(eq(playbookShares.token, token), eq(playbookShares.ownerId, ownerId)));
  if (!row) return fail("That link isn't one of yours.", 404);

  if (method === "GET" && action === "results") {
    const rows = await db.select().from(quizResults).where(eq(quizResults.shareId, row.id)).orderBy(desc(quizResults.at)).limit(SHARE_LIMITS.results);
    return json({ results: rows.map((r) => ({ id: r.id, playerName: r.playerName, letter: r.letter, score: r.score, total: r.total, at: r.at })) });
  }
  if (method === "DELETE") {
    await db.delete(playbookShares).where(eq(playbookShares.id, row.id));
    return json({ ok: true });
  }
  return fail("That address is not part of the player link API.", 404);
}
