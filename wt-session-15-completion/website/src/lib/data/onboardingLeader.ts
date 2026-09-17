/**
 * Minimal server-side derivation for the Surface A onboarding modal.
 *
 * Returns only the three values the modal's claim 02 prose interpolates
 * (`{leaderName} first, at {leaderP}%`, "{mcRuns} simulations"). Reads
 * snapshot_meta.json and tournament.json directly, sorts teams once,
 * and exits. Avoids `loadStructuralMaps` and `mergeTournament`, which
 * the homepage calls but the editorial layout otherwise does not need.
 *
 * Keeping this helper out of the broader snapshot pipeline is
 * deliberate: cp-08 mounts the OnboardingController at the editorial
 * layout level so the modal is reachable from any editorial page
 * (via the masthead "First time?" pill). The layout would otherwise
 * pay the full `mergeTournament` cost on every render of /brief,
 * /vault, /methodology, etc., which is unnecessary.
 *
 * Returns numeric values for `leaderP` (0..1) and `mcRuns` (10000).
 * The modal component is responsible for display formatting
 * (`toFixed(1)`, `toLocaleString()`), so this function stays pure.
 */
import { loadSnapshotMeta, loadTournament } from "./loadSnapshot";

export interface OnboardingLeader {
  /** Display name of the top team by p_champion. e.g. "Spain". */
  leaderName: string;
  /** Probability that the top team wins the tournament, in [0, 1]. e.g. 0.1824. */
  leaderP: number;
  /** Number of Monte Carlo runs in the current snapshot. e.g. 10000. */
  mcRuns: number;
}

export function getOnboardingLeader(snapshotId?: string): OnboardingLeader {
  const meta = loadSnapshotMeta(snapshotId);
  const tournament = loadTournament(snapshotId);
  // Defensive sort: the snapshot file is already sorted descending by
  // p_champion, but a sort here decouples this helper from any future
  // change to the snapshot's array order.
  const leader = [...tournament.teams].sort(
    (a, b) => b.p_champion - a.p_champion,
  )[0];
  return {
    leaderName: leader.display_name,
    leaderP: leader.p_champion,
    mcRuns: meta.mc_runs,
  };
}
