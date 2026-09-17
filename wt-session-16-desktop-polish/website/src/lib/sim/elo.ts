/**
 * Static pre-tournament Elo snapshot for the 48 WC 2026 qualifiers.
 *
 * Sole purpose: power the simulator's "Auto-fill from Elo" buttons in
 * Full Bracket Step 1. The user clicks Auto-fill, we sort each group's
 * four teams by Elo, and pre-fill winner = highest, runnerUp = second.
 *
 * ── Why raw Elo and nothing else ─────────────────────────────────────
 *
 * The simulator exists so users can stake a scenario *independently* of
 * the model's prediction (M0 through M★), and then see how their pick
 * compares. If Auto-fill secretly seeded from M★, the user's "scenario"
 * would just be the model talking to itself; and the eventual Nyberg
 * test would lose its statistical bite.
 *
 * So this file ships only Elo. No form, no FIFA points, no macro prior,
 * no model output. The numbers below are a **mock** snapshot stand-in
 * for the values that `ingestion/fetch_elo_ratings.py` will produce
 * once Phase 2 task 2.3a lands. They are loosely calibrated against
 * publicly-known relative team strengths circa late 2025; a future PR
 * will replace this object with the real registered snapshot and the
 * snapshot SHA can be surfaced through the existing `snapshotSha` flow.
 *
 * Stability: keys are FIFA 3-letter codes from `wc2026-official-draw.ts`.
 * Update those codes here and there together; a missing code returns 0
 * from `eloFor`, which sorts last (the worst tiebreak the user will see
 * is alphabetical-via-stable-sort, which is acceptable for a stub).
 */

import { TEAMS, type GroupLetter } from "@/lib/data/wc2026-official-draw";
import type { TeamCode } from "./types";

/**
 * Pre-tournament Elo, keyed by FIFA 3-letter code. Higher = stronger.
 * Range observed in the wild: ~1450 (lowest WC qualifiers) to ~2100
 * (top European/South American sides). Values here are a stand-in,
 * not a forecast.
 */
export const WC2026_ELO_SNAPSHOT: Record<string, number> = {
  // Tier 1: established top-six contenders
  ESP: 2068,
  ARG: 2061,
  FRA: 2042,
  BRA: 2018,
  ENG: 2005,
  POR: 1985,
  GER: 1972,
  NED: 1955,
  // Tier 2: strong outsiders
  BEL: 1928,
  CRO: 1911,
  COL: 1899,
  URU: 1894,
  MAR: 1875,
  SUI: 1862,
  ECU: 1850,
  SEN: 1843,
  // Tier 3: middle of the pack
  JPN: 1830,
  USA: 1820,
  KOR: 1810,
  MEX: 1798,
  AUS: 1782,
  EGY: 1770,
  IRN: 1762,
  TUR: 1755,
  AUT: 1748,
  CIV: 1740,
  PAR: 1735,
  NOR: 1730,
  // Tier 4: solid but unlikely to advance deep
  SWE: 1720,
  TUN: 1712,
  ALG: 1705,
  COD: 1698,
  CAN: 1690,
  SCO: 1685,
  QAT: 1678,
  CPV: 1668,
  BIH: 1660,
  GHA: 1652,
  IRQ: 1645,
  // Tier 5: long-shots
  KSA: 1635,
  UZB: 1628,
  PAN: 1620,
  RSA: 1612,
  CZE: 1605,
  JOR: 1590,
  HAI: 1572,
  CUW: 1545,
  NZL: 1530,
};

/**
 * Look up the Elo for a team. Returns 0 for unknown codes (sorts last
 * via descending sort) so a missing entry can never throw at runtime.
 */
export function eloFor(code: TeamCode): number {
  return WC2026_ELO_SNAPSHOT[code] ?? 0;
}

/**
 * For each group letter A-L, return the four team codes sorted by Elo
 * descending. Stable: ties (none expected at this granularity) fall
 * back to TEAMS-array order, which is FIFA pot order.
 *
 * Used by Auto-fill: index 0 = winner, index 1 = runner-up.
 */
export function teamsByGroupSortedByElo(): Record<GroupLetter, TeamCode[]> {
  const out = {} as Record<GroupLetter, TeamCode[]>;
  const groups: GroupLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  for (const g of groups) {
    const teams = TEAMS.filter((t) => t.group === g).map((t) => t.fifa_code);
    teams.sort((a, b) => eloFor(b as TeamCode) - eloFor(a as TeamCode));
    out[g] = teams as TeamCode[];
  }
  return out;
}
