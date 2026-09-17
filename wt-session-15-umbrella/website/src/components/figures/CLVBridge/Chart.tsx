"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";

export interface CLVPoint {
  forecastId: string;
  matchId: string;
  pModel: number;
  qMarket: number;
  edgeE: number;
  clvBps: number | null;
  hitMiss: "HIT" | "MISS" | "NEUTRAL";
}

interface TooltipPayload {
  payload?: CLVPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  const edgeSign = pt.edgeE >= 0 ? "+" : "";
  const clvText = pt.clvBps != null ? `${pt.clvBps > 0 ? "+" : ""}${pt.clvBps} bps` : "-";
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
      <div style={{ color: "var(--text-quiet)", fontSize: 10, marginBottom: 4 }}>
        {pt.matchId}
      </div>
      <div>
        p_model{" "}
        <span style={{ color: "var(--prism-peach)", fontWeight: 500 }}>
          {(pt.pModel * 100).toFixed(2)}%
        </span>
      </div>
      <div>
        q_market{" "}
        <span style={{ color: "var(--prism-indigo)", fontWeight: 500 }}>
          {(pt.qMarket * 100).toFixed(2)}%
        </span>
      </div>
      <div>
        edge E{" "}
        <span
          style={{
            color: pt.edgeE >= 0 ? "var(--edge-positive)" : "var(--edge-negative)",
            fontWeight: 500,
          }}
        >
          {edgeSign}
          {(pt.edgeE * 100).toFixed(2)}pp
        </span>
      </div>
      <div style={{ color: "var(--text-quiet)", marginTop: 4 }}>CLV {clvText}</div>
      <div
        style={{
          marginTop: 4,
          color:
            pt.hitMiss === "HIT"
              ? "var(--ledger-hit)"
              : pt.hitMiss === "MISS"
              ? "var(--ledger-miss)"
              : "var(--text-quiet)",
          fontWeight: 500,
        }}
      >
        {pt.hitMiss}
      </div>
    </div>
  );
}

function pointColor(pt: CLVPoint): string {
  if (pt.edgeE > 0.01) return "var(--prism-mint)";
  if (pt.edgeE < -0.01) return "var(--prism-rose)";
  return "var(--prism-peach)";
}

interface Props {
  points: CLVPoint[];
  mode: "interactive" | "static";
}

export function CLVBridgeChart({ points, mode }: Props) {
  if (!points.length) {
    return (
      <div
        style={{
          height: 240,
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
        No settled M★ forecasts yet.
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-tertiary)",
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--prism-mint)",
              marginRight: 6,
              verticalAlign: "middle",
            }}
          />
          E &gt; +1pp
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--prism-peach)",
              marginRight: 6,
              verticalAlign: "middle",
            }}
          />
          |E| ≤ 1pp
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--prism-rose)",
              marginRight: 6,
              verticalAlign: "middle",
            }}
          />
          E &lt; −1pp
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 16, right: 16, bottom: 40, left: 48 }}>
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="var(--border-subtle)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="qMarket"
            type="number"
            domain={[0, 1]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            label={{
              value: "q_market (devigged, on realized)",
              position: "insideBottom",
              offset: -24,
              style: {
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fill: "var(--text-quiet)",
              },
            }}
            tick={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "var(--text-quiet)",
                  }}
            stroke="var(--border-subtle)"
          />
          <YAxis
            dataKey="pModel"
            type="number"
            domain={[0, 1]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            label={{
              value: "p_model (on realized)",
              angle: -90,
              position: "insideLeft",
              offset: 16,
              style: {
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fill: "var(--text-quiet)",
              },
            }}
            tick={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "var(--text-quiet)",
                  }}
            stroke="var(--border-subtle)"
          />

          {/* p_model = q_market reference */}
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ]}
            stroke="var(--border-default)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />

          {mode === "interactive" ? <Tooltip content={<CustomTooltip />} /> : null}

          <Scatter
            data={points}
            isAnimationActive={mode === "interactive"}
          >
            {points.map((pt, i) => (
              <Cell
                key={i}
                fill={pointColor(pt)}
                fillOpacity={0.8}
                stroke={pointColor(pt)}
                strokeWidth={0.5}
                r={5}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
