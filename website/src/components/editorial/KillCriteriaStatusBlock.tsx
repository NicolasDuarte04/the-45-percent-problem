import { loadEvaluationMetrics } from "@/lib/data/loadSnapshot";

/**
 * §8.9 — Live kill-criteria status block for the vault article.
 * Server component: loads evaluation_metrics at build time, no client JS.
 */
export function KillCriteriaStatusBlock() {
  const metrics = loadEvaluationMetrics();
  const { kill_criteria_check } = metrics;
  const { triggered, margin, condition } = kill_criteria_check;

  const statusLabel = triggered ? "TRIPPED" : "NOT TRIPPED";
  const accentColor = triggered
    ? "var(--color-prism-rose)"
    : "var(--color-prism-mint)";

  return (
    <div
      role="status"
      aria-label={`Kill criterion status: ${statusLabel}`}
      style={{
        border: "1px solid var(--border-default)",
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: "var(--radius)",
        padding: "20px 24px",
        background: "var(--bg-panel)",
        margin: "40px 0",
      }}
    >
      {/* Status row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accentColor,
            flexShrink: 0,
            display: "inline-block",
          }}
        />
        <span
          className="mono"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: accentColor,
            letterSpacing: "0.04em",
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Detail row */}
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
        Current margin:{" "}
        <span
          aria-label={`margin ${margin >= 0 ? "positive" : "negative"} ${Math.abs(margin).toFixed(4)}`}
          style={{ color: accentColor }}
        >
          {margin >= 0 ? "+" : ""}
          {margin.toFixed(4)}
        </span>{" "}
        · Evaluation point: Round of 16
      </p>
    </div>
  );
}
