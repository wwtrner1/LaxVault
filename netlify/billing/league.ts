import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { leagueMembers, leagues, profiles } from "../../db/schema.js";

/**
 * League pack: the owner pays once a year (offer `league_year`) and shares an
 * invite link; each coach who joins gets Coach while the league's subscription
 * is live. Billing keeps `leagues.active` in step (`syncLeague`); `planState`
 * in api.ts asks `inActiveLeague` before dropping a coach to Sideline.
 */
export const LEAGUE_SEATS = 15;

type Who = { id: string; email: string; name: string };

/** The invite token: the owner's id plus a check tied to their subscription, so an old link dies with a new subscription. */
const tokenFor = (ownerId: string, subscriptionId: string) =>
  `${ownerId}.${createHash("sha256").update(`${ownerId}:${subscriptionId}`).digest("hex").slice(0, 16)}`;

/** Billing's view: the league's subscription started, changed or ended. */
export async function syncLeague(ownerId: string, subscriptionId: string, active: boolean) {
  await db
    .insert(leagues)
    .values({ ownerId, subscriptionId, active, seats: LEAGUE_SEATS })
    .onConflictDoUpdate({ target: leagues.ownerId, set: { subscriptionId, active } });
}

/** Is this coach a member of a league whose subscription is live? */
export async function inActiveLeague(memberId: string): Promise<boolean> {
  const [row] = await db
    .select({ active: leagues.active })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagues.ownerId, leagueMembers.ownerId))
    .where(eq(leagueMembers.memberId, memberId));
  return Boolean(row?.active);
}

const seatsUsed = async (ownerId: string) => {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(leagueMembers).where(eq(leagueMembers.ownerId, ownerId));
  // The owner takes a seat too.
  return (row?.n ?? 0) + 1;
};

/** What the League page shows: the owner's league with its members and link, or the league this coach is in. */
export async function leagueView(me: Who) {
  const [own] = await db.select().from(leagues).where(eq(leagues.ownerId, me.id));
  if (own) {
    const members = await db
      .select({ id: leagueMembers.memberId, joinedAt: leagueMembers.joinedAt, email: profiles.email, name: profiles.displayName })
      .from(leagueMembers)
      .leftJoin(profiles, eq(profiles.id, leagueMembers.memberId))
      .where(eq(leagueMembers.ownerId, me.id));
    return {
      role: "owner" as const,
      name: own.name,
      active: own.active,
      seats: own.seats,
      used: members.length + 1,
      invite: own.active && own.subscriptionId ? tokenFor(me.id, own.subscriptionId) : null,
      members: members.map((m) => ({ id: m.id, email: m.email ?? "", name: m.name ?? "", joinedAt: m.joinedAt?.toISOString() ?? null })),
    };
  }
  const [mine] = await db
    .select({ ownerId: leagues.ownerId, name: leagues.name, active: leagues.active, ownerName: profiles.displayName })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagues.ownerId, leagueMembers.ownerId))
    .leftJoin(profiles, eq(profiles.id, leagues.ownerId))
    .where(eq(leagueMembers.memberId, me.id));
  if (mine) return { role: "member" as const, name: mine.name, active: mine.active, ownerName: mine.ownerName ?? "" };
  return { role: "none" as const };
}

/** A coach joins with an invite link. Returns the coach-facing refusal, or null on success. */
export async function joinLeague(me: Who, token: string): Promise<string | null> {
  const [ownerId] = token.split(".");
  if (!ownerId || ownerId === me.id) return ownerId === me.id ? "That's your own league's link. Send it to the coaches you want in." : "That invite link isn't right. Ask for a fresh one.";
  const [league] = await db.select().from(leagues).where(eq(leagues.ownerId, ownerId));
  if (!league?.subscriptionId || tokenFor(ownerId, league.subscriptionId) !== token) return "That invite link has expired. Ask for a fresh one.";
  if (!league.active) return "That league's plan isn't active right now. Ask the coach who runs it.";
  const [already] = await db.select({ ownerId: leagueMembers.ownerId }).from(leagueMembers).where(eq(leagueMembers.memberId, me.id));
  if (already?.ownerId === ownerId) return null;
  if (already) return "You're already in another league. Leave it on the League page first.";
  const [ownsOne] = await db.select({ id: leagues.ownerId }).from(leagues).where(eq(leagues.ownerId, me.id));
  if (ownsOne) return "You run a league of your own, so you can't join another.";
  if ((await seatsUsed(ownerId)) >= league.seats) return `That league has all ${league.seats} coaches. Ask them to free a seat.`;
  await db.insert(leagueMembers).values({ memberId: me.id, ownerId }).onConflictDoNothing();
  return null;
}

/** The owner removes a coach, or a coach leaves. */
export async function removeMember(me: Who, memberId: string): Promise<boolean> {
  const where = memberId === me.id ? eq(leagueMembers.memberId, me.id) : and(eq(leagueMembers.memberId, memberId), eq(leagueMembers.ownerId, me.id));
  const gone = await db.delete(leagueMembers).where(where).returning({ id: leagueMembers.memberId });
  return gone.length > 0;
}

/** The owner names the league (shown to members). */
export async function renameLeague(me: Who, name: string) {
  await db.update(leagues).set({ name: name.trim().slice(0, 60) }).where(eq(leagues.ownerId, me.id));
}

/** Account deletion: a coach's seat goes, and a league they ran stops giving anyone Coach. */
export async function forgetLeague(userId: string) {
  await db.delete(leagueMembers).where(eq(leagueMembers.memberId, userId));
  await db.delete(leagueMembers).where(eq(leagueMembers.ownerId, userId));
  await db.delete(leagues).where(eq(leagues.ownerId, userId));
}
