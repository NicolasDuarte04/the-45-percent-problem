import type { Prediction } from "@/lib/db/schema";
import type {
  AnyScenario,
  Mode,
  PredictionState,
  PublicPredictionView,
} from "./types";

/**
 * Strip a stored prediction row to the shape that is safe to return to
 * any caller that has the prediction ID — including the public permalink
 * `/scenario/p/[id]`. Removes `email` and `subscriberId`; preserves
 * everything the Trade Ticket and dashboard need to render.
 *
 * Per addition (c) in the previous session's resolutions: the public
 * permalink must not leak email or subscriber_id.
 */
export function toPublicPredictionView(row: Prediction): PublicPredictionView {
  return {
    id: row.id,
    mode: row.mode as Mode,
    scenario: row.scenario as AnyScenario,
    storyLine: row.storyLine,
    countOriginal: row.countOriginal,
    countCurrent: row.countCurrent,
    total: row.total,
    state: row.state as PredictionState,
    killedBy: row.killedBy,
    modelSha: row.modelSha,
    snapshotSha: row.snapshotSha,
    submittedAt: row.submittedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    // Boolean derived server-side from the FK; the email itself never
    // crosses into the public view. Per IMPL_PROMPT §11.7 we infer
    // tracking from `subscriber_id IS NULL` rather than maintaining a
    // separate `dismissedEmailGate` column.
    hasTracking: row.subscriberId !== null,
  };
}

/**
 * Owner-scoped view used by the dashboard list endpoint. Includes the
 * (lowercased) email — the dashboard already proved ownership via the
 * signed `45a:sim:owner` cookie, and showing the email back is useful
 * UX. Still strips `subscriberId` (an internal join key with no
 * external value).
 */
export interface OwnerPredictionView extends PublicPredictionView {
  email: string | null;
}

export function toOwnerPredictionView(row: Prediction): OwnerPredictionView {
  return {
    ...toPublicPredictionView(row),
    email: row.email,
  };
}
