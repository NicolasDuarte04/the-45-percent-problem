import { Figure } from "@/components/editorial/Figure";
import { loadEvaluationMetrics } from "@/lib/data/loadSnapshot";
import { ReliabilityFigureChart } from "./Chart";

interface Props {
  snapshotId?: string;
  mode?: "interactive" | "static";
}

/**
 * §8.4 — ReliabilityFigure.
 * Calibration reliability diagram with current snapshot's bins, 45° reference
 * line, and sample-size halo on each dot. Hover reveals raw counts (interactive
 * mode only).
 */
export function ReliabilityFigure({
  snapshotId = "latest",
  mode = "interactive",
}: Props) {
  const metrics = loadEvaluationMetrics(snapshotId === "latest" ? undefined : snapshotId);
  const bins = metrics.reliability_diagram;
  const populated = bins.filter((b) => b.n > 0);

  const noscriptRows = populated
    .map(
      (b) =>
        `  predicted ${(b.p_model_mean * 100).toFixed(1)}% → realized ${(b.frequency_realized * 100).toFixed(1)}% (n=${b.n})`
    )
    .join("\n");

  return (
    <Figure
      caption={`Reliability diagram. Each point is a probability bin; the dashed line is perfect calibration. Dot radius scales with sample count. Snapshot ${metrics.snapshot_id}.`}
      cite={{ href: "/vault/evaluation", label: "§ Evaluation" }}
      ariaLabel="Calibration reliability diagram"
    >
      <ReliabilityFigureChart bins={bins} mode={mode} />
      <noscript>
        <pre
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: "18px",
            color: "var(--text-tertiary)",
            padding: "16px",
            border: "1px solid var(--border-subtle)",
            borderRadius: 4,
            background: "var(--bg-panel)",
            whiteSpace: "pre-wrap",
          }}
        >
          {`Reliability diagram — ${metrics.snapshot_id}\n${noscriptRows || "No settled forecasts yet."}`}
        </pre>
      </noscript>
    </Figure>
  );
}
