/**
 * Confederation mapping for the 48 qualified teams of WC 2026.
 *
 * Source of truth: the canonical draw at
 * `src/lib/data/wc2026-official-draw.ts` already carries each team's
 * confederation. This file restates the mapping as a flat lookup so
 * region-aware UI surfaces (e.g. the Final Four team picker's region
 * sort) can read it without importing the full TEAMS table or
 * destructuring objects in hot render paths.
 *
 * Authoritative reference for the FIFA-to-confederation assignments:
 * FIFA Council confirmation of qualified members for the WC 2026 draw
 * (December 2025). Notable edge cases double-checked here:
 *   - Mexico, USA, Canada, Curacao, Haiti, Panama are CONCACAF (the
 *     three host nations + their continental peers).
 *   - Australia is AFC, not OFC (AFC since 2006).
 *   - New Zealand is OFC.
 *   - Turkiye is UEFA.
 *   - Israel is not a qualifier and does not appear.
 *
 * All 48 codes here match the FIFA codes used by `TEAM_PROBS` in
 * `snapshotProbs.ts`; the keys are intentionally exhaustive so a missing
 * code reads as a typo, not a default.
 */

export type Confederation =
  | "UEFA"
  | "CONMEBOL"
  | "CAF"
  | "AFC"
  | "CONCACAF"
  | "OFC";

export const CONFEDERATION_BY_TEAM: Record<string, Confederation> = {
  // UEFA (16)
  AUT: "UEFA",
  BEL: "UEFA",
  BIH: "UEFA",
  CRO: "UEFA",
  CZE: "UEFA",
  ENG: "UEFA",
  ESP: "UEFA",
  FRA: "UEFA",
  GER: "UEFA",
  NED: "UEFA",
  NOR: "UEFA",
  POR: "UEFA",
  SCO: "UEFA",
  SUI: "UEFA",
  SWE: "UEFA",
  TUR: "UEFA",

  // CONMEBOL (6)
  ARG: "CONMEBOL",
  BRA: "CONMEBOL",
  COL: "CONMEBOL",
  ECU: "CONMEBOL",
  PAR: "CONMEBOL",
  URU: "CONMEBOL",

  // CAF (10)
  ALG: "CAF",
  CIV: "CAF",
  COD: "CAF",
  CPV: "CAF",
  EGY: "CAF",
  GHA: "CAF",
  MAR: "CAF",
  RSA: "CAF",
  SEN: "CAF",
  TUN: "CAF",

  // AFC (9)
  AUS: "AFC",
  IRN: "AFC",
  IRQ: "AFC",
  JOR: "AFC",
  JPN: "AFC",
  KOR: "AFC",
  KSA: "AFC",
  QAT: "AFC",
  UZB: "AFC",

  // CONCACAF (6)
  CAN: "CONCACAF",
  CUW: "CONCACAF",
  HAI: "CONCACAF",
  MEX: "CONCACAF",
  PAN: "CONCACAF",
  USA: "CONCACAF",

  // OFC (1)
  NZL: "OFC",
};

/**
 * Traversal order for region-sorted UI. UEFA first because it carries
 * the largest cohort and the highest probability mass; OFC last because
 * it carries a single entry.
 */
export const CONFEDERATION_ORDER: readonly Confederation[] = [
  "UEFA",
  "CONMEBOL",
  "CAF",
  "AFC",
  "CONCACAF",
  "OFC",
] as const;
