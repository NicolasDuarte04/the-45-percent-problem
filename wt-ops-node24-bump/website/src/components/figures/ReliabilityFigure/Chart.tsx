"use client";

import {
  ComposedChart,
  Scatter,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  CartesianGrid,
} from "recharts";

export interface ReliabilityBin {
  bin_lower: number;
  bin_upper: number;
  p_model_mean: number;
  frequency_realized: number;
  n: number;
}

interface TooltipPayload {
  value?: number;
  name?: string;
  payload?: ReliabilityBin;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const bin = payload[0]?.payload as ReliabilityBin | undefined;
  if (!bin) return null;
  return (
    <div
      style={{
        background: "var(--bg-panel-elev)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 4,
        padding: "8px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: "18px",
        color: "var(--text-secondary)",
      }}
    >
      <div>predicted {(bin.p_model_mean * 100).toFixed(1)}%</div>
      <div>realized {(bin.frequency_realized * 100).toFixed(1)}%</div>
      <div style={{ color: "var(--text-quiet)", marginTop: 4 }}>
        n = {bin.n}
      </div>
    </div>
  );
}

interface Props {
  bins: ReliabilityBin[];
  mode: "interactive" | "static";
}

export function ReliabilityFigureChart({ bins, mode }: Props) {
  const populated = bins.filter((b) => b.n > 0);

  // Reference line data for perfect calibration (y = x)
  const refData = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart margin={{ top: 16, right: 16, bottom: 40, left: 40 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border-subtle)"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="x"
          type="number"
          domain={[0, 1]}
          tickCount={6}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          label={{
            value: "predicted probability",
            position: "insideBottom",
            offset: -24,
            style: {
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fill: "var(--text-quiet)",
                  },
          }}
          tick={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fill: "var(--text-quiet)",
              }}
          stroke="var(--border-subtle)"
        />
        <YAxis
          dataKey="y"
          type="number"
          domain={[0, 1]}
          tickCount={6}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          label={{
            value: "frequency realized",
            angle: -90,
            position: "insideLeft",
            offset: 16,
            style: {
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fill: "var(--text-quiet)",
                  },
          }}
          tick={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fill: "var(--text-quiet)",
              }}
          stroke="var(--border-subtle)"
        />

        {/* 45° perfect-calibration reference */}
        <Line
          data={refData}
          dataKey="y"
          stroke="var(--border-default)"
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
          legendType="none"
          isAnimationActive={false}
        />

        {/* Calibration scatter: radius encodes sample size */}
        <Scatter
          data={populated.map((b) => ({
            ...b,
            x: b.p_model_mean,
            y: b.frequency_realized,
            z: Math.max(6, Math.sqrt(b.n) * 4),
          }))}
          dataKey="y"
          fill="var(--prism-peach)"
          fillOpacity={0.85}
          stroke="var(--prism-coral)"
          strokeWidth={1.5}
          r={6}
          isAnimationActive={mode === "interactive"}
        />

        {mode === "interactive" ? <Tooltip content={<CustomTooltip />} /> : null}

        {/* Zero-data baseline */}
        <ReferenceLine y={0} stroke="var(--border-subtle)" strokeWidth={1} />
        <ReferenceLine x={0} stroke="var(--border-subtle)" strokeWidth={1} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
