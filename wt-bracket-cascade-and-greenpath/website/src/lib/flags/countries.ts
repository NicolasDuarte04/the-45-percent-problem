// Country names for the 48 FIFA World Cup 2026 qualifiers, keyed by FIFA
// 3-letter code. Used by <Flag /> for accessible labels. Display names are
// mirrored from src/lib/data/wc2026-official-draw.ts; scripts/fetch-flags.mjs
// asserts that the dictionary keys match the canonical roster at fetch time.

export const COUNTRY_NAMES = {
  // Group A
  MEX: "Mexico",
  RSA: "South Africa",
  KOR: "Korea Republic",
  CZE: "Czechia",
  // Group B
  CAN: "Canada",
  BIH: "Bosnia & Herzegovina",
  QAT: "Qatar",
  SUI: "Switzerland",
  // Group C
  BRA: "Brazil",
  MAR: "Morocco",
  HAI: "Haiti",
  SCO: "Scotland",
  // Group D
  USA: "United States",
  PAR: "Paraguay",
  AUS: "Australia",
  TUR: "Türkiye",
  // Group E
  GER: "Germany",
  CUW: "Curaçao",
  CIV: "Côte d'Ivoire",
  ECU: "Ecuador",
  // Group F
  NED: "Netherlands",
  JPN: "Japan",
  SWE: "Sweden",
  TUN: "Tunisia",
  // Group G
  BEL: "Belgium",
  EGY: "Egypt",
  IRN: "IR Iran",
  NZL: "New Zealand",
  // Group H
  ESP: "Spain",
  CPV: "Cabo Verde",
  KSA: "Saudi Arabia",
  URU: "Uruguay",
  // Group I
  FRA: "France",
  SEN: "Senegal",
  IRQ: "Iraq",
  NOR: "Norway",
  // Group J
  ARG: "Argentina",
  ALG: "Algeria",
  AUT: "Austria",
  JOR: "Jordan",
  // Group K
  POR: "Portugal",
  UZB: "Uzbekistan",
  COL: "Colombia",
  COD: "Congo DR",
  // Group L
  ENG: "England",
  CRO: "Croatia",
  GHA: "Ghana",
  PAN: "Panama",
} as const;

export type FifaCode = keyof typeof COUNTRY_NAMES;

export function isFifaCode(value: string): value is FifaCode {
  return value in COUNTRY_NAMES;
}
