// Country names for the 48 FIFA World Cup 2026 qualifiers, keyed by FIFA
// 3-letter code. Used by <Flag /> for accessible labels. Keep in sync with
// scripts/fetch-flags.mjs — adding a code here without an SVG (or vice versa)
// is the only way <Flag /> breaks at runtime.

export const COUNTRY_NAMES = {
  ARG: "Argentina",
  ESP: "Spain",
  FRA: "France",
  POR: "Portugal",
  ENG: "England",
  BRA: "Brazil",
  COL: "Colombia",
  GER: "Germany",
  CRO: "Croatia",
  ECU: "Ecuador",
  NED: "Netherlands",
  JPN: "Japan",
  SEN: "Senegal",
  URU: "Uruguay",
  TUR: "Türkiye",
  MEX: "Mexico",
  SUI: "Switzerland",
  ITA: "Italy",
  DEN: "Denmark",
  MAR: "Morocco",
  BEL: "Belgium",
  CAN: "Canada",
  AUT: "Austria",
  KOR: "South Korea",
  AUS: "Australia",
  UZB: "Uzbekistan",
  ALG: "Algeria",
  PAN: "Panama",
  IRN: "Iran",
  UKR: "Ukraine",
  SRB: "Serbia",
  SCO: "Scotland",
  USA: "United States",
  NGA: "Nigeria",
  EGY: "Egypt",
  POL: "Poland",
  HUN: "Hungary",
  PER: "Peru",
  JOR: "Jordan",
  VEN: "Venezuela",
  SVK: "Slovakia",
  CIV: "Côte d'Ivoire",
  CRC: "Costa Rica",
  NZL: "New Zealand",
  CMR: "Cameroon",
  IRQ: "Iraq",
  KSA: "Saudi Arabia",
  GHA: "Ghana",
} as const;

export type FifaCode = keyof typeof COUNTRY_NAMES;

export function isFifaCode(value: string): value is FifaCode {
  return value in COUNTRY_NAMES;
}
