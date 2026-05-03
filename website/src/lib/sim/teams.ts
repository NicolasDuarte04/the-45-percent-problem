import type { TeamCode } from "./types";

// Static FIFA 3-letter codes for the 48 WC 2026 qualifiers, with display
// names and group letters (A..L). This is a Phase A standalone source so
// the simulator does not depend on the structural `teams` table that
// lives on a separate branch and has not yet landed in main.
//
// Reconcile with the structural table when it merges (Phase B+ task).
//
// Group letters reflect the official FIFA 2026 final draw. Where the
// final draw has not been published for a slot, the group letter is
// best-known and may be revised before the tournament.

export interface SimTeam {
  code: TeamCode;
  name: string;
  group: string; // single letter A..L
}

export const TEAMS: readonly SimTeam[] = [
  // Group A
  { code: "MEX", name: "Mexico", group: "A" },
  // Group B
  { code: "CAN", name: "Canada", group: "B" },
  // Group D
  { code: "USA", name: "United States", group: "D" },
  // Confirmed UEFA qualifiers (group letters TBD; staged alphabetically
  // until the FIFA draw is published).
  { code: "ARG", name: "Argentina", group: "C" },
  { code: "BRA", name: "Brazil", group: "E" },
  { code: "URU", name: "Uruguay", group: "F" },
  { code: "ECU", name: "Ecuador", group: "G" },
  { code: "COL", name: "Colombia", group: "H" },
  { code: "PAR", name: "Paraguay", group: "I" },
  { code: "JPN", name: "Japan", group: "J" },
  { code: "KOR", name: "South Korea", group: "K" },
  { code: "IRN", name: "Iran", group: "L" },
  { code: "AUS", name: "Australia", group: "A" },
  { code: "UZB", name: "Uzbekistan", group: "B" },
  { code: "JOR", name: "Jordan", group: "C" },
  { code: "KSA", name: "Saudi Arabia", group: "D" },
  { code: "MAR", name: "Morocco", group: "E" },
  { code: "TUN", name: "Tunisia", group: "F" },
  { code: "EGY", name: "Egypt", group: "G" },
  { code: "GHA", name: "Ghana", group: "H" },
  { code: "ALG", name: "Algeria", group: "I" },
  { code: "SEN", name: "Senegal", group: "J" },
  { code: "CIV", name: "Côte d'Ivoire", group: "K" },
  { code: "RSA", name: "South Africa", group: "L" },
  { code: "NGA", name: "Nigeria", group: "A" },
  { code: "ENG", name: "England", group: "B" },
  { code: "FRA", name: "France", group: "C" },
  { code: "GER", name: "Germany", group: "D" },
  { code: "ESP", name: "Spain", group: "E" },
  { code: "POR", name: "Portugal", group: "F" },
  { code: "ITA", name: "Italy", group: "G" },
  { code: "NED", name: "Netherlands", group: "H" },
  { code: "BEL", name: "Belgium", group: "I" },
  { code: "CRO", name: "Croatia", group: "J" },
  { code: "DEN", name: "Denmark", group: "K" },
  { code: "SWI", name: "Switzerland", group: "L" },
  { code: "AUT", name: "Austria", group: "A" },
  { code: "POL", name: "Poland", group: "B" },
  { code: "TUR", name: "Turkey", group: "C" },
  { code: "NOR", name: "Norway", group: "D" },
  { code: "SCO", name: "Scotland", group: "E" },
  { code: "WAL", name: "Wales", group: "F" },
  { code: "IRL", name: "Republic of Ireland", group: "G" },
  { code: "SRB", name: "Serbia", group: "H" },
  { code: "UKR", name: "Ukraine", group: "I" },
  { code: "PER", name: "Peru", group: "J" },
  { code: "CHL", name: "Chile", group: "K" },
  { code: "PAN", name: "Panama", group: "L" },
  { code: "NZL", name: "New Zealand", group: "F" },
] as const;

export const TEAMS_BY_CODE: Readonly<Record<TeamCode, SimTeam>> =
  Object.freeze(
    Object.fromEntries(TEAMS.map((t) => [t.code, t])) as Record<
      TeamCode,
      SimTeam
    >,
  );

export const TEAM_CODES: readonly TeamCode[] = TEAMS.map((t) => t.code);

export function teamName(code: TeamCode): string {
  return TEAMS_BY_CODE[code]?.name ?? code;
}
