import { loadEvaluationMetrics } from "@/lib/data/loadSnapshot";

/**
 * cp-25b. Live R16 kill-criterion checkpoint status block for the vault
 * kill-criteria article.
 *
 * Server component: loads evaluation_metrics at build time, no client JS.
 * Reads the r16_checkpoint sibling field (see evaluation/r16_checkpoint.py
 * and website/src/lib/data/schemas.ts::EvaluationMetricsSchema), never the
 * kill_criteria_check block that KillCriteriaStatusBlock renders.
 *
 * This is a genuinely separate event from the Phase 8 pre-tournament sanity
 * gate: a paired per-match log-loss comparison over the 72 pre-registered
 * group-stage forecasts, rescored once real outcomes are known, evaluated
 * once the Round of 16 settlement gate is reached. It must never be rendered
 * as, or numerically compared against, the 1.75 SE / 6.22 SE pre-tournament
 * readings.
 *
 * Renders one of two states:
 *   - r16_checkpoint absent: the interim sentence (evaluation is still
 *     pending the R16 settlement gate).
 *   - r16_checkpoint present: the live result -- n, the gap in SE against
 *     the 2 SE threshold, whether the criterion fired, and the evaluation
 *     timestamp -- with the fired / not-fired wording the spec requires.
 */
export function R16CheckpointStatusBlock() {
  const metrics = loadEvaluationMetrics();
  const checkpoint = metrics.r16_checkpoint;

  if (!checkpoint) {
    return (
      <div
        role="status"
        aria-label="R16 live checkpoint: pending"
        style={{
          border: "1px solid var(--border-default)",
          borderLeft: "3px solid var(--text-tertiary)",
          borderRadius: "var(--radius)",
          padding: "20px 24px",
          background: "var(--bg-panel)",
          margin: "40px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            marginBottom: 10,
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
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginLeft: "auto",
            }}
          >
            PENDING
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 16,
            lineHeight: "26px",
            color: "var(--text-secondary)",
            margin: 0,
          }}
        >
          The R16 live checkpoint remains wired and will be evaluated when
          the Round of 16 settles, on a live M2-versus-M0 comparison over the
          72 pre-registered group-stage forecasts.
        </p>
      </div>
    );
  }

  const {
    n,
    gap_in_se,
    threshold_se,
    tripped,
    evaluated_at_utc,
  } = checkpoint;

  const dateLabel = evaluated_at_utc.slice(0, 10);
  const gapLabel = gap_in_se === null ? "undefined" : gap_in_se.toFixed(2);
  const statusColor = tripped
    ? "var(--color-prism-rose)"
    : "var(--color-prism-mint)";
  const statusLabel = tripped ? "FIRED" : "DID NOT FIRE";

  return (
    <div
      role="status"
      aria-label={`R16 live checkpoint: ${statusLabel}`}
      style={{
        border: "1px solid var(--border-default)",
        borderLeft: `3px solid ${statusColor}`,
        borderRadius: "var(--radius)",
        padding: "20px 24px",
        background: "var(--bg-panel)",
        margin: "40px 0",
      }}
    >
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
          R16 LIVE CHECKPOINT
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "12px 14px",
          border: `1px solid ${statusColor}`,
          borderRadius: "var(--radius)",
          marginBottom: 14,
        }}
        aria-label={`${statusLabel}: ${gapLabel} SE / ${threshold_se.toFixed(1)} SE, n=${n}`}
      >
        <span
          className="mono"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: statusColor,
            letterSpacing: "0.04em",
          }}
        >
          {statusLabel}: {gapLabel} SE / {threshold_se.toFixed(1)} SE (n = {n})
        </span>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            lineHeight: "22px",
            color: "var(--text-secondary)",
          }}
        >
          {tripped ? (
            <>
              The pre-registered kill criterion fired. Per the project&apos;s
              pivot_paper_framing convention, the paper&apos;s framing pivots
              to the pre-committed contingency described in the
              pre-registration. The model is not silently swapped. The full
              report follows within 72 hours.
            </>
          ) : (
            <>
              M★ was not worse than M0 by 2 or more standard errors on the 72
              pre-registered group-stage forecasts. The kill criterion did
              not fire. The full evaluation is published as promised.
            </>
          )}
        </span>
      </div>

      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: "20px",
          color: "var(--text-tertiary)",
          margin: 0,
        }}
      >
        This is a live tournament checkpoint on the 72 pre-registered
        group-stage forecasts, a different construction from the
        pre-tournament cross-validation readings on the Phase 8 sanity gate
        above; the two are not numerically comparable.
      </p>
    </div>
  );
}
