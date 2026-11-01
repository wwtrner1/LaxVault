import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** One row per Identity user who has saved anything. */
export const profiles = pgTable("profiles", {
  id: text().primaryKey(), // Netlify Identity user id
  email: text().notNull(),
  displayName: text("display_name").notNull().default(""),
  team: text().notNull().default(""),
  /** Verified mobile number (E.164). One account per phone, one phone per account. */
  phone: text().unique(),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  /** Plan id from src/lib/plan.ts. The server enforces its limits; Stripe billing is the only writer for paying coaches. The old default "beta" is retired and reads as Sideline. */
  plan: text().notNull().default("beta"),
  createdAt: timestamp("created_at").defaultNow(),
  /** Last time the app talked to the server as this coach (throttled to every few minutes). */
  lastActiveAt: timestamp("last_active_at"),
  /** End of the 14-day Head Coach trial. Set only while plan is "trial"; the server drops the coach to Sideline after it. */
  trialEndsAt: timestamp("trial_ends_at"),
  /** Stripe's ids for this coach, set when they first pay. Billing (netlify/billing/stripe.ts) is the only writer of plan after that. */
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  /** End of a one-time Season Pass. Past it, with no subscription, the coach is back on Sideline. */
  planEndsAt: timestamp("plan_ends_at"),
});

/**
 * One row per person who has been given a trial: a fingerprint of their email
 * (variants folded together) and, once verified, of their phone. Kept after the
 * account is deleted, so deleting and signing up again doesn't start another.
 * Fingerprints only: never the address or number.
 */
export const trialClaims = pgTable("trial_claims", {
  keyHash: text("key_hash").primaryKey(),
  kind: text().notNull(), // "email" | "phone"
  userId: text("user_id").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow(),
});

/**
 * One row per account that deleted itself, so the owner's signup history and the
 * free-plan abuse checks survive deletion. Only fingerprints of the phone are
 * kept, never the number, and no plays.
 */
export const accountLedger = pgTable("account_ledger", {
  userId: text("user_id").primaryKey(),
  email: text().notNull(),
  name: text().notNull().default(""),
  /** SHA-256 of the verified phone number, or "" when there was none. */
  phoneHash: text("phone_hash").notNull().default(""),
  lastPlan: text("last_plan").notNull().default(""),
  playCount: integer("play_count").notNull().default(0),
  signedUpAt: timestamp("signed_up_at"),
  deletedAt: timestamp("deleted_at").defaultNow(),
});

/** Everything the owner does in /admin: who, what, to whom. Append-only. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    actorId: text("actor_id").notNull(),
    actorEmail: text("actor_email").notNull(),
    action: text().notNull(),
    targetId: text("target_id").notNull().default(""),
    detail: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    at: timestamp().defaultNow(),
  },
  (t) => [index("audit_log_at_idx").on(t.at)],
);

/**
 * Devices a coach has confirmed with a code to his phone. A sign-in from
 * any other device needs a code; at most three are kept per account.
 */
export const trustedDevices = pgTable(
  "trusted_devices",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    /** SHA-256 of the random device id the browser keeps; the id itself is never stored. */
    deviceHash: text("device_hash").notNull(),
    label: text().notNull().default(""),
    lastSeen: timestamp("last_seen").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("trusted_devices_owner_device_idx").on(t.ownerId, t.deviceHash)],
);

/** A single diagrammed play. `scene` holds the editor document. */
export const plays = pgTable(
  "plays",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    ownerName: text("owner_name").notNull().default(""),
    name: text().notNull(),
    formation: text().notNull().default(""),
    playType: text("play_type").notNull().default("pass"),
    personnel: text().notNull().default("5v5"),
    description: text().notNull().default(""),
    tags: jsonb().$type<string[]>().notNull().default([]),
    fieldView: text("field_view").notNull().default("full"),
    scene: jsonb().$type<unknown>().notNull(),
    preview: text().notNull().default(""), // inline SVG thumbnail
    isPublic: boolean("is_public").notNull().default(false),
    saveCount: integer("save_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("plays_owner_idx").on(t.ownerId),
    index("plays_public_idx").on(t.isPublic),
  ],
);

/** A folder of plays. */
export const playbooks = pgTable("playbooks", {
  id: uuid().primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull(),
  name: text().notNull(),
  description: text().notNull().default(""),
  color: text().notNull().default("#DB5A33"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const playbookPlays = pgTable(
  "playbook_plays",
  {
    id: uuid().primaryKey().defaultRandom(),
    playbookId: uuid("playbook_id")
      .notNull()
      .references(() => playbooks.id, { onDelete: "cascade" }),
    playId: uuid("play_id")
      .notNull()
      .references(() => plays.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("playbook_plays_book_idx").on(t.playbookId)],
);

/** Copies of public plays that a coach pulled into their own library. */
export const playSaves = pgTable(
  "play_saves",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    playId: uuid("play_id")
      .notNull()
      .references(() => plays.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("play_saves_user_idx").on(t.userId)],
);

/**
 * Counted calls per coach per day, so one account can't run up the texting bill.
 * `kind` is "texts" today (sign-in codes Twilio actually sent).
 */
export const dailyUsage = pgTable(
  "daily_usage",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    day: text().notNull(), // YYYY-MM-DD, UTC
    kind: text().notNull(),
    count: integer().notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [uniqueIndex("daily_usage_owner_day_kind_idx").on(t.ownerId, t.day, t.kind)],
);

/**
 * The three usage events (play_created, practice_opened, play_exported)
 * that track() beacons, kept for signed-in coaches only.
 */
export const events = pgTable(
  "events",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, string | number | boolean | null>>().notNull().default({}),
    at: timestamp().defaultNow(),
  },
  (t) => [index("events_owner_idx").on(t.ownerId)],
);

/**
 * One row per visit (a browser tab's session), for the owner's visitor counts and
 * time on site. No IP address, no cookie and no user id: `visitor` is a hash of the
 * browser's random id and the day, so it can't follow anyone from one day to the next.
 */
export const visits = pgTable(
  "visits",
  {
    id: uuid().primaryKey().defaultRandom(),
    sid: text().notNull(),
    day: text().notNull(), // YYYY-MM-DD, UTC
    visitor: text().notNull(),
    signedIn: boolean("signed_in").notNull().default(false),
    landing: text().notNull().default("/"),
    referrer: text().notNull().default(""), // host only
    device: text().notNull().default("desktop"),
    pages: integer().notNull().default(1),
    /** Seconds the page was visible, summed from heartbeats. */
    seconds: integer().notNull().default(0),
    startedAt: timestamp("started_at").defaultNow(),
    lastBeatAt: timestamp("last_beat_at").defaultNow(),
  },
  (t) => [uniqueIndex("visits_sid_idx").on(t.sid), index("visits_day_idx").on(t.day)],
);

/**
 * A copy of every play, playbook or Season Grid a coach deletes, kept for 30 days
 * so the owner can put it back if it was deleted by mistake. Account deletion
 * does not use this: it removes the coach's work for good.
 */
export const trash = pgTable(
  "trash",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    kind: text().notNull(), // "play" | "playbook"
    originalId: text("original_id").notNull(),
    name: text().notNull().default(""),
    /** The whole row, plus `playIds` for a playbook's members. */
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    deletedAt: timestamp("deleted_at").defaultNow(),
    restoredAt: timestamp("restored_at"),
  },
  (t) => [index("trash_owner_idx").on(t.ownerId)],
);

/**
 * A coach's browser documents copied to the account: `kind` "drills" holds the
 * drill library (plus ids deleted recently, so a delete reaches every device),
 * "practice" holds the practice script. One row per coach and kind; the newest
 * copy wins, merged per drill in the browser (src/lib/docSync.ts).
 */
export const coachDocs = pgTable(
  "coach_docs",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    kind: text().notNull(), // "drills" | "practice" | "plans"
    data: jsonb().$type<unknown>().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [uniqueIndex("coach_docs_owner_kind_idx").on(t.ownerId, t.kind)],
);

/**
 * A League pack: one paid subscription (the owner's) that gives up to `seats`
 * coaches Coach. Billing (netlify/billing/stripe.ts) keeps `active` in step
 * with the subscription; members join with the owner's invite link.
 */
export const leagues = pgTable("leagues", {
  ownerId: text("owner_id").primaryKey(),
  name: text().notNull().default(""),
  subscriptionId: text("subscription_id"),
  seats: integer().notNull().default(15),
  active: boolean().notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

/** One row per coach in a league; a coach is in at most one. */
export const leagueMembers = pgTable(
  "league_members",
  {
    memberId: text("member_id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (t) => [index("league_members_owner_idx").on(t.ownerId)],
);

/**
 * Small server-side settings the app writes itself, so the owner has nothing to paste:
 * `stripe_prices` (the price ids setup made) and `stripe_webhook_secret` (the signing secret of
 * the endpoint setup made). Only the API reads or writes this table.
 */
export const appSettings = pgTable("app_settings", {
  key: text().primaryKey(),
  value: text().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Stripe events already handled, so a resent webhook (Stripe retries and sometimes sends twice) changes nothing the second time. */
export const stripeEvents = pgTable("stripe_events", {
  id: text().primaryKey(),
  type: text().notNull(),
  receivedAt: timestamp("received_at").defaultNow(),
});

/** Player links: a playbook frozen for players, opened with no account at /team/<token>. One link per playbook (`source`). */
export const playbookShares = pgTable(
  "playbook_shares",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    token: text().notNull(),
    source: text().notNull().default(""),
    name: text().notNull(),
    snapshot: jsonb().$type<unknown>().notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [uniqueIndex("playbook_shares_token_idx").on(t.token), index("playbook_shares_owner_idx").on(t.ownerId)],
);

/** Play quiz scores players send back to the coach who shared the playbook. */
export const quizResults = pgTable(
  "quiz_results",
  {
    id: uuid().primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => playbookShares.id, { onDelete: "cascade" }),
    playerName: text("player_name").notNull().default(""),
    letter: text().notNull().default(""),
    score: integer().notNull(),
    total: integer().notNull(),
    at: timestamp().defaultNow(),
  },
  (t) => [index("quiz_results_share_idx").on(t.shareId)],
);
