"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TeamProgression } from "@/lib/data/schemas";

interface HistoricalChampionSparklineProps {
  history: TeamProgression["history"];
  fifaCode: string;
}

export function HistoricalChampionSparkline({
  history,
  fifaCode,
}: HistoricalChampionSparklineProps) {
  if (history.length === 0) {
    return (
      <div
        className="rounded-lg"
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          padding: 20,
        }}
      >
        <h3
          className="text-[13px] font-medium mb-3"
          style={{
            fontFamily: "var(--font-sans)",
            color: "var(--text-primary)",
          }}
        >
          Champion probability history
        </h3>
        <div
          className="mono text-[12px] text-center py-10"
          style={{ color: "var(--text-tertiary)" }}
        >
          History available from the second published snapshot onward. This is
          the first snapshot for {fifaCode}.
        </div>
      </div>
    );
  }

  const data = history.map((h) => ({
    snapshot: h.snapshot_id,
    short: h.snapshot_id.slice(5, 10),
    p: h.p_champion,
  }));

  const last = data[data.length - 1].p;
  const first = data[0].p;
  const delta = last - first;

  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: 20,
      }}
    >
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <h3
            className="text-[13px] font-medium"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--text-primary)",
            }}
          >
            Champion probability history
          </h3>
          <div
            className="mono text-[11px] mt-[3px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            snapshot-to-snapshot drift · {history.length} points
          </div>
        </div>
        <div
          className="mono text-[12px]"
          style={{
            color:
              delta > 0
                ? "var(--prism-mint)"
                : delta < 0
                  ? "var(--prism-rose)"
                  : "var(--text-tertiary)",
          }}
        >
          Δ {(delta * 100 >= 0 ? "+" : "−") + Math.abs(delta * 100).toFixed(1)}pp
        </div>
      </div>

      <div role="img" aria-label={`Champion probability history sparkline for ${fifaCode}`}>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 8, left: 0 }}>
            <XAxis
              dataKey="short"
              tick={{
                fontSize: 10,
                fill: "var(--text-quiet)",
                fontFamily: "var(--font-mono)",
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide
              domain={["dataMin", "dataMax"]}
            />
            <Tooltip
              cursor={{ stroke: "var(--border-default)", strokeDasharray: "3 3" }}
              contentStyle={{
                background: "var(--bg-panel-elev)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
              formatter={(v) => {
                const n = typeof v === "number" ? v : Number(v);
                return [`${(n * 100).toFixed(1)}%`, "p(champion)"];
              }}
            />
            <Line
              type="monotone"
              dataKey="p"
              stroke="var(--prism-peach)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
