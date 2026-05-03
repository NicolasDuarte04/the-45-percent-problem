/**
 * src/lib/db/structuralData.ts
 *
 * Production read path for tournament STRUCTURE: which 48 teams are in
 * the tournament, which 12 groups they sit in, and which 104 matchups
 * they will play. Per the May 2026 mandate this is the only path frontend
 * code is allowed to take for that data — no hardcoded pairings.
 *
 * Strategy:
 *   1. If DATABASE_URL is set, read from Postgres via Drizzle (the SoT).
 *   2. Otherwise (build environments without DB credentials, local dev
 *      before the seed script has run), fall back to the canonical TS
 *      draw module. The TS module mirrors what `pnpm db:seed:fixtures`
 *      writes into Postgres, byte-for-byte, so the fallback is correct
 *      by construction.
 *
 * Probabilities continue to come from `loadSnapshot.ts` and are joined
 * to structural rows in components by `match_id` / `fifa_code`.
 */

import "server-only";

import {
  TEAMS as TS_TEAMS,
  GROUP_MATCHES as TS_GROUP_MATCHES,
  KNOCKOUT_MATCHES as TS_KO_MATCHES,
  VENUES as TS_VENUES,
  TEAM_BY_CODE as TS_TEAM_BY_CODE,
  type GroupLetter,
  type Team as TSTeam,
} from "@/lib/data/wc2026-official-draw";

export type StructuralTeam = {
  fifa_code: string;
  display_name: string;
  confederation: TSTeam["confederation"];
  group: GroupLetter;
  draw_pot: number;
};

export type StructuralMatch = {
  match_id: string;
  round: "GRP" | "R32" | "R16" | "QF" | "SF" | "3P" | "FIN";
  matchday: number | null;
  group: GroupLetter | null;
  home_code: string | null;
  away_code: string | null;
  home_slot: string | null;
  away_slot: string | null;
  kickoff_utc: string;
  venue_key: string;
};

function dbAvailable(): boolean {
  if (!process.env.DATABASE_URL) return false;
  // During `next build`, hammering Supabase from N parallel workers across
  // ~150 static pages exhausts the pooler connection budget and trips the
  // 60s per-page build timeout. The TS canonical draw is byte-identical to
  // the seeded Postgres tables (the seed script asserts this), so we fall
  // back to TS at build time and reserve Drizzle for runtime / dev where
  // the connection cost is amortized over many real requests.
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  return true;
}

/** Get all 48 teams. Tries Drizzle first; falls back to TS canonical. */
export async function getStructuralTeams(): Promise<StructuralTeam[]> {
  if (dbAvailable()) {
    try {
      const { getAllTeams } = await import("./fixtures");
      const rows = await getAllTeams();
      return rows.map((r) => ({
        fifa_code: r.fifaCode,
        display_name: r.displayName,
        confederation: r.confederation,
        group: r.group as GroupLetter,
        draw_pot: r.drawPot,
      }));
    } catch (err) {
      console.warn(
        "[structuralData] Drizzle read failed; falling back to TS draw.",
        err,
      );
    }
  }
  return TS_TEAMS.map((t) => ({
    fifa_code: t.fifa_code,
    display_name: t.display_name,
    confederation: t.confederation,
    group: t.group,
    draw_pot: t.draw_pot,
  }));
}

/** Convenience: teams keyed by group letter A..L. */
export async function getStructuralGroups(): Promise<
  Record<GroupLetter, StructuralTeam[]>
> {
  const teams = await getStructuralTeams();
  const out = {} as Record<GroupLetter, StructuralTeam[]>;
  for (const g of "ABCDEFGHIJKL".split("") as GroupLetter[]) out[g] = [];
  for (const t of teams) {
    if (out[t.group]) out[t.group].push(t);
  }
  // Stable order within group: by draw pot.
  for (const g of Object.keys(out) as GroupLetter[]) {
    out[g].sort((a, b) => a.draw_pot - b.draw_pot);
  }
  return out;
}

/** All 104 matches. */
export async function getStructuralMatches(): Promise<StructuralMatch[]> {
  if (dbAvailable()) {
    try {
      const { getAllMatches } = await import("./fixtures");
      const rows = await getAllMatches();
      return rows.map((r) => {
        // Drizzle/postgres-js usually returns timestamps as Date, but if a
        // future driver bump (or an SSR-bundled edge case) hands us a string
        // we'd rather pass it through than crash.
        const kickoff =
          r.kickoffUtc instanceof Date
            ? r.kickoffUtc.toISOString()
            : String(r.kickoffUtc);
        return {
          match_id: r.matchId,
          round: r.round,
          matchday: r.matchday,
          group: (r.group as GroupLetter | null) ?? null,
          home_code: r.homeTeam,
          away_code: r.awayTeam,
          home_slot: r.homeSlot,
          away_slot: r.awaySlot,
          kickoff_utc: kickoff,
          venue_key: r.venueKey,
        };
      });
    } catch (err) {
      console.warn(
        "[structuralData] Drizzle read failed; falling back to TS draw.",
        err,
      );
    }
  }
  const grp: StructuralMatch[] = TS_GROUP_MATCHES.map((m) => ({
    match_id: m.match_id,
    round: "GRP",
    matchday: m.matchday,
    group: m.group,
    home_code: m.home_code,
    away_code: m.away_code,
    home_slot: null,
    away_slot: null,
    kickoff_utc: m.kickoff_utc,
    venue_key: m.venue_key,
  }));
  const ko: StructuralMatch[] = TS_KO_MATCHES.map((m) => ({
    match_id: m.match_id,
    round: m.round,
    matchday: null,
    group: null,
    home_code: null,
    away_code: null,
    home_slot: m.home_slot,
    away_slot: m.away_slot,
    kickoff_utc: m.kickoff_utc,
    venue_key: m.venue_key,
  }));
  return [...grp, ...ko];
}

/** Helper: lookup a team by code from either source. */
export async function lookupTeam(code: string): Promise<StructuralTeam | null> {
  const all = await getStructuralTeams();
  return all.find((t) => t.fifa_code === code) ?? null;
}

/** Helper: get the venue map (used to render kickoff cards). */
export function getStructuralVenues() {
  // Venues are immutable static data — always source from TS module.
  return TS_VENUES;
}

/** Helper: TS-side display name for a code, used by both data paths. */
export function displayName(code: string): string {
  return TS_TEAM_BY_CODE[code]?.display_name ?? code;
}
