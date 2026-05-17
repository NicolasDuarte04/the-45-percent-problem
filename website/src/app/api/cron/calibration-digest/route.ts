import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dispatchCalibrationDigests } from "@/lib/email/calibrationDispatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily calibration digest cron (Checkpoint 14, P1.2).
 *
 * Schedule: 06:05 UTC daily, configured in vercel.json. Runs five minutes
 * after eval-predictions so the audit log is fully up to date. Reads the
 * 24-hour window of new transitions from prediction_state_log and
 * dispatches one email per subscriber with at least one transition.
 *
 * Idempotency: the dispatcher checks send_log per (subscriber, digest_date)
 * before sending, so a second cron run on the same digest_date produces
 * zero new sends.
 *
 * Auth: mirrors eval-predictions. Accepts Vercel Cron's bearer token
 * (CRON_SECRET) and the developer-facing BRIEF_DISPATCH_TOKEN for manual
 * triggering.
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

function todayUtcDate(now: Date): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkCronAuth(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const now = new Date();
  const digestDate = todayUtcDate(now);
  const sinceCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const result = await dispatchCalibrationDigests({
      digestDate,
      sinceCutoff,
    });
    return NextResponse.json({
      ok: true,
      dispatchedCount: result.dispatchedCount,
      skippedCount: result.skippedCount,
      failureCount: result.failureCount,
    });
  } catch (err) {
    console.error("[cron/calibration-digest] dispatcher failed", err);
    return NextResponse.json(
      { ok: false, error: "server" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}
