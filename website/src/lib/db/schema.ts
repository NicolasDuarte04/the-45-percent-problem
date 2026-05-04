import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  jsonb,
  index,
  integer,
  check,
  varchar,
  smallint,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const subscribers = pgTable(
  "subscribers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull().unique(),
    status: text("status", {
      enum: ["pending", "active", "unsubscribed", "bounced", "complained"],
    }).notNull(),
    verificationToken: text("verification_token"),
    verificationSentAt: timestamp("verification_sent_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    source: text("source"),
    locale: text("locale").default("en"),
    preferences: jsonb("preferences").default(sql`'{}'::jsonb`),
    consentText: text("consent_text").notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Active topic subscriptions. Default ARRAY['daily_brief'] back-populates
    // existing rows correctly (Phase 1 had only one channel). Net-new
    // simulator-only subscribers pass ARRAY['prediction_tracking'] explicitly
    // via subscribeService so they do not silently inherit daily-brief consent.
    subscriptionTypes: text("subscription_types")
      .array()
      .notNull()
      .default(sql`ARRAY['daily_brief']::text[]`),
  },
  (t) => [
    index("idx_subscribers_status").on(t.status),
    index("idx_subscribers_verification_token").on(t.verificationToken),
  ],
);

export const sendLog = pgTable(
  "send_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => subscribers.id),
    briefDate: date("brief_date").notNull(),
    messageId: text("message_id"),
    status: text("status").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    complainedAt: timestamp("complained_at", { withTimezone: true }),
    meta: jsonb("meta").default(sql`'{}'::jsonb`),
  },
  (t) => [
    index("idx_send_log_subscriber").on(t.subscriberId),
    index("idx_send_log_brief_date").on(t.briefDate),
  ],
);

export const unsubscribeLog = pgTable("unsubscribe_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriberId: uuid("subscriber_id").references(() => subscribers.id),
  email: text("email").notNull(),
  reason: text("reason"),
  feedbackText: text("feedback_text"),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const suppressionList = pgTable("suppression_list", {
  email: text("email").primaryKey(),
  reason: text("reason").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Subscriber = typeof subscribers.$inferSelect;
export type NewSubscriber = typeof subscribers.$inferInsert;
export type SendLogEntry = typeof sendLog.$inferSelect;
export type NewSendLogEntry = typeof sendLog.$inferInsert;

// ─── Tournament structure (FIFA World Cup 2026) ───────────────────────────────
//
// These three tables are the SINGLE SOURCE OF TRUTH for the tournament's
// static structure: who is in it, where they play, and the bracket pathway.
//
// Probabilities and other model output continue to live in the JSON snapshot
// pipeline (public/data/latest/*.json). Frontend joins by `match_id` and
// `fifa_code` at render time.
//
// Per project mandate (May 2026): NO frontend component is permitted to
// hardcode team pairings. All structural reads go through these tables.

export const venues = pgTable("venues", {
  /** Stable short key, e.g. "MetLife", "Azteca". */
  key: text("key").primaryKey(),
  /** Official FIFA stadium name. */
  stadium: text("stadium").notNull(),
  city: text("city").notNull(),
  /** Host country: "USA" | "CAN" | "MEX". */
  country: varchar("country", { length: 3 }).notNull(),
});

export const teams = pgTable(
  "teams",
  {
    /** FIFA 3-letter code. e.g. "MEX", "ARG". */
    fifaCode: varchar("fifa_code", { length: 3 }).primaryKey(),
    displayName: text("display_name").notNull(),
    confederation: text("confederation", {
      enum: ["CONMEBOL", "UEFA", "CONCACAF", "AFC", "CAF", "OFC"],
    }).notNull(),
    /** Group letter A..L. */
    group: varchar("group", { length: 1 }).notNull(),
    /** Pot index in the final draw (1-4). */
    drawPot: smallint("draw_pot").notNull(),
  },
  (t) => [index("idx_teams_group").on(t.group)],
);

export const matches = pgTable(
  "matches",
  {
    /** "M01".."M104". Stable across the tournament. */
    matchId: varchar("match_id", { length: 8 }).primaryKey(),
    round: text("round", {
      enum: ["GRP", "R32", "R16", "QF", "SF", "3P", "FIN"],
    }).notNull(),
    /** 1, 2, or 3 for group stage; null for knockout. */
    matchday: smallint("matchday"),
    /** Group letter A..L for group stage; null for knockout. */
    group: varchar("group", { length: 1 }),
    /**
     * Resolved home team's FIFA code. Null for knockout matches whose home
     * team is determined by group results or earlier KO match outcomes
     * (use `homeSlot` instead).
     */
    homeTeam: varchar("home_team", { length: 3 }).references(
      () => teams.fifaCode,
    ),
    awayTeam: varchar("away_team", { length: 3 }).references(
      () => teams.fifaCode,
    ),
    /**
     * Slot descriptor when the team is TBD: e.g. "1A" (winner of A),
     * "2C" (runner-up of C), "BEST3-CDEFI" (best 3rd-placed from those
     * groups), "WM73" (winner of match 73), "LM101" (loser of match 101).
     * Always populated for KO matches; null for resolved group fixtures.
     */
    homeSlot: text("home_slot"),
    awaySlot: text("away_slot"),
    kickoffUtc: timestamp("kickoff_utc", { withTimezone: true }).notNull(),
    venueKey: text("venue_key")
      .notNull()
      .references(() => venues.key),
  },
  (t) => [
    index("idx_matches_round").on(t.round),
    index("idx_matches_group").on(t.group),
    index("idx_matches_kickoff").on(t.kickoffUtc),
  ],
);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;

// ─── Tournament Scenario Simulator (Phase A) ────────────────────────────────
//
// Public-facing predictions submitted via /scenario. The `id` is a
// human-readable Crockford-base32 short ID (`45A-2026-XXXX`); it doubles as
// the public permalink slug. Email/subscriber FK are nullable so users can
// submit without going through the email gate.

export const predictions = pgTable(
  "predictions",
  {
    id: text("id").primaryKey(),
    subscriberId: uuid("subscriber_id").references(() => subscribers.id, {
      onDelete: "set null",
    }),
    email: text("email"),
    mode: text("mode", {
      enum: ["final_four", "champions_path", "full_bracket"],
    }).notNull(),
    scenario: jsonb("scenario").notNull(),
    storyLine: text("story_line").notNull(),
    countOriginal: integer("count_original").notNull(),
    countCurrent: integer("count_current").notNull(),
    total: integer("total").notNull().default(10000),
    state: text("state", { enum: ["alive", "dead", "promoted"] })
      .notNull()
      .default("alive"),
    killedBy: text("killed_by"),
    modelSha: text("model_sha").notNull(),
    snapshotSha: text("snapshot_sha").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_predictions_subscriber_id").on(t.subscriberId),
    index("idx_predictions_email_lower").on(sql`lower(${t.email})`),
    index("idx_predictions_state").on(t.state),
    index("idx_predictions_submitted_at").on(sql`${t.submittedAt} DESC`),
    check("predictions_total_positive", sql`${t.total} > 0`),
    check(
      "predictions_count_bounds",
      sql`${t.countOriginal} >= 0 AND ${t.countOriginal} <= ${t.total} AND ${t.countCurrent} >= 0 AND ${t.countCurrent} <= ${t.total}`,
    ),
  ],
);

export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;
