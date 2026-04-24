"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { EvaluationMetrics } from "@/lib/data/schemas";

type Bin = EvaluationMetrics["reliability_diagram"][number];

interface ReliabilityDiagramProps {
  bins: Bin[];
}

interface TooltipPayload {
  payload?: {
    p_model_mean: number;
    frequency_realized: number;
    n: number;
    bin_lower: number;
    bin_upper: number;
  };
}

function DiagramTooltip({ payload }: { payload?: TooltipPayload[] }) {
  const d = payload?.[0]?.payload;
  if (!d) return null;

  return (
    <div
      className="border rounded px-3 py-2 text-[11px] mono"
      style={{
        backgroundColor: "var(--bg-panel-elev)",
        borderColor: "var(--border-default)",
        color: "var(--text-primary)",
      }}
    >
      <div>
        Bin: [{d.bin_lower.toFixed(1)}, {d.bin_upper.toFixed(1)})
      </div>
      <div style={{ color: "var(--text-secondary)" }}>
        Mean predicted: {(d.p_model_mean * 100).toFixed(1)}%
      </div>
      <div style={{ color: "var(--text-secondary)" }}>
        Observed frequency: {(d.frequency_realized * 100).toFixed(1)}%
      </div>
      <div style={{ color: "var(--text-tertiary)" }}>n = {d.n}</div>
    </div>
  );
}

export function ReliabilityDiagram({ bins }: ReliabilityDiagramProps) {
  const populated = bins.filter((b) => b.n > 0);

  if (populated.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-[200px] border rounded text-[12px]"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-tertiary)",
        }}
        aria-label="Reliability diagram: no data available"
      >
        No settled forecasts — diagram available after first matches settle.
      </div>
    );
  }

  const data = populated.map((b) => ({
    ...b,
    x: b.p_model_mean,
    y: b.frequency_realized,
  }));

  return (
    <div
      aria-label="Reliability diagram: predicted probability versus observed frequency"
      role="img"
    >
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 32, left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-subtle)"
            opacity={0.5}
          />

          {/* Perfect calibration diagonal */}
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
            stroke="var(--text-tertiary)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: "perfect calibration",
              position: "insideTopLeft",
              fontSize: 10,
              fill: "var(--text-tertiary)",
              dy: 4,
            }}
          />

          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 1]}
            tickCount={6}
            tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            tickFormatter={(v: number) => v.toFixed(1)}
            label={{
              value: "Predicted probability",
              position: "insideBottom",
              offset: -18,
              fontSize: 11,
              fill: "var(--text-secondary)",
            }}
          />

          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 1]}
            tickCount={6}
            tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            tickFormatter={(v: number) => v.toFixed(1)}
            label={{
              value: "Observed frequency",
              angle: -90,
              position: "insideLeft",
              offset: 12,
              fontSize: 11,
              fill: "var(--text-secondary)",
            }}
            width={36}
          />

          <Tooltip
            content={<DiagramTooltip />}
            cursor={{ strokeDasharray: "3 3", stroke: "var(--border-default)" }}
          />

          <Scatter
            data={data}
            fill="var(--accent-focus)"
            opacity={0.85}
            shape={(props: React.SVGProps<SVGCircleElement> & { cx?: number; cy?: number; payload?: { n: number } }) => {
              const { cx = 0, cy = 0, payload } = props;
              const n = payload?.n ?? 1;
              const r = Math.max(4, Math.min(10, 3 + Math.sqrt(n)));
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="var(--accent-focus)"
                  fillOpacity={0.75}
                  stroke="var(--accent-focus)"
                  strokeWidth={1}
                  strokeOpacity={0.4}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
