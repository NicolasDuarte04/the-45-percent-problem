import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { isValidPredictionId } from "@/lib/sim/generatePredictionId";
import { toPublicPredictionView } from "@/lib/sim/predictionViews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Developer-only state-mutation endpoint per IMPL_PROMPT §16.
 *
 * Auth: Bearer token compared against `BRIEF_DISPATCH_TOKEN` with
 * timing-safe equality. We deliberately reuse the email subsystem's
 * existing admin token (renamed from the IMPL_PROMPT's
 * `ADMIN_DISPATCH_TOKEN` during the dispatch→brief rename); see the
 * commit message for the call. If a separate per-endpoint secret is
 * preferred, swap this constant — no other plumbing changes.
 *
 * Purpose: visual QA of the dashboard's three state variants until the
 * Phase B/C eval cron arrives. Not surfaced in any UI.
 */

const ADMIN_TOKEN_ENV = "BRIEF_DISPATCH_TOKEN";

const StateBody = z.object({
  state: z.enum(["alive", "dead", "promoted"]),
  killedBy: z.string().trim().max(256).optional(),
});

function jsonError(
  variant: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ ok: false, error: variant, ...extra }, { status });
}

function checkAdminAuth(req: NextRequest): boolean {
  const expected = process.env[ADMIN_TOKEN_ENV];
  if (!expected || expected.length < 16) {
    // Misconfigured server: refuse rather than allow.
    return false;
  }
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const provided = auth.slice("Bearer ".length).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!checkAdminAuth(req)) {
    return jsonError("unauthorized", 401);
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
  const parsed = StateBody.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalid", 400);
  }
  const { state, killedBy } = parsed.data;

  const now = new Date();
  const result = await db
    .update(predictions)
    .set({
      state,
      // Only set killedBy when entering 'dead'. Clear it on the 'alive'
      // transition so a previously-dead row that's manually revived
      // doesn't carry stale reason text.
      killedBy: state === "dead" ? (killedBy ?? null) : null,
      updatedAt: now,
    })
    .where(eq(predictions.id, id))
    .returning();

  const row = result[0];
  if (!row) {
    return jsonError("notFound", 404);
  }

  return NextResponse.json({ ok: true, prediction: toPublicPredictionView(row) });
}
