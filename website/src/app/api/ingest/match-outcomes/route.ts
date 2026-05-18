import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { matchOutcomes } from "@/lib/db/schema";
import { runEvaluatorAcrossPredictions } from "@/lib/sim/runEvaluator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ingest route for batched live WC 2026 match outcomes (Checkpoint 15).
 *
 * Auth: Bearer token compared against INGEST_TOKEN with timing-safe
 * equality. Distinct from BRIEF_DISPATCH_TOKEN so the live-ingestion
 * credentials can rotate independently from the admin credentials. The
 * Python script `ingestion/fetch_match_outcomes.py` is the canonical
 * caller; the GitHub Action ships it INGEST_TOKEN.
 *
 * Body: { outcomes: MatchOutcomeInput[] }. Maximum 50 outcomes per
 * request (the WC 2026 schedule has 104 matches total; 50 per call is a
 * comfortable hard cap for the hourly cadence, well above any single
 * matchday's settled count).
 *
 * Effect: each outcome upserts to match_outcomes with the same
 * on-conflict-update semantics as the admin route. After all upserts
 * succeed, a single runEvaluatorAcrossPredictions call re-evaluates
 * every alive and promoted prediction. The evaluator's idempotency
 * (no log row when state and count are unchanged) keeps batched calls
 * cheap.
 *
 * Failure modes:
 *   - Auth failure: 401.
 *   - Body parse / schema fail: 400 with issues.
 *   - DB upsert failure: 500.
 *   - DB succeeds, evaluator throws: 207 Multi-Status with
 *     { ok: true, accepted, evaluatorError: "deferred" }. The daily
 *     reconciliation cron picks up the gap. This mirrors the admin
 *     route's graceful-degradation pattern.
 */

const INGEST_TOKEN_ENV = "INGEST_TOKEN";
const MAX_BATCH = 50;

const TeamCodeSchema = z.string().regex(/^[A-Z]{3}$/);
const StageSchema = z.enum(["group", "r32", "r16", "qf", "sf", "final"]);

const OutcomeSchema = z
  .object({
    matchId: z.string().trim().min(1).max(32),
    competition: z.string().trim().min(1).max(32).default("WC2026"),
    stage: StageSchema,
    homeTeam: TeamCodeSchema,
    awayTeam: TeamCodeSchema,
    homeGoals: z.number().int().nonnegative().max(99),
    awayGoals: z.number().int().nonnegative().max(99),
    shootoutWinner: TeamCodeSchema.optional(),
    settledAt: z.string().datetime(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.homeTeam === data.awayTeam) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["awayTeam"],
        message: "home_and_away_identical",
      });
    }
    if (
      data.shootoutWinner &&
      data.shootoutWinner !== data.homeTeam &&
      data.shootoutWinner !== data.awayTeam
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shootoutWinner"],
        message: "shootout_winner_not_in_match",
      });
    }
    if (data.shootoutWinner && data.homeGoals !== data.awayGoals) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shootoutWinner"],
        message: "shootout_only_when_drawn",
      });
    }
  });

const BodySchema = z.object({
  outcomes: z.array(OutcomeSchema).min(1).max(MAX_BATCH),
});

function jsonError(
  variant: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ ok: false, error: variant, ...extra }, { status });
}

function checkIngestAuth(req: NextRequest): boolean {
  const expected = process.env[INGEST_TOKEN_ENV];
  if (!expected || expected.length < 16) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const provided = auth.slice("Bearer ".length).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkIngestAuth(req)) {
    return jsonError("unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid", 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalid", 400, { issues: parsed.error.flatten() });
  }
  const { outcomes } = parsed.data;

  try {
    for (const data of outcomes) {
      await db
        .insert(matchOutcomes)
        .values({
          matchId: data.matchId,
          competition: data.competition,
          stage: data.stage,
          homeTeam: data.homeTeam,
          awayTeam: data.awayTeam,
          homeGoals: data.homeGoals,
          awayGoals: data.awayGoals,
          shootoutWinner: data.shootoutWinner ?? null,
          settledAt: new Date(data.settledAt),
          enteredBy: "ingest",
          meta: data.meta ?? {},
        })
        .onConflictDoUpdate({
          target: matchOutcomes.matchId,
          set: {
            competition: data.competition,
            stage: data.stage,
            homeTeam: data.homeTeam,
            awayTeam: data.awayTeam,
            homeGoals: data.homeGoals,
            awayGoals: data.awayGoals,
            shootoutWinner: data.shootoutWinner ?? null,
            settledAt: new Date(data.settledAt),
            meta: data.meta ?? {},
          },
        });
    }
  } catch (err) {
    console.error("[ingest/match-outcomes] upsert failed", err);
    return jsonError("server", 500);
  }

  let transitionsCount = 0;
  try {
    // The trigger field accepts a single matchId. For a batched ingest
    // we stamp the first outcome's matchId; the daily reconciliation
    // cron remains the safety net regardless. A future polish could
    // pass the full batch and have the runner stamp per-prediction.
    const result = await runEvaluatorAcrossPredictions({
      triggeredByMatchId: outcomes[0].matchId,
    });
    transitionsCount = result.transitionsCount;
  } catch (err) {
    console.error("[ingest/match-outcomes] evaluator failed", err);
    return NextResponse.json(
      {
        ok: true,
        accepted: outcomes.length,
        transitionsCount: 0,
        evaluatorError: "deferred",
      },
      { status: 207 },
    );
  }

  return NextResponse.json({
    ok: true,
    accepted: outcomes.length,
    transitionsCount,
  });
}
