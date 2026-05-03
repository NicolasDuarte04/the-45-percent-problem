import { randomBytes } from "node:crypto";
import { render } from "@react-email/render";
import { briefMail, getResend } from "./resend";
import { VerificationEmail } from "@/emails/VerificationEmail";

const TOKEN_BYTES = 32;
export const VERIFICATION_TOKEN_TTL_HOURS = 24;

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

export async function sendVerificationEmail(opts: {
  to: string;
  token: string;
}): Promise<{ messageId: string | null }> {
  const verifyUrl = buildVerifyUrl(opts.token);
  const subject = "[45A] Confirm your subscription";

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
  const result = await resend.emails.send({
    from: briefMail.from,
    replyTo: briefMail.replyTo,
    to: opts.to,
    subject,
    html,
    text,
  });

  if (result.error) {
    throw new Error(
      `Resend send failed: ${result.error.name} ${result.error.message}`,
    );
  }
  return { messageId: result.data?.id ?? null };
}

export const CONSENT_TEXT =
  "I agree to receive the 45analytics daily brief at 12:00 UTC. Methodology is open. I can unsubscribe with one click from any email.";
