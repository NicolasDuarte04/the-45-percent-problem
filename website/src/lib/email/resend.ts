import { Resend } from "resend";

declare global {
  // eslint-disable-next-line no-var
  var __briefResend: Resend | undefined;
}

function buildClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to .env.local / Vercel env before importing this module.",
    );
  }
  return new Resend(apiKey);
}

export function getResend(): Resend {
  if (process.env.NODE_ENV === "production") {
    return buildClient();
  }
  if (!global.__briefResend) {
    global.__briefResend = buildClient();
  }
  return global.__briefResend;
}

export const briefMail = {
  from: process.env.RESEND_FROM_ADDRESS ?? "brief@45analytics.com",
  replyTo: process.env.RESEND_REPLY_TO ?? "hello@45analytics.com",
} as const;
