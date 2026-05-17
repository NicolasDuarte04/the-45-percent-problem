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
  ErrorBar,
  LabelList,
} from "recharts";

export interface ChampionTeam {
  fifaCode: string;
  displayName: string;
  pChampion: number;
  ciLo: number;
  ciHi: number;
  history: Array<{ snapshotId: string; pChampion: number }>;
}

const PRISM_COLORS = [
  "var(--prism-peach)",
  "var(--prism-coral)",
  "var(--prism-indigo)",
  "var(--prism-plum)",
  "var(--prism-mint)",
  "var(--prism-cyan)",
  "var(--prism-rose)",
  "var(--prism-sun)",
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
        minWidth: 160,
      }}
    >
      <div style={{ color: "var(--text-quiet)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number" ? `${(p.value * 100).toFixed(1)}%` : "-"}
        </div>
      ))}
    </div>
  );
}

interface Props {
  teams: ChampionTeam[];
  mode: "interactive" | "static";
}

export function ChampionEvolutionChart({ teams, mode }: Props) {
  const hasHistory = teams.some((t) => t.history.length > 1);

  if (hasHistory) {
    const allSnapshots = Array.from(
      new Set(teams.flatMap((t) => t.history.map((h) => h.snapshotId)))
    ).sort();

    const data = allSnapshots.map((sid) => {
      const row: Record<string, string | number> = { snapshotId: sid };
      for (const team of teams) {
        const pt = team.history.find((h) => h.snapshotId === sid);
        if (pt) row[team.fifaCode] = pt.pChampion;
      }
      return row;
    });

    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 32, left: 48 }}>
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
            domain={[0, "auto"]}
            tick={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "var(--text-quiet)",
            }}
            label={{
              value: "p_champion",
              angle: -90,
              position: "insideLeft",
              offset: 16,
              style: {
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fill: "var(--text-quiet)",
              },
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

  // No history: current-snapshot bar chart with 95% CI error bars
  const barData = teams.map((t, i) => ({
    name: t.fifaCode,
    label: t.displayName,
    pChampion: t.pChampion,
    ciError: [t.pChampion - t.ciLo, t.ciHi - t.pChampion] as [number, number],
    color: PRISM_COLORS[i % PRISM_COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={barData}
        margin={{ top: 24, right: 16, bottom: 8, left: 48 }}
        barCategoryGap="25%"
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
            fontSize: 11,
            fill: "var(--text-quiet)",
          }}
          stroke="var(--border-subtle)"
        />
        <YAxis
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          domain={[0, "auto"]}
          tick={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fill: "var(--text-quiet)",
          }}
          label={{
            value: "p_champion",
            angle: -90,
            position: "insideLeft",
            offset: 16,
            style: {
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "var(--text-quiet)",
            },
          }}
          stroke="var(--border-subtle)"
        />
        {mode === "interactive" ? (
          <Tooltip
            formatter={(v: unknown) => [`${(Number(v) * 100).toFixed(1)}%`, "p_champion"]}
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
        <Bar dataKey="pChampion" radius={[2, 2, 0, 0]} isAnimationActive={mode === "interactive"}>
          {barData.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
          ))}
          <ErrorBar dataKey="ciError" width={4} strokeWidth={1.5} stroke="var(--text-quiet)" />
          <LabelList
            dataKey="pChampion"
            position="top"
            formatter={(v: unknown) => `${(Number(v) * 100).toFixed(1)}%`}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fill: "var(--text-quiet)",
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
