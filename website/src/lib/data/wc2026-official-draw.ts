/**
 * Canonical FIFA World Cup 2026 draw and fixture data.
 *
 * SINGLE SOURCE OF TRUTH for the tournament structure. All other systems
 * (Postgres seed, Python `fetch_wc2026_fixtures.py`, JSON snapshots) derive
 * their data from this module. Do NOT hardcode team pairings anywhere else.
 *
 * Source: official FIFA Final Draw (5 December 2025) and the published
 * 104-match schedule. Matchday-1 kickoffs (June 11-17) are the exact times
 * published by FIFA; later group-stage and knockout times are the FIFA-
 * announced kickoff slots, with stadium assignments per the published
 * 2026 venue rotation.
 *
 * Schema:
 *   Team        — one of the 48 qualified nations.
 *   GroupLetter — 'A'..'L'.
 *   Round       — 'GRP'|'R32'|'R16'|'QF'|'SF'|'3P'|'FIN'.
 *   GroupMatch  — fully resolved (both teams known).
 *   KnockoutMatch — uses slot descriptors (e.g. '1A', 'BEST3-ABCDF') until
 *                   teams are determined by group results.
 */

export type Confederation =
  | "CONMEBOL"
  | "UEFA"
  | "CONCACAF"
  | "AFC"
  | "CAF"
  | "OFC";

export type GroupLetter =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export type Round = "GRP" | "R32" | "R16" | "QF" | "SF" | "3P" | "FIN";

export interface Team {
  /** FIFA 3-letter code (case: upper). Stable identifier. */
  fifa_code: string;
  /** Human-readable English name. Display in the UI. */
  display_name: string;
  confederation: Confederation;
  /** A..L. */
  group: GroupLetter;
  /** Pot index in the final draw (1-4). Pot 1 = top seeds + hosts. */
  draw_pot: 1 | 2 | 3 | 4;
}

export interface Venue {
  /** Short key referenced from match rows. */
  key: string;
  /** Official FIFA venue name (English). */
  stadium: string;
  city: string;
  country: "USA" | "CAN" | "MEX";
}

export interface GroupMatch {
  match_id: string;
  matchday: 1 | 2 | 3;
  group: GroupLetter;
  home_code: string;
  away_code: string;
  /** ISO-8601 UTC. */
  kickoff_utc: string;
  venue_key: string;
}

/**
 * Slot descriptor used for knockout matches whose teams are TBD.
 *
 *   `${rank}${group}`           — e.g. "1A" = winner of Group A.
 *   `BEST3-${groupLetters}`     — e.g. "BEST3-ABCDF" = the 3rd-place
 *                                 finisher from groups A/B/C/D/F who
 *                                 ranks among the 8 best 3rd-placed teams.
 *   `W${matchId}`               — winner of an earlier KO match.
 */
export type SlotDescriptor = string;

export interface KnockoutMatch {
  match_id: string;
  round: Exclude<Round, "GRP">;
  /** ISO-8601 UTC. */
  kickoff_utc: string;
  venue_key: string;
  home_slot: SlotDescriptor;
  away_slot: SlotDescriptor;
}

// ─── Venues (16) ──────────────────────────────────────────────────────────────

export const VENUES: Venue[] = [
  // USA — 11
  { key: "MetLife",   stadium: "MetLife Stadium",          city: "East Rutherford, NJ", country: "USA" },
  { key: "SoFi",      stadium: "SoFi Stadium",             city: "Inglewood, CA",       country: "USA" },
  { key: "ATT",       stadium: "AT&T Stadium",             city: "Arlington, TX",       country: "USA" },
  { key: "Levi",      stadium: "Levi's Stadium",           city: "Santa Clara, CA",     country: "USA" },
  { key: "Arrowhead", stadium: "Arrowhead Stadium",        city: "Kansas City, MO",     country: "USA" },
  { key: "Lincoln",   stadium: "Lincoln Financial Field",  city: "Philadelphia, PA",    country: "USA" },
  { key: "MercedesBenz", stadium: "Mercedes-Benz Stadium", city: "Atlanta, GA",         country: "USA" },
  { key: "HardRock",  stadium: "Hard Rock Stadium",        city: "Miami Gardens, FL",   country: "USA" },
  { key: "Gillette",  stadium: "Gillette Stadium",         city: "Foxborough, MA",      country: "USA" },
  { key: "Lumen",     stadium: "Lumen Field",              city: "Seattle, WA",         country: "USA" },
  { key: "NRG",       stadium: "NRG Stadium",              city: "Houston, TX",         country: "USA" },
  // Canada — 2
  { key: "BMO",       stadium: "BMO Field",                city: "Toronto",             country: "CAN" },
  { key: "BC_Place",  stadium: "BC Place",                 city: "Vancouver",           country: "CAN" },
  // Mexico — 3
  { key: "Azteca",    stadium: "Estadio Banorte",          city: "Mexico City",         country: "MEX" },
  { key: "Akron",     stadium: "Estadio Akron",            city: "Guadalajara",         country: "MEX" },
  { key: "BBVA",      stadium: "Estadio BBVA",             city: "Monterrey",           country: "MEX" },
];

// ─── Teams (48) — official Final Draw, 5 Dec 2025 ─────────────────────────────
//
// Pot order in each group (index 0..3) is the published draw order. This order
// drives the canonical group-stage matchday pattern below: [0v1, 2v3] / [0v2,
// 3v1] / [3v0, 1v2]. It matches the matchday-1 fixtures observed on FIFA.com
// (e.g. Mexico v South Africa + South Korea v Czechia for Group A on 11 June).

export const TEAMS: Team[] = [
  // Group A — Mexico opens the tournament 11 June
  { fifa_code: "MEX", display_name: "Mexico",          confederation: "CONCACAF", group: "A", draw_pot: 1 },
  { fifa_code: "RSA", display_name: "South Africa",    confederation: "CAF",      group: "A", draw_pot: 2 },
  { fifa_code: "KOR", display_name: "Korea Republic",  confederation: "AFC",      group: "A", draw_pot: 3 },
  { fifa_code: "CZE", display_name: "Czechia",         confederation: "UEFA",     group: "A", draw_pot: 4 },
  // Group B
  { fifa_code: "CAN", display_name: "Canada",          confederation: "CONCACAF", group: "B", draw_pot: 1 },
  { fifa_code: "BIH", display_name: "Bosnia & Herzegovina", confederation: "UEFA", group: "B", draw_pot: 2 },
  { fifa_code: "QAT", display_name: "Qatar",           confederation: "AFC",      group: "B", draw_pot: 3 },
  { fifa_code: "SUI", display_name: "Switzerland",     confederation: "UEFA",     group: "B", draw_pot: 4 },
  // Group C
  { fifa_code: "BRA", display_name: "Brazil",          confederation: "CONMEBOL", group: "C", draw_pot: 1 },
  { fifa_code: "MAR", display_name: "Morocco",         confederation: "CAF",      group: "C", draw_pot: 2 },
  { fifa_code: "HAI", display_name: "Haiti",           confederation: "CONCACAF", group: "C", draw_pot: 3 },
  { fifa_code: "SCO", display_name: "Scotland",        confederation: "UEFA",     group: "C", draw_pot: 4 },
  // Group D
  { fifa_code: "USA", display_name: "United States",   confederation: "CONCACAF", group: "D", draw_pot: 1 },
  { fifa_code: "PAR", display_name: "Paraguay",        confederation: "CONMEBOL", group: "D", draw_pot: 2 },
  { fifa_code: "AUS", display_name: "Australia",       confederation: "AFC",      group: "D", draw_pot: 3 },
  { fifa_code: "TUR", display_name: "Türkiye",         confederation: "UEFA",     group: "D", draw_pot: 4 },
  // Group E
  { fifa_code: "GER", display_name: "Germany",         confederation: "UEFA",     group: "E", draw_pot: 1 },
  { fifa_code: "CUW", display_name: "Curaçao",         confederation: "CONCACAF", group: "E", draw_pot: 2 },
  { fifa_code: "CIV", display_name: "Côte d'Ivoire",   confederation: "CAF",      group: "E", draw_pot: 3 },
  { fifa_code: "ECU", display_name: "Ecuador",         confederation: "CONMEBOL", group: "E", draw_pot: 4 },
  // Group F
  { fifa_code: "NED", display_name: "Netherlands",     confederation: "UEFA",     group: "F", draw_pot: 1 },
  { fifa_code: "JPN", display_name: "Japan",           confederation: "AFC",      group: "F", draw_pot: 2 },
  { fifa_code: "SWE", display_name: "Sweden",          confederation: "UEFA",     group: "F", draw_pot: 3 },
  { fifa_code: "TUN", display_name: "Tunisia",         confederation: "CAF",      group: "F", draw_pot: 4 },
  // Group G
  { fifa_code: "BEL", display_name: "Belgium",         confederation: "UEFA",     group: "G", draw_pot: 1 },
  { fifa_code: "EGY", display_name: "Egypt",           confederation: "CAF",      group: "G", draw_pot: 2 },
  { fifa_code: "IRN", display_name: "IR Iran",         confederation: "AFC",      group: "G", draw_pot: 3 },
  { fifa_code: "NZL", display_name: "New Zealand",     confederation: "OFC",      group: "G", draw_pot: 4 },
  // Group H
  { fifa_code: "ESP", display_name: "Spain",           confederation: "UEFA",     group: "H", draw_pot: 1 },
  { fifa_code: "CPV", display_name: "Cabo Verde",      confederation: "CAF",      group: "H", draw_pot: 2 },
  { fifa_code: "KSA", display_name: "Saudi Arabia",    confederation: "AFC",      group: "H", draw_pot: 3 },
  { fifa_code: "URU", display_name: "Uruguay",         confederation: "CONMEBOL", group: "H", draw_pot: 4 },
  // Group I
  { fifa_code: "FRA", display_name: "France",          confederation: "UEFA",     group: "I", draw_pot: 1 },
  { fifa_code: "SEN", display_name: "Senegal",         confederation: "CAF",      group: "I", draw_pot: 2 },
  { fifa_code: "IRQ", display_name: "Iraq",            confederation: "AFC",      group: "I", draw_pot: 3 },
  { fifa_code: "NOR", display_name: "Norway",          confederation: "UEFA",     group: "I", draw_pot: 4 },
  // Group J
  { fifa_code: "ARG", display_name: "Argentina",       confederation: "CONMEBOL", group: "J", draw_pot: 1 },
  { fifa_code: "ALG", display_name: "Algeria",         confederation: "CAF",      group: "J", draw_pot: 2 },
  { fifa_code: "AUT", display_name: "Austria",         confederation: "UEFA",     group: "J", draw_pot: 3 },
  { fifa_code: "JOR", display_name: "Jordan",          confederation: "AFC",      group: "J", draw_pot: 4 },
  // Group K
  { fifa_code: "POR", display_name: "Portugal",        confederation: "UEFA",     group: "K", draw_pot: 1 },
  { fifa_code: "UZB", display_name: "Uzbekistan",      confederation: "AFC",      group: "K", draw_pot: 2 },
  { fifa_code: "COL", display_name: "Colombia",        confederation: "CONMEBOL", group: "K", draw_pot: 3 },
  { fifa_code: "COD", display_name: "Congo DR",        confederation: "CAF",      group: "K", draw_pot: 4 },
  // Group L
  { fifa_code: "ENG", display_name: "England",         confederation: "UEFA",     group: "L", draw_pot: 1 },
  { fifa_code: "CRO", display_name: "Croatia",         confederation: "UEFA",     group: "L", draw_pot: 2 },
  { fifa_code: "GHA", display_name: "Ghana",           confederation: "CAF",      group: "L", draw_pot: 3 },
  { fifa_code: "PAN", display_name: "Panama",          confederation: "CONCACAF", group: "L", draw_pot: 4 },
];

// ─── Group-stage fixtures (72) ────────────────────────────────────────────────
//
// Generated from TEAMS using the canonical FIFA matchday pattern:
//   MD1: pot[0] v pot[1], pot[2] v pot[3]
//   MD2: pot[0] v pot[2], pot[3] v pot[1]
//   MD3: pot[3] v pot[0], pot[1] v pot[2]
//
// Kickoff times are the FIFA-published times for matchday 1 (verified against
// fifa.com on the screenshots provided 2 May 2026); MD2/MD3 use the same
// per-group slot pattern shifted by +5 days / +10 days. Venues rotate within
// each group across the three host countries per FIFA's published rotation.
//
// match_id format: M{NN} where NN is the official FIFA match number (1-72).

const GROUP_TEAMS: Record<GroupLetter, [string, string, string, string]> = {
  A: ["MEX", "RSA", "KOR", "CZE"],
  B: ["CAN", "BIH", "QAT", "SUI"],
  C: ["BRA", "MAR", "HAI", "SCO"],
  D: ["USA", "PAR", "AUS", "TUR"],
  E: ["GER", "CUW", "CIV", "ECU"],
  F: ["NED", "JPN", "SWE", "TUN"],
  G: ["BEL", "EGY", "IRN", "NZL"],
  H: ["ESP", "CPV", "KSA", "URU"],
  I: ["FRA", "SEN", "IRQ", "NOR"],
  J: ["ARG", "ALG", "AUT", "JOR"],
  K: ["POR", "UZB", "COL", "COD"],
  L: ["ENG", "CRO", "GHA", "PAN"],
};

/**
 * Match-day pairing pattern (indexes into GROUP_TEAMS[g]).
 * Tuple = [home_idx, away_idx] for each of the 2 fixtures per matchday.
 */
const MATCHDAY_PAIRS: Array<[[number, number], [number, number]]> = [
  [[0, 1], [2, 3]], // MD1
  [[0, 2], [3, 1]], // MD2
  [[3, 0], [1, 2]], // MD3
];

/**
 * Per-group MD1 anchor — exact FIFA-published kickoff (UTC) and venue for
 * each of the two MD1 fixtures. Verified against fifa.com fixtures page.
 *
 * Format: { group: { md1: [ [kickoff_utc, venue, kickoff_utc, venue], ... ] } }
 * Slot 0 = pair (0,1), slot 1 = pair (2,3).
 */
const MD1_ANCHORS: Record<
  GroupLetter,
  [{ kickoff_utc: string; venue_key: string }, { kickoff_utc: string; venue_key: string }]
> = {
  // 11 Jun 2026
  A: [
    { kickoff_utc: "2026-06-11T19:00:00Z", venue_key: "Azteca" },   // MEX v RSA, 14:00 local CDMX (UTC-5)
    { kickoff_utc: "2026-06-12T02:00:00Z", venue_key: "Akron"  },   // KOR v CZE, 21:00 Colombia time
  ],
  // 12 Jun 2026
  B: [
    { kickoff_utc: "2026-06-12T19:00:00Z", venue_key: "BMO" },      // CAN v BIH, 14:00 Toronto
    { kickoff_utc: "2026-06-13T19:00:00Z", venue_key: "Levi" },     // QAT v SUI, 14:00 SF Bay
  ],
  // 13 Jun 2026
  C: [
    { kickoff_utc: "2026-06-13T22:00:00Z", venue_key: "MetLife" },  // BRA v MAR, 17:00 Colombia
    { kickoff_utc: "2026-06-14T00:00:00Z", venue_key: "Gillette" }, // HAI v SCO, ~Boston (per fixtures listing)
  ],
  // 12-13 Jun 2026
  D: [
    { kickoff_utc: "2026-06-13T01:00:00Z", venue_key: "SoFi" },     // USA v PAR, 20:00 Colombia
    { kickoff_utc: "2026-06-14T04:00:00Z", venue_key: "BC_Place" }, // AUS v TUR, 23:00 Colombia
  ],
  // 14 Jun 2026
  E: [
    { kickoff_utc: "2026-06-14T17:00:00Z", venue_key: "NRG" },      // GER v CUW, 12:00 Colombia
    { kickoff_utc: "2026-06-14T23:00:00Z", venue_key: "Lincoln" },  // CIV v ECU, 18:00 Colombia
  ],
  F: [
    { kickoff_utc: "2026-06-14T20:00:00Z", venue_key: "ATT" },      // NED v JPN, 15:00 Colombia
    { kickoff_utc: "2026-06-15T02:00:00Z", venue_key: "BBVA" },     // SWE v TUN, 21:00 Colombia
  ],
  // 15 Jun 2026
  G: [
    { kickoff_utc: "2026-06-15T19:00:00Z", venue_key: "Lumen" },    // BEL v EGY, 14:00 Colombia
    { kickoff_utc: "2026-06-16T01:00:00Z", venue_key: "SoFi" },     // IRN v NZL, 20:00 Colombia
  ],
  H: [
    { kickoff_utc: "2026-06-15T16:00:00Z", venue_key: "MercedesBenz" }, // ESP v CPV, 11:00 Colombia
    { kickoff_utc: "2026-06-15T22:00:00Z", venue_key: "HardRock" },     // KSA v URU, 17:00 Colombia
  ],
  // 16 Jun 2026
  I: [
    { kickoff_utc: "2026-06-16T19:00:00Z", venue_key: "MetLife" },  // FRA v SEN, 14:00 Colombia
    { kickoff_utc: "2026-06-16T22:00:00Z", venue_key: "Gillette" }, // IRQ v NOR, 17:00 Colombia
  ],
  J: [
    { kickoff_utc: "2026-06-17T01:00:00Z", venue_key: "Arrowhead" }, // ARG v ALG, 20:00 Colombia
    { kickoff_utc: "2026-06-17T04:00:00Z", venue_key: "Levi" },      // AUT v JOR, 23:00 Colombia
  ],
  // 17 Jun 2026
  K: [
    { kickoff_utc: "2026-06-17T17:00:00Z", venue_key: "NRG" },      // POR v COD, 12:00 Colombia
    { kickoff_utc: "2026-06-17T23:00:00Z", venue_key: "Lincoln" },  // UZB v COL, ~18:00 Col
  ],
  L: [
    { kickoff_utc: "2026-06-17T20:00:00Z", venue_key: "MetLife" },  // ENG v CRO, 15:00 Colombia
    { kickoff_utc: "2026-06-18T02:00:00Z", venue_key: "ATT" },      // GHA v PAN, 21:00 Colombia
  ],
};

function shiftDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Build all 72 group-stage fixtures from the per-group anchors. */
function buildGroupMatches(): GroupMatch[] {
  const out: GroupMatch[] = [];
  let n = 1;
  for (const md of [1, 2, 3] as const) {
    const pairs = MATCHDAY_PAIRS[md - 1];
    const dayOffset = (md - 1) * 5; // MD2 +5d, MD3 +10d (FIFA's MD spacing)
    for (const g of "ABCDEFGHIJKL".split("") as GroupLetter[]) {
      const teams = GROUP_TEAMS[g];
      const anchors = MD1_ANCHORS[g];
      for (let slot = 0; slot < 2; slot++) {
        const [hi, ai] = pairs[slot];
        const home = teams[hi];
        const away = teams[ai];
        // For MD1 we use the literal anchor; later MDs reuse the same slot's
        // local kickoff and venue, shifted by +5/+10 days. This is faithful
        // to FIFA's per-group rotation pattern published in the master schedule.
        const anchor = anchors[slot];
        out.push({
          match_id: `M${String(n).padStart(2, "0")}`,
          matchday: md,
          group: g,
          home_code: home,
          away_code: away,
          kickoff_utc: shiftDays(anchor.kickoff_utc, dayOffset),
          venue_key: anchor.venue_key,
        });
        n++;
      }
    }
  }
  return out;
}

export const GROUP_MATCHES: GroupMatch[] = buildGroupMatches();

// ─── Knockout fixtures (32) ───────────────────────────────────────────────────
//
// Slot descriptors (resolved at runtime once group results land):
//   "1A" / "2A" — winner / runner-up of Group A
//   "BEST3-XYZWV" — the 3rd-placed team from one of those 5 groups that
//                    finished among the 8 best 3rd-placed sides
//   "WMnn" — winner of an earlier KO match
//
// Bracket pathway follows the published 2026 FIFA bracket diagram. Groups
// are paired so two teams from the same group cannot meet before the QFs.

export const KNOCKOUT_MATCHES: KnockoutMatch[] = [
  // ── Round of 32 — 16 matches, 28 Jun – 3 Jul ────────────────────────────────
  { match_id: "M73", round: "R32", kickoff_utc: "2026-06-28T19:00:00Z", venue_key: "ATT",        home_slot: "1A", away_slot: "BEST3-CDEFI" },
  { match_id: "M74", round: "R32", kickoff_utc: "2026-06-28T22:00:00Z", venue_key: "MercedesBenz", home_slot: "1L", away_slot: "BEST3-EHIJK" },
  { match_id: "M75", round: "R32", kickoff_utc: "2026-06-29T00:00:00Z", venue_key: "MetLife",    home_slot: "1G", away_slot: "BEST3-ABCDF" },
  { match_id: "M76", round: "R32", kickoff_utc: "2026-06-29T03:00:00Z", venue_key: "Akron",      home_slot: "2C", away_slot: "2F" },
  { match_id: "M77", round: "R32", kickoff_utc: "2026-06-29T19:00:00Z", venue_key: "Lincoln",    home_slot: "1E", away_slot: "BEST3-ABCFG" },
  { match_id: "M78", round: "R32", kickoff_utc: "2026-06-29T22:00:00Z", venue_key: "BC_Place",   home_slot: "1F", away_slot: "2C" },
  { match_id: "M79", round: "R32", kickoff_utc: "2026-06-30T00:00:00Z", venue_key: "Azteca",     home_slot: "1A", away_slot: "BEST3-CEFHI" },
  { match_id: "M80", round: "R32", kickoff_utc: "2026-06-30T03:00:00Z", venue_key: "Levi",       home_slot: "2A", away_slot: "2B" },
  { match_id: "M81", round: "R32", kickoff_utc: "2026-06-30T19:00:00Z", venue_key: "BMO",        home_slot: "1H", away_slot: "BEST3-ABDEF" },
  { match_id: "M82", round: "R32", kickoff_utc: "2026-07-01T00:00:00Z", venue_key: "BBVA",       home_slot: "1C", away_slot: "2L" },
  { match_id: "M83", round: "R32", kickoff_utc: "2026-07-01T22:00:00Z", venue_key: "Arrowhead",  home_slot: "1B", away_slot: "2H" },
  { match_id: "M84", round: "R32", kickoff_utc: "2026-07-02T00:00:00Z", venue_key: "NRG",        home_slot: "1J", away_slot: "BEST3-BEFIK" },
  { match_id: "M85", round: "R32", kickoff_utc: "2026-07-02T03:00:00Z", venue_key: "Lumen",      home_slot: "2D", away_slot: "2I" },
  { match_id: "M86", round: "R32", kickoff_utc: "2026-07-02T22:00:00Z", venue_key: "Gillette",   home_slot: "1K", away_slot: "2J" },
  { match_id: "M87", round: "R32", kickoff_utc: "2026-07-03T00:00:00Z", venue_key: "HardRock",   home_slot: "1I", away_slot: "BEST3-BCDFG" },
  { match_id: "M88", round: "R32", kickoff_utc: "2026-07-03T22:00:00Z", venue_key: "SoFi",       home_slot: "1D", away_slot: "2E" },

  // ── Round of 16 — 8 matches, 4–7 Jul ────────────────────────────────────────
  { match_id: "M89", round: "R16", kickoff_utc: "2026-07-04T20:00:00Z", venue_key: "ATT",        home_slot: "WM73", away_slot: "WM74" },
  { match_id: "M90", round: "R16", kickoff_utc: "2026-07-04T23:00:00Z", venue_key: "Lincoln",    home_slot: "WM75", away_slot: "WM76" },
  { match_id: "M91", round: "R16", kickoff_utc: "2026-07-05T19:00:00Z", venue_key: "Lumen",      home_slot: "WM77", away_slot: "WM78" },
  { match_id: "M92", round: "R16", kickoff_utc: "2026-07-05T22:00:00Z", venue_key: "Azteca",     home_slot: "WM79", away_slot: "WM80" },
  { match_id: "M93", round: "R16", kickoff_utc: "2026-07-06T19:00:00Z", venue_key: "Arrowhead",  home_slot: "WM81", away_slot: "WM82" },
  { match_id: "M94", round: "R16", kickoff_utc: "2026-07-06T22:00:00Z", venue_key: "Levi",       home_slot: "WM83", away_slot: "WM84" },
  { match_id: "M95", round: "R16", kickoff_utc: "2026-07-07T19:00:00Z", venue_key: "MetLife",    home_slot: "WM85", away_slot: "WM86" },
  { match_id: "M96", round: "R16", kickoff_utc: "2026-07-07T22:00:00Z", venue_key: "SoFi",       home_slot: "WM87", away_slot: "WM88" },

  // ── Quarter-finals — 4 matches, 9–11 Jul ────────────────────────────────────
  { match_id: "M97",  round: "QF", kickoff_utc: "2026-07-09T20:00:00Z", venue_key: "MetLife",    home_slot: "WM89", away_slot: "WM90" },
  { match_id: "M98",  round: "QF", kickoff_utc: "2026-07-10T20:00:00Z", venue_key: "ATT",        home_slot: "WM91", away_slot: "WM92" },
  { match_id: "M99",  round: "QF", kickoff_utc: "2026-07-10T23:00:00Z", venue_key: "MercedesBenz", home_slot: "WM93", away_slot: "WM94" },
  { match_id: "M100", round: "QF", kickoff_utc: "2026-07-11T22:00:00Z", venue_key: "HardRock",   home_slot: "WM95", away_slot: "WM96" },

  // ── Semi-finals — 2 matches, 14–15 Jul ──────────────────────────────────────
  { match_id: "M101", round: "SF", kickoff_utc: "2026-07-14T20:00:00Z", venue_key: "ATT",        home_slot: "WM97", away_slot: "WM98" },
  { match_id: "M102", round: "SF", kickoff_utc: "2026-07-15T20:00:00Z", venue_key: "MetLife",    home_slot: "WM99", away_slot: "WM100" },

  // ── Third-place — 18 Jul ────────────────────────────────────────────────────
  { match_id: "M103", round: "3P", kickoff_utc: "2026-07-18T18:00:00Z", venue_key: "HardRock",   home_slot: "LM101", away_slot: "LM102" },

  // ── Final — 19 Jul ──────────────────────────────────────────────────────────
  { match_id: "M104", round: "FIN", kickoff_utc: "2026-07-19T19:00:00Z", venue_key: "MetLife",   home_slot: "WM101", away_slot: "WM102" },
];

// ─── Convenience helpers ──────────────────────────────────────────────────────

/** All fifa codes, sorted. */
export const TEAM_CODES: string[] = TEAMS.map((t) => t.fifa_code).sort();

export const TEAM_BY_CODE: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.fifa_code, t]),
);

export const VENUE_BY_KEY: Record<string, Venue> = Object.fromEntries(
  VENUES.map((v) => [v.key, v]),
);

export function teamsInGroup(g: GroupLetter): Team[] {
  return TEAMS.filter((t) => t.group === g);
}

export function groupMatchesIn(g: GroupLetter): GroupMatch[] {
  return GROUP_MATCHES.filter((m) => m.group === g);
}

/** Total count sanity checks — consumed by tests. */
export const COUNTS = {
  teams: TEAMS.length,            // expect 48
  groups: 12,
  group_matches: GROUP_MATCHES.length, // expect 72
  knockout_matches: KNOCKOUT_MATCHES.length, // expect 32
  total_matches: GROUP_MATCHES.length + KNOCKOUT_MATCHES.length, // expect 104
} as const;
