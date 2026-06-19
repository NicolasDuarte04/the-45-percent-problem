/**
 * Pure helpers for the /matches index page (cp-17).
 *
 * The page reads the published per-match JSON via loadAllMatches() and needs to
 * (a) split fixtures into played vs upcoming, (b) order them chronologically,
 * (c) group them by calendar day for the date dividers, and (d) derive the
 * modal scoreline from the model's goal grid. All of that is pure data
 * transformation, kept here so it can be unit-tested without rendering.
 *
 * Day grouping uses a fixed AUDIENCE timezone (America/Bogota), not UTC. A late
 * local-evening kickoff that crosses UTC midnight (e.g. Mexico vs Korea at
 * 01:00Z, which is 8:00 PM the previous day in Bogota) must land on the day the
 * Latin American audience actually experiences it. `dayKey` is the single basis
 * shared by the matches page AND the daily share card (which imports it), so the
 * two surfaces can never disagree about which day a fixture belongs to.
 */
import type { MatchDetail } from "./schemas";

/**
 * The audience timezone for all civil-day grouping and clock display.
 * America/Bogota is a fixed UTC-5 with no daylight saving, so the day boundary
 * is stable year round. Anchored here as the one source of truth.
 */
export const AUDIENCE_TZ = "America/Bogota";

/** A fixture counts as "played" once the nightly regen has joined a score. */
export function isPlayed(m: MatchDetail): boolean {
  return m.score != null;
}

/** Chronological compare on kickoff_utc, with match_id as a stable tiebreak. */
export function byKickoff(a: MatchDetail, b: MatchDetail): number {
  const ta = Date.parse(a.kickoff_utc);
  const tb = Date.parse(b.kickoff_utc);
  if (ta !== tb) return ta - tb;
  return a.match_id.localeCompare(b.match_id);
}

/**
 * Split into played and upcoming, each sorted ascending by kickoff. Played
 * fixtures come first so the page reads strictly forward in tournament time:
 * the divider between the two sections is the "now" line.
 */
export function splitPlayedUpcoming(matches: MatchDetail[]): {
  played: MatchDetail[];
  upcoming: MatchDetail[];
} {
  const played: MatchDetail[] = [];
  const upcoming: MatchDetail[] = [];
  for (const m of matches) {
    (isPlayed(m) ? played : upcoming).push(m);
  }
  played.sort(byKickoff);
  upcoming.sort(byKickoff);
  return { played, upcoming };
}

/** Formats a Date as a "YYYY-MM-DD" civil-day key in the audience timezone. */
const AUDIENCE_DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: AUDIENCE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Audience-local (America/Bogota) calendar day key, e.g. "2026-06-11". Used to
 * group rows under a date. A kickoff of 01:00Z on June 19 is 8:00 PM on June 18
 * in Bogota and therefore keys to "2026-06-18", matching the local listings the
 * audience sees. en-CA yields ISO-ordered YYYY-MM-DD parts.
 */
export function dayKey(kickoffUtc: string): string {
  const d = new Date(kickoffUtc);
  if (Number.isNaN(d.getTime())) return kickoffUtc.slice(0, 10);
  return AUDIENCE_DAY_FMT.format(d);
}

export interface MatchDayGroup {
  day: string;
  matches: MatchDetail[];
}

/** Group an already-sorted list into consecutive same-day buckets. */
export function groupByDay(matches: MatchDetail[]): MatchDayGroup[] {
  const groups: MatchDayGroup[] = [];
  for (const m of matches) {
    const day = dayKey(m.kickoff_utc);
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.matches.push(m);
    } else {
      groups.push({ day, matches: [m] });
    }
  }
  return groups;
}

/** One ranked exact scoreline: home/away goals and their joint probability. */
export interface ScoreCell {
  home: number;
  away: number;
  p: number;
}

/**
 * The `n` most probable exact scorelines under the model, ranked by joint
 * probability descending, read off p_model_goals[home_goals][away_goals].
 *
 * This is the single ranking shared by the match detail page's goal-matrix
 * heatmap (GoalMatrixHeatmap), the daily share card, and `modalScoreline`. To
 * stay byte-identical with what the detail page shows, it mirrors that
 * component exactly: the grid is clipped to the 0..6 goal range (7x7), cells
 * are walked in row-major order (home outer, away inner), and ties resolve by
 * that order via a stable sort (lower home, then lower away). Returns fewer
 * than `n` (possibly empty) when the grid is missing or smaller.
 */
export function topScorelines(
  grid: number[][] | undefined | null,
  n: number,
): ScoreCell[] {
  if (!grid || grid.length === 0) return [];
  const clipped = grid.slice(0, 7).map((row) => row.slice(0, 7));
  const cells: ScoreCell[] = [];
  for (let h = 0; h < clipped.length; h++) {
    const row = clipped[h];
    if (!row) continue;
    for (let a = 0; a < row.length; a++) {
      cells.push({ home: h, away: a, p: row[a] });
    }
  }
  cells.sort((x, y) => y.p - x.p);
  return cells.slice(0, Math.max(0, n));
}

/**
 * The most likely exact scoreline under the model. Thin wrapper over
 * `topScorelines` so there is one ranking implementation. Returns null when the
 * grid is missing or empty (knockout fixtures that haven't been priced).
 */
export function modalScoreline(
  grid: number[][] | undefined | null,
): { home: number; away: number } | null {
  const [top] = topScorelines(grid, 1);
  if (!top) return null;
  return { home: top.home, away: top.away };
}

/** Long-form day label for a "YYYY-MM-DD" key, e.g. "Thursday, 11 June 2026". */
export function formatDayLabel(day: string): string {
  // Parse as UTC midnight so the weekday/day never shift with the build TZ.
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Formats a Date as a 12-hour time-of-day in the audience timezone, e.g. "8:00 PM". */
const AUDIENCE_TIME_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: AUDIENCE_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Kickoff clock label in the audience timezone, with an explicit zone tag so it
 * can never be misread as UTC, e.g. "8:00 PM COT". COT is Colombia Time (UTC-5).
 * A match grouped under June 18 whose kickoff is 01:00Z June 19 reads "8:00 PM",
 * not a confusing "01:00Z".
 */
export function formatKickoffTime(kickoffUtc: string): string {
  const d = new Date(kickoffUtc);
  if (Number.isNaN(d.getTime())) return kickoffUtc.slice(11, 16);
  // Some ICU builds separate the AM/PM with a narrow no-break space; normalise
  // to a plain space so the label is stable across environments.
  const clock = AUDIENCE_TIME_FMT.format(d).replace(/[\u202f\u00a0]/g, " ");
  return `${clock} COT`;
}

/**
 * Audience-local (America/Bogota) calendar-day key ("YYYY-MM-DD") for a
 * millisecond timestamp. Used to derive "today" from the client clock so it
 * lines up with `dayKey`, which keys fixtures on their audience-local kickoff
 * day. Late-evening "today" matches that cross UTC midnight stay under today.
 */
export function audienceDayKeyFromMs(ms: number): string {
  return AUDIENCE_DAY_FMT.format(new Date(ms));
}

/**
 * Split an upcoming (unplayed) list into the fixtures kicking off on
 * `todayKey` and everything else, preserving the input order. `today` is the
 * set whose audience-local kickoff day equals todayKey; `rest` is the
 * remainder (future days, plus any earlier-dated fixture not yet settled).
 * Pass the already-sorted upcoming list so both partitions stay chronological.
 */
export function partitionToday(
  upcoming: MatchDetail[],
  todayKey: string,
): { today: MatchDetail[]; rest: MatchDetail[] } {
  const today: MatchDetail[] = [];
  const rest: MatchDetail[] = [];
  for (const m of upcoming) {
    (dayKey(m.kickoff_utc) === todayKey ? today : rest).push(m);
  }
  return { today, rest };
}

/**
 * Case-insensitive filter on team identity: a fixture is kept when the query
 * is a substring of either side's display name or FIFA code. A blank query
 * returns the list unchanged (referential identity preserved).
 */
export function filterByTeam(
  matches: MatchDetail[],
  query: string,
): MatchDetail[] {
  const q = query.trim().toLowerCase();
  if (!q) return matches;
  return matches.filter(
    (m) =>
      m.home.display_name.toLowerCase().includes(q) ||
      m.away.display_name.toLowerCase().includes(q) ||
      m.home.fifa_code.toLowerCase().includes(q) ||
      m.away.fifa_code.toLowerCase().includes(q),
  );
}
