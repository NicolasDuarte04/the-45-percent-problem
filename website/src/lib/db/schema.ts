import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  jsonb,
  index,
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
