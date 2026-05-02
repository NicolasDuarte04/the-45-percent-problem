import Link from "next/link";
import type { EvaluationMetrics, SnapshotMeta } from "@/lib/data/schemas";

interface TournamentCalibrationStripProps {
  evaluation: EvaluationMetrics;
  meta: SnapshotMeta;
}

export function TournamentCalibrationStrip({
  evaluation,
  meta,
}: TournamentCalibrationStripProps) {
  const noData = evaluation.matches_settled === 0;

  if (noData) {
    return (
      <div
        className="rounded-2xl border"
        style={{
          backgroundColor: "var(--bg-panel-elev)",
          borderColor: "var(--rule)",
          padding: "22px 24px",
          boxShadow: "0 1px 3px rgb(0 0 0 / 0.04), 0 6px 24px rgb(0 0 0 / 0.05)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 2fr",
          gap: 28,
          alignItems: "center",
        }}
      >
        <Metric label="Brier (lower = better)" value="—" />
        <Metric label="Log-loss" value="—" />
        <Metric label="Settled forecasts" value="0" />
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.55,
          }}
        >
          Pre-tournament window. Calibration populates after the first
          settled forecasts. Model:{" "}
          <span className="mono">M★ ({meta.champion_model})</span> · MC runs:{" "}
          <span className="mono">{meta.mc_runs.toLocaleString()}</span>.{" "}
          <Link
            href="/ledger"
            style={{ color: "var(--accent-focus)", fontWeight: 500 }}
          >
            Transparency ledger →
          </Link>
        </div>
      </div>
    );
  }

  const brier = evaluation.brier.M_STAR;
  const logloss = evaluation.log_loss.M_STAR;

  return (
    <div
      className="rounded-2xl border"
      style={{
        backgroundColor: "var(--bg-panel-elev)",
        borderColor: "var(--rule)",
        padding: "22px 24px",
        boxShadow: "0 1px 3px rgb(0 0 0 / 0.04), 0 6px 24px rgb(0 0 0 / 0.05)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 2fr",
        gap: 28,
        alignItems: "center",
      }}
    >
      <Metric
        label="Brier (lower = better)"
        value={brier !== null ? brier.toFixed(4) : "—"}
      />
      <Metric
        label="Log-loss"
        value={logloss !== null ? logloss.toFixed(4) : "—"}
      />
      <Metric
        label="Settled forecasts"
        value={evaluation.matches_settled.toLocaleString()}
      />
      <div
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.55,
        }}
      >
        Cumulative CLV{" "}
        <span
          className="mono"
          style={{
            color:
              evaluation.clv_cumulative_bps > 0
                ? "var(--edge-positive)"
                : evaluation.clv_cumulative_bps < 0
                  ? "var(--edge-negative)"
                  : "var(--text-primary)",
          }}
        >
          {evaluation.clv_cumulative_bps >= 0 ? "+" : ""}
          {evaluation.clv_cumulative_bps}
        </span>{" "}
        bps across {evaluation.matches_settled.toLocaleString()} settled
        forecasts. Kill criteria{" "}
        <span
          className="mono"
          style={{
            color: evaluation.kill_criteria_check.tripped
              ? "var(--edge-negative)"
              : "var(--text-primary)",
          }}
        >
          {evaluation.kill_criteria_check.tripped ? "TRIGGERED" : "not tripped"}
        </span>
        .{" "}
        <Link
          href="/ledger"
          style={{ color: "var(--accent-focus)", fontWeight: 500 }}
        >
          Full diagram →
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          letterSpacing: ".04em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 24,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
