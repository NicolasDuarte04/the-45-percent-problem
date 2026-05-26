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
    `Pre-tournament. Locked champion: M2_fifa at ${marginalGapSe.toFixed(2)} marginal SE. ` +
    `Sanity gate logged at ${pairedGapSe.toFixed(2)} paired SE; see /vault/kill-criteria.`;

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
        ariaLabel: `Kill criterion cleared in tournament. Marginal ${marginalGapSe.toFixed(2)} SE of ${thresholdSe.toFixed(1)} SE required.`,
      };
    case "in_tournament_warning":
      return {
        variant: "amber",
        glyph: "●",
        label: "KILL CRITERION: WARNING",
        ariaLabel: `Kill criterion warning in tournament. Paired-difference SE ${pairedGapSe.toFixed(2)} below the ${thresholdSe.toFixed(1)} SE threshold; marginal reading still locked.`,
      };
    case "in_tournament_tripped":
      return {
        variant: "rose",
        glyph: "◆",
        label: "KILL CRITERIA TRIPPED",
        ariaLabel: "Kill criterion tripped in tournament. See /vault/kill-criteria.",
      };
    case "pre_tournament_locked":
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
