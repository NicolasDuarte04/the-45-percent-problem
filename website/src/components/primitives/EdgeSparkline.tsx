"use client";

import type { DivergenceHistoryEntry } from "@/lib/data/schemas";

interface EdgeSparklineProps {
  history: DivergenceHistoryEntry[];
  currentEdge: number;
  width?: number;
  height?: number;
}

export function EdgeSparkline({
  history,
  currentEdge,
  width = 120,
  height = 32,
}: EdgeSparklineProps) {
  const allPoints = [
    ...history.map((h) => h.edge_E),
    currentEdge,
  ];

  if (allPoints.length < 2) {
    return (
      <span className="mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
. 
      </span>
    );
  }

  const minE = Math.min(...allPoints);
  const maxE = Math.max(...allPoints);
  const range = maxE - minE || 0.001;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const toX = (i: number) => pad + (i / (allPoints.length - 1)) * w;
  const toY = (v: number) => pad + h - ((v - minE) / range) * h;

  const points = allPoints.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  const zeroY = toY(0);
  const isAboveZero = zeroY > pad && zeroY < pad + h;

  const lineColor = currentEdge >= 0 ? "var(--edge-positive)" : "var(--edge-negative)";
  const dotColor = lineColor;

  return (
    <svg
      width={width}
      height={height}
      aria-label={`edge history sparkline, current ${currentEdge >= 0 ? "+" : ""}${(currentEdge * 100).toFixed(1)}pp`}
      role="img"
    >
      {/* Zero baseline */}
      {isAboveZero && (
        <line
          x1={pad}
          y1={zeroY}
          x2={pad + w}
          y2={zeroY}
          stroke="var(--border-subtle)"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
      )}

      {/* History line */}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.2"
        strokeOpacity="0.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Current value dot */}
      <circle
        cx={toX(allPoints.length - 1)}
        cy={toY(currentEdge)}
        r="2"
        fill={dotColor}
        opacity="0.9"
      />
    </svg>
  );
}
