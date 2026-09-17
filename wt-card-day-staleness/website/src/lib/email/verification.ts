import { randomBytes } from "node:crypto";
import { render } from "@react-email/render";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendLog, subscribers } from "@/lib/db/schema";
import { briefMail, getResend } from "./resend";
import { VerificationEmail } from "@/emails/VerificationEmail";

const TOKEN_BYTES = 32;
export const VERIFICATION_TOKEN_TTL_HOURS = 24;

// send_log event_type for double-opt-in confirmation emails. Distinct from
// 'brief' and 'calibration_digest' so the operator can slice verification
// deliverability (sent / failed / delivered / bounced) on its own.
export const VERIFICATION_EVENT_TYPE = "verification";

// Minimum gap between two verification sends to the same pending address.
// The subscribe route re-sends on a repeat submit (the first email likely
// went to spam); this floor stops rapid repeat submissions from issuing a
// burst of emails. It layers under the per-IP rate limit in the route.
export const VERIFICATION_RESEND_THROTTLE_MS = 60_000;

function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not set.");
  }
  return url.replace(/\/$/, "");
}

export function generateVerificationToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function buildVerifyUrl(token: string): string {
  return `${siteUrl()}/api/verify?token=${encodeURIComponent(token)}`;
}

const VERIFICATION_SUBJECT =
  "Confirm your subscription to the 45analytics daily brief";

type ResendResult = {
  data: { id?: string } | null;
  error: { name: string; message: string } | null;
};

// Single render + Resend dispatch shared by the pure sender and the
// logging wrapper. Returns the raw Resend result so callers can decide
// how to record success vs failure.
async function dispatchVerification(opts: {
  to: string;
  token: string;
}): Promise<ResendResult> {
  const verifyUrl = buildVerifyUrl(opts.token);
  const html = await render(
    VerificationEmail({
      verifyUrl,
      expiresInHours: VERIFICATION_TOKEN_TTL_HOURS,
    }),
  );
  const text = await render(
    VerificationEmail({
      verifyUrl,
      expiresInHours: VERIFICATION_TOKEN_TTL_HOURS,
    }),
    { plainText: true },
  );

  const resend = getResend();
  return (await resend.emails.send({
    from: briefMail.from,
    replyTo: briefMail.replyTo,
    to: opts.to,
    subject: VERIFICATION_SUBJECT,
    html,
    text,
  })) as ResendResult;
}

/**
 * Pure send: dispatch the verification email and return the Resend message
 * id, throwing on a Resend error. No database writes. Used by the shared
 * subscribeService (simulator / prediction-attach) newsletter branch, whose
 * row bookkeeping lives in that module.
 */
export async function sendVerificationEmail(opts: {
  to: string;
  token: string;
}): Promise<{ messageId: string | null }> {
  const result = await dispatchVerification(opts);
  if (result.error) {
    throw new Error(
      `Resend send failed: ${result.error.name} ${result.error.message}`,
    );
  }
  return { messageId: result.data?.id ?? null };
}

/**
 * Send the verification email AND record the outcome.
 *
 * On success: writes a `sent` row to send_log and stamps
 * `verification_sent_at` on the subscriber. The stamp is written only
 * after Resend accepts the send, so a pending row honestly reflects an
 * email that actually went out (the row is inserted with a null
 * verification_sent_at by the caller).
 *
 * On failure: writes a `failed` row to send_log (with the Resend error in
 * meta) and throws, leaving verification_sent_at null so the caller can
 * surface a 502 and the address stays eligible for an immediate re-send.
 */
export async function deliverVerificationEmail(opts: {
  subscriberId: string;
  to: string;
  token: string;
}): Promise<{ messageId: string | null }> {
  const result = await dispatchVerification({ to: opts.to, token: opts.token });

  if (result.error) {
    await db.insert(sendLog).values({
      subscriberId: opts.subscriberId,
      eventType: VERIFICATION_EVENT_TYPE,
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

  await db
    .update(subscribers)
    .set({ verificationSentAt: new Date() })
    .where(eq(subscribers.id, opts.subscriberId));

  await db.insert(sendLog).values({
    subscriberId: opts.subscriberId,
    eventType: VERIFICATION_EVENT_TYPE,
    messageId,
    status: "sent",
  });

  return { messageId };
}

export const CONSENT_TEXT =
  "I agree to receive the 45analytics daily brief at 12:00 UTC. Methodology is open. I can unsubscribe with one click from any email.";
