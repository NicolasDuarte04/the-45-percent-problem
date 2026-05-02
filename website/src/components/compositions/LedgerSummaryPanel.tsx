import type { EvaluationMetrics } from "@/lib/data/schemas";
import { NumericCell } from "@/components/primitives/NumericCell";
import { ReliabilityDiagram } from "@/components/compositions/ReliabilityDiagram";
import { formatMono } from "@/lib/formatters";

interface LedgerSummaryPanelProps {
  metrics: EvaluationMetrics;
}

const MODEL_IDS = ["M0", "M1", "M2", "M3", "M_STAR"] as const;

function MetricRow({
  label,
  values,
}: {
  label: string;
  values: Record<string, number | null>;
}) {
  return (
    <tr style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <td
        className="py-1.5 pr-4 text-[11px]"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </td>
      {MODEL_IDS.map((id) => {
        const v = values[id];
        return (
          <td
            key={id}
            className="py-1.5 px-3 text-right"
            aria-label={`${label} for ${id}: ${v === null ? "not available" : v.toFixed(4)}`}
          >
            {v === null ? (
              <span className="mono text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                —
              </span>
            ) : (
              <NumericCell value={v} formatter={(x) => formatMono(x, 4)} />
            )}
          </td>
        );
      })}
    </tr>
  );
}

export function LedgerSummaryPanel({ metrics }: LedgerSummaryPanelProps) {
  const clvSign = metrics.clv_cumulative_bps >= 0 ? "+" : "−";
  const clvAbs = Math.abs(metrics.clv_cumulative_bps);
  const killTripped = metrics.kill_criteria_check.tripped;

  return (
    <section
      aria-label="Evaluation metrics summary"
      className="border rounded"
      style={{
        borderColor: "var(--border-default)",
        backgroundColor: "var(--bg-panel)",
      }}
    >
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 border-b flex flex-wrap items-baseline justify-between gap-3"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div>
          <h2
            className="text-[13px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Evaluation Metrics
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {metrics.matches_settled} match{metrics.matches_settled !== 1 ? "es" : ""} settled ·
            snapshot <span className="mono">{metrics.snapshot_id}</span>
          </p>
        </div>

        {/* Kill criteria pill */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded border text-[11px] mono"
          style={{
            borderColor: killTripped ? "var(--edge-negative)" : "var(--border-default)",
            color: killTripped ? "var(--edge-negative)" : "var(--text-tertiary)",
            backgroundColor: killTripped
              ? "rgba(252,165,165,0.06)"
              : "transparent",
          }}
          aria-label={`Kill criteria: ${killTripped ? "tripped" : "not tripped"}`}
        >
          <span aria-hidden>{killTripped ? "◆" : "●"}</span>
          <span>{killTripped ? "KILL CRITERIA TRIPPED" : "KILL CRITERIA: NOT TRIPPED"}</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Scoring metrics table ─────────────────────────────────────── */}
        <div>
          <p
            className="text-[11px] mb-2 font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Proper Scoring Rules: lower is better
          </p>
          <div className="overflow-x-auto" data-guide-id="ledger-scoring-table">
            <table className="w-full text-[12px]" style={{ color: "var(--data-neutral)" }}>
              <thead>
                <tr>
                  <th
                    className="pb-1.5 text-left text-[11px] font-normal"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Metric
                  </th>
                  {MODEL_IDS.map((id) => (
                    <th
                      key={id}
                      className="pb-1.5 px-3 text-right text-[11px] font-normal"
                      style={{
                        color:
                          id === "M_STAR"
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                      }}
                      scope="col"
                      aria-label={id === "M_STAR" ? "M-star champion model" : id}
                    >
                      {id === "M_STAR" ? "M★" : id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <MetricRow label="Brier" values={metrics.brier} />
                <MetricRow label="Log-loss" values={metrics.log_loss} />
                <MetricRow label="RPS" values={metrics.rps} />
              </tbody>
            </table>
          </div>

          {/* ── CLV and statistical tests ──────────────────────────────── */}
          <div
            data-guide-id="ledger-clv-block"
            className="mt-4 pt-4 border-t space-y-2"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex justify-between items-baseline text-[12px]">
              <span style={{ color: "var(--text-secondary)" }}>
                Cumulative CLV (M★)
              </span>
              <span
                className="mono"
                style={{
                  color:
                    metrics.clv_cumulative_bps >= 0
                      ? "var(--edge-positive)"
                      : "var(--edge-negative)",
                }}
                aria-label={`Cumulative CLV ${clvSign}${clvAbs} basis points`}
              >
                {clvSign}{clvAbs} bps
              </span>
            </div>

            <div className="flex justify-between items-baseline text-[12px]">
              <span style={{ color: "var(--text-secondary)" }}>CLV z-score</span>
              <span
                className="mono"
                style={{ color: "var(--data-neutral)" }}
                aria-label={`CLV z-score ${metrics.clv_z_score.toFixed(2)}`}
              >
                {metrics.clv_z_score.toFixed(2)}
              </span>
            </div>

            {metrics.nyberg_test_pvalue !== null && (
              <div className="flex justify-between items-baseline text-[12px]">
                <span style={{ color: "var(--text-secondary)" }}>
                  Nyberg test p-value
                </span>
                <span
                  className="mono"
                  style={{ color: "var(--data-neutral)" }}
                  aria-label={`Nyberg test p-value ${metrics.nyberg_test_pvalue.toFixed(3)}`}
                >
                  {metrics.nyberg_test_pvalue.toFixed(3)}
                </span>
              </div>
            )}

            {metrics.diebold_mariano_vs_M0.stat !== null && (
              <div className="flex justify-between items-baseline text-[12px]">
                <span style={{ color: "var(--text-secondary)" }}>
                  Diebold-Mariano vs M0
                </span>
                <span
                  className="mono"
                  style={{ color: "var(--data-neutral)" }}
                  aria-label={`Diebold-Mariano statistic ${metrics.diebold_mariano_vs_M0.stat!.toFixed(3)}, p-value ${metrics.diebold_mariano_vs_M0.pvalue!.toFixed(3)}`}
                >
                  stat {metrics.diebold_mariano_vs_M0.stat!.toFixed(3)} · p{" "}
                  {metrics.diebold_mariano_vs_M0.pvalue!.toFixed(3)}
                </span>
              </div>
            )}

            {/* Kill criteria condition detail */}
            <div
              className="mt-3 pt-3 border-t text-[11px]"
              style={{
                borderColor: "var(--border-subtle)",
                color: "var(--text-tertiary)",
              }}
            >
              <span>Pre-registered kill condition: </span>
              <span className="mono">{metrics.kill_criteria_check.condition}</span>
              <span>
                {" "}· gap{" "}
                <span
                  className="mono"
                  aria-label={`gap ${metrics.kill_criteria_check.gap_se.toFixed(2)} SE of ${metrics.kill_criteria_check.threshold_se.toFixed(1)} SE`}
                >
                  {metrics.kill_criteria_check.gap_se.toFixed(2)} SE / {metrics.kill_criteria_check.threshold_se.toFixed(1)} SE
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Reliability diagram ───────────────────────────────────────── */}
        <div data-guide-id="ledger-reliability-diagram">
          <p
            className="text-[11px] mb-2 font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Calibration: Reliability Diagram
          </p>
          <ReliabilityDiagram bins={metrics.reliability_diagram} />
          <p
            className="text-[11px] mt-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Points on the diagonal indicate perfect calibration. Each point
            represents one decile bin; size reflects sample count. Only bins
            with n ≥ 1 are rendered.
          </p>
        </div>
      </div>
    </section>
  );
}
