/**
 * Group-standings helper for WC 2026 (Checkpoint 15).
 *
 * Pure function. No DB access, no clock reads. Takes a list of settled
 * match outcomes and a set of group assignments (which 4 teams are in
 * each of the 12 groups) and returns a TournamentGroupStandings
 * describing every group's standings plus the top 8 best third-placed
 * teams.
 *
 * Tiebreaker order (Framework Blueprint v1.0 / FIFA WC 2026 regulations):
 *   1. Points (3 for a win, 1 for a draw, 0 for a loss)
 *   2. Goal difference
 *   3. Goals scored
 *   4. Head-to-head points among tied teams
 *   5. Head-to-head goal difference among tied teams
 *   6. Fair Play (NOT implemented; no card data in match_outcomes)
 *   7. Lots (NOT implemented; falls back to alphabetical FIFA code)
 *
 * Steps 6 and 7 are simplifications. The match_outcomes schema does not
 * store yellow / red card counts, so a true Fair Play tiebreaker is not
 * available in Phase B; if a tie reaches that level the function falls
 * back to alphabetical ordering of FIFA codes. This is deterministic,
 * which preserves the evaluator's idempotency guarantee. A future
 * checkpoint can add card ingestion plus a Fair Play stage if any actual
 * WC 2026 group is contested down to that level.
 *
 * Best-thirds selection:
 *   1. Take every group's 3rd-placed team (position === 3).
 *   2. Rank them by (points desc, goal difference desc, goals scored desc).
 *   3. Break further ties by alphabetical FIFA code (lots equivalent).
 *   4. Return the top 8.
 *
 * The function tolerates partial group-stage settlement: it computes
 * standings off whatever group-stage matches have actually settled.
 * Position assignment is still total (every team in every group is
 * placed 1..4) so the caller can read "Group A: W=MEX, RU=KOR" even
 * before the third matchday plays. Callers that need to know whether a
 * group is fully settled can call `isGroupFullySettled` against the
 * input matches.
 */

import type { MatchOutcome } from "@/lib/db/schema";
import type { TeamCode } from "./types";

/** A team's standing inside its group. */
export interface GroupTeamStanding {
  code: TeamCode;
  played: number;
  won: number;
  drawn: number;
  /** Operator vocabulary: factual match result count. */
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** 1 (group winner), 2 (runner-up), 3, or 4. Assigned after tiebreakers. */
  position: 1 | 2 | 3 | 4;
}

/** Standings for a single group. */
export interface GroupStandings {
  /** "A" through "L". */
  group: string;
  /** All 4 teams, ordered by position (1 first, 4 last). */
  teams: GroupTeamStanding[];
}

/** Best-third entry used in the cross-group ranking. */
export interface BestThirdEntry {
  code: TeamCode;
  fromGroup: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
}

/** Full tournament standings shape. */
export interface TournamentGroupStandings {
  /** 12 groups, in order A through L. */
  groups: GroupStandings[];
  /** Top 8 of the 12 third-placed teams. */
  bestThirds: BestThirdEntry[];
}

/** Group assignment input. */
export interface GroupAssignment {
  /** "A" through "L". */
  group: string;
  /** The 4 FIFA codes in this group. Order is irrelevant. */
  teams: readonly TeamCode[];
}

const GROUP_LETTERS = [
  "A", "B", "C", "D", "E", "F",
  "G", "H", "I", "J", "K", "L",
] as const;

/**
 * Compute group standings from a set of settled matches plus the group
 * assignments. The function filters to group-stage matches (stage ===
 * "group"); knockout matches are ignored.
 */
export function computeGroupStandings(
  matches: readonly MatchOutcome[],
  groupAssignments: readonly GroupAssignment[],
): TournamentGroupStandings {
  const assignmentByGroup = new Map<string, readonly TeamCode[]>();
  const teamToGroup = new Map<TeamCode, string>();
  for (const a of groupAssignments) {
    assignmentByGroup.set(a.group, a.teams);
    for (const t of a.teams) {
      teamToGroup.set(t, a.group);
    }
  }

  const groupMatches = matches.filter((m) => m.stage === "group");

  const groups: GroupStandings[] = [];
  for (const letter of GROUP_LETTERS) {
    const teams = assignmentByGroup.get(letter);
    if (!teams) continue;
    const standings = computeOneGroup(letter, teams, groupMatches);
    groups.push(standings);
  }

  const bestThirds = computeBestThirds(groups);

  return { groups, bestThirds };
}

/**
 * Returns true when every match between the 4 teams in a group has
 * settled (6 matches per group in WC 2026).
 */
export function isGroupFullySettled(
  group: string,
  teams: readonly TeamCode[],
  matches: readonly MatchOutcome[],
): boolean {
  const teamSet = new Set(teams);
  let count = 0;
  for (const m of matches) {
    if (m.stage !== "group") continue;
    if (!teamSet.has(m.homeTeam as TeamCode)) continue;
    if (!teamSet.has(m.awayTeam as TeamCode)) continue;
    count += 1;
  }
  return count >= 6;
}

// ─── Internal: one group ────────────────────────────────────────────────────

interface RunningTally {
  code: TeamCode;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

function emptyTally(code: TeamCode): RunningTally {
  return {
    code,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };
}

function computeOneGroup(
  letter: string,
  teams: readonly TeamCode[],
  groupMatches: readonly MatchOutcome[],
): GroupStandings {
  const teamSet = new Set(teams);
  const tallyByCode = new Map<TeamCode, RunningTally>();
  for (const t of teams) tallyByCode.set(t, emptyTally(t));

  for (const m of groupMatches) {
    const home = m.homeTeam as TeamCode;
    const away = m.awayTeam as TeamCode;
    if (!teamSet.has(home) || !teamSet.has(away)) continue;

    const hT = tallyByCode.get(home);
    const aT = tallyByCode.get(away);
    if (!hT || !aT) continue;

    hT.played += 1;
    aT.played += 1;
    hT.goalsFor += m.homeGoals;
    hT.goalsAgainst += m.awayGoals;
    aT.goalsFor += m.awayGoals;
    aT.goalsAgainst += m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      hT.won += 1;
      aT.lost += 1;
    } else if (m.awayGoals > m.homeGoals) {
      aT.won += 1;
      hT.lost += 1;
    } else {
      hT.drawn += 1;
      aT.drawn += 1;
    }
  }

  const projected: Array<Omit<GroupTeamStanding, "position">> = [];
  for (const t of teams) {
    const tally = tallyByCode.get(t);
    if (!tally) continue;
    const points = tally.won * 3 + tally.drawn;
    projected.push({
      code: tally.code,
      played: tally.played,
      won: tally.won,
      drawn: tally.drawn,
      lost: tally.lost,
      goalsFor: tally.goalsFor,
      goalsAgainst: tally.goalsAgainst,
      goalDifference: tally.goalsFor - tally.goalsAgainst,
      points,
    });
  }

  const ranked = rankWithinGroup(projected, groupMatches);
  const finalTeams: GroupTeamStanding[] = ranked.map((row, idx) => ({
    ...row,
    position: (idx + 1) as 1 | 2 | 3 | 4,
  }));

  return { group: letter, teams: finalTeams };
}

// ─── Tiebreakers ────────────────────────────────────────────────────────────

type Row = Omit<GroupTeamStanding, "position">;

function rankWithinGroup(
  rows: readonly Row[],
  allGroupMatches: readonly MatchOutcome[],
): Row[] {
  /**
   * Step 1: bucket teams by (points, GD, GS). Inside a bucket teams are
   * tied at the global stage; we resolve those with H2H, H2H GD, and the
   * alphabetical fallback (lots).
   */
  const sorted = rows.slice().sort(compareGlobal);

  const buckets: Row[][] = [];
  let current: Row[] = [];
  let last: Row | null = null;
  for (const r of sorted) {
    if (last !== null && compareGlobal(last, r) === 0) {
      current.push(r);
    } else {
      if (current.length > 0) buckets.push(current);
      current = [r];
    }
    last = r;
  }
  if (current.length > 0) buckets.push(current);

  const out: Row[] = [];
  for (const bucket of buckets) {
    if (bucket.length === 1) {
      out.push(bucket[0]);
    } else {
      const resolved = resolveTie(bucket, allGroupMatches);
      out.push(...resolved);
    }
  }
  return out;
}

function compareGlobal(a: Row, b: Row): number {
  if (a.points !== b.points) return b.points - a.points;
  if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
  return 0;
}

function resolveTie(
  tied: readonly Row[],
  allGroupMatches: readonly MatchOutcome[],
): Row[] {
  /**
   * Head-to-head subgroup: build a mini-table containing only matches
   * played between the tied teams. Apply (H2H points, H2H GD) ordering.
   * If a tie still exists after H2H, fall back to alphabetical FIFA
   * code (the deterministic stand-in for the Fair Play and lots
   * stages).
   */
  const tiedSet = new Set(tied.map((r) => r.code));
  const h2hPoints = new Map<TeamCode, number>();
  const h2hGD = new Map<TeamCode, number>();
  const h2hGS = new Map<TeamCode, number>();
  for (const r of tied) {
    h2hPoints.set(r.code, 0);
    h2hGD.set(r.code, 0);
    h2hGS.set(r.code, 0);
  }

  for (const m of allGroupMatches) {
    const home = m.homeTeam as TeamCode;
    const away = m.awayTeam as TeamCode;
    if (!tiedSet.has(home) || !tiedSet.has(away)) continue;
    const hGD = m.homeGoals - m.awayGoals;
    const aGD = m.awayGoals - m.homeGoals;
    h2hGD.set(home, (h2hGD.get(home) ?? 0) + hGD);
    h2hGD.set(away, (h2hGD.get(away) ?? 0) + aGD);
    h2hGS.set(home, (h2hGS.get(home) ?? 0) + m.homeGoals);
    h2hGS.set(away, (h2hGS.get(away) ?? 0) + m.awayGoals);
    if (m.homeGoals > m.awayGoals) {
      h2hPoints.set(home, (h2hPoints.get(home) ?? 0) + 3);
    } else if (m.awayGoals > m.homeGoals) {
      h2hPoints.set(away, (h2hPoints.get(away) ?? 0) + 3);
    } else {
      h2hPoints.set(home, (h2hPoints.get(home) ?? 0) + 1);
      h2hPoints.set(away, (h2hPoints.get(away) ?? 0) + 1);
    }
  }

  return tied.slice().sort((a, b) => {
    const ap = h2hPoints.get(a.code) ?? 0;
    const bp = h2hPoints.get(b.code) ?? 0;
    if (ap !== bp) return bp - ap;
    const agd = h2hGD.get(a.code) ?? 0;
    const bgd = h2hGD.get(b.code) ?? 0;
    if (agd !== bgd) return bgd - agd;
    const ags = h2hGS.get(a.code) ?? 0;
    const bgs = h2hGS.get(b.code) ?? 0;
    if (ags !== bgs) return bgs - ags;
    // Fair Play and lots not implemented; fall back to alphabetical.
    if (a.code < b.code) return -1;
    if (a.code > b.code) return 1;
    return 0;
  });
}

// ─── Best thirds ────────────────────────────────────────────────────────────

function computeBestThirds(groups: readonly GroupStandings[]): BestThirdEntry[] {
  const thirds: BestThirdEntry[] = [];
  for (const g of groups) {
    const third = g.teams.find((t) => t.position === 3);
    if (!third) continue;
    thirds.push({
      code: third.code,
      fromGroup: g.group,
      points: third.points,
      goalDifference: third.goalDifference,
      goalsFor: third.goalsFor,
    });
  }
  thirds.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
    if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
    // Lots fallback: alphabetical FIFA code, deterministic.
    if (a.code < b.code) return -1;
    if (a.code > b.code) return 1;
    return 0;
  });
  return thirds.slice(0, 8);
}

// ─── Canonical WC 2026 group assignments ────────────────────────────────────

/**
 * The canonical group assignments mirror `src/lib/data/wc2026-official-draw.ts`.
 * That module is the single source of truth; we duplicate the assignments
 * here so the evaluator (which runs in environments without DB access)
 * stays a pure function. If the official draw module changes (e.g. a
 * forfeit), this list must be updated in lockstep. There is no Drizzle
 * read path in the evaluator runner so a build-time check is not
 * straightforward; the structural-data unit test in
 * `website/tests/contracts/run_contracts.ts` is the safety net.
 */
export const WC2026_GROUP_ASSIGNMENTS: readonly GroupAssignment[] = [
  { group: "A", teams: ["MEX", "RSA", "KOR", "CZE"] },
  { group: "B", teams: ["CAN", "BIH", "QAT", "SUI"] },
  { group: "C", teams: ["BRA", "MAR", "HAI", "SCO"] },
  { group: "D", teams: ["USA", "PAR", "AUS", "TUR"] },
  { group: "E", teams: ["GER", "CUW", "CIV", "ECU"] },
  { group: "F", teams: ["NED", "JPN", "SWE", "TUN"] },
  { group: "G", teams: ["BEL", "EGY", "IRN", "NZL"] },
  { group: "H", teams: ["ESP", "CPV", "KSA", "URU"] },
  { group: "I", teams: ["FRA", "SEN", "IRQ", "NOR"] },
  { group: "J", teams: ["ARG", "ALG", "AUT", "JOR"] },
  { group: "K", teams: ["POR", "UZB", "COL", "COD"] },
  { group: "L", teams: ["ENG", "CRO", "GHA", "PAN"] },
] as const;
