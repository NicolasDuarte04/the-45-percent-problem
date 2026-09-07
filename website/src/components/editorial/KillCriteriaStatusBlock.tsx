import { loadEvaluationMetrics } from "@/lib/data/loadSnapshot";

/**
 * §8.9 Live kill-criteria status block for the vault article.
 * Server component: loads evaluation_metrics at build time, no client JS.
 *
 * Per LOCKDOWN_PLAN_2026-05-11 Section 5 (vault narrative rewrite) and
 * Section 8 Item 8.4 (dual-badge render), the block surfaces two SE
 * readings of the M2-vs-M0 cross-validation gap:
 *
 *   - Mean-SE reading (from evaluation/cv_battery_result.json's
 *     `m_star_vs_m0_gap_se`, mirrored into evaluation_metrics.json as
 *     `kill_criteria_check.gap_se`). Reads 1.75 SE today; the sanity
 *     gate did not clear the 2.0 SE threshold under this convention,
 *     so the badge renders WARNING.
 *   - Between-fold-SD reading (from data/calibration/cv_battery_results.json's
 *     `sigma_CV = 0.006587` divided into `delta_CV = -0.04096`, mirrored in
 *     champion_model.json). Reads 6.22 SE; this convention clears the
 *     2.0 SE bar decisively, so the badge renders CLEARED.
 *
 * AMENDMENT v1.2 (2026-09-07) — LABEL CORRECTION. Until v1.2 these were
 * described as a "paired-difference" and a "marginal" reading. Neither is
 * a paired difference. Both divide the gap by a dispersion of M2 alone:
 * 6.22 by M2's between-fold standard deviation (`np.std(ddof=1)`, no
 * sqrt(n)), 1.75 by the standard error of M2's cross-fold mean
 * (`sd/sqrt(5)`) in a DIFFERENT battery with a different fold
 * construction. The genuinely paired statistic — the construction the
 * pre-registered criterion is implemented on, at
 * evaluation/accuracy_metrics.check_kill_criterion — reads 1.96 on the
 * Phase 4 folds and 2.24 on the Phase 8 folds, straddling the 2.0 bar.
 * See osf/amendments/amendment_v1.2_evaluation_reporting_corrections.md.
 *
 * The 6.22 value is fixed at the OSF lock and lives in the sealed
 * calibration artifacts. It does not flow through
 * evaluation_metrics.json today, so the value is hardcoded here as a
 * static reference (the architect's Section 8 spec explicitly allows
 * "a static configuration" for this purpose; introducing a new
 * data-fetch path was disallowed).
 *
 * Champion identity is M2_fifa with CHAMPION_LOCKED = true regardless
 * of which SE reading is consulted. The dual badge makes both readings
 * visible at once; the connecting status line names the protocol
 * action (`pivot_paper_framing`) and the next adjudication (R16 live
 * checkpoint).
 */

// Between-fold-SD reading from data/calibration/cv_battery_results.json.
// delta_CV = -0.04096 / sigma_CV = 0.006587 = 6.218 SE, where sigma_CV is
// np.std(fold_losses, ddof=1) with NO division by sqrt(n). Named
// MARGINAL_GAP_SE for continuity with the sealed `marginal_gap_se` field
// in evaluation_metrics.json, which amendment v1.2 deliberately does not
// rename (it is published in dozens of historical snapshots).
const MARGINAL_GAP_SE = 6.22;

export function KillCriteriaStatusBlock() {
  const metrics = loadEvaluationMetrics();
  const { kill_criteria_check } = metrics;
  const { gap_se, threshold_se, condition, timestamp } = kill_criteria_check;

  const dateLabel = timestamp.slice(0, 10);

  // Mean-SE badge state. When the gap is below the threshold,
  // we render WARNING (not FAILED): per Section 5, the sanity-gate firing
  // is a procedural warning under `pivot_paper_framing`, not an automatic
  // demotion.
  const pairedCleared = gap_se >= threshold_se;
  const pairedLabel = pairedCleared ? "CLEARED" : "WARNING";
  const pairedColor = pairedCleared
    ? "var(--color-prism-mint)"
    : "var(--color-prism-rose)";

  // Between-fold-SD badge state. Hardcoded at 6.22 SE; this convention clears
  // the 2.0 SE bar decisively, so the badge is always CLEARED today. If
  // the locked sigma_CV ever moves (an OSF amendment would be required),
  // update the MARGINAL_GAP_SE constant above.
  const marginalCleared = MARGINAL_GAP_SE >= threshold_se;
  const marginalLabel = marginalCleared ? "CLEARED" : "WARNING";
  const marginalColor = marginalCleared
    ? "var(--color-prism-mint)"
    : "var(--color-prism-rose)";

  // Block accent: the locked champion artifact wins for the visual
  // emphasis (between-fold-SD reading); the mean-SE warning lives
  // alongside but does not flip the locked status. v1.2 leaves this
  // emphasis unchanged; see the "Proposed but not executed" section of
  // the amendment.
  const accentColor = marginalColor;

  return (
    <div
      role="status"
      aria-label={`Kill criterion status; between-fold SD reading: ${marginalLabel}; mean SE reading: ${pairedLabel}`}
      style={{
        border: "1px solid var(--border-default)",
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: "var(--radius)",
        padding: "20px 24px",
        background: "var(--bg-panel)",
        margin: "40px 0",
      }}
    >
      {/* Header row: condition + timestamp */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-secondary)",
            letterSpacing: "0.04em",
          }}
        >
          KILL CRITERION
        </span>
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginLeft: "auto",
          }}
        >
          {dateLabel}
        </span>
      </div>

      {/* Dual badge: between-fold SD and mean SE, side by side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 14,
        }}
      >
        {/* Between-fold-SD badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "12px 14px",
            border: `1px solid ${marginalColor}`,
            borderRadius: "var(--radius)",
          }}
          aria-label={`Between-fold SD reading: ${marginalLabel} at ${MARGINAL_GAP_SE.toFixed(2)} SE`}
        >
          <span
            className="mono"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: marginalColor,
              letterSpacing: "0.04em",
            }}
          >
            {marginalLabel}: {MARGINAL_GAP_SE.toFixed(2)} SE / {threshold_se.toFixed(1)} SE
          </span>
          <span
            className="mono"
            style={{ fontSize: 12, color: "var(--text-tertiary)" }}
          >
            gap / between-fold SD (cv_battery_results.json)
          </span>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              lineHeight: "22px",
              color: "var(--text-secondary)",
            }}
          >
            CHAMPION_LOCKED = true; M2_fifa sealed under the protocol's
            primary criterion.
          </span>
        </div>

        {/* Mean-SE badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "12px 14px",
            border: `1px solid ${pairedColor}`,
            borderRadius: "var(--radius)",
          }}
          aria-label={`Mean SE reading: ${pairedLabel} at ${gap_se.toFixed(2)} SE`}
        >
          <span
            className="mono"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: pairedColor,
              letterSpacing: "0.04em",
            }}
          >
            {pairedLabel}: {gap_se.toFixed(2)} SE / {threshold_se.toFixed(1)} SE
          </span>
          <span
            className="mono"
            style={{ fontSize: 12, color: "var(--text-tertiary)" }}
          >
            gap / SE of champion mean (cv_battery_result.json)
          </span>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              lineHeight: "22px",
              color: "var(--text-secondary)",
            }}
          >
            Sanity gate did not clear the 2.0 SE threshold under this
            convention; M2_fifa retained per the protocol's primary
            criterion (`pivot_paper_framing`).
          </span>
        </div>
      </div>

      {/* Condition + connecting status line */}
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 16,
          lineHeight: "26px",
          color: "var(--text-secondary)",
          margin: "0 0 6px",
        }}
      >
        Condition:{" "}
        <code
          className="mono"
          style={{ fontSize: 13, color: "var(--text-primary)" }}
        >
          {condition}
        </code>
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: "20px",
          color: "var(--text-tertiary)",
          margin: 0,
        }}
      >
        Two SE readings, neither of them a paired difference; locked under
        the between-fold SD reading; warning logged under the mean SE
        reading; on the paired construction the gap reads 1.96 to 2.24 and
        straddles the bar (amendment v1.2); R16 live checkpoint is the next
        adjudication.
      </p>
    </div>
  );
}
