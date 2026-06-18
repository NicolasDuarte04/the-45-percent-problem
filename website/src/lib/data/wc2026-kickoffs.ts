/**
 * Per-match kickoff overrides (UTC), keyed by canonical match id ("M01".."M104").
 *
 * GENERATED ARTIFACT. Authoritative kickoff times sourced from
 * Football-Data.org (`/competitions/WC/matches`) and verified against the
 * official FIFA schedule by `scripts/build_wc2026_schedule.py`. Regenerate
 * with the live feed (the FD key only exists in the regen environment):
 *
 *   python scripts/build_wc2026_schedule.py            # live FD
 *   python scripts/build_wc2026_schedule.py --fixture <path>   # offline/test
 *
 * Why this file exists: the per-group anchors in `wc2026-official-draw.ts`
 * plus a uniform +5d/+10d matchday shift only approximate the real schedule
 * (the comment on `buildGroupMatches` documented "~1-3 days off"). This map
 * replaces those approximations with the exact published kickoffs. A match id
 * absent from the map falls back to the anchor-derived time, so a partial map
 * is always strictly an improvement.
 *
 * Group fixtures (M01-M72) are joined from FD by team code and gated by a
 * verification table of official anchors. Knockout fixtures (M73-M104) are
 * best-effort from FD's stage + chronological order while the teams are TBD,
 * and are flagged for re-verification once the bracket resolves; they do not
 * appear on the public matches listing (72 group fixtures only).
 *
 * Do not edit by hand: hand edits drift back on the next regen.
 */
export const KICKOFF_OVERRIDES: Record<string, string> = {
  // Operator-confirmed corrections against the official Dec 5 draw schedule.
  // The full set lands when build_wc2026_schedule.py runs against live FD.
  M24: "2026-06-17T23:00:00Z", // Ghana v Panama  (was 2026-06-18T02:00Z)
  M25: "2026-06-19T03:00:00Z", // Mexico v Korea Republic  (was 2026-06-16T19:00Z)
};
