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
import type { Prediction, MatchOutcome } from "@/lib/db/schema";
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

export async function runEvaluatorAcrossPredictions(
  opts: RunEvaluatorOptions,
): Promise<RunEvaluatorResult> {
  const settled = await db.select().from(matchOutcomes);
  const candidates = await db
    .select()
    .from(predictions)
    .where(inArray(predictions.state, ["alive", "promoted"]));

  let transitionsCount = 0;
  for (const prediction of candidates) {
    const transitioned = await evaluateAndPersist(prediction, settled, opts);
    if (transitioned) transitionsCount += 1;
  }
  return { evaluatedCount: candidates.length, transitionsCount };
}

/** Evaluate a single prediction and persist any transition. Returns true
 *  when a prediction_state_log row was written. */
async function evaluateAndPersist(
  prediction: Prediction,
  settled: readonly MatchOutcome[],
  opts: RunEvaluatorOptions,
): Promise<boolean> {
  const result = evaluatePrediction({ prediction, settledMatches: settled });
  const stateChanged = result.newState !== prediction.state;
  const countChanged = result.newCountCurrent !== prediction.countCurrent;
  if (!stateChanged && !countChanged) return false;

  const now = new Date();
  await db
    .update(predictions)
    .set({
      state: result.newState,
      countCurrent: result.newCountCurrent,
      // Mirror the descriptive evaluator reason into killedBy on dead
      // transitions, and clear it when leaving dead, matching the
      // manual admin route's contract.
      killedBy:
        result.newState === "dead"
          ? result.reason.slice(0, 256)
          : null,
      updatedAt: now,
    })
    .where(eq(predictions.id, prediction.id));

  await db.insert(predictionStateLog).values({
    predictionId: prediction.id,
    previousState: prediction.state,
    newState: result.newState,
    previousCountCurrent: prediction.countCurrent,
    newCountCurrent: result.newCountCurrent,
    triggeredByMatchId: opts.triggeredByMatchId,
    reason: result.reason,
    evaluatorVersion: result.evaluatorVersion,
  });

  return true;
}
