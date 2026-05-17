"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export interface GateTimelinePoint {
  snapshotId: string;
  edgeE: number;
  pModel: number;
  qMarket: number;
  gateTripped: boolean;
}

export interface GateTimelineData {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  outcome: string;
  threshold: number;
  points: GateTimelinePoint[];
  finalGateStatus: "OPEN" | "FIRED";
  rulesTripped: string[];
}

interface TooltipPayload {
  color?: string;
  name?: string;
  value?: number;
  payload?: GateTimelinePoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const pt = payload[0]?.payload;
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
      <div style={{ color: "var(--text-quiet)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? `${(p.value * 100).toFixed(2)}%` : "-"}
        </div>
      ))}
      {pt?.gateTripped ? (
        <div
          style={{
            marginTop: 6,
            color: "var(--gate-fired)",
            fontWeight: 500,
          }}
        >
          ◆ Gate tripped
        </div>
      ) : null}
    </div>
  );
}

interface Props {
  data: GateTimelineData;
  mode: "interactive" | "static";
}

export function GateTimelineChart({ data, mode }: Props) {
  if (!data.points.length) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed var(--border-subtle)",
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--text-quiet)",
        }}
      >
        No price history available for this market.
      </div>
    );
  }

  const chartData = data.points.map((pt) => ({
    ...pt,
    // Recharts needs a label-friendly x key
    label: pt.snapshotId.slice(5, 10),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 16, right: 16, bottom: 32, left: 48 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border-subtle)"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="label"
          tick={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fill: "var(--text-quiet)",
              }}
          label={{
            value: "snapshot date",
            position: "insideBottom",
            offset: -20,
            style: {
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "var(--text-quiet)",
            },
          }}
          stroke="var(--border-subtle)"
        />
        <YAxis
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          domain={["auto", "auto"]}
          tick={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fill: "var(--text-quiet)",
              }}
          stroke="var(--border-subtle)"
        />

        {/* Edge threshold band */}
        <ReferenceLine
          y={data.threshold}
          stroke="var(--gate-fired)"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{
            value: `ε=${(data.threshold * 100).toFixed(0)}%`,
            position: "right",
            style: {
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fill: "var(--gate-fired)",
            },
          }}
        />

        {/* M★ model probability */}
        <Line
          dataKey="pModel"
          name="p_model (M★)"
          stroke="var(--prism-peach)"
          strokeWidth={2}
          dot={(props: { cx?: number; cy?: number; payload?: GateTimelinePoint }) => {
            const cx = props.cx ?? 0;
            const cy = props.cy ?? 0;
            const payload = props.payload;
            if (payload?.gateTripped) {
              return (
                <polygon
                  key={`dot-${cx}-${cy}`}
                  points={`${cx},${cy - 7} ${cx + 6},${cy + 4} ${cx - 6},${cy + 4}`}
                  fill="var(--gate-fired)"
                  stroke="var(--gate-fired)"
                />
              );
            }
            return (
              <circle
                key={`dot-${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={3}
                fill="var(--prism-peach)"
                stroke="var(--prism-peach)"
              />
            );
          }}
          isAnimationActive={mode === "interactive"}
        />

        {/* Market de-vigged probability */}
        <Line
          dataKey="qMarket"
          name="q_market (devigged)"
          stroke="var(--prism-indigo)"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={{ r: 3, fill: "var(--prism-indigo)" }}
          isAnimationActive={mode === "interactive"}
        />

        {mode === "interactive" ? <Tooltip content={<CustomTooltip />} /> : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
