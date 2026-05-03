import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import { ScenarioPayloadSchema } from "@/lib/sim/types";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import { computeRealityScoreMock } from "@/lib/sim/computeRealityScoreMock";
import { generateUniquePredictionId } from "@/lib/sim/generatePredictionId";
import { renderStoryLine } from "@/lib/sim/renderStoryLine";
import { toPublicPredictionView } from "@/lib/sim/predictionViews";

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
