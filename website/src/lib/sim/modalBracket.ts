import type { TournamentSnapshot, TournamentTeam } from "@/lib/data/schemas";
import type { TeamCode } from "@/lib/sim/types";

/**
 * The set of teams the model places in each knockout round, derived
 * round-by-round from the marginal reach probabilities published in
 * tournament.json. This is the same per-round top-k selection that
 * MostLikelyBracket renders on the home page (`byR16`, `byQF`, `bySF`,
 * `byF`, `byC`), surfaced as plain sets so the permalink comparison
 * panel can read them.
 *
 * The selections are independent top-k sorts, not a single coherent
 * simulated bracket. Per-round overlap with the user's call is
 * therefore a set intersection, not an index match.
 */
export interface ModalBracket {
  r32Winners: TeamCode[];
  r16Winners: TeamCode[];
  qfWinners: TeamCode[];
  sfWinners: TeamCode[];
  champion: TeamCode | null;
}

function isTeamCode(code: string): code is TeamCode {
  return /^[A-Z]{3}$/.test(code);
}

function topKCodes(
  teams: TournamentTeam[],
  key: (t: TournamentTeam) => number,
  k: number,
): TeamCode[] {
  return [...teams]
    .sort((a, b) => key(b) - key(a))
    .slice(0, k)
    .map((t) => t.fifa_code)
    .filter(isTeamCode);
}

export function deriveModalBracket(
  tournament: TournamentSnapshot,
): ModalBracket {
  const teams = tournament.teams.filter((t) => isTeamCode(t.fifa_code));
  const r32Winners = topKCodes(teams, (t) => t.p_r16, 16);
  const r16Winners = topKCodes(teams, (t) => t.p_quarterfinal, 8);
  const qfWinners = topKCodes(teams, (t) => t.p_semifinal, 4);
  const sfWinners = topKCodes(teams, (t) => t.p_final, 2);
  const championList = topKCodes(teams, (t) => t.p_champion, 1);
  const champion = championList[0] ?? null;
  return { r32Winners, r16Winners, qfWinners, sfWinners, champion };
}

/**
 * Per-team marginal probabilities, keyed by FIFA code. Mirrors the
 * fields on TournamentTeam but flattened to a lookup table so the
 * Champion's Path comparison can resolve a team's chance of reaching
 * each round without scanning the team array repeatedly.
 */
export interface TeamReachLookup {
  pR16: number;
  pQF: number;
  pSF: number;
  pF: number;
  pC: number;
}

export function buildTeamReachLookup(
  tournament: TournamentSnapshot,
): Record<string, TeamReachLookup> {
  const out: Record<string, TeamReachLookup> = {};
  for (const t of tournament.teams) {
    out[t.fifa_code] = {
      pR16: t.p_r16,
      pQF: t.p_quarterfinal,
      pSF: t.p_semifinal,
      pF: t.p_final,
      pC: t.p_champion,
    };
  }
  return out;
}
