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
 * Subject-day auto-selection (zero manual work, regenerates daily). Both
 * selectors are anchored to the audience-local "today" (`todayKey`, injected by
 * the route from the wall clock) so the card tracks the CALENDAR, not the data's
 * played-state. This keeps the card honest when results ingestion lags: a day of
 * unsettled fixtures can no longer drag the card into the past.
 *   - preview -> today's fixtures (the earliest unplayed day that is not before
 *                today). A day of stale, not-yet-settled past fixtures is never
 *                selected; on a rest day with nothing today, preview rolls
 *                forward to the next day with fixtures.
 *   - recap   -> the most recent COMPLETED day strictly before today (every
 *                fixture on it settled). If yesterday is not yet fully settled
 *                it falls back to the last fully-settled day, and the "Día N" and
 *                date labels follow that real day so a two-day-old recap is never
 *                dressed up as yesterday's.
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
import {
  dayKey,
  byKickoff,
  isLiveKnockout,
  isPlayed,
  modalScoreline,
  topScorelines,
} from "./matchListing";

export { audienceDayKeyFromMs } from "./matchListing";

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

/**
 * Recap subject day: the most recent COMPLETED audience-local day strictly
 * before `todayKey`, or null when none exists yet.
 *
 * "Completed" means every fixture on that day is settled (a score has been
 * joined). A day with even one unsettled fixture is skipped, so the recap never
 * shows a half-finished slate. When yesterday is not yet fully settled (e.g.
 * results ingestion is lagging) this walks back to the last fully-settled day;
 * the caller derives "Día N" and the date label from the returned day, so the
 * card honestly presents whatever day it actually shows rather than implying it
 * is yesterday's.
 *
 * `todayKey` is the audience-local "YYYY-MM-DD" for the current wall clock,
 * injected by the route (via audienceDayKeyFromMs) so this stays pure.
 */
export function selectRecapDay(
  matches: MatchDetail[],
  todayKey: string,
): string | null {
  const perDay = new Map<string, { total: number; played: number }>();
  for (const m of matches) {
    const day = dayKey(m.kickoff_utc);
    if (day >= todayKey) continue; // recap is strictly before today
    const entry = perDay.get(day) ?? { total: 0, played: 0 };
    entry.total += 1;
    if (isPlayed(m)) entry.played += 1;
    perDay.set(day, entry);
  }
  let best: string | null = null;
  for (const [day, { total, played }] of perDay) {
    if (total > 0 && played === total && (best === null || day > best)) {
      best = day;
    }
  }
  return best;
}

/**
 * Preview subject day: today's fixtures. Formally, the earliest audience-local
 * day with an unplayed fixture that is NOT before `todayKey`, or null when no
 * upcoming fixture remains.
 *
 * Anchoring at today (rather than "earliest unplayed day") is what keeps the
 * preview current under ingestion lag: a past day whose results have not yet
 * been joined is excluded by the `>= todayKey` floor, so it can never pull the
 * preview backwards. When today itself has fixtures they win; on a rest day with
 * nothing today, this rolls forward to the next day that does.
 *
 * `todayKey` is injected by the route (see selectRecapDay).
 */
export function selectPreviewDay(
  matches: MatchDetail[],
  todayKey: string,
): string | null {
  let best: string | null = null;
  for (const m of matches) {
    if (isPlayed(m)) continue;
    const day = dayKey(m.kickoff_utc);
    if (day < todayKey) continue; // never anchor to a stale past day
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
 * cp-29: the Spanish shootout resolution for a penalty-decided knockout on the
 * recap card, e.g. "penales: PAR ganó 4-3". A knockout that ends level went to
 * penalties, so a bare "1-1 Final" hides how the tie was actually decided. The
 * regulation score stays the headline (never the inflated shootout sum); this
 * line names the winner and the shootout tally, winner first. It reuses the
 * shared `isLiveKnockout` discriminator and the same `shootout` block that
 * matchListing's `shootoutLine` reads; the string is rendered in the card's
 * Colombian Spanish rather than the English quant-surface wording. Returns null
 * for group cards and any knockout decided in regulation.
 */
export function shootoutNote(m: MatchDetail): string | null {
  if (!isLiveKnockout(m)) return null;
  const so = m.shootout;
  if (!so || so.winner == null || so.home == null || so.away == null) return null;
  const winnerCode = so.winner === "H" ? m.home.fifa_code : m.away.fifa_code;
  const [w, l] = so.winner === "H" ? [so.home, so.away] : [so.away, so.home];
  return `penales: ${winnerCode} ganó ${w}-${l}`;
}

/** One scoreline chip on the preview card: "1-1" with its whole-percent prob. */
export interface ScorelineChip {
  /** Score with a plain ASCII hyphen, e.g. "1-1" (never an en dash). */
  score: string;
  /** Joint probability rounded to whole percent, e.g. "12%". */
  pct: string;
}

/**
 * The three most probable scorelines for a preview fixture, each as a display
 * pair { score: "1-1", pct: "12%" }. The ranking is the shared `topScorelines`
 * (identical to the match detail page's goal-matrix list), and probabilities
 * are rounded to whole percent via the same `pct` the card already uses for its
 * 1X2 numbers, so the value matches the detail page (which renders it to two
 * decimals) up to that rounding. Empty when the grid is absent (an unpriced
 * knockout), so the card can fall back gracefully.
 */
export function previewScorelines(
  grid: number[][] | undefined | null,
): ScorelineChip[] {
  return topScorelines(grid, 3).map((s) => ({
    score: `${s.home}-${s.away}`,
    pct: pct(s.p),
  }));
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

/**
 * The favored side of a fixture for the share card's gold ring and chip.
 *
 * The favorite is the side with the higher win probability: home when
 * `p.H >= p.A`, otherwise away. The draw is deliberately not eligible to be
 * the favorite even when it is the single most likely 1X2 outcome; per the
 * card spec we still ring the higher of home or away (a draw cannot wear the
 * gold ring). Ties on the two win probabilities resolve to home.
 */
export interface Favorite {
  side: "home" | "away";
  /** FIFA 3-letter code of the favored side, e.g. "MEX". */
  code: string;
  /** Win probability of the favored side in [0,1]. */
  p: number;
  /** Whole-percent string of that win probability, e.g. "73%". */
  pct: string;
}

export function favorite(
  p: { H: number; D: number; A: number },
  homeCode: string,
  awayCode: string,
): Favorite {
  if (p.A > p.H) {
    return { side: "away", code: awayCode, p: p.A, pct: pct(p.A) };
  }
  return { side: "home", code: homeCode, p: p.H, pct: pct(p.H) };
}
