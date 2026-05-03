import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import {
  CONSENT_TEXT,
  generateVerificationToken,
  sendVerificationEmail,
} from "@/lib/email/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SubscribeBody = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "invalid_format" })
    .max(254),
  source: z.string().trim().max(64).optional(),
  // Optional Turnstile token: server-side verification is deferred in v1.
  // TODO(turnstile): when NEXT_PUBLIC_TURNSTILE_ENABLED is flipped on, POST
  // this token to https://challenges.cloudflare.com/turnstile/v0/siteverify
  // with TURNSTILE_SECRET_KEY before continuing.
  turnstileToken: z.string().max(2048).optional(),
});

function clientKey(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || "unknown";
  return `subscribe:${ip}`;
}

function jsonError(
  variant: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ ok: false, error: variant, ...extra }, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid", 400);
  }

  const parsed = SubscribeBody.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const variant = issue?.message === "invalid_format" ? "invalid" : "invalid";
    return jsonError(variant, 400);
  }

  const { email, source, turnstileToken } = parsed.data;

  // TODO(turnstile): verify turnstileToken when NEXT_PUBLIC_TURNSTILE_ENABLED.
  void turnstileToken;

  const limit = rateLimit({ key: clientKey(req), limit: 10, windowMs: 60_000 });
  if (!limit.ok) {
    return jsonError("rateLimit", 429, {
      retryAfterMs: Math.max(0, limit.resetMs - Date.now()),
    });
  }

  const token = generateVerificationToken();
  const now = new Date();

  const existing = await db
    .select({ id: subscribers.id, status: subscribers.status })
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);

  const row = existing[0];

  if (row?.status === "active") {
    return jsonError("active", 409);
  }
  if (row?.status === "pending") {
    return jsonError("pending", 409);
  }

  if (row && (row.status === "unsubscribed" || row.status === "bounced")) {
    // Reactivate: new pending token, clear unsubscribed timestamp.
    await db
      .update(subscribers)
      .set({
        status: "pending",
        verificationToken: token,
        verificationSentAt: now,
        unsubscribedAt: null,
        consentText: CONSENT_TEXT,
        consentAt: now,
        source: source ?? null,
      })
      .where(eq(subscribers.id, row.id));
  } else if (row?.status === "complained") {
    // Hard stop. Do not let a complained address re-enroll silently.
    return jsonError("active", 409);
  } else {
    await db.insert(subscribers).values({
      email,
      status: "pending",
      verificationToken: token,
      verificationSentAt: now,
      source: source ?? null,
      consentText: CONSENT_TEXT,
      consentAt: now,
    });
  }

  try {
    await sendVerificationEmail({ to: email, token });
  } catch (err) {
    console.error("[subscribe] verification email send failed", err);
    return jsonError("server", 502);
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
