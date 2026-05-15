import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import { ScenarioPayloadSchema } from "@/lib/sim/types";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import { computeRealityScore } from "@/lib/sim/computeRealityScore";
import { generateUniquePredictionId } from "@/lib/sim/generatePredictionId";
import { getUserPredictions } from "@/lib/sim/getUserPredictions";
import { renderStoryLine } from "@/lib/sim/renderStoryLine";
import { toPublicPredictionView } from "@/lib/sim/predictionViews";
import {
  COOKIE_NAME as OWNER_COOKIE_NAME,
  slidingRenewHeader,
  verifyOwnerCookie,
} from "@/lib/sim/ownerCookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per handoff §3 addition (b): /api/predictions rate limit is 30 per hour
// per IP — looser than /api/subscribe's 10/min, since users may legitimately
// submit a few scenarios in one session.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const ShaSchema = z.string().trim().min(3).max(128);
const MetaSchema = z.object({
  modelSha: ShaSchema,
  snapshotSha: ShaSchema,
});

function clientKey(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || "unknown";
  return `predictions:${ip}`;
}

function jsonError(
  variant: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ ok: false, error: variant, ...extra }, { status });
}

/**
 * Map a list of Zod issues to the compact { path, code, message } shape
 * we surface in 400 responses (under `?debug=1`). Keeps the server log
 * and the wire payload in sync.
 */
function summarizeZodIssues(
  issues: readonly z.ZodIssue[],
): Array<{ path: string; code: string; message: string }> {
  return issues.map((i) => ({
    path: i.path.join("."),
    code: i.code,
    message: i.message,
  }));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // `?debug=1` opts the response into surfacing structured Zod issues
  // alongside the `invalid` error code. Off by default — including in
  // production — so the wire stays sparse on the happy path.
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid", 400, debug ? { reason: "malformed_json" } : undefined);
  }

  // Validate the discriminated mode/scenario union and the meta fields
  // independently so a single malformed payload yields one consistent
  // error code. When `?debug=1`, surface the offending field paths so
  // the client can show the user which slot is wrong.
  const payload = ScenarioPayloadSchema.safeParse(body);
  const meta = MetaSchema.safeParse(body);
  if (!payload.success || !meta.success) {
    if (debug) {
      const issues = [
        ...(payload.success ? [] : payload.error.issues),
        ...(meta.success ? [] : meta.error.issues),
      ];
      return jsonError("invalid", 400, { issues: summarizeZodIssues(issues) });
    }
    return jsonError("invalid", 400);
  }

  const limit = rateLimit({
    key: clientKey(req),
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  if (!limit.ok) {
    return jsonError("rateLimit", 429, {
      retryAfterMs: Math.max(0, limit.resetMs - Date.now()),
    });
  }

  const { mode, scenario } = payload.data;
  const { modelSha, snapshotSha } = meta.data;

  // Canonicalize → real score → unique ID → server-rendered story line.
  const canonical = canonicalizeScenario(mode, scenario);
  const { count, total } = computeRealityScore(mode, canonical, scenario);

  // Track DB failures inside `existsCheck` separately from the
  // `generateUniquePredictionId` exhaustion case. Conflating them (the
  // pre-fix behavior) made a missing `predictions` table look like a
  // statistical impossibility instead of an unrun migration.
  let dbErr: unknown = null;
  let id: string;
  try {
    id = await generateUniquePredictionId(async (candidate) => {
      try {
        const rows = await db
          .select({ id: predictions.id })
          .from(predictions)
          .where(eq(predictions.id, candidate))
          .limit(1);
        return rows.length > 0;
      } catch (err) {
        dbErr = err;
        // Re-throw so generateUniquePredictionId stops; the outer catch
        // will see this and return a 500 with the real cause logged.
        throw err;
      }
    });
  } catch (err) {
    if (dbErr) {
      console.error("[predictions] id existence check failed (DB)", dbErr);
    } else {
      console.error("[predictions] id generation exhausted", err);
    }
    return jsonError("server", 500);
  }

  const storyLine = renderStoryLine(mode, scenario);

  let inserted;
  try {
    const result = await db
      .insert(predictions)
      .values({
        id,
        subscriberId: null,
        email: null,
        mode,
        scenario,
        storyLine,
        countOriginal: count,
        countCurrent: count,
        total,
        modelSha,
        snapshotSha,
      })
      .returning();
    inserted = result[0];
  } catch (err) {
    console.error("[predictions] insert failed", err);
    return jsonError("server", 500);
  }

  if (!inserted) {
    console.error("[predictions] insert returned no row", { id });
    return jsonError("server", 500);
  }

  return NextResponse.json(
    { ok: true, prediction: toPublicPredictionView(inserted) },
    { status: 201 },
  );
}

const EmailQuery = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

/**
 * Owner-scoped dashboard list per IMPL_PROMPT §10.3.
 *
 * Authentication is the signed `45a:sim:owner` cookie set by /api/verify
 * after a simulator subscriber confirms their address. The query
 * `?email=` must equal the cookie's email exactly (case-insensitive
 * after lowercasing) — this prevents cookie holders from enumerating
 * other users' predictions.
 *
 * Behavior:
 *   - No cookie / invalid cookie / email mismatch → 200 with empty list.
 *     Per the spec ("If no signed cookie is present, return an empty
 *     list"), no auth signal leaks: callers can't distinguish missing-
 *     cookie from email-mismatch from no-predictions.
 *   - Valid cookie + matching email → 200 with the user's predictions,
 *     newest first. Cookie is sliding-renewed on the response so a
 *     returning user keeps their session.
 *
 * No rate limit in Phase A (read-only, scoped to one user, low cost).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const parsed = EmailQuery.safeParse({
    email: req.nextUrl.searchParams.get("email") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const { email } = parsed.data;

  const cookieValue = req.cookies.get(OWNER_COOKIE_NAME)?.value;
  const owner = verifyOwnerCookie(cookieValue);

  // Empty-list response shape, used for every "not authorized to see"
  // outcome so the endpoint reveals no discriminating signal.
  const empty = NextResponse.json({ ok: true, predictions: [] });

  if (!owner) return empty;
  if (owner.email.toLowerCase() !== email) return empty;

  const ownerPredictions = await getUserPredictions(email);

  const response = NextResponse.json({
    ok: true,
    predictions: ownerPredictions,
  });
  response.headers.set("Set-Cookie", slidingRenewHeader(owner));
  return response;
}
