/**
 * Pure helpers for the /matches index page (cp-17).
 *
 * The page reads the published per-match JSON via loadAllMatches() and needs to
 * (a) split fixtures into played vs upcoming, (b) order them chronologically,
 * (c) group them by calendar (UTC) day for the date dividers, and (d) derive
 * the modal scoreline from the model's goal grid. All of that is pure data
 * transformation, kept here so it can be unit-tested without rendering.
 */
import type { MatchDetail } from "./schemas";

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

/** UTC calendar day key, e.g. "2026-06-11". Used to group rows under a date. */
export function dayKey(kickoffUtc: string): string {
  // kickoff_utc is an ISO string; the first 10 chars are YYYY-MM-DD in UTC.
  // Fall back to a Date round-trip if the string is not already ISO-prefixed.
  if (/^\d{4}-\d{2}-\d{2}/.test(kickoffUtc)) return kickoffUtc.slice(0, 10);
  const d = new Date(kickoffUtc);
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dy = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mo}-${dy}`;
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

/**
 * The most likely exact scoreline under the model, read off the joint goal
 * matrix p_model_goals[home_goals][away_goals]. Returns null when the grid is
 * missing or empty (knockout fixtures that haven't been priced).
 */
export function modalScoreline(
  grid: number[][] | undefined | null,
): { home: number; away: number } | null {
  if (!grid || grid.length === 0) return null;
  let best = -1;
  let homeGoals = 0;
  let awayGoals = 0;
  for (let h = 0; h < grid.length; h++) {
    const row = grid[h];
    if (!row) continue;
    for (let a = 0; a < row.length; a++) {
      if (row[a] > best) {
        best = row[a];
        homeGoals = h;
        awayGoals = a;
      }
    }
  }
  if (best < 0) return null;
  return { home: homeGoals, away: awayGoals };
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

/** Kickoff clock label in UTC, e.g. "19:00Z". */
export function formatKickoffTime(kickoffUtc: string): string {
  const d = new Date(kickoffUtc);
  if (Number.isNaN(d.getTime())) return kickoffUtc.slice(11, 16);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}Z`;
}

/**
 * UTC calendar-day key ("YYYY-MM-DD") for a millisecond timestamp. Used to
 * derive "today" from the client clock so it lines up with `dayKey`, which
 * keys fixtures on their UTC kickoff day.
 */
export function utcDayKeyFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Split an upcoming (unplayed) list into the fixtures kicking off on
 * `todayKey` (UTC) and everything else, preserving the input order. `today`
 * is the set whose UTC kickoff day equals todayKey; `rest` is the remainder
 * (future days, plus any earlier-dated fixture not yet settled). Pass the
 * already-sorted upcoming list so both partitions stay chronological.
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
