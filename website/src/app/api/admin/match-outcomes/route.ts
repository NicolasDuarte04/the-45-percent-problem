import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { matchOutcomes } from "@/lib/db/schema";
import { runEvaluatorAcrossPredictions } from "@/lib/sim/runEvaluator";
import { revalidatePublicSnapshotRoutes } from "@/lib/revalidation";
import { triggerOnDemandRegen } from "@/lib/regenDispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin route for entering a settled WC 2026 match outcome.
 *
 * Auth: Bearer token compared against BRIEF_DISPATCH_TOKEN with
 * timing-safe equality, mirroring the existing
 * /api/admin/predictions/[id]/state route.
 *
 * Effect: upserts the outcome by matchId (admin can correct a wrong
 * entry by re-posting the same matchId with updated values) and
 * synchronously runs the evaluator across all alive and promoted
 * predictions. The synchronous re-evaluation is the "live" path that
 * makes outcome entry meaningful; the daily eval-predictions cron is
 * the safety-net reconciliation.
 */

const ADMIN_TOKEN_ENV = "BRIEF_DISPATCH_TOKEN";

const TeamCodeSchema = z.string().regex(/^[A-Z]{3}$/);

// "3p" is the third-place playoff (cp-43). The manual admin fallback
// accepts it too so an operator can correct or backfill the bronze match
// through the same stage vocabulary as the live ingest path.
const StageSchema = z.enum(["group", "r32", "r16", "qf", "sf", "3p", "final"]);

const BodySchema = z
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

function jsonError(
  variant: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ ok: false, error: variant, ...extra }, { status });
}

function checkAdminAuth(req: NextRequest): boolean {
  const expected = process.env[ADMIN_TOKEN_ENV];
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
  if (!checkAdminAuth(req)) {
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
  const data = parsed.data;

  try {
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
        enteredBy: "brief-dispatch",
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
  } catch (err) {
    console.error("[admin/match-outcomes] insert failed", err);
    return jsonError("server", 500);
  }

  // cp-13 (Fix 6): the outcome is now durably committed, so refresh the public
  // surface. Two independent effects, neither of which may fail the response:
  //   1. revalidatePublicSnapshotRoutes() purges the static render caches
  //      (forward-compatible; harmless today, load-bearing once a public route
  //      reads settled data at request time).
  //   2. triggerOnDemandRegen() fires the snapshot-regeneration workflow — the
  //      path that actually re-conditions the MC and rewrites the bracket JSON.
  // Both run regardless of evaluator success, since the upsert is what changes
  // the public snapshot. Failures are reported in the body, never thrown.
  const revalidation = revalidatePublicSnapshotRoutes();
  const regenDispatch = await triggerOnDemandRegen({
    reason: "admin-match-outcome",
    triggeredByMatchId: data.matchId,
  });

  let transitionsCount = 0;
  try {
    const result = await runEvaluatorAcrossPredictions({
      triggeredByMatchId: data.matchId,
    });
    transitionsCount = result.transitionsCount;
  } catch (err) {
    console.error("[admin/match-outcomes] evaluator failed", err);
    // The outcome insert already succeeded; surface a partial-success
    // response so the admin knows to retry the eval pass (the daily cron
    // would catch the gap regardless).
    return NextResponse.json(
      {
        ok: true,
        transitionsCount: 0,
        evaluatorError: "deferred",
        revalidation,
        regenDispatch,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    transitionsCount,
    revalidation,
    regenDispatch,
  });
}
