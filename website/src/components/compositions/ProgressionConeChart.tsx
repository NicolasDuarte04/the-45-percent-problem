"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

interface ConeDatum {
  stage: string;
  label: string;
  p: number;
  p_range: [number, number];
  is_champion: boolean;
  ci_lo: number | null;
  ci_hi: number | null;
}

interface TooltipPayload {
  payload?: ConeDatum;
}

function ConeTooltip({ payload }: { payload?: TooltipPayload[] }) {
  const d = payload?.[0]?.payload;
  if (!d) return null;
  return (
    <div
      className="rounded px-3 py-2 text-[11px] mono"
      style={{
        backgroundColor: "var(--bg-panel-elev)",
        border: "1px solid var(--border-default)",
        color: "var(--text-primary)",
      }}
    >
      <div>{d.label}</div>
      <div style={{ color: "var(--text-secondary)" }}>
        P(reach) = {(d.p * 100).toFixed(1)}%
      </div>
      {d.is_champion && d.ci_lo !== null && d.ci_hi !== null ? (
        <div style={{ color: "var(--text-tertiary)" }}>
          95% CI [{(d.ci_lo * 100).toFixed(1)}%, {(d.ci_hi * 100).toFixed(1)}%]
        </div>
      ) : (
        <div style={{ color: "var(--text-quiet)" }}>
          CI published only on champion stage
        </div>
      )}
    </div>
  );
}

export function ProgressionConeChart({
  progression,
  fifaCode,
  displayName,
}: ProgressionConeChartProps) {
  const [ciLo, ciHi] = progression.ci_95_champion;

  const data: ConeDatum[] = STAGES.map((s) => {
    const p = progression[s.key] as number;
    const isChampion = s.key === "p_champion";
    return {
      stage: s.short,
      label: s.label,
      p,
      p_range: [0, p],
      is_champion: isChampion,
      ci_lo: isChampion ? ciLo : null,
      ci_hi: isChampion ? ciHi : null,
    };
  });

  const pChampion = progression.p_champion;

  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: 20,
      }}
    >
      <div className="flex justify-between items-baseline mb-4 flex-wrap gap-2">
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
            {displayName} · marginal P(reach stage) from Monte Carlo ensemble ·
            95% band published on champion stage only (§4.6)
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
        aria-label={`Progression cone for ${displayName}, champion probability ${(pChampion * 100).toFixed(1)} percent with 95% confidence interval ${(ciLo * 100).toFixed(1)} to ${(ciHi * 100).toFixed(1)} percent`}
      >
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={data}
            margin={{ top: 12, right: 24, bottom: 24, left: 8 }}
          >
            <defs>
              <linearGradient id="progression-cone-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--prism-peach)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--prism-peach)" stopOpacity={0.04} />
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
              width={44}
            />
            <Tooltip
              content={<ConeTooltip />}
              cursor={{ stroke: "var(--border-default)", strokeDasharray: "3 3" }}
            />
            {/* Cone: area from 0 up to P(reach stage). Naturally funnels as
                probabilities decay across the progression; the cone shape
                emerges from the published probabilities, not interpolation. */}
            <Area
              type="monotone"
              dataKey="p"
              stroke="var(--prism-peach)"
              strokeWidth={2}
              fill="url(#progression-cone-fill)"
              isAnimationActive={false}
              dot={{
                r: 3,
                fill: "var(--prism-peach)",
                stroke: "var(--bg-panel)",
                strokeWidth: 1.5,
              }}
              activeDot={{ r: 5 }}
            />
            {/* 95% CI segment: rendered only at the champion stage, which is
                the only stage with a published CI in the data contract (§4.6).
                Drawn as a vertical segment from ciLo to ciHi at x=CHA, with
                small cap dots at both bounds. */}
            <ReferenceLine
              segment={[
                { x: "CHA", y: ciLo },
                { x: "CHA", y: ciHi },
              ]}
              stroke="var(--prism-peach)"
              strokeWidth={3}
              strokeOpacity={0.75}
              ifOverflow="extendDomain"
            />
            <ReferenceDot
              x="CHA"
              y={ciLo}
              r={3}
              fill="var(--prism-peach)"
              stroke="var(--bg-panel)"
              strokeWidth={1}
            />
            <ReferenceDot
              x="CHA"
              y={ciHi}
              r={3}
              fill="var(--prism-peach)"
              stroke="var(--bg-panel)"
              strokeWidth={1}
            />
          </AreaChart>
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
              className="mono text-[14px] mt-0.5 tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {(d.p * 100).toFixed(1)}%
            </div>
            <div
              className="mono text-[10px] mt-0.5 tabular-nums"
              style={{ color: "var(--text-quiet)" }}
            >
              {d.is_champion && d.ci_lo !== null && d.ci_hi !== null
                ? `[${(d.ci_lo * 100).toFixed(1)}, ${(d.ci_hi * 100).toFixed(1)}]`
                : ": no CI. "}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
