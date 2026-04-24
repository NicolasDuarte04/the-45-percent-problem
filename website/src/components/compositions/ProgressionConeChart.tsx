"use client";

import {
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { TeamProgression } from "@/lib/data/schemas";

interface ProgressionConeChartProps {
  progression: TeamProgression["progression"];
  fifaCode: string;
  displayName: string;
}

const STAGES: Array<{
  key: keyof TeamProgression["progression"];
  label: string;
  short: string;
}> = [
  { key: "p_group_qualification", label: "group qualification", short: "GRP" },
  { key: "p_r16", label: "round of 16", short: "R16" },
  { key: "p_qf", label: "quarter-final", short: "QF" },
  { key: "p_sf", label: "semi-final", short: "SF" },
  { key: "p_final", label: "final", short: "FIN" },
  { key: "p_champion", label: "champion", short: "CHA" },
];

interface TooltipPayload {
  payload?: {
    stage: string;
    p: number;
    lo: number;
    hi: number;
  };
}

function ConeTooltip({ payload }: { payload?: TooltipPayload[] }) {
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
      <div>{d.stage}</div>
      <div style={{ color: "var(--text-secondary)" }}>
        P(reach) = {(d.p * 100).toFixed(1)}%
      </div>
      <div style={{ color: "var(--text-tertiary)" }}>
        95% band [{(d.lo * 100).toFixed(1)}%, {(d.hi * 100).toFixed(1)}%]
      </div>
    </div>
  );
}

export function ProgressionConeChart({
  progression,
  fifaCode,
  displayName,
}: ProgressionConeChartProps) {
  const values = STAGES.map((s) => progression[s.key]) as number[];

  const [ciLo, ciHi] = progression.ci_95_champion;
  const championIdx = STAGES.length - 1;
  const pChampion = progression.p_champion;

  const data = STAGES.map((s, i) => {
    const p = values[i] as number;
    let lo = p;
    let hi = p;
    if (i === championIdx) {
      lo = ciLo;
      hi = ciHi;
    } else {
      const shrink = 1 - i / championIdx;
      const delta = (ciHi - ciLo) / 2;
      const adjusted = delta * (1 - 0.65 * shrink);
      lo = Math.max(0, p - adjusted);
      hi = Math.min(1, p + adjusted);
    }
    return {
      stage: s.short,
      label: s.label,
      p,
      lo,
      hi,
      band: [lo, hi],
    };
  });

  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: 20,
      }}
    >
      <div className="flex justify-between items-baseline mb-4">
        <div>
          <h3
            className="text-[13px] font-medium"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--text-primary)",
            }}
          >
            Progression cone
          </h3>
          <div
            className="mono text-[11px] mt-[3px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {displayName} · marginal P(reach stage) from Monte Carlo · 95% band
            on champion; earlier stages interpolated for visual shape only
          </div>
        </div>
        <div
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          {fifaCode} · stage progression
        </div>
      </div>

      <div
        role="img"
        aria-label={`Progression cone for ${displayName}, champion probability ${(pChampion * 100).toFixed(1)} percent with confidence interval ${(ciLo * 100).toFixed(1)} to ${(ciHi * 100).toFixed(1)} percent`}
      >
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
          >
            <defs>
              <linearGradient id="coneBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--prism-peach)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--prism-peach)" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              vertical={false}
              opacity={0.55}
            />
            <XAxis
              dataKey="stage"
              tick={{
                fontSize: 11,
                fill: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
              }}
              axisLine={{ stroke: "var(--border-default)" }}
              tickLine={{ stroke: "var(--border-default)" }}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              tick={{
                fontSize: 10,
                fill: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
              }}
              axisLine={{ stroke: "var(--border-default)" }}
              tickLine={{ stroke: "var(--border-default)" }}
              width={40}
            />
            <Tooltip
              content={<ConeTooltip />}
              cursor={{ stroke: "var(--border-default)", strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="band"
              stroke="none"
              fill="url(#coneBand)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="p"
              stroke="var(--prism-peach)"
              strokeWidth={2}
              dot={{
                r: 3,
                fill: "var(--prism-peach)",
                stroke: "var(--bg-panel)",
                strokeWidth: 1.5,
              }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div
        className="grid mt-4 gap-2"
        style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
      >
        {data.map((d) => (
          <div
            key={d.stage}
            className="rounded"
            style={{
              background: "var(--bg-panel-elev)",
              border: "1px solid var(--border-subtle)",
              padding: "8px 10px",
            }}
          >
            <div
              className="mono text-[10px] uppercase tracking-[.06em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {d.stage}
            </div>
            <div
              className="mono text-[14px] mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              {(d.p * 100).toFixed(1)}%
            </div>
            <div
              className="mono text-[10px] mt-0.5"
              style={{ color: "var(--text-quiet)" }}
            >
              [{(d.lo * 100).toFixed(1)}, {(d.hi * 100).toFixed(1)}]
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
