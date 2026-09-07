import { cn } from "@/lib/utils";

export type KillCriteriaStatus =
  | "pre_tournament_locked"
  | "in_tournament_clear"
  | "in_tournament_warning"
  | "in_tournament_tripped";

export interface KillCriteriaPillProps {
  status?: KillCriteriaStatus;
  matchesSettled: number;
  marginalGapSe?: number;
  pairedGapSe?: number;
  thresholdSe?: number;
  className?: string;
}

export interface KillCriteriaPillState {
  variant: "neutral" | "mint" | "amber" | "rose";
  glyph: "●" | "◆";
  label: string;
  ariaLabel: string;
}

const MARGINAL_GAP_SE_DEFAULT = 6.22;
const PAIRED_GAP_SE_DEFAULT = 1.75;
const THRESHOLD_SE_DEFAULT = 2.0;

/**
 * Derives the pill's visual state from the snapshot's kill-criteria fields.
 * Pure helper so the same mapping table can be unit-tested without React.
 *
 * Resolution rules:
 *   1. If matches_settled === 0, render the neutral pre-tournament pill
 *      regardless of any `status` field. The kill criterion is structurally
 *      meaningless before any matches have been played.
 *   2. Otherwise, the `status` field drives the pill. Absent or unknown
 *      status falls back to the neutral pill so a partial snapshot never
 *      renders a false red badge.
 *   3. `pre_tournament_locked` WITH matches settled is the live state once the
 *      ledger is scoring against the frozen champion batch: the snapshot still
 *      carries the locked status (the champion lock does not change in
 *      tournament), but matches are settled. The badge reads CLEARED on the
 *      6.22 reading and surfaces the 1.75 reading alongside it without
 *      demoting the badge.
 *
 *      CAVEAT, amendment v1.2 (2026-09-07). An earlier version of this comment
 *      asserted that "the marginal SE is the pre-registered LOCKED criterion".
 *      That is false. `evaluation/pre_reg_constants.yaml` seals only
 *      `kill_criterion.threshold_standard_errors: 2.0` and `kill.ll_gap_se: 2.0`;
 *      it does not seal an SE construction. The only implementation of the
 *      criterion, `evaluation/accuracy_metrics.check_kill_criterion`, uses a
 *      PAIRED per-match SE (`d.std(ddof=1) / sqrt(n)`), which neither 6.22 nor
 *      1.75 is. 6.22 is the gap over M2's between-fold SD (`sigma_CV`, no
 *      sqrt(n)); 1.75 is the gap over the SE of M2's cross-fold mean in a
 *      different battery. On the paired construction the same gap reads 1.96
 *      (Phase 4 folds) and 2.24 (Phase 8 folds) — it straddles the 2.0 bar.
 *      This pill's CLEARED-on-6.22 behaviour is DELIBERATELY LEFT UNCHANGED by
 *      v1.2: it is what a visitor sees on the vault home, and changing it is
 *      the maintainer's call, not a reporting correction. See
 *      `osf/amendments/amendment_v1.2_evaluation_reporting_corrections.md`
 *      section "Proposed but not executed".
 */
export function deriveKillCriteriaPillState({
  status,
  matchesSettled,
  marginalGapSe = MARGINAL_GAP_SE_DEFAULT,
  pairedGapSe = PAIRED_GAP_SE_DEFAULT,
  thresholdSe = THRESHOLD_SE_DEFAULT,
}: {
  status?: KillCriteriaStatus;
  matchesSettled: number;
  marginalGapSe?: number;
  pairedGapSe?: number;
  thresholdSe?: number;
}): KillCriteriaPillState {
  const preTournamentAria =
    `Pre-tournament. Locked champion: M2_fifa at ${marginalGapSe.toFixed(2)} SE on the between-fold SD reading. ` +
    `Sanity gate logged at ${pairedGapSe.toFixed(2)} SE on the mean SE reading; see /vault/kill-criteria.`;

  // Live state once the ledger is scoring but the snapshot still carries the
  // locked status. Surfaces BOTH published SE readings. Per amendment v1.2
  // neither is the pre-registered paired construction; the wording names the
  // arithmetic instead of asserting which one is "the" criterion.
  const lockedInTournamentAria =
    `Locked champion M2_fifa, not tripped. ${marginalGapSe.toFixed(2)} SE on the between-fold SD reading ` +
    `clears the ${thresholdSe.toFixed(1)} SE bar. ${pairedGapSe.toFixed(2)} SE on the mean SE reading ` +
    `is below the ${thresholdSe.toFixed(1)} SE sanity gate, logged as a transparency caveat; ` +
    `champion not demoted. See /vault/kill-criteria.`;

  if (matchesSettled === 0) {
    return {
      variant: "neutral",
      glyph: "●",
      label: "AWAITING TOURNAMENT KICKOFF",
      ariaLabel: preTournamentAria,
    };
  }

  switch (status) {
    case "in_tournament_clear":
      return {
        variant: "mint",
        glyph: "●",
        label: "KILL CRITERION: CLEARED",
        ariaLabel: `Kill criterion cleared in tournament. ${marginalGapSe.toFixed(2)} SE on the between-fold SD reading, of ${thresholdSe.toFixed(1)} SE required.`,
      };
    case "in_tournament_warning":
      return {
        variant: "amber",
        glyph: "●",
        label: "KILL CRITERION: WARNING",
        ariaLabel: `Kill criterion warning in tournament. ${pairedGapSe.toFixed(2)} SE on the mean SE reading, below the ${thresholdSe.toFixed(1)} SE threshold; the between-fold SD reading still clears.`,
      };
    case "in_tournament_tripped":
      return {
        variant: "rose",
        glyph: "◆",
        label: "KILL CRITERIA TRIPPED",
        ariaLabel: "Kill criterion tripped in tournament. See /vault/kill-criteria.",
      };
    case "pre_tournament_locked":
      // matchesSettled === 0 already returned above, so reaching here means
      // matches are settling: the champion lock holds and the 6.22 reading
      // clears, so render the in-tournament CLEARED state with the dual-SE
      // aria rather than the pre-tournament waiting pill. See the v1.2 caveat
      // above on what that reading is and is not.
      return {
        variant: "mint",
        glyph: "●",
        label: "KILL CRITERION: CLEARED",
        ariaLabel: lockedInTournamentAria,
      };
    default:
      return {
        variant: "neutral",
        glyph: "●",
        label: "AWAITING TOURNAMENT KICKOFF",
        ariaLabel: preTournamentAria,
      };
  }
}

function variantStyles(variant: KillCriteriaPillState["variant"]): {
  border: string;
  color: string;
  background: string;
} {
  switch (variant) {
    case "mint":
      return {
        border: "var(--edge-positive)",
        color: "var(--edge-positive)",
        background: "transparent",
      };
    case "amber":
      return {
        border: "var(--prism-sun)",
        color: "var(--prism-sun)",
        background: "transparent",
      };
    case "rose":
      return {
        border: "var(--edge-negative)",
        color: "var(--edge-negative)",
        background: "rgba(252,165,165,0.06)",
      };
    case "neutral":
    default:
      return {
        border: "var(--border-default)",
        color: "var(--text-tertiary)",
        background: "transparent",
      };
  }
}

export function KillCriteriaPill({
  status,
  matchesSettled,
  marginalGapSe,
  pairedGapSe,
  thresholdSe,
  className,
}: KillCriteriaPillProps) {
  const state = deriveKillCriteriaPillState({
    status,
    matchesSettled,
    marginalGapSe,
    pairedGapSe,
    thresholdSe,
  });
  const styles = variantStyles(state.variant);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded border text-[11px] mono",
        className,
      )}
      style={{
        borderColor: styles.border,
        color: styles.color,
        backgroundColor: styles.background,
      }}
      aria-label={state.ariaLabel}
    >
      <span aria-hidden>{state.glyph}</span>
      <span>{state.label}</span>
    </div>
  );
}
