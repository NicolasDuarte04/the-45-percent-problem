/**
 * Runner for the Phase B prediction evaluator. Walks alive and promoted
 * predictions, evaluates each against the current settled-match set, and
 * writes transitions to predictions and prediction_state_log.
 *
 * Both the admin match-outcomes route (triggered re-evaluation after a
 * new outcome is entered) and the daily eval-predictions cron call this
 * runner. Idempotency: the runner only writes a row to
 * prediction_state_log when state OR countCurrent changes from the
 * persisted value, so repeated runs on unchanged data produce zero log
 * rows.
 */

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  predictions,
  predictionStateLog,
  matchOutcomes,
} from "@/lib/db/schema";
import type {
  NewPredictionStateLogEntry,
} from "@/lib/db/schema";
import { evaluatePrediction } from "./predictionEvaluator";

export interface RunEvaluatorOptions {
  /** Match ID that triggered this run. Stamped on every transition row
   *  written during this run. Null for the daily reconciliation cron. */
  triggeredByMatchId: string | null;
}

export interface RunEvaluatorResult {
  evaluatedCount: number;
  transitionsCount: number;
}

interface PendingUpdate {
  id: string;
  state: "alive" | "dead" | "promoted";
  countCurrent: number;
  killedBy: string | null;
}

export async function runEvaluatorAcrossPredictions(
  opts: RunEvaluatorOptions,
): Promise<RunEvaluatorResult> {
  const settled = await db.select().from(matchOutcomes);
  const candidates = await db
    .select()
    .from(predictions)
    .where(inArray(predictions.state, ["alive", "promoted"]));

  // Phase B's prior implementation issued one UPDATE + one INSERT per
  // transitioned prediction inside the loop, in series. On a busy
  // matchday with a few thousand alive predictions that produced
  // thousands of sequential DB roundtrips inside a single request,
  // making the admin/ingest synchronous evaluator path a credible
  // 60s-timeout candidate. We now evaluate purely in memory, then
  // issue parallel UPDATEs (bounded by the pool size) plus a single
  // batched INSERT for the audit-log rows.
  const pendingUpdates: PendingUpdate[] = [];
  const pendingLogRows: NewPredictionStateLogEntry[] = [];
  const now = new Date();

  for (const prediction of candidates) {
    const result = evaluatePrediction({ prediction, settledMatches: settled });
    const stateChanged = result.newState !== prediction.state;
    const countChanged = result.newCountCurrent !== prediction.countCurrent;
    if (!stateChanged && !countChanged) continue;

    pendingUpdates.push({
      id: prediction.id,
      state: result.newState,
      countCurrent: result.newCountCurrent,
      // Mirror the descriptive evaluator reason into killedBy on dead
      // transitions, and clear it when leaving dead, matching the
      // manual admin route's contract.
      killedBy:
        result.newState === "dead" ? result.reason.slice(0, 256) : null,
    });
    pendingLogRows.push({
      predictionId: prediction.id,
      previousState: prediction.state,
      newState: result.newState,
      previousCountCurrent: prediction.countCurrent,
      newCountCurrent: result.newCountCurrent,
      triggeredByMatchId: opts.triggeredByMatchId,
      reason: result.reason,
      evaluatorVersion: result.evaluatorVersion,
    });
  }

  if (pendingLogRows.length > 0) {
    await Promise.all(
      pendingUpdates.map((u) =>
        db
          .update(predictions)
          .set({
            state: u.state,
            countCurrent: u.countCurrent,
            killedBy: u.killedBy,
            updatedAt: now,
          })
          .where(eq(predictions.id, u.id)),
      ),
    );
    await db.insert(predictionStateLog).values(pendingLogRows);
  }

  return {
    evaluatedCount: candidates.length,
    transitionsCount: pendingLogRows.length,
  };
}
