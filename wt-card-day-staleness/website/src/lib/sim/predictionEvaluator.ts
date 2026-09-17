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
  TeamCode,
} from "./types";
import {
  computeGroupStandings,
  isGroupFullySettled,
  WC2026_GROUP_ASSIGNMENTS,
  type GroupStandings,
} from "./groupStandings";
import type { Prediction, MatchOutcome } from "@/lib/db/schema";

// Bump on any change to the evaluator's decision logic so re-runs against
// the audit log can identify which rule set produced a transition. v2 adds
// groups-stage Full Bracket evaluation (Checkpoint 15).
export const EVALUATOR_VERSION = "v2";

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
    return evaluateFullBracketGroupsStage(
      scenario,
      settled,
      total,
      countCurrent,
    );
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

// ─── Full Bracket: groups stage (Checkpoint 15) ─────────────────────────────
//
// The user submitted a Full Bracket scenario with koAdvancers.length === 0,
// meaning they committed to:
//   - 12 group winners (groupWinners)
//   - 12 group runners-up (groupRunnersUp)
//   - 8 best 3rd-placed teams (bestThirds; may be empty for a "groups
//     only, no thirds" submission, although the FullBracketScenario zod
//     superRefine forces bestThirds.length === 0 for that case)
//
// Evaluation walks the canonical 12 groups. For each group:
//   1. Compute actual standings from settled match_outcomes.
//   2. Compare against the user's predicted W and RU for that group.
//      - If a group is fully settled (all 6 matches played) and the
//        actual W or RU differs from the prediction: dead.
//      - If a group is fully settled and the actual 3rd-placed team
//        differs from the prediction's third pick (the team in that
//        group that the user expected to finish third, derived from
//        bestThirds): only contradicts when the user committed to 8
//        thirds AND the user's third for this group is wrong.
// After all groups are walked, if every group is fully settled and every
// W/RU/3rd matches and the user's 8 best thirds match the actual top-8
// best thirds: promoted. Otherwise alive.

function evaluateFullBracketGroupsStage(
  scenario: FullBracketScenario,
  settled: readonly MatchOutcome[],
  total: number,
  countCurrent: number,
): InnerResult {
  const standings = computeGroupStandings(settled, WC2026_GROUP_ASSIGNMENTS);
  const standingsByLetter = new Map<string, GroupStandings>();
  for (const g of standings.groups) standingsByLetter.set(g.group, g);

  // Map each predicted group winner / runner-up to its group letter
  // using the canonical WC 2026 assignments. The scenario's
  // groupWinners[i] is the user's prediction for group i (A..L).
  const groupLetters = WC2026_GROUP_ASSIGNMENTS.map((a) => a.group);

  // Build a per-group "predicted 3rd-placed team" map. The Full Bracket
  // scenario gives 8 best thirds at most; the other 4 groups' 3rd
  // finishers are unconstrained (they finish third but are not among the
  // top 8 best thirds). We surface contradictions only for groups whose
  // 3rd-placed team the user explicitly named.
  const teamToGroup = new Map<TeamCode, string>();
  for (const a of WC2026_GROUP_ASSIGNMENTS) {
    for (const t of a.teams) teamToGroup.set(t as TeamCode, a.group);
  }
  const predictedThirdByGroup = new Map<string, TeamCode>();
  for (const t of scenario.bestThirds) {
    const g = teamToGroup.get(t as TeamCode);
    if (g) predictedThirdByGroup.set(g, t as TeamCode);
  }

  let allGroupsSettled = true;

  for (let i = 0; i < groupLetters.length; i += 1) {
    const letter = groupLetters[i];
    const assignment = WC2026_GROUP_ASSIGNMENTS[i];
    const standing = standingsByLetter.get(letter);
    if (!standing) continue;

    const settledForGroup = isGroupFullySettled(
      letter,
      assignment.teams,
      settled,
    );
    if (!settledForGroup) {
      allGroupsSettled = false;
      continue;
    }

    const actualW = standing.teams.find((t) => t.position === 1)?.code;
    const actualRU = standing.teams.find((t) => t.position === 2)?.code;
    const actualThird = standing.teams.find((t) => t.position === 3)?.code;
    if (!actualW || !actualRU || !actualThird) {
      allGroupsSettled = false;
      continue;
    }

    const predictedW = scenario.groupWinners[i] as TeamCode | undefined;
    const predictedRU = scenario.groupRunnersUp[i] as TeamCode | undefined;

    if (predictedW && actualW !== predictedW) {
      return {
        state: "dead",
        count: 0,
        reason: `Group ${letter}: actual W is ${actualW}, predicted ${predictedW}. Scenario contradicted.`,
      };
    }
    if (predictedRU && actualRU !== predictedRU) {
      return {
        state: "dead",
        count: 0,
        reason: `Group ${letter}: actual RU is ${actualRU}, predicted ${predictedRU}. Scenario contradicted.`,
      };
    }
    const predictedThird = predictedThirdByGroup.get(letter);
    if (predictedThird && actualThird !== predictedThird) {
      return {
        state: "dead",
        count: 0,
        reason: `Group ${letter}: actual 3rd is ${actualThird}, predicted ${predictedThird}. Scenario contradicted.`,
      };
    }
  }

  // Promotion: every group settled, every W/RU/3rd pick consistent, and
  // (if the user gave 8 best thirds) the actual top-8 best thirds match
  // the predicted set as an unordered set of FIFA codes.
  if (allGroupsSettled) {
    if (scenario.bestThirds.length === 8) {
      const actualBestThirds = new Set(
        standings.bestThirds.map((b) => b.code),
      );
      const predictedBestThirds = new Set(scenario.bestThirds);
      const allMatch =
        actualBestThirds.size === predictedBestThirds.size &&
        [...actualBestThirds].every((c) => predictedBestThirds.has(c));
      if (!allMatch) {
        const missing = [...predictedBestThirds].filter(
          (c) => !actualBestThirds.has(c),
        );
        return {
          state: "dead",
          count: 0,
          reason: `Best thirds differ. Predicted ${[...predictedBestThirds].join(", ")} but actual best thirds include ${[...actualBestThirds].join(", ")}. Missing: ${missing.join(", ")}. Scenario contradicted.`,
        };
      }
    }
    return {
      state: "promoted",
      count: total,
      reason: "All 12 groups confirmed. Scenario promoted.",
    };
  }

  // Alive. Refresh countCurrent against the joint of pG marginals over
  // group winners and runners-up that have not yet been confirmed by a
  // fully-settled group. We use pG (probability of qualifying from the
  // group; i.e., finishing top-2) as the per-team marginal; teams whose
  // group has already settled and matched the prediction collapse to
  // factor 1.
  const confirmedTeams = new Set<TeamCode>();
  for (const standing of standings.groups) {
    const groupAssignment = WC2026_GROUP_ASSIGNMENTS.find(
      (a) => a.group === standing.group,
    );
    if (!groupAssignment) continue;
    if (!isGroupFullySettled(standing.group, groupAssignment.teams, settled)) {
      continue;
    }
    const w = standing.teams.find((t) => t.position === 1)?.code;
    const ru = standing.teams.find((t) => t.position === 2)?.code;
    if (w) confirmedTeams.add(w);
    if (ru) confirmedTeams.add(ru);
  }

  const allGroupPicks = [
    ...scenario.groupWinners,
    ...scenario.groupRunnersUp,
  ] as TeamCode[];

  let joint = 1;
  let unknown = false;
  for (const team of allGroupPicks) {
    if (confirmedTeams.has(team)) continue;
    const prob = TEAM_PROBS[team];
    if (!prob) {
      unknown = true;
      break;
    }
    joint *= prob.pG;
  }
  if (unknown) {
    return {
      state: "alive",
      count: countCurrent,
      reason: "Snapshot missing for one or more group picks. Count unchanged.",
    };
  }
  // STAGE_SCALES for the "groups" stage aligns with the rarity-band
  // calibration: a strong groups-only pick (every team in their top-2
  // marginal) should land in the same band as it did pre-tournament. We
  // pick the constant that yields integer counts in the same ballpark as
  // the r32 case (200x) but rescale for the higher marginals at pG. A
  // future polish can derive this from a real Monte Carlo joint; for
  // Phase B v1 we use a single calibrated scale.
  const GROUPS_STAGE_SCALE = 5;
  const count = Math.max(1, Math.round(total * joint * GROUPS_STAGE_SCALE));
  return {
    state: "alive",
    count,
    reason: "Groups submission consistent so far. Count recomputed against snapshot marginals.",
  };
}


