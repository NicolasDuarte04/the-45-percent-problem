import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import { ScenarioPayloadSchema } from "@/lib/sim/types";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import { computeRealityScoreMock } from "@/lib/sim/computeRealityScoreMock";
import { generateUniquePredictionId } from "@/lib/sim/generatePredictionId";
import { renderStoryLine } from "@/lib/sim/renderStoryLine";
import {
  toOwnerPredictionView,
  toPublicPredictionView,
} from "@/lib/sim/predictionViews";
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid", 400);
  }

  // Validate the discriminated mode/scenario union and the meta fields
  // independently so a single malformed payload yields one consistent
  // error code.
  const payload = ScenarioPayloadSchema.safeParse(body);
  const meta = MetaSchema.safeParse(body);
  if (!payload.success || !meta.success) {
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

  // Canonicalize → mock score → unique ID → server-rendered story line.
  const canonical = canonicalizeScenario(mode, scenario);
  const { count, total } = computeRealityScoreMock(mode, canonical);

  let id: string;
  try {
    id = await generateUniquePredictionId(async (candidate) => {
      const rows = await db
        .select({ id: predictions.id })
        .from(predictions)
        .where(eq(predictions.id, candidate))
        .limit(1);
      return rows.length > 0;
    });
  } catch (err) {
    console.error("[predictions] id generation exhausted", err);
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

  const rows = await db
    .select()
    .from(predictions)
    .where(eq(sql`lower(${predictions.email})`, email))
    .orderBy(desc(predictions.submittedAt));

  const response = NextResponse.json({
    ok: true,
    predictions: rows.map(toOwnerPredictionView),
  });
  response.headers.set("Set-Cookie", slidingRenewHeader(owner));
  return response;
}
