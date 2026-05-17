/**
 * Phase C real Reality Score computation using M0 snapshot marginal
 * probabilities from snapshotProbs.ts.
 *
 * All three modes use independence approximations over team-level marginals.
 * This is more accurate than the FNV hash mock and reflects real model
 * calibration, while acknowledging that exact joint probabilities would
 * require a full simulation run query.
 *
 * Approximation strategy:
 *   Final Four: product of p_sf over the four teams times MC_RUNS.
 *                 Independence is reasonable for teams in different bracket
 *                 halves.
 *   Champion's Path: stage-boundary differences. P(team exits at stage S)
 *                 = P(reach S) minus P(reach S+1). The path's probability is
 *                 the outcome probability at the last resolved stage.
 *   Full Bracket: stage-aware (Checkpoint 9, P1.1). The submitted scenario
 *                 names its commitment depth via koAdvancers.length; we
 *                 multiply the marginal at the deepest stage's next-round
 *                 reach probability across the picks, then apply a per-stage
 *                 depth scale. See scoreFullBracket for the tuning rationale.
 *
 * Returns { count, total } where total = 10,000 and count >= 1.
 */

import { TEAM_PROBS, type TeamProbs } from "./snapshotProbs";
import { computeRealityScoreMock, fnv1a32 } from "./computeRealityScoreMock";
import {
  detectFullBracketStage,
  type FullBracketStage,
} from "./types";
import type {
  AnyScenario,
  ChampionsPathScenario,
  FullBracketScenario,
  FinalFourScenario,
  Mode,
} from "./types";

const MC_RUNS = 10_000;

export function computeRealityScore(
  mode: Mode,
  canonical: string,
  scenario: AnyScenario,
): { count: number; total: number } {
  switch (mode) {
    case "final_four":
      return scoreFinalFour(canonical, scenario as FinalFourScenario);
    case "champions_path":
      return scoreChampionsPath(canonical, scenario as ChampionsPathScenario);
    case "full_bracket":
      return scoreFullBracket(canonical, scenario as FullBracketScenario);
  }
}

// ── Final Four ────────────────────────────────────────────────────────────────
// Approximate joint probability that exactly these 4 teams are semifinalists.
// Using ∏(p_sf[team]) as the independence upper bound; realistic for teams
// in different bracket halves.

function scoreFinalFour(
  canonical: string,
  s: FinalFourScenario,
): { count: number; total: number } {
  let jointP = 1;
  for (const team of s.semifinalists) {
    const prob = TEAM_PROBS[team];
    if (!prob) {
      // Unknown team: fall back to mock for robustness.
      return computeRealityScoreMock("final_four", canonical);
    }
    jointP *= prob.pS;
  }
  // Small additive jitter via hash so identical-probability teams produce
  // different counts (avoids every 4-strong-team combo showing exactly
  // the same number).
  const jitter = ((fnv1a32(canonical) % 200) - 100) / MC_RUNS;
  const count = Math.max(1, Math.round(MC_RUNS * (jointP + jitter)));
  return { count, total: MC_RUNS };
}

// ── Champion's Path ───────────────────────────────────────────────────────────
// Stage-boundary differences give the marginal probability of the outcome at
// each stage.
//
// Stage mapping (Champion's Path schema → snapshot field):
//   r16 = first KO round (R32 in WC 2026) → boundary pG ↔ pR
//   qf  = Round of 16                      → boundary pR ↔ pQ
//   sf  = Quarterfinal                     → boundary pQ ↔ pS
//   f   = Semifinal                        → boundary pS ↔ pF / pF ↔ pC

function scoreChampionsPath(
  canonical: string,
  s: ChampionsPathScenario,
): { count: number; total: number } {
  const prob = TEAM_PROBS[s.team];
  if (!prob) return computeRealityScoreMock("champions_path", canonical);

  // Stage boundary probabilities: entry[i] = P(team is in stage i).
  // Index: 0=R32(entry) 1=R16(entry) 2=QF(entry) 3=SF(entry) 4=F(entry) 5=winner
  const bounds = [prob.pG, prob.pR, prob.pQ, prob.pS, prob.pF, prob.pC];

  const stageKeys = ["r16", "qf", "sf", "f"] as const;
  let lastFilledIdx = -1;
  let lastResult: "W" | "L" | null = null;

  for (let i = 0; i < stageKeys.length; i++) {
    const v = s[stageKeys[i]];
    if (!v) break;
    lastFilledIdx = i;
    lastResult = v.result;
    if (v.result === "L") break;
  }

  if (lastFilledIdx === -1) {
    // No stage set: use group qualification probability.
    return { count: Math.max(1, Math.round(MC_RUNS * prob.pG)), total: MC_RUNS };
  }

  let p: number;
  if (lastResult === "W" && lastFilledIdx === stageKeys.length - 1) {
    // Won the final → champion
    p = prob.pC;
  } else if (lastResult === "W") {
    // Won through stage lastFilledIdx, still alive → P(reach S+1 entry)
    p = bounds[lastFilledIdx + 1];
  } else {
    // Lost at stage lastFilledIdx → P(exit at this stage) = P(enter) − P(advance)
    const enter = bounds[lastFilledIdx];
    const advance = bounds[lastFilledIdx + 1];
    p = Math.max(0, enter - advance);
  }

  const count = Math.max(1, Math.round(MC_RUNS * p));
  return { count, total: MC_RUNS };
}

// ── Full Bracket ──────────────────────────────────────────────────────────────
// Stage-aware scoring (Checkpoint 9, P1.1). The user may submit at any of
// six commitment depths: groups (12 group winners), r32 (16 R32 winners),
// r16 (24 advancers), qf (28), sf (30), final (full 31 incl. champion).
//
// At each stage we compute the joint marginal probability of the user's
// picks at that stage using the per-team "reach next stage" probability,
// then apply a per-stage scale. The scale compensates for the shrinking
// joint as more marginals multiply together and anchors each stage in a
// sensible rarity band for the favourites case (modal-call picks).
//
// Per-stage marginals (snapshotProbs.TeamProbs):
//   groups: pG (P(qualify from group = reach R32))
//   r32:    pR (P(reach R16))
//   r16:    pQ (P(reach QF))
//   qf:     pS (P(reach SF))
//   sf:     pF (P(reach Final))
//   final:  pC (P(champion))
//
// Tuning anchor: the top-pG team per group joint product is ~0.260; the
// existing complete-bracket scale BRACKET_SCALE = 0.0025 is preserved at
// the final stage so legacy records continue to render the same count.
// Counts for the modal-favourites pick at each stage (rounded):
//   groups: 10,000 * 0.260 * 0.4    ~= 1040  (Plausible, 10.4%)
//   r32:    10,000 * 8.83e-5 * 200  ~=  177  (Uncommon, 1.77%)
//   r16:    10,000 * 7.41e-4 * 8    ~=   59  (Rare, 0.59%)
//   qf:     10,000 * 0.0124 * 0.25  ~=   31  (Rare, 0.31%)
//   sf:     10,000 * 0.1096 * 0.015 ~=   16  (Rare, 0.16%)
//   final:  10,000 * 0.3091 * 0.0025 ~=   8  (Vanishingly rare, 0.08%)
// The chain is strictly monotone (deeper stage produces a rarer count for
// the same set of teams), which satisfies the "intermediate stages produce
// rarity strictly between groups-only and full-bracket" constraint.

const STAGE_SCALES: Record<FullBracketStage, number> = {
  groups: 0.4,
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

function stagePicks(
  stage: FullBracketStage,
  s: FullBracketScenario,
): readonly string[] {
  switch (stage) {
    case "groups":
      return s.groupWinners;
    case "r32":
      return s.koAdvancers.slice(0, 16);
    case "r16":
      return s.koAdvancers.slice(16, 24);
    case "qf":
      return s.koAdvancers.slice(24, 28);
    case "sf":
      return s.koAdvancers.slice(28, 30);
    case "final":
      return [s.koAdvancers[30]];
  }
}

function scoreFullBracket(
  canonical: string,
  s: FullBracketScenario,
): { count: number; total: number } {
  const stage = detectFullBracketStage(s);
  const picks = stagePicks(stage, s);
  if (picks.length === 0) {
    return computeRealityScoreMock("full_bracket", canonical);
  }
  const field = reachField(stage);
  let jointP = 1;
  for (const team of picks) {
    const prob = TEAM_PROBS[team];
    if (!prob) {
      return computeRealityScoreMock("full_bracket", canonical);
    }
    jointP *= prob[field];
  }
  const count = Math.max(1, Math.round(MC_RUNS * jointP * STAGE_SCALES[stage]));
  return { count, total: MC_RUNS };
}
