"use client";

import { useState } from "react";

export interface GoalMatrix {
  matrix: number[][];
  homeTeam: string;
  awayTeam: string;
  lambdaHome: number;
  lambdaAway: number;
}

const MAX_GOALS = 6; // show 0–5 for readability

function interpolate(t: number): string {
  // cream → prism-peach → prism-coral
  // t in [0, 1]
  if (t < 0.5) {
    const s = t * 2;
    // #F7F4EC → #F9B88A
    const r = Math.round(247 + (249 - 247) * s);
    const g = Math.round(244 + (184 - 244) * s);
    const b = Math.round(236 + (138 - 236) * s);
    return `rgb(${r},${g},${b})`;
  } else {
    const s = (t - 0.5) * 2;
    // #F9B88A → #EC7C6A
    const r = Math.round(249 + (236 - 249) * s);
    const g = Math.round(184 + (124 - 184) * s);
    const b = Math.round(138 + (106 - 138) * s);
    return `rgb(${r},${g},${b})`;
  }
}

interface CellProps {
  value: number;
  maxValue: number;
  homeGoals: number;
  awayGoals: number;
  homeTeam: string;
  awayTeam: string;
  interactive: boolean;
}

function Cell({
  value,
  maxValue,
  homeGoals,
  awayGoals,
  homeTeam,
  awayTeam,
  interactive,
}: CellProps) {
  const [hovered, setHovered] = useState(false);
  const t = maxValue > 0 ? value / maxValue : 0;
  const bg = interpolate(t);
  const isHighContrast = t > 0.6;

  return (
    <div
      role="gridcell"
      aria-label={`${homeTeam} ${homeGoals}–${awayGoals} ${awayTeam}: ${(value * 100).toFixed(2)}%`}
      style={{
        position: "relative",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        aspectRatio: "1",
        cursor: interactive ? "default" : undefined,
        transition: "opacity 80ms",
        opacity: interactive && hovered ? 0.85 : 1,
      }}
      onMouseEnter={interactive ? () => setHovered(true) : undefined}
      onMouseLeave={interactive ? () => setHovered(false) : undefined}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: isHighContrast ? "#141414" : "#5A5550",
          userSelect: "none",
        }}
      >
        {value > 0.0005 ? `${(value * 100).toFixed(1)}` : ""}
      </span>
      {interactive && hovered && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-panel-elev)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 4,
            padding: "6px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            lineHeight: "16px",
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            zIndex: 10,
            pointerEvents: "none",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <div>
            {homeTeam} {homeGoals}–{awayGoals} {awayTeam}
          </div>
          <div style={{ color: "var(--prism-peach)", fontWeight: 500 }}>
            {(value * 100).toFixed(3)}%
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  goalMatrix: GoalMatrix;
  mode: "interactive" | "static";
}

export function PoissonHeatmapChart({ goalMatrix, mode }: Props) {
  const { matrix, homeTeam, awayTeam, lambdaHome, lambdaAway } = goalMatrix;
  const size = Math.min(MAX_GOALS + 1, matrix.length);

  const subMatrix: number[][] = [];
  let maxVal = 0;
  for (let h = 0; h < size; h++) {
    subMatrix[h] = [];
    for (let a = 0; a < size; a++) {
      const v = matrix[h]?.[a] ?? 0;
      subMatrix[h][a] = v;
      if (v > maxVal) maxVal = v;
    }
  }

  const AXIS_SIZE = 28;
  const LABEL_STYLE: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontVariantNumeric: "tabular-nums",
    color: "var(--text-quiet)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div>
      {/* λ annotation */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          color: "var(--text-tertiary)",
        }}
      >
        <span>
          λ<sub>home</sub> = {lambdaHome.toFixed(3)}
        </span>
        <span>
          λ<sub>away</sub> = {lambdaAway.toFixed(3)}
        </span>
      </div>

      {/* Grid: row 0 = away-goals header, rows 1..size = home rows */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${AXIS_SIZE}px repeat(${size}, 1fr)`,
          gridTemplateRows: `${AXIS_SIZE}px repeat(${size}, 1fr)`,
          gap: 1,
          background: "var(--border-subtle)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 4,
          overflow: "hidden",
          maxWidth: 480,
        }}
        role="grid"
        aria-label={`Goal score probability matrix: ${homeTeam} (rows) vs ${awayTeam} (columns)`}
      >
        {/* Corner cell */}
        <div
          style={{
            ...LABEL_STYLE,
            background: "var(--bg-panel)",
            fontSize: 9,
            color: "var(--text-quiet)",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <span>H↓</span>
          <span>A→</span>
        </div>

        {/* Away goals header */}
        {Array.from({ length: size }, (_, a) => (
          <div
            key={a}
            style={{ ...LABEL_STYLE, background: "var(--bg-panel)", fontWeight: 500 }}
          >
            {a}
          </div>
        ))}

        {/* Home rows */}
        {Array.from({ length: size }, (_, h) => (
          <>
            {/* Home goals label */}
            <div
              key={`label-${h}`}
              style={{ ...LABEL_STYLE, background: "var(--bg-panel)", fontWeight: 500 }}
            >
              {h}
            </div>
            {/* Cells */}
            {Array.from({ length: size }, (_, a) => (
              <Cell
                key={`${h}-${a}`}
                value={subMatrix[h][a]}
                maxValue={maxVal}
                homeGoals={h}
                awayGoals={a}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                interactive={mode === "interactive"}
              />
            ))}
          </>
        ))}
      </div>

      {/* Axis labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-quiet)",
          maxWidth: 480,
        }}
      >
        <span>↓ {homeTeam} goals (rows)</span>
        <span>{awayTeam} goals → (columns)</span>
      </div>
    </div>
  );
}
