/**
 * Pure helpers for the daily Instagram share card (/api/og/daily).
 *
 * The card has two variants:
 *   - "recap"   : the matches PLAYED on a given day, with their real final
 *                 score and the probability the model gave the result.
 *   - "preview" : the fixtures NOT yet played on a given day, with the model's
 *                 modal scoreline and top 1X2 outcome.
 *
 * Days are keyed in the audience timezone (America/Bogota) via the shared
 * `dayKey` from matchListing, the same basis the /matches page groups by, so
 * the card and the page can never disagree about which day a fixture is on.
 *
 * Subject-day auto-selection (zero manual work, regenerates daily):
 *   - recap   -> the most recent audience-local day with at least one played match.
 *   - preview -> the earliest audience-local day that still has an unplayed fixture.
 * The route also accepts an explicit ?day=YYYY-MM-DD override.
 *
 * "Día N" is derived from the tournament start (2026-06-11 = Día 1), counted on
 * the same audience-local day basis.
 *
 * Everything here is pure data transformation so it can be unit-tested
 * without rendering. The card JSX lives in
 * src/app/api/og/_lib/dailyCard.tsx; the route in
 * src/app/api/og/daily/route.tsx.
 *
 * Copy is Colombian Spanish. Punctuation is restricted to ASCII plus the
 * middot used across the site chrome; the score separator is a plain
 * hyphen (never the en dash the live MatchesBrowser bar uses).
 */
import type { MatchDetail } from "./schemas";
import { dayKey, byKickoff, isPlayed, modalScoreline } from "./matchListing";

/** First match-day of the tournament. 2026-06-11 is Día 1. */
export const TOURNAMENT_START = "2026-06-11";

const MS_PER_DAY = 86_400_000;

export type DailyVariant = "recap" | "preview";

/**
 * Spanish display names for the 48 FIFA World Cup 2026 qualifiers, keyed by
 * FIFA 3-letter code. The published per-match JSON carries English display
 * names; the card shows Spanish. Falls back to the English name for any code
 * not present here, so a draw change degrades gracefully rather than breaking.
 */
export const COUNTRY_NAMES_ES: Record<string, string> = {
  // Group A
  MEX: "México",
  RSA: "Sudáfrica",
  KOR: "Corea del Sur",
  CZE: "República Checa",
  // Group B
  CAN: "Canadá",
  BIH: "Bosnia y Herzegovina",
  QAT: "Catar",
  SUI: "Suiza",
  // Group C
  BRA: "Brasil",
  MAR: "Marruecos",
  HAI: "Haití",
  SCO: "Escocia",
  // Group D
  USA: "Estados Unidos",
  PAR: "Paraguay",
  AUS: "Australia",
  TUR: "Turquía",
  // Group E
  GER: "Alemania",
  CUW: "Curazao",
  CIV: "Costa de Marfil",
  ECU: "Ecuador",
  // Group F
  NED: "Países Bajos",
  JPN: "Japón",
  SWE: "Suecia",
  TUN: "Túnez",
  // Group G
  BEL: "Bélgica",
  EGY: "Egipto",
  IRN: "Irán",
  NZL: "Nueva Zelanda",
  // Group H
  ESP: "España",
  CPV: "Cabo Verde",
  KSA: "Arabia Saudita",
  URU: "Uruguay",
  // Group I
  FRA: "Francia",
  SEN: "Senegal",
  IRQ: "Irak",
  NOR: "Noruega",
  // Group J
  ARG: "Argentina",
  ALG: "Argelia",
  AUT: "Austria",
  JOR: "Jordania",
  // Group K
  POR: "Portugal",
  UZB: "Uzbekistán",
  COL: "Colombia",
  COD: "RD del Congo",
  // Group L
  ENG: "Inglaterra",
  CRO: "Croacia",
  GHA: "Ghana",
  PAN: "Panamá",
};

/** Spanish name for a FIFA code, falling back to the published display name. */
export function spanishName(code: string, fallback: string): string {
  return COUNTRY_NAMES_ES[code.toUpperCase()] ?? fallback;
}

/**
 * Tournament day number for a "YYYY-MM-DD" audience-local day key. The constant
 * TOURNAMENT_START is itself the Bogota civil day of the opener, and dayNumber
 * differences two such keys, so the count stays anchored on the same basis:
 * 2026-06-18 -> 8, 2026-06-19 -> 9. 2026-06-11 -> 1. Days before the start
 * return 0 or negative; callers show these dates only when they come from real
 * fixtures, so that case does not arise in practice.
 */
export function dayNumber(day: string): number {
  const start = Date.parse(`${TOURNAMENT_START}T00:00:00Z`);
  const d = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(d) || Number.isNaN(start)) return 0;
  return Math.round((d - start) / MS_PER_DAY) + 1;
}

/** Long-form Spanish date for a "YYYY-MM-DD" key, e.g. "18 de junio de 2026". */
export function formatSpanishDate(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Most recent audience-local day that has at least one played match, or null. */
export function selectRecapDay(matches: MatchDetail[]): string | null {
  let best: string | null = null;
  for (const m of matches) {
    if (!isPlayed(m)) continue;
    const day = dayKey(m.kickoff_utc);
    if (best === null || day > best) best = day;
  }
  return best;
}

/** Earliest audience-local day that still has an unplayed fixture, or null. */
export function selectPreviewDay(matches: MatchDetail[]): string | null {
  let best: string | null = null;
  for (const m of matches) {
    if (isPlayed(m)) continue;
    const day = dayKey(m.kickoff_utc);
    if (best === null || day < best) best = day;
  }
  return best;
}

/**
 * The matches shown on the card for a variant and subject day, sorted by
 * kickoff. Recap keeps played fixtures; preview keeps unplayed ones.
 */
export function matchesForCard(
  matches: MatchDetail[],
  day: string,
  variant: DailyVariant,
): MatchDetail[] {
  const wantPlayed = variant === "recap";
  return matches
    .filter((m) => dayKey(m.kickoff_utc) === day && isPlayed(m) === wantPlayed)
    .sort(byKickoff);
}

/**
 * Realized outcome for a played match: the stamped `outcome_realized` when
 * present, otherwise derived from the final score. Returns null when the
 * match has no score (not played).
 */
export function realizedOutcome(m: MatchDetail): "H" | "D" | "A" | null {
  if (m.outcome_realized) return m.outcome_realized;
  if (!m.score) return null;
  if (m.score.home > m.score.away) return "H";
  if (m.score.home < m.score.away) return "A";
  return "D";
}

/** Whole-percent string for a probability in [0,1], e.g. 0.731 -> "73%". */
export function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

/**
 * Recap calibration note: the probability the model assigned to the result
 * that actually happened. e.g. "el modelo le dio 73% a la victoria de México".
 * Returns null when the realized outcome cannot be determined.
 */
export function recapNote(m: MatchDetail): string | null {
  const outcome = realizedOutcome(m);
  if (!outcome) return null;
  const p = m.p_model_1x2;
  const home = spanishName(m.home.fifa_code, m.home.display_name);
  const away = spanishName(m.away.fifa_code, m.away.display_name);
  if (outcome === "H") return `el modelo le dio ${pct(p.H)} a la victoria de ${home}`;
  if (outcome === "A") return `el modelo le dio ${pct(p.A)} a la victoria de ${away}`;
  return `el modelo le dio ${pct(p.D)} al empate`;
}

/**
 * Preview note: the model's top 1X2 outcome and, when the goal grid is
 * present, the modal scoreline. e.g.
 *   "favorito: México con 73% · marcador modal 2-0"
 *   "el modelo ve un empate (32%) · marcador modal 1-1"
 */
export function previewNote(m: MatchDetail): string {
  const p = m.p_model_1x2;
  const home = spanishName(m.home.fifa_code, m.home.display_name);
  const away = spanishName(m.away.fifa_code, m.away.display_name);
  const modal = modalScoreline(m.p_model_goals);
  const modalPart = modal ? ` · marcador modal ${modal.home}-${modal.away}` : "";

  let head: string;
  if (p.H >= p.D && p.H >= p.A) head = `favorito: ${home} con ${pct(p.H)}`;
  else if (p.A >= p.D && p.A >= p.H) head = `favorito: ${away} con ${pct(p.A)}`;
  else head = `el modelo ve un empate (${pct(p.D)})`;

  return `${head}${modalPart}`;
}
