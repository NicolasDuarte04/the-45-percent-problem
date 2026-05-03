/**
 * src/lib/db/fixtures.ts
 *
 * Typed query helpers for the FIFA 2026 tournament structure tables. Frontend
 * components must consume these helpers (NOT the canonical TS draw module
 * directly, NOT raw Drizzle calls scattered throughout the tree). This file
 * is the only sanctioned read path for `teams`, `venues`, and `matches`.
 *
 * Per project mandate: NO frontend component is allowed to hardcode team
 * pairings. All matchups must be fetched here.
 *
 * Probabilities continue to come from the JSON snapshot loader
 * (lib/data/loadSnapshot.ts). Components join structure (Drizzle) and
 * probability (JSON) by `match_id` / `fifa_code` at render time.
 */

import "server-only";

import { eq, asc, and, inArray } from "drizzle-orm";

import { db, schema } from "./index";
import type { Match, Team, Venue } from "./schema";

export type GroupLetter =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export type Round = "GRP" | "R32" | "R16" | "QF" | "SF" | "3P" | "FIN";

// ─── Teams ────────────────────────────────────────────────────────────────────

/** All 48 qualified teams, ordered by group then draw pot. */
export async function getAllTeams(): Promise<Team[]> {
  return db
    .select()
    .from(schema.teams)
    .orderBy(asc(schema.teams.group), asc(schema.teams.drawPot));
}

export async function getTeamByCode(code: string): Promise<Team | null> {
  const rows = await db
    .select()
    .from(schema.teams)
    .where(eq(schema.teams.fifaCode, code))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTeamsInGroup(group: GroupLetter): Promise<Team[]> {
  return db
    .select()
    .from(schema.teams)
    .where(eq(schema.teams.group, group))
    .orderBy(asc(schema.teams.drawPot));
}

/** Teams keyed by group letter — convenient for rendering all 12 groups. */
export async function getAllTeamsGrouped(): Promise<
  Record<GroupLetter, Team[]>
> {
  const all = await getAllTeams();
  const out = {} as Record<GroupLetter, Team[]>;
  for (const g of "ABCDEFGHIJKL".split("") as GroupLetter[]) {
    out[g] = [];
  }
  for (const t of all) {
    const g = t.group as GroupLetter;
    if (out[g]) out[g].push(t);
  }
  return out;
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export async function getAllMatches(): Promise<Match[]> {
  return db.select().from(schema.matches).orderBy(asc(schema.matches.kickoffUtc));
}

export async function getMatchById(matchId: string): Promise<Match | null> {
  const rows = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.matchId, matchId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getGroupMatches(group?: GroupLetter): Promise<Match[]> {
  if (group) {
    return db
      .select()
      .from(schema.matches)
      .where(
        and(eq(schema.matches.round, "GRP"), eq(schema.matches.group, group)),
      )
      .orderBy(asc(schema.matches.kickoffUtc));
  }
  return db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.round, "GRP"))
    .orderBy(asc(schema.matches.kickoffUtc));
}

export async function getKnockoutMatches(): Promise<Match[]> {
  return db
    .select()
    .from(schema.matches)
    .where(
      inArray(schema.matches.round, ["R32", "R16", "QF", "SF", "3P", "FIN"]),
    )
    .orderBy(asc(schema.matches.kickoffUtc));
}

export async function getMatchesByRound(round: Round): Promise<Match[]> {
  return db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.round, round))
    .orderBy(asc(schema.matches.kickoffUtc));
}

// ─── Venues ───────────────────────────────────────────────────────────────────

export async function getAllVenues(): Promise<Venue[]> {
  return db.select().from(schema.venues).orderBy(asc(schema.venues.key));
}

export async function getVenueByKey(key: string): Promise<Venue | null> {
  const rows = await db
    .select()
    .from(schema.venues)
    .where(eq(schema.venues.key, key))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Composite shapes used by pages ───────────────────────────────────────────

export interface MatchWithTeams {
  match: Match;
  home: Team | null;
  away: Team | null;
  venue: Venue | null;
}

/**
 * Returns matches enriched with their home/away team rows and venue. Rows
 * with `home_slot` / `away_slot` (knockout matches whose teams are TBD)
 * have `home: null` / `away: null` — render the slot descriptor instead.
 */
export async function getMatchesWithTeams(opts: {
  round?: Round;
  group?: GroupLetter;
}): Promise<MatchWithTeams[]> {
  const matchRows = await (async () => {
    if (opts.round) return getMatchesByRound(opts.round);
    if (opts.group) return getGroupMatches(opts.group);
    return getAllMatches();
  })();

  if (matchRows.length === 0) return [];

  const teamCodes = new Set<string>();
  const venueKeys = new Set<string>();
  for (const m of matchRows) {
    if (m.homeTeam) teamCodes.add(m.homeTeam);
    if (m.awayTeam) teamCodes.add(m.awayTeam);
    venueKeys.add(m.venueKey);
  }

  const [teams, venues] = await Promise.all([
    teamCodes.size > 0
      ? db
          .select()
          .from(schema.teams)
          .where(inArray(schema.teams.fifaCode, [...teamCodes]))
      : Promise.resolve([] as Team[]),
    db
      .select()
      .from(schema.venues)
      .where(inArray(schema.venues.key, [...venueKeys])),
  ]);

  const teamByCode = new Map(teams.map((t) => [t.fifaCode, t]));
  const venueByKey = new Map(venues.map((v) => [v.key, v]));

  return matchRows.map((m) => ({
    match: m,
    home: m.homeTeam ? teamByCode.get(m.homeTeam) ?? null : null,
    away: m.awayTeam ? teamByCode.get(m.awayTeam) ?? null : null,
    venue: venueByKey.get(m.venueKey) ?? null,
  }));
}
