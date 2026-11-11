import { desc, gte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { feedback } from "../../db/schema.js";

/** At most this many notes a day across everyone, so a bot can't fill the table. */
const DAILY_CAP = 300;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Keeps a Help & feedback note. Returns a coach-facing error, or null when it's stored. */
export async function saveFeedback(raw: unknown, who: { id: string; email: string } | null): Promise<string | null> {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (clip(b.company, 200)) return null; // honeypot: look sent, store nothing
  const note = clip(b.note, 4000);
  if (!note) return "Tell us what to improve — two sentences is plenty.";
  const since = new Date(Date.now() - 86_400_000);
  const [today] = await db.select({ n: sql<number>`count(*)::int` }).from(feedback).where(gte(feedback.at, since));
  if ((today?.n ?? 0) >= DAILY_CAP) return "We've had a flood of notes today. Try again tomorrow.";
  const rating = Number(b.rating);
  await db.insert(feedback).values({
    userId: who?.id ?? null,
    email: clip(b.email, 200) || who?.email || "",
    area: clip(b.area, 60),
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    note,
    page: clip(b.page, 200),
  });
  return null;
}

/** The newest notes for the owner console. */
export const recentFeedback = () => db.select().from(feedback).orderBy(desc(feedback.at)).limit(200);
