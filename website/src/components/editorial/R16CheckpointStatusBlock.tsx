import { loadEvaluationMetrics } from "@/lib/data/loadSnapshot";

/**
 * cp-25b: the Round of 16 live kill-criterion checkpoint block for the vault
 * kill-criteria essay. Server component: loads evaluation_metrics at build time,
 * no client JS.
 *
 * This is a SEPARATE EVENT from the Phase 8 pre-tournament gate rendered by
 * KillCriteriaStatusBlock. It renders from evaluation_metrics.r16_checkpoint
 * (mirrored from the r16_checkpoint.json artifact the nightly pipeline publishes
 * once, when the Round of 16 settles):
 *
 *   - absent (the interim state): render the pre-registered interim sentence.
 *   - present: render the live result (n, the gap in SE against the 2 SE
 *     threshold, whether the kill criterion fired, and the evaluation
 *     timestamp).
 *
 * The live gap is a paired per-match SE over the settled group results. It is
 * its own construction and is never displayed as a continuation of, or compared
 * to, the Phase 8 pre-tournament 1.75 SE or 6.22 SE cross-validation readings.
 */
export function R16CheckpointStatusBlock() {
  const metrics = loadEvaluationMetrics();
  const checkpoint = metrics.r16_checkpoint;

  // Interim state: no checkpoint yet. Keep the pre-registered interim sentence.
  if (!checkpoint) {
    return (
      <p
        role="status"
        aria-label="Round of 16 kill-criterion checkpoint: interim"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 16,
          lineHeight: "26px",
          color: "var(--text-secondary)",
          borderLeft: "3px solid var(--border-default)",
          padding: "12px 0 12px 16px",
          margin: "24px 0",
        }}
      >
        The Round of 16 live checkpoint remains wired and will be evaluated when
        the Round of 16 settles, on a live M2-versus-M0 comparison over the 72
        pre-registered group-stage forecasts.
      </p>
    );
  }

  const {
    n,
    gap_in_se,
    threshold_se,
    tripped,
    evaluated_at_utc,
  } = checkpoint;

  const dateLabel = (evaluated_at_utc ?? "").slice(0, 10);
  const accentColor = tripped
    ? "var(--color-prism-rose)"
    : "var(--color-prism-mint)";
  const badgeLabel = tripped ? "FIRED" : "DID NOT FIRE";

  // The gap in SE against the 2 SE threshold. gap_in_se is signed: positive
  // means M_STAR is worse than M0 (the failing direction), negative means
  // M_STAR is better. We display the magnitude with an explicit direction word.
  const gapMagnitude = Math.abs(gap_in_se).toFixed(2);
  const directionWord = gap_in_se > 0 ? "worse than" : "better than";

  return (
    <div
      role="status"
      aria-label={`Round of 16 kill-criterion checkpoint; ${badgeLabel}`}
      style={{
        border: "1px solid var(--border-default)",
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: "var(--radius)",
        padding: "20px 24px",
        background: "var(--bg-panel)",
        margin: "32px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 12,
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
          R16 LIVE CHECKPOINT
        </span>
        <span
          className="mono"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: accentColor,
            letterSpacing: "0.04em",
          }}
        >
          {badgeLabel}
        </span>
        {dateLabel ? (
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
        ) : null}
      </div>

      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 16,
          lineHeight: "26px",
          color: "var(--text-secondary)",
          margin: "0 0 10px",
        }}
      >
        On the {n} pre-registered group-stage forecasts re-scored against their
        realized results, M2 (M&#8902;) was{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          {gapMagnitude} SE {directionWord}
        </strong>{" "}
        M0, against the {threshold_se.toFixed(1)} SE threshold.
      </p>

      {tripped ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 16,
            lineHeight: "26px",
            color: "var(--text-secondary)",
            margin: 0,
          }}
        >
          The pre-registered kill criterion fired. Per the pre-committed
          contingency (`pivot_paper_framing`), the paper pivots to the
          pre-committed contingency framing; the model is not silently swapped;
          the full report follows within 72 hours.
        </p>
      ) : (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 16,
            lineHeight: "26px",
            color: "var(--text-secondary)",
            margin: 0,
          }}
        >
          M2 (M&#8902;) was not worse than M0 by 2 or more standard errors; the
          kill criterion did not fire. The full evaluation is published as
          promised.
        </p>
      )}

      <p
        className="mono"
        style={{
          fontSize: 12,
          lineHeight: "18px",
          color: "var(--text-tertiary)",
          margin: "12px 0 0",
        }}
      >
        Paired per-match SE over the settled group results; a separate
        construction from the Phase 8 cross-validation readings above.
      </p>
    </div>
  );
}
