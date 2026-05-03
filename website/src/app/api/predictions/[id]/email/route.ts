import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import { subscribeService } from "@/lib/email/subscribeService";
import { isValidPredictionId } from "@/lib/sim/generatePredictionId";
import { getRarityBand } from "@/lib/sim/getRarityBand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Attach an email to a prediction per IMPL_PROMPT §10.2 + §11.
 *
 * Flow:
 *   1. Same-origin CSRF check (Origin or Referer must match
 *      NEXT_PUBLIC_SITE_URL's host). Per handoff §3 addition (d):
 *      this mirrors the Origin/Referer pattern intended for the email
 *      subsystem. Per the same note, we do NOT touch /api/subscribe's
 *      CSRF behavior in this commit.
 *   2. Rate limit (10/min per IP) — same shape as /api/subscribe; this
 *      route also creates DB rows and triggers email sends.
 *   3. Validate path id and JSON body.
 *   4. Look up the prediction row.
 *   5. Hand off to subscribeService (kind='simulator') with the
 *      prediction's storyLine and rarity band so the verification
 *      email's context block is populated.
 *   6. Attach the resulting subscriber id + lowercase email to the
 *      prediction row.
 *
 * Return-shape semantics:
 *   - suppressed | complained: 409 with the explicit error code so the
 *     UI can surface "this email cannot be added to notifications"
 *     per §11.6. Distinct codes preserve ops visibility.
 *   - created | reactivated: 200 with status — fresh verification email
 *     sent.
 *   - already_pending | already_active: 200 with status — no fresh email,
 *     but the prediction is still attached to the existing subscriber.
 *     UI can render an "already on file" affordance. Cross-device
 *     cookie acquisition for already_active users is a Phase B concern
 *     (per IMPL_PROMPT §19, magic-link sign-in lands then).
 *   - send_failed: 502.
 */

const EmailBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

function clientKey(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || "unknown";
  return `predictions-email:${ip}`;
}

function jsonError(
  variant: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ ok: false, error: variant, ...extra }, { status });
}

function expectedHost(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host;
  } catch {
    return null;
  }
}

function checkSameOrigin(req: NextRequest): boolean {
  const expected = expectedHost();
  if (!expected) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === expected;
    } catch {
      return false;
    }
  }
  // Some browsers omit Origin on same-origin POSTs; fall back to Referer.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === expected;
    } catch {
      return false;
    }
  }
  // No Origin and no Referer → reject.
  return false;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!checkSameOrigin(req)) {
    return jsonError("forbidden", 403);
  }

  const { id } = await ctx.params;
  if (!isValidPredictionId(id)) {
    return jsonError("invalid", 400);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid", 400);
  }
  const parsed = EmailBody.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalid", 400);
  }
  const { email } = parsed.data;

  const limit = rateLimit({ key: clientKey(req), limit: 10, windowMs: 60_000 });
  if (!limit.ok) {
    return jsonError("rateLimit", 429, {
      retryAfterMs: Math.max(0, limit.resetMs - Date.now()),
    });
  }

  const rows = await db
    .select()
    .from(predictions)
    .where(eq(predictions.id, id))
    .limit(1);
  const prediction = rows[0];
  if (!prediction) {
    return jsonError("notFound", 404);
  }

  // Derive rarity band server-side so the verification email shows the
  // same band the user just saw on screen, even if the DB row is later
  // promoted/demoted by Phase B's eval cron.
  const rarity = getRarityBand(prediction.countCurrent, prediction.total);

  let result;
  try {
    result = await subscribeService({
      email,
      source: "simulator",
      kind: "simulator",
      predictionId: id,
      storyLine: prediction.storyLine,
      rarityBand: rarity.band,
    });
  } catch (err) {
    console.error("[predictions/email] subscribeService threw", err);
    return jsonError("server", 500);
  }

  switch (result.kind) {
    case "suppressed":
      return jsonError("suppressed", 409);
    case "complained":
      return jsonError("complained", 409);
    case "send_failed":
      return jsonError("server", 502);
    case "created":
    case "reactivated":
    case "already_pending":
    case "already_active": {
      await db
        .update(predictions)
        .set({
          subscriberId: result.subscriberId,
          email,
          updatedAt: new Date(),
        })
        .where(eq(predictions.id, id));

      return NextResponse.json({ ok: true, status: result.kind });
    }
  }
}
