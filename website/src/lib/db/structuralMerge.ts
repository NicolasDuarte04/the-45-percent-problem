/**
 * src/lib/db/structuralMerge.ts
 *
 * Server-only join helpers. Snapshot loaders give us probabilities; Drizzle
 * gives us tournament structure. Pages call `loadStructuralMaps()` once, then
 * pass the result to whichever `merge*` helper(s) they need before handing
 * already-merged data down to compositions.
 *
 * Conventions:
 *   - We treat Drizzle as the single source of truth for *identity* (display
 *     name, fifa_code, confederation, group, home/away pairing on a match).
 *   - Snapshot rows whose match_id / fifa_code is unknown to Drizzle are
 *     dropped silently — better to render fewer rows than to render fictional
 *     teams while a snapshot regeneration catches up.
 *   - Snapshot rows that match Drizzle keep all their probability fields
 *     untouched; only the identity sub-object is rewritten.
 */

import "server-only";

import {
  getStructuralMatches,
  getStructuralTeams,
  type StructuralMatch,
  type StructuralTeam,
} from "./structuralData";
import type {
  DivergenceRow,
  DivergenceSnapshot,
  MatchDetail,
  TeamProgression,
  TeamRef,
  TournamentSnapshot,
  TournamentTeam,
} from "@/lib/data/schemas";

export type StructuralMaps = {
  matchesById: Map<string, StructuralMatch>;
  teamsByCode: Map<string, StructuralTeam>;
};

// Module-level memoization. Structural data does not change during a build
// or between requests served by the same Node worker, so we resolve it once
// per process and let every page share the result. Without this every static
// page (~150 of them at build time) would re-issue the Drizzle queries and
// open a fresh Postgres connection (`db/index.ts` keeps `max: 1`), which is
// what caused the per-route 60s timeouts seen during the WC2026 refactor.
let cached: Promise<StructuralMaps> | undefined;

export function loadStructuralMaps(): Promise<StructuralMaps> {
  if (!cached) {
    cached = (async () => {
      const [matches, teams] = await Promise.all([
        getStructuralMatches(),
        getStructuralTeams(),
      ]);
      return {
        matchesById: new Map(matches.map((m) => [m.match_id, m])),
        teamsByCode: new Map(teams.map((t) => [t.fifa_code, t])),
      };
    })();
  }
  return cached;
}

function teamRefFrom(t: StructuralTeam): TeamRef {
  return { fifa_code: t.fifa_code, display_name: t.display_name };
}

/**
 * Filter divergence rows to those whose `match_id` is in Drizzle, and rewrite
 * `home`/`away` from the structural match's `home_code`/`away_code`. This
 * means a snapshot lag (e.g. an extra match left over from an old draw) drops
 * out cleanly, and a draw correction propagates without waiting on the
 * next snapshot regeneration.
 */
export function mergeDivergence(
  snap: DivergenceSnapshot,
  maps: StructuralMaps,
): DivergenceSnapshot {
  const rows: DivergenceRow[] = [];
  for (const row of snap.rows) {
    const m = maps.matchesById.get(row.match_id);
    if (!m) continue;
    const homeCode = m.home_code ?? row.home.fifa_code;
    const awayCode = m.away_code ?? row.away.fifa_code;
    const home = maps.teamsByCode.get(homeCode);
    const away = maps.teamsByCode.get(awayCode);
    rows.push({
      ...row,
      home: home ? teamRefFrom(home) : row.home,
      away: away ? teamRefFrom(away) : row.away,
    });
  }
  return { ...snap, rows };
}

/**
 * Filter `tournament.teams` to qualifiers Drizzle knows about, and replace
 * `display_name` / `confederation` / `group` with Drizzle values. Probability
 * fields (`p_champion`, `p_final`, etc.) are kept verbatim.
 */
export function mergeTournament(
  snap: TournamentSnapshot,
  maps: StructuralMaps,
): TournamentSnapshot {
  const teams: TournamentTeam[] = [];
  for (const t of snap.teams) {
    const s = maps.teamsByCode.get(t.fifa_code);
    if (!s) continue;
    teams.push({
      ...t,
      display_name: s.display_name,
      confederation: s.confederation,
      group: s.group,
    });
  }
  return { ...snap, teams };
}

/**
 * Replace a single match's identity (home/away) with Drizzle-sourced TeamRefs.
 * If the match isn't in Drizzle (e.g. a stale snapshot), the original is
 * returned unchanged — callers that need a 404 should check `matchesById`
 * directly before loading the snapshot.
 */
export function mergeMatch(match: MatchDetail, maps: StructuralMaps): MatchDetail {
  const m = maps.matchesById.get(match.match_id);
  if (!m) return match;
  const homeCode = m.home_code ?? match.home.fifa_code;
  const awayCode = m.away_code ?? match.away.fifa_code;
  const home = maps.teamsByCode.get(homeCode);
  const away = maps.teamsByCode.get(awayCode);
  return {
    ...match,
    home: home ? teamRefFrom(home) : match.home,
    away: away ? teamRefFrom(away) : match.away,
  };
}

/** Replace a single team's identity (display_name, group) with Drizzle values. */
export function mergeTeamProgression(
  team: TeamProgression,
  maps: StructuralMaps,
): TeamProgression {
  const s = maps.teamsByCode.get(team.fifa_code);
  if (!s) return team;
  return { ...team, display_name: s.display_name, group: s.group };
}
