/**
 * Calibration digest dispatcher (Checkpoint 14, P1.2).
 *
 * Queries prediction_state_log for real state transitions
 * (previousState !== newState) since the cutoff, groups them by
 * subscriber, and dispatches one digest per subscriber. Idempotent: if
 * the dispatcher is re-run on the same window, the per-subscriber check
 * against sendLog (eventType='calibration_digest', digestDate) produces
 * zero new sends.
 */

import { and, eq, gte, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  predictions,
  predictionStateLog,
  sendLog,
  subscribers,
} from "@/lib/db/schema";
import {
  CALIBRATION_DIGEST_EVENT_TYPE,
  sendCalibrationDigest,
} from "./calibrationDigest";
import type {
  CalibrationDigestMode,
  CalibrationDigestState,
  CalibrationDigestTransition,
} from "@/emails/CalibrationDigestEmail";

export interface DispatchCalibrationDigestsArgs {
  /** YYYY-MM-DD, the digest's nominal date. Used as the sendLog dedupe key. */
  digestDate: string;
  /** Lower bound on prediction_state_log.evaluatedAt. */
  sinceCutoff: Date;
}

export interface DispatchCalibrationDigestsResult {
  dispatchedCount: number;
  skippedCount: number;
  failureCount: number;
}

function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function buildPermalinkUrl(predictionId: string): string {
  return `${siteUrl()}/scenario/p/${encodeURIComponent(predictionId)}`;
}

interface GroupedRow {
  subscriberId: string;
  email: string;
  transition: CalibrationDigestTransition;
}

async function loadTransitions(
  sinceCutoff: Date,
): Promise<GroupedRow[]> {
  const rows = await db
    .select({
      subscriberId: predictions.subscriberId,
      email: subscribers.email,
      predictionId: predictionStateLog.predictionId,
      mode: predictions.mode,
      storyLine: predictions.storyLine,
      previousState: predictionStateLog.previousState,
      newState: predictionStateLog.newState,
      reason: predictionStateLog.reason,
    })
    .from(predictionStateLog)
    .innerJoin(
      predictions,
      eq(predictionStateLog.predictionId, predictions.id),
    )
    .innerJoin(
      subscribers,
      eq(predictions.subscriberId, subscribers.id),
    )
    .where(
      and(
        gte(predictionStateLog.evaluatedAt, sinceCutoff),
        ne(predictionStateLog.previousState, predictionStateLog.newState),
      ),
    );

  const grouped: GroupedRow[] = [];
  for (const row of rows) {
    // The inner joins guarantee subscriberId and email are non-null, but
    // the predictions.subscriberId column type is nullable. Skip defensively.
    if (!row.subscriberId || !row.email) continue;
    grouped.push({
      subscriberId: row.subscriberId,
      email: row.email,
      transition: {
        predictionId: row.predictionId,
        mode: row.mode as CalibrationDigestMode,
        storyLine: row.storyLine,
        previousState: row.previousState as CalibrationDigestState,
        newState: row.newState as CalibrationDigestState,
        reason: row.reason,
        permalinkUrl: buildPermalinkUrl(row.predictionId),
      },
    });
  }
  return grouped;
}

async function hasAlreadyReceivedDigest(args: {
  subscriberId: string;
  digestDate: string;
}): Promise<boolean> {
  const rows = await db
    .select({ id: sendLog.id })
    .from(sendLog)
    .where(
      and(
        eq(sendLog.eventType, CALIBRATION_DIGEST_EVENT_TYPE),
        eq(sendLog.subscriberId, args.subscriberId),
        eq(sendLog.digestDate, args.digestDate),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function dispatchCalibrationDigests(
  args: DispatchCalibrationDigestsArgs,
): Promise<DispatchCalibrationDigestsResult> {
  const groupedRows = await loadTransitions(args.sinceCutoff);

  // Group by subscriber. Within a subscriber, dedupe transitions by
  // predictionId (the evaluator only writes one log row per transition,
  // but the cron can run after a manual admin re-eval that produced a
  // second row; keep the latest by appending order, which matches the
  // db read order for a stable ordering).
  type Bundle = {
    subscriberId: string;
    email: string;
    transitions: CalibrationDigestTransition[];
    seen: Set<string>;
  };
  const bySubscriber = new Map<string, Bundle>();
  for (const row of groupedRows) {
    let bundle = bySubscriber.get(row.subscriberId);
    if (!bundle) {
      bundle = {
        subscriberId: row.subscriberId,
        email: row.email,
        transitions: [],
        seen: new Set<string>(),
      };
      bySubscriber.set(row.subscriberId, bundle);
    }
    if (bundle.seen.has(row.transition.predictionId)) continue;
    bundle.seen.add(row.transition.predictionId);
    bundle.transitions.push(row.transition);
  }

  let dispatchedCount = 0;
  let skippedCount = 0;
  let failureCount = 0;

  for (const bundle of bySubscriber.values()) {
    const alreadySent = await hasAlreadyReceivedDigest({
      subscriberId: bundle.subscriberId,
      digestDate: args.digestDate,
    });
    if (alreadySent) {
      skippedCount += 1;
      continue;
    }

    try {
      const result = await sendCalibrationDigest({
        to: bundle.email,
        subscriberId: bundle.subscriberId,
        digestDate: args.digestDate,
        transitions: bundle.transitions,
      });
      if (result.kind === "sent") {
        dispatchedCount += 1;
      } else {
        skippedCount += 1;
      }
    } catch (err) {
      console.error(
        `[calibrationDispatcher] send failed for subscriber ${bundle.subscriberId}`,
        err,
      );
      failureCount += 1;
    }
  }

  return { dispatchedCount, skippedCount, failureCount };
}
