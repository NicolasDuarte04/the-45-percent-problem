import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runEvaluatorAcrossPredictions } from "@/lib/sim/runEvaluator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily reconciliation cron for the prediction evaluator.
 *
 * Schedule: 06:00 UTC daily, configured in vercel.json. Idempotent by
 * construction: the evaluator only writes a prediction_state_log row
 * when state or countCurrent differs from the persisted values, so
 * rerunning the cron on the same data produces zero new log rows.
 *
 * Auth: Vercel Cron sends Authorization: Bearer ${CRON_SECRET}. We also
 * accept BRIEF_DISPATCH_TOKEN for manual trigger during development and
 * for the admin's ad-hoc reconciliation runs.
 */

function checkCronAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const provided = auth.slice("Bearer ".length).trim();
  const candidates = [
    process.env.CRON_SECRET,
    process.env.BRIEF_DISPATCH_TOKEN,
  ].filter((s): s is string => typeof s === "string" && s.length >= 16);
  if (candidates.length === 0) return false;
  const a = Buffer.from(provided);
  for (const expected of candidates) {
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkCronAuth(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  try {
    const result = await runEvaluatorAcrossPredictions({
      triggeredByMatchId: null,
    });
    return NextResponse.json({
      ok: true,
      evaluatedCount: result.evaluatedCount,
      transitionsCount: result.transitionsCount,
    });
  } catch (err) {
    console.error("[cron/eval-predictions] evaluator failed", err);
    return NextResponse.json(
      { ok: false, error: "server" },
      { status: 500 },
    );
  }
}

// Vercel Cron pings the configured path with GET by default in some
// configurations. Mirror the POST handler for safety so a misconfigured
// schedule still triggers the evaluator instead of silently failing.
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}
