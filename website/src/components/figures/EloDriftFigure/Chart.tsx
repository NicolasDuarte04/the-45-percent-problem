"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from "recharts";

export interface EloTeam {
  fifaCode: string;
  displayName: string;
  eloHistory: Array<{ snapshotId: string; elo: number }>;
  eloCurrent: number;
}

const PRISM_COLORS = [
  "var(--prism-peach)",
  "var(--prism-coral)",
  "var(--prism-indigo)",
  "var(--prism-plum)",
];

interface TooltipPayload {
  color?: string;
  name?: string;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
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
      <div style={{ marginBottom: 4, color: "var(--text-quiet)" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(0) : "—"}
        </div>
      ))}
    </div>
  );
}

interface Props {
  teams: EloTeam[];
  mode: "interactive" | "static";
}

export function EloDriftFigureChart({ teams, mode }: Props) {
  const hasHistory = teams.some((t) => t.eloHistory.length > 1);

  if (hasHistory) {
    // Build unified timeline
    const allSnapshots = Array.from(
      new Set(teams.flatMap((t) => t.eloHistory.map((h) => h.snapshotId)))
    ).sort();

    const data = allSnapshots.map((sid) => {
      const row: Record<string, string | number> = { snapshotId: sid };
      for (const team of teams) {
        const pt = team.eloHistory.find((h) => h.snapshotId === sid);
        if (pt) row[team.fifaCode] = pt.elo;
      }
      return row;
    });

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 48 }}>
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="var(--border-subtle)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="snapshotId"
            tickFormatter={(v: string) => v.slice(5, 10)}
            tick={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "var(--text-quiet)",
            }}
            stroke="var(--border-subtle)"
          />
          <YAxis
            tickFormatter={(v: number) => v.toFixed(0)}
            tick={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "var(--text-quiet)",
            }}
            stroke="var(--border-subtle)"
          />
          {mode === "interactive" ? <Tooltip content={<CustomTooltip />} /> : null}
          {teams.map((team, i) => (
            <Line
              key={team.fifaCode}
              dataKey={team.fifaCode}
              name={team.displayName}
              stroke={PRISM_COLORS[i % PRISM_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={mode === "interactive"}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Fallback: current Elo bar chart when history is unavailable
  const barData = teams.map((t, i) => ({
    name: t.fifaCode,
    elo: t.eloCurrent,
    label: t.displayName,
    color: PRISM_COLORS[i % PRISM_COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={barData}
        margin={{ top: 16, right: 16, bottom: 8, left: 48 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border-subtle)"
          strokeOpacity={0.5}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fill: "var(--text-quiet)",
          }}
          stroke="var(--border-subtle)"
        />
        <YAxis
          tickFormatter={(v: number) => v.toFixed(0)}
          domain={["auto", "auto"]}
          tick={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fill: "var(--text-quiet)",
          }}
          stroke="var(--border-subtle)"
          label={{
            value: "Elo",
            angle: -90,
            position: "insideLeft",
            offset: 16,
            style: {
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "var(--text-quiet)",
            },
          }}
        />
        {mode === "interactive" ? (
          <Tooltip
            formatter={(value: unknown) => [Number(value).toFixed(0), "Elo"]}
            contentStyle={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-panel-elev)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 4,
              color: "var(--text-secondary)",
            }}
          />
        ) : null}
        <Bar dataKey="elo" radius={[2, 2, 0, 0]} isAnimationActive={mode === "interactive"}>
          {barData.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
          ))}
          <LabelList
            dataKey="elo"
            position="top"
            formatter={(v: unknown) => Number(v).toFixed(0)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "var(--text-quiet)",
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
