import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscribers, suppressionList } from "@/lib/db/schema";
import {
  CONSENT_TEXT,
  generateVerificationToken,
  sendVerificationEmail,
} from "./verification";
import { sendPredictionVerificationEmail } from "./predictionVerification";

export type SubscribeSource = "newsletter" | "simulator";

export interface SubscribeServiceInput {
  email: string;
  /** Free-text source label retained for analytics; behavior keys off `kind`. */
  source: string;
  /** Behavior selector: simulator routes use `simulator`; everything else
   *  (including unknown free-text source values) falls back to `newsletter`. */
  kind: SubscribeSource;
  /** Required when `kind === 'simulator'`. */
  predictionId?: string;
  /** Verification email needs these for simulator-scoped context. */
  storyLine?: string;
  rarityBand?: string;
  /** Optional Turnstile token; verification deferred per Phase 5 plan. */
  turnstileToken?: string;
}

export type SubscribeServiceResult =
  | { kind: "created"; subscriberId: string }
  | { kind: "reactivated"; subscriberId: string }
  | { kind: "already_pending"; subscriberId: string }
  | { kind: "already_active"; subscriberId: string }
  | { kind: "complained" }
  | { kind: "suppressed" }
  | { kind: "send_failed" };

const TOPIC_DAILY_BRIEF = "daily_brief";
const TOPIC_PREDICTION_TRACKING = "prediction_tracking";

/**
 * Single-source subscribe entry point shared by `/api/subscribe` (newsletter)
 * and `/api/predictions/[id]/email` (simulator). Honors the project's
 * locked rules: Postgres is the single source of truth, the existing
 * Resend client is the only mailer, and the suppression list is enforced.
 */
export async function subscribeService(
  input: SubscribeServiceInput,
): Promise<SubscribeServiceResult> {
  const email = input.email.trim().toLowerCase();
  // Normalize unknown sources to newsletter semantics.
  const kind: SubscribeSource = input.kind === "simulator" ? "simulator" : "newsletter";

  // Simulator path requires a prediction context.
  if (kind === "simulator" && !input.predictionId) {
    throw new Error("subscribeService: simulator path requires predictionId");
  }

  // Suppression check: applies to both paths. Hard stop, never bypassed.
  const sup = await db
    .select({ email: suppressionList.email })
    .from(suppressionList)
    .where(eq(suppressionList.email, email))
    .limit(1);
  if (sup.length > 0) {
    return { kind: "suppressed" };
  }

  const existing = await db
    .select({
      id: subscribers.id,
      status: subscribers.status,
      subscriptionTypes: subscribers.subscriptionTypes,
    })
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);
  const row = existing[0];

  const desiredTopic = kind === "simulator" ? TOPIC_PREDICTION_TRACKING : TOPIC_DAILY_BRIEF;
  const now = new Date();

  let subscriberId: string;
  let outcome: SubscribeServiceResult["kind"];

  if (row?.status === "complained") {
    return { kind: "complained" };
  }

  if (row?.status === "active") {
    // Already active: merge desired topic without removing existing ones,
    // skip verification email, return without throwing. The simulator's
    // calling endpoint will still attach the prediction to this subscriber.
    const merged = mergeTopics(row.subscriptionTypes ?? [], desiredTopic);
    if (!arraysEqual(merged, row.subscriptionTypes ?? [])) {
      await db
        .update(subscribers)
        .set({ subscriptionTypes: merged })
        .where(eq(subscribers.id, row.id));
    }
    return { kind: "already_active", subscriberId: row.id };
  }

  if (row?.status === "pending") {
    // Already pending: do not regenerate token (avoids token-burning a
    // legitimate in-flight verification). Merge topics so the eventual
    // verification confirms the right ones.
    const merged = mergeTopics(row.subscriptionTypes ?? [], desiredTopic);
    if (!arraysEqual(merged, row.subscriptionTypes ?? [])) {
      await db
        .update(subscribers)
        .set({ subscriptionTypes: merged })
        .where(eq(subscribers.id, row.id));
    }
    return { kind: "already_pending", subscriberId: row.id };
  }

  // Net-new path or reactivation from unsubscribed/bounced.
  const token = generateVerificationToken();

  if (row && (row.status === "unsubscribed" || row.status === "bounced")) {
    // Reactivate. Merge the desired topic into whatever subscription_types
    // the row currently carries. For an `unsubscribed` row the array is
    // empty (per resolution #5: status only flips to unsubscribed when
    // the array empties), so the merge degenerates to [desiredTopic].
    // For `bounced` the array is preserved as-is plus the new topic, so
    // a daily-brief subscriber whose mailbox bounced and later returns
    // through the simulator keeps daily_brief alongside prediction_tracking.
    const merged = mergeTopics(row.subscriptionTypes ?? [], desiredTopic);
    await db
      .update(subscribers)
      .set({
        status: "pending",
        verificationToken: token,
        verificationSentAt: now,
        unsubscribedAt: null,
        consentText: CONSENT_TEXT,
        consentAt: now,
        source: input.source ?? null,
        subscriptionTypes: merged,
      })
      .where(eq(subscribers.id, row.id));
    subscriberId = row.id;
    outcome = "reactivated";
  } else {
    // Net-new insert. Explicitly set subscription_types to the desired
    // single topic, overriding the column-level default of ['daily_brief'].
    const inserted = await db
      .insert(subscribers)
      .values({
        email,
        status: "pending",
        verificationToken: token,
        verificationSentAt: now,
        source: input.source ?? null,
        consentText: CONSENT_TEXT,
        consentAt: now,
        subscriptionTypes: [desiredTopic],
      })
      .returning({ id: subscribers.id });
    subscriberId = inserted[0].id;
    outcome = "created";
  }

  // Dispatch verification email: template depends on path.
  try {
    if (kind === "simulator") {
      await sendPredictionVerificationEmail({
        to: email,
        token,
        predictionId: input.predictionId!,
        rarityBand: input.rarityBand ?? "",
        storyLine: input.storyLine ?? "",
      });
    } else {
      await sendVerificationEmail({ to: email, token });
    }
  } catch (err) {
    // Surface the failure; the row is in pending state but the user
    // never got the email. The route handler should respond 502.
    console.error("[subscribeService] verification email send failed", err);
    return { kind: "send_failed" };
  }

  return { kind: outcome, subscriberId };
}

function mergeTopics(existing: string[], add: string): string[] {
  const set = new Set(existing);
  set.add(add);
  return [...set];
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  return aSorted.every((v, i) => v === bSorted[i]);
}
