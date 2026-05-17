/**
 * Calibration digest send function (Checkpoint 14, P1.2).
 *
 * Mirrors the shape of `sendPredictionVerificationEmail`. Verifies that
 * the subscriber is active and on the prediction_tracking topic and that
 * the email is not on the suppression list before dispatching to Resend.
 * Every outcome (sent, suppressed, send-failed) writes a row to sendLog
 * so the dispatcher can rely on sendLog as the source of truth for
 * idempotency.
 */

import { eq } from "drizzle-orm";
import { render } from "@react-email/render";
import { db } from "@/lib/db";
import { sendLog, subscribers, suppressionList } from "@/lib/db/schema";
import { briefMail, getResend } from "./resend";
import {
  buildListUnsubscribeHeaders,
  signUnsubscribeToken,
} from "./hmac";
import {
  CalibrationDigestEmail,
  type CalibrationDigestTransition,
} from "@/emails/CalibrationDigestEmail";

export const CALIBRATION_DIGEST_EVENT_TYPE = "calibration_digest";
const TOPIC_PREDICTION_TRACKING = "prediction_tracking";

export interface SendCalibrationDigestInput {
  to: string;
  subscriberId: string;
  /** YYYY-MM-DD, the digest's nominal date. */
  digestDate: string;
  transitions: CalibrationDigestTransition[];
}

export type SendCalibrationDigestResult =
  | { kind: "sent"; messageId: string | null }
  | { kind: "skipped_suppression"; reason: SuppressionReason };

export type SuppressionReason =
  | "subscriber_not_found"
  | "subscriber_inactive"
  | "topic_not_subscribed"
  | "email_suppressed";

function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function buildUnsubscribeUrl(subscriberId: string): string {
  const { u, s } = signUnsubscribeToken({
    sub: subscriberId,
    iat: Math.floor(Date.now() / 1000),
  });
  return `${siteUrl()}/api/unsubscribe?u=${encodeURIComponent(u)}&s=${encodeURIComponent(s)}`;
}

export function buildCalibrationDigestSubject(count: number): string {
  if (count === 1) return "[45A] 1 forecast changed state today";
  return `[45A] ${count} forecasts changed state today`;
}

/**
 * Checks subscriber status, topic membership, and the suppression list.
 * Returns the reason a send must be skipped, or null if the dispatch may
 * proceed. Mirrors the discipline of subscribeService: every entry point
 * to the mailer goes through the same gate.
 */
export async function checkCalibrationDigestSuppression(args: {
  subscriberId: string;
  email: string;
}): Promise<SuppressionReason | null> {
  const normalizedEmail = args.email.trim().toLowerCase();

  const sup = await db
    .select({ email: suppressionList.email })
    .from(suppressionList)
    .where(eq(suppressionList.email, normalizedEmail))
    .limit(1);
  if (sup.length > 0) return "email_suppressed";

  const rows = await db
    .select({
      id: subscribers.id,
      status: subscribers.status,
      subscriptionTypes: subscribers.subscriptionTypes,
    })
    .from(subscribers)
    .where(eq(subscribers.id, args.subscriberId))
    .limit(1);
  const row = rows[0];
  if (!row) return "subscriber_not_found";
  if (row.status !== "active") return "subscriber_inactive";
  const topics = row.subscriptionTypes ?? [];
  if (!topics.includes(TOPIC_PREDICTION_TRACKING)) {
    return "topic_not_subscribed";
  }
  return null;
}

export async function sendCalibrationDigest(
  input: SendCalibrationDigestInput,
): Promise<SendCalibrationDigestResult> {
  const suppression = await checkCalibrationDigestSuppression({
    subscriberId: input.subscriberId,
    email: input.to,
  });
  if (suppression) {
    await db.insert(sendLog).values({
      subscriberId: input.subscriberId,
      eventType: CALIBRATION_DIGEST_EVENT_TYPE,
      digestDate: input.digestDate,
      status: "skipped_suppression",
      meta: { suppressionReason: suppression },
    });
    return { kind: "skipped_suppression", reason: suppression };
  }

  const subject = buildCalibrationDigestSubject(input.transitions.length);
  const unsubscribeUrl = buildUnsubscribeUrl(input.subscriberId);
  const headers = buildListUnsubscribeHeaders({ unsubscribeUrl });

  const templateProps = {
    digestDate: input.digestDate,
    subscriberEmail: input.to,
    transitions: input.transitions,
    deskUrl: `${siteUrl()}/me`,
    methodologyUrl: `${siteUrl()}/methodology`,
    unsubscribeUrl,
  };

  const html = await render(CalibrationDigestEmail(templateProps));
  const text = await render(CalibrationDigestEmail(templateProps), {
    plainText: true,
  });

  const resend = getResend();
  const result = await resend.emails.send({
    from: briefMail.from,
    replyTo: briefMail.replyTo,
    to: input.to,
    subject,
    html,
    text,
    headers,
  });

  if (result.error) {
    await db.insert(sendLog).values({
      subscriberId: input.subscriberId,
      eventType: CALIBRATION_DIGEST_EVENT_TYPE,
      digestDate: input.digestDate,
      status: "failed",
      meta: {
        error: {
          name: result.error.name,
          message: result.error.message,
        },
      },
    });
    throw new Error(
      `Resend send failed: ${result.error.name} ${result.error.message}`,
    );
  }

  const messageId = result.data?.id ?? null;
  await db.insert(sendLog).values({
    subscriberId: input.subscriberId,
    eventType: CALIBRATION_DIGEST_EVENT_TYPE,
    digestDate: input.digestDate,
    messageId,
    status: "sent",
  });
  return { kind: "sent", messageId };
}
