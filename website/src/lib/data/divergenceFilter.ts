/**
 * cp-29: settled-match filtering for the divergence surfaces.
 *
 * A divergence row is a PRE-match model-vs-market edge. Once a fixture has
 * kicked off, that edge is post-hoc and must not be displayed as if it were a
 * live screening signal. The current live snapshot still carries group-stage
 * rows for matches that settled in June; showing them on the landing page and
 * the terminal reads as live coverage that no longer exists. This is a quick
 * display-side mitigation: it filters those rows out and lets the caller render
 * an honest empty state. It touches no producer and no divergence.json data.
 */
import type { DivergenceRow, DivergenceSnapshot } from "./schemas";

/**
 * A row counts as upcoming when its kickoff is strictly after the reference
 * time. The reference is the snapshot's generated_at_utc (the "now" the nightly
 * pipeline stamps), so the filter is deterministic at render time rather than
 * depending on the wall clock. A row with an unparseable timestamp is kept
 * (fail-open: never hide a row on a parse error).
 */
export function isDivergenceRowUpcoming(
  row: DivergenceRow,
  referenceUtc: string,
): boolean {
  const kickoff = Date.parse(row.kickoff_utc);
  const reference = Date.parse(referenceUtc);
  if (Number.isNaN(kickoff) || Number.isNaN(reference)) return true;
  return kickoff > reference;
}

/**
 * The subset of rows whose fixture has not yet kicked off, measured against the
 * snapshot's generated_at_utc. Settled group-stage rows drop out; the caller
 * shows an honest empty state when nothing upcoming remains.
 */
export function upcomingDivergenceRows(
  snapshot: DivergenceSnapshot,
): DivergenceRow[] {
  return snapshot.rows.filter((r) =>
    isDivergenceRowUpcoming(r, snapshot.generated_at_utc),
  );
}

/**
 * The honest empty-state line shown when the upcoming-fixture filter leaves no
 * rows to display on a live snapshot. cp-30 revived the knockout odds feed, so
 * knockout coverage is live rather than pending; an empty feed now means no
 * upcoming knockout fixture currently has a de-vigged line (for example between
 * rounds, or when the day's matches have all kicked off).
 */
export const DIVERGENCE_KNOCKOUT_PENDING_NOTE =
  "Group-stage divergence coverage is complete. Knockout-round divergence " +
  "coverage is complete; no upcoming knockout fixture had an open de-vigged line.";

/**
 * The empty-state line for the cp-30 stale-odds guard: real bookmaker lines
 * landed once but the committed snapshot is older than the freshness threshold,
 * so no edges are shown until a fresh odds pull lands.
 */
export const DIVERGENCE_STALE_ODDS_NOTE =
  "The most recent bookmaker odds snapshot is stale (older than the freshness " +
  "threshold), so no divergence edges are shown.";

/**
 * The empty-state line for the cp-14 pending state: no real bookmaker lines
 * are ingested yet, so no divergence rows are published.
 */
export const DIVERGENCE_PENDING_NOTE =
  "No real bookmaker lines were ingested during the tournament, so no " +
  "divergence rows were published.";

/**
 * cp-38: the empty-state explanation for the landing divergence modules,
 * mirroring the /terminal panels so an empty widget reads as legitimately
 * empty rather than broken. A live snapshot can have no rows to show for two
 * honest reasons: between knockout rounds few upcoming fixtures have an open
 * de-vigged line, or the freshness guard has marked the odds stale (rows are
 * withheld rather than shown stale). Group-stage grading is unaffected in
 * every case. Status-driven so the landing gives the same reason the /terminal
 * panel would.
 */
export function divergenceEmptyStateNote(snapshot: DivergenceSnapshot): string {
  if (snapshot.status === "stale") return DIVERGENCE_STALE_ODDS_NOTE;
  if (snapshot.status === "pending") return DIVERGENCE_PENDING_NOTE;
  return DIVERGENCE_KNOCKOUT_PENDING_NOTE;
}

/**
 * The detail-page href for a divergence row. Knockout rows (KO-FD ids, round
 * other than GRP) live in the ungraded matches_live/ namespace and render at
 * /match/live/[id]; group rows resolve to the graded /match/[id] route. A row
 * that points at the wrong route 404s at runtime, so this is the single place
 * that decides which sibling route a divergence row links to.
 */
export function divergenceMatchHref(row: {
  match_id: string;
  round?: string;
}): string {
  const isKnockout = row.round !== undefined && row.round !== "GRP";
  const isLiveKnockoutId = row.match_id.startsWith("KO-");
  return isKnockout || isLiveKnockoutId
    ? `/match/live/${row.match_id}`
    : `/match/${row.match_id}`;
}
