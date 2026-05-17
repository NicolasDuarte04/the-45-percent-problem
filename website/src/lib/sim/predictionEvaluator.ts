/**
 * Phase B prediction evaluator (Checkpoint 13).
 *
 * Given a prediction and the full set of settled match outcomes, returns the
 * prediction's new state and countCurrent. The caller (admin route or cron
 * route) writes the result to the predictions row and appends a
 * prediction_state_log entry when the state or count differs from the
 * current persisted values.
 *
 * Design notes:
 *
 *   1. Pure function. No database access, no clock reads. Determinism makes
 *      the cron idempotent: rerunning the evaluator on the same inputs
 *      always produces the same output, so the comparison in the caller
 *      correctly skips a no-op transition.
 *
 *   2. The conditional probability math uses the simpler "joint of remaining
 *      picks' marginals" approximation specced for Phase B. Per-team
 *      marginals come from snapshotProbs. A future polish can replace this
 *      with conditional probabilities computed against the current settled
 *      state (e.g., conditioning each pSF on the team having survived its
 *      current stage), but the audit log preserves the evaluator version so
 *      a re-evaluation pass remains feasible.
 *
 *   3. Reason strings are descriptive, not evaluative. They are surfaced
 *      verbatim in calibration emails (Checkpoint 14). No sentiment words.
 *
 *   4. The evaluator never throws on an unknown team. Unknown teams fall
 *      back to a neutral path (alive, count unchanged). This keeps the cron
 *      robust to data drift; the admin should be alerted out of band if a
 *      team is missing from the snapshot.
 */

import { TEAM_PROBS, type TeamProbs } from "./snapshotProbs";
import { detectFullBracketStage, type FullBracketStage } from "./types";
import type {
  AnyScenario,
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  Mode,
  PredictionState,
} from "./types";
import type { Prediction, MatchOutcome } from "@/lib/db/schema";

export const EVALUATOR_VERSION = "v1";

/** Stage names used across match_outcomes and the evaluator. */
export type MatchStage = "group" | "r32" | "r16" | "qf" | "sf" | "final";

export interface EvaluatorInput {
  prediction: Prediction;
  settledMatches: readonly MatchOutcome[];
}

export interface EvaluatorOutput {
  newState: PredictionState;
  newCountCurrent: number;
  reason: string;
  evaluatorVersion: string;
}

// ─── Public entry point ─────────────────────────────────────────────────────

export function evaluatePrediction(input: EvaluatorInput): EvaluatorOutput {
  const { prediction, settledMatches } = input;
  const mode = prediction.mode as Mode;
  const scenario = prediction.scenario as AnyScenario;
  const total = prediction.total;
  const countCurrent = prediction.countCurrent;

  let inner: InnerResult;
  switch (mode) {
    case "final_four":
      inner = evaluateFinalFour(scenario as FinalFourScenario, settledMatches, total);
      break;
    case "champions_path":
      inner = evaluateChampionsPath(
        scenario as ChampionsPathScenario,
        settledMatches,
        total,
        countCurrent,
      );
      break;
    case "full_bracket":
      inner = evaluateFullBracket(
        scenario as FullBracketScenario,
        settledMatches,
        total,
        countCurrent,
      );
      break;
  }

  return {
    newState: inner.state,
    newCountCurrent: clampCount(inner.count, total),
    reason: inner.reason,
    evaluatorVersion: EVALUATOR_VERSION,
  };
}

interface InnerResult {
  state: PredictionState;
  count: number;
  reason: string;
}

function clampCount(count: number, total: number): number {
  if (!Number.isFinite(count) || count < 0) return 0;
  if (count > total) return total;
  return Math.round(count);
}

// ─── Match-outcome helpers ──────────────────────────────────────────────────

/** Winner of a settled match, or null if it was drawn with no shootout
 *  (which cannot happen in WC 2026 knockout matches; for group matches a
 *  null winner is the natural draw outcome). */
function matchWinner(match: MatchOutcome): string | null {
  if (match.homeGoals > match.awayGoals) return match.homeTeam;
  if (match.awayGoals > match.homeGoals) return match.awayTeam;
  return match.shootoutWinner ?? null;
}

function matchLoser(match: MatchOutcome): string | null {
  const winner = matchWinner(match);
  if (!winner) return null;
  return winner === match.homeTeam ? match.awayTeam : match.homeTeam;
}

function teamInMatch(match: MatchOutcome, team: string): boolean {
  return match.homeTeam === team || match.awayTeam === team;
}

function formatScore(match: MatchOutcome): string {
  const base = `${match.homeGoals}-${match.awayGoals}`;
  if (match.shootoutWinner) {
    return `${base} (shootout)`;
  }
  return base;
}

// ─── Final Four ─────────────────────────────────────────────────────────────
//
// User picks 4 teams to reach the semifinals. Knockout stages r32, r16, qf
// can eliminate a pick (loser of any of those matches who is one of the
// user's picks). A pick is "in the SF" once it wins its QF match. All four
// picks in the SF means promoted.

function evaluateFinalFour(
  scenario: FinalFourScenario,
  settled: readonly MatchOutcome[],
  total: number,
): InnerResult {
  const picks = scenario.semifinalists;
  const knockoutKillStages: MatchStage[] = ["r32", "r16", "qf"];

  // Detect a dead transition first. A pick that lost a r32/r16/qf match
  // cannot reach the SF.
  for (const match of settled) {
    if (!knockoutKillStages.includes(match.stage as MatchStage)) continue;
    const loser = matchLoser(match);
    if (!loser) continue;
    if (picks.includes(loser)) {
      return {
        state: "dead",
        count: 0,
        reason: `${loser} eliminated in ${stageLabel(match.stage as MatchStage)} vs ${winnerOf(match)} (${formatScore(match)}). Scenario contradicted.`,
      };
    }
  }

  // Detect promotion. A pick "reached the SF" when it won a QF match.
  const reachedSf = new Set<string>();
  for (const match of settled) {
    if (match.stage !== "qf") continue;
    const winner = matchWinner(match);
    if (winner && picks.includes(winner)) {
      reachedSf.add(winner);
    }
  }
  if (reachedSf.size === picks.length) {
    return {
      state: "promoted",
      count: total,
      reason: `All four semifinalists confirmed: ${picks.join(", ")}. Scenario promoted.`,
    };
  }

  // Still alive. Recompute countCurrent as total * joint(pS) over picks
  // still alive (i.e., not yet eliminated). Per Phase B spec this is the
  // simpler approximation; pSF is read from the original snapshot.
  let jointP = 1;
  let unknownTeam = false;
  for (const team of picks) {
    const prob: TeamProbs | undefined = TEAM_PROBS[team];
    if (!prob) {
      unknownTeam = true;
      break;
    }
    jointP *= prob.pS;
  }
  if (unknownTeam) {
    return {
      state: "alive",
      count: total,
      reason: "Snapshot missing for one or more picks. Count unchanged.",
    };
  }
  return {
    state: "alive",
    count: Math.max(1, Math.round(total * jointP)),
    reason: "Scenario alive. Count recomputed against snapshot marginals.",
  };
}

function winnerOf(match: MatchOutcome): string {
  const w = matchWinner(match);
  return w ?? "draw";
}

function stageLabel(stage: MatchStage): string {
  switch (stage) {
    case "group":
      return "group stage";
    case "r32":
      return "R32";
    case "r16":
      return "R16";
    case "qf":
      return "QF";
    case "sf":
      return "SF";
    case "final":
      return "Final";
  }
}

// ─── Champion's Path ────────────────────────────────────────────────────────
//
// The user picks one team plus per-stage opponents and W/L outcomes. Per
// Phase B spec we score on outcome direction only (W or L), not opponent
// identity. The Champion's Path schema's stage field names predate WC 2026:
//
//   scenario.r16 = the team's R32 match  (first KO round in WC 2026)
//   scenario.qf  = the team's R16 match
//   scenario.sf  = the team's QF match
//   scenario.f   = the team's SF match; if W, also implicitly champions
//                  the final (per existing scoreChampionsPath logic).
//
// Promotion fires when the user's deepest predicted stage has been
// confirmed by a settled match outcome:
//   r16=W and team's R32 match settled W
//   r16=L and team's R32 match settled L
//   ... and so on for each stage. For f=W we additionally require the
//   final match to settle W (since f=W means "wins the SF and the F").

type ChampStageKey = "r16" | "qf" | "sf" | "f";

const CHAMP_STAGE_TO_MATCH_STAGE: Record<ChampStageKey, MatchStage> = {
  r16: "r32",
  qf: "r16",
  sf: "qf",
  f: "sf",
};

function evaluateChampionsPath(
  scenario: ChampionsPathScenario,
  settled: readonly MatchOutcome[],
  total: number,
  countCurrent: number,
): InnerResult {
  const team = scenario.team;
  const order: ChampStageKey[] = ["r16", "qf", "sf", "f"];

  // Build a chronological list of matches the team participated in.
  const teamMatches = settled
    .filter((m) => teamInMatch(m, team))
    .slice()
    .sort((a, b) => stageOrder(a.stage as MatchStage) - stageOrder(b.stage as MatchStage));

  // Walk the user's predicted stages. For each, find the corresponding
  // settled match (by mapped stage) and confirm or contradict.
  const settledStages = new Set<ChampStageKey>();
  for (const key of order) {
    const stagePick = scenario[key];
    if (!stagePick) continue;
    const mappedStage = CHAMP_STAGE_TO_MATCH_STAGE[key];
    const match = teamMatches.find((m) => m.stage === mappedStage);
    if (!match) continue;
    const teamWon = matchWinner(match) === team;
    const userPredictedW = stagePick.result === "W";
    if (teamWon !== userPredictedW) {
      const actual = teamWon ? "W" : "L";
      return {
        state: "dead",
        count: 0,
        reason: `${team} ${stageLabel(mappedStage)} ${actual} vs ${opponentOf(match, team)} (${formatScore(match)}) contradicts predicted ${stagePick.result}.`,
      };
    }
    settledStages.add(key);
  }

  // Determine the deepest predicted stage.
  let deepestPredicted: ChampStageKey | null = null;
  for (const key of order) {
    if (scenario[key]) deepestPredicted = key;
  }
  if (deepestPredicted === null) {
    return {
      state: "alive",
      count: countCurrent,
      reason: "No knockout stages predicted. Count unchanged.",
    };
  }

  const deepestStagePick = scenario[deepestPredicted];
  // For an f=W prediction we additionally require the final to settle.
  if (
    deepestPredicted === "f" &&
    deepestStagePick?.result === "W" &&
    settledStages.has("f")
  ) {
    const finalMatch = settled.find(
      (m) => m.stage === "final" && teamInMatch(m, team),
    );
    if (finalMatch) {
      const teamWonFinal = matchWinner(finalMatch) === team;
      if (!teamWonFinal) {
        return {
          state: "dead",
          count: 0,
          reason: `${team} lost the Final vs ${opponentOf(finalMatch, team)} (${formatScore(finalMatch)}) contradicts champion prediction.`,
        };
      }
      return {
        state: "promoted",
        count: total,
        reason: `${team} champion confirmed in the Final (${formatScore(finalMatch)}). Scenario promoted.`,
      };
    }
    // SF won but Final not yet settled; still alive.
    return {
      state: "alive",
      count: countCurrent,
      reason: `${team} reached the Final. Awaiting Final result for champion prediction.`,
    };
  }

  // Promotion when the deepest predicted stage is fully settled.
  if (settledStages.has(deepestPredicted)) {
    return {
      state: "promoted",
      count: total,
      reason: `${team} ${stageLabel(CHAMP_STAGE_TO_MATCH_STAGE[deepestPredicted])} ${deepestStagePick?.result ?? ""} confirmed. Scenario promoted.`,
    };
  }

  // Still alive: keep countCurrent unchanged. Per Phase B spec the alive
  // count for Champion's Path is the original boundary marginal at the
  // deepest unsettled stage, which equals countOriginal until promotion
  // collapses to total. The accuracy refinement is a future polish.
  return {
    state: "alive",
    count: countCurrent,
    reason: `${team} scenario alive. Awaiting later stage settlement.`,
  };
}

function stageOrder(stage: MatchStage): number {
  switch (stage) {
    case "group":
      return 0;
    case "r32":
      return 1;
    case "r16":
      return 2;
    case "qf":
      return 3;
    case "sf":
      return 4;
    case "final":
      return 5;
  }
}

function opponentOf(match: MatchOutcome, team: string): string {
  return match.homeTeam === team ? match.awayTeam : match.homeTeam;
}

// ─── Full Bracket ───────────────────────────────────────────────────────────
//
// The user submits at one of six commitment depths via koAdvancers.length:
// 0 (groups), 16 (r32), 24 (r16), 28 (qf), 30 (sf), 31 (final). Picks at
// each stage range are matched team-by-team against settled match winners
// and losers at the corresponding stage:
//
//   r32 picks  ↔ settled match_outcomes where stage = "r32"
//   r16 picks  ↔ stage = "r16"
//   qf picks   ↔ stage = "qf"
//   sf picks   ↔ stage = "sf"
//   final pick ↔ stage = "final"
//
// We do NOT match by physical match index (the bracket pairing logic for
// resolved slots is non-trivial and not needed for v1). A pick is
// contradicted when its team lost at the corresponding stage; the pick is
// confirmed when its team won at the corresponding stage. Promotion fires
// when every pick at the user's deepest committed stage is confirmed.
//
// Groups-stage submissions (koAdvancers.length === 0) are not contradicted
// by knockout-stage matches alone, since the matchday-level group standings
// logic is not implemented in v1. Such submissions remain alive until a
// later checkpoint adds group-standings evaluation.

const FULL_BRACKET_STAGE_TO_MATCH: Record<
  Exclude<FullBracketStage, "groups">,
  MatchStage
> = {
  r32: "r32",
  r16: "r16",
  qf: "qf",
  sf: "sf",
  final: "final",
};

function picksAtStage(
  scenario: FullBracketScenario,
  stage: Exclude<FullBracketStage, "groups">,
): readonly string[] {
  switch (stage) {
    case "r32":
      return scenario.koAdvancers.slice(0, 16);
    case "r16":
      return scenario.koAdvancers.slice(16, 24);
    case "qf":
      return scenario.koAdvancers.slice(24, 28);
    case "sf":
      return scenario.koAdvancers.slice(28, 30);
    case "final":
      return scenario.koAdvancers.slice(30, 31);
  }
}

const KO_STAGES_IN_ORDER: Array<Exclude<FullBracketStage, "groups">> = [
  "r32",
  "r16",
  "qf",
  "sf",
  "final",
];

function evaluateFullBracket(
  scenario: FullBracketScenario,
  settled: readonly MatchOutcome[],
  total: number,
  countCurrent: number,
): InnerResult {
  const deepestStage = detectFullBracketStage(scenario);

  // 1. Contradiction scan across every stage the user committed to.
  for (const stage of KO_STAGES_IN_ORDER) {
    if (!isStageCommitted(deepestStage, stage)) continue;
    const picks = picksAtStage(scenario, stage);
    const pickSet = new Set(picks);
    const matchStage = FULL_BRACKET_STAGE_TO_MATCH[stage];
    for (const match of settled) {
      if (match.stage !== matchStage) continue;
      const loser = matchLoser(match);
      if (!loser) continue;
      if (pickSet.has(loser)) {
        return {
          state: "dead",
          count: 0,
          reason: `${loser} lost ${stageLabel(matchStage)} vs ${winnerOf(match)} (${formatScore(match)}). Bracket contradicted at ${stageLabel(matchStage)}.`,
        };
      }
    }
  }

  // 2. Promotion when the deepest committed stage is fully consistent.
  if (deepestStage !== "groups") {
    const deepestPicks = picksAtStage(scenario, deepestStage);
    const deepestMatchStage = FULL_BRACKET_STAGE_TO_MATCH[deepestStage];
    const confirmed = new Set<string>();
    for (const match of settled) {
      if (match.stage !== deepestMatchStage) continue;
      const winner = matchWinner(match);
      if (winner && deepestPicks.includes(winner)) {
        confirmed.add(winner);
      }
    }
    if (deepestPicks.length > 0 && confirmed.size === deepestPicks.length) {
      return {
        state: "promoted",
        count: total,
        reason: `Bracket consistent through ${stageLabel(deepestMatchStage)}. Scenario promoted.`,
      };
    }
  }

  // 3. Alive. Recompute countCurrent using the stage-aware joint of marginals
  //    over picks at unsettled stages, applying the per-stage scale that
  //    mirrors computeRealityScore. For Phase B v1, "unsettled stages" means
  //    every stage the user committed to up to and including deepestStage,
  //    minus stages whose every pick has already been confirmed by a settled
  //    match. This is the simpler approximation specced for v1.
  if (deepestStage === "groups") {
    return {
      state: "alive",
      count: countCurrent,
      reason:
        "Groups-stage submission. Awaiting group-standings logic in a later checkpoint.",
    };
  }

  const jointResult = jointForUnsettledStages(scenario, settled, deepestStage);
  if (jointResult === null) {
    return {
      state: "alive",
      count: countCurrent,
      reason: "Snapshot missing for one or more picks. Count unchanged.",
    };
  }
  const stageScale = STAGE_SCALES[deepestStage];
  const count = Math.max(1, Math.round(total * jointResult * stageScale));
  return {
    state: "alive",
    count,
    reason: "Bracket consistent so far. Count recomputed against snapshot marginals.",
  };
}

function isStageCommitted(
  deepest: FullBracketStage,
  stage: Exclude<FullBracketStage, "groups">,
): boolean {
  // koAdvancers contains every stage at and shallower than the deepest one.
  const order: FullBracketStage[] = ["groups", "r32", "r16", "qf", "sf", "final"];
  return order.indexOf(stage) <= order.indexOf(deepest);
}

// Per-stage scale aligned with computeRealityScore's STAGE_SCALES so the
// initial countCurrent at submission equals the count that would be
// re-derived by the evaluator before any matches settle.
const STAGE_SCALES: Record<Exclude<FullBracketStage, "groups">, number> = {
  r32: 200,
  r16: 8,
  qf: 0.25,
  sf: 0.015,
  final: 0.0025,
};

function reachField(stage: FullBracketStage): keyof TeamProbs {
  switch (stage) {
    case "groups":
      return "pG";
    case "r32":
      return "pR";
    case "r16":
      return "pQ";
    case "qf":
      return "pS";
    case "sf":
      return "pF";
    case "final":
      return "pC";
  }
}

function jointForUnsettledStages(
  scenario: FullBracketScenario,
  settled: readonly MatchOutcome[],
  deepest: Exclude<FullBracketStage, "groups">,
): number | null {
  // Compute the joint marginal at the deepest stage over picks at that
  // stage whose corresponding match has not yet been settled (i.e., the
  // pick is not yet a confirmed winner). Picks already confirmed
  // contribute a factor of 1.0.
  const picks = picksAtStage(scenario, deepest);
  const matchStage = FULL_BRACKET_STAGE_TO_MATCH[deepest];
  const winners = new Set<string>();
  for (const match of settled) {
    if (match.stage !== matchStage) continue;
    const w = matchWinner(match);
    if (w) winners.add(w);
  }
  const field = reachField(deepest);
  let joint = 1;
  for (const team of picks) {
    if (winners.has(team)) continue;
    const prob = TEAM_PROBS[team];
    if (!prob) return null;
    joint *= prob[field];
  }
  return joint;
}
