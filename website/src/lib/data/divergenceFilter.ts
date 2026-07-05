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
 * The honest empty-state line shown when the settled-match filter empties a
 * feed that DID carry rows. Group-stage coverage ran and is done; knockout
 * coverage waits on the odds feed being remapped to the resolved pairings.
 */
export const DIVERGENCE_KNOCKOUT_PENDING_NOTE =
  "Group-stage divergence coverage is complete. Knockout-round divergence is " +
  "pending the odds remap to the resolved pairings.";
