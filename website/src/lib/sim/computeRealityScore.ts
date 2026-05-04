/**
 * Phase C — real Reality Score computation using M0 snapshot marginal
 * probabilities from snapshotProbs.ts.
 *
 * All three modes use independence approximations over team-level marginals.
 * This is more accurate than the FNV hash mock and reflects real model
 * calibration, while acknowledging that exact joint probabilities would
 * require a full simulation run query.
 *
 * Approximation strategy:
 *   Final Four  — ∏(p_sf[team]) × MC_RUNS. Independence assumption is
 *                 reasonable for teams in different brackets.
 *   Champion's Path — stage-boundary differences: P(team exits at stage S)
 *                 = P(reach S) − P(reach S+1). The path's probability is
 *                 the outcome probability at the last resolved stage.
 *   Full Bracket — champion probability scaled by a bracket-joint factor
 *                 that reflects how improbable the full 31-outcome joint
 *                 event is. Scale = 0.0025 calibrated to put a strong
 *                 bracket in the Uncommon/Rare bands.
 *
 * Returns { count, total } where total = 10,000 and count ≥ 1.
 */

import { TEAM_PROBS } from "./snapshotProbs";
import { computeRealityScoreMock, fnv1a32 } from "./computeRealityScoreMock";
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
      // Unknown team — fall back to mock for robustness.
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
    // No stage set — use group qualification probability.
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
// The champion's marginal p_champion is the primary signal. We scale it by
// a joint-probability factor (BRACKET_SCALE = 0.0025) to represent the
// improbability of getting all 31 KO results correct. This puts strong
// brackets (e.g. ESP champion) in the Rare range (≈ 7–8 / 10,000) and weak
// picks (deep underdogs) in Vanishingly rare.

const BRACKET_SCALE = 0.0025;

function scoreFullBracket(
  canonical: string,
  s: FullBracketScenario,
): { count: number; total: number } {
  const champion = s.koAdvancers[30];
  if (!champion) return computeRealityScoreMock("full_bracket", canonical);

  const prob = TEAM_PROBS[champion];
  if (!prob) return computeRealityScoreMock("full_bracket", canonical);

  const count = Math.max(1, Math.round(MC_RUNS * prob.pC * BRACKET_SCALE));
  return { count, total: MC_RUNS };
}
