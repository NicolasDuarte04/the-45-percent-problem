import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { predictions, predictionStateLog } from "@/lib/db/schema";
import { isValidPredictionId } from "@/lib/sim/generatePredictionId";
import { toPublicPredictionView } from "@/lib/sim/predictionViews";
import { EVALUATOR_VERSION } from "@/lib/sim/predictionEvaluator";

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
 * preferred, swap this constant: no other plumbing changes.
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

  // Read the current row first so we can record the previous state in the
  // audit log. The audit log is populated by both this manual route and
  // the automated evaluator path; manual transitions land with a null
  // triggeredByMatchId since they are not tied to a specific match.
  const existing = await db
    .select()
    .from(predictions)
    .where(eq(predictions.id, id))
    .limit(1);
  const current = existing[0];
  if (!current) {
    return jsonError("notFound", 404);
  }

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

  // Audit-log the manual transition when the state actually changed.
  // No-op transitions (admin re-applying the same state) do not produce
  // a log row, mirroring the evaluator's idempotency contract.
  if (current.state !== state) {
    await db.insert(predictionStateLog).values({
      predictionId: id,
      previousState: current.state,
      newState: state,
      previousCountCurrent: current.countCurrent,
      newCountCurrent: current.countCurrent,
      triggeredByMatchId: null,
      reason:
        state === "dead"
          ? `Manual admin transition. ${killedBy ?? "no reason recorded"}`
          : "Manual admin transition.",
      evaluatorVersion: EVALUATOR_VERSION,
    });
  }

  return NextResponse.json({ ok: true, prediction: toPublicPredictionView(row) });
}
