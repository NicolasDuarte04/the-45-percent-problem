"use client";

import { useEffect, useMemo, useRef } from "react";
import * as Plot from "@observablehq/plot";

interface GoalMatrixHeatmapProps {
  grid: number[][];
  homeCode: string;
  awayCode: string;
  homeName: string;
  awayName: string;
}

interface Cell {
  home: number;
  away: number;
  p: number;
}

export function GoalMatrixHeatmap({
  grid,
  homeCode,
  awayCode,
  homeName,
  awayName,
}: GoalMatrixHeatmapProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const { clipped, cells, total, modalMax, maxRows, maxCols, rowSums, colSums, top3 } = useMemo(() => {
    const clipped = grid.slice(0, 7).map((row) => row.slice(0, 7));
    const maxRows = clipped.length;
    const maxCols = clipped[0]?.length ?? 0;

    const cells: Cell[] = [];
    let total = 0;
    let modalMax = 0;
    for (let h = 0; h < maxRows; h++) {
      for (let a = 0; a < maxCols; a++) {
        const p = clipped[h][a];
        cells.push({ home: h, away: a, p });
        total += p;
        if (p > modalMax) modalMax = p;
      }
    }

    const rowSums = clipped.map((r) => r.reduce((acc, v) => acc + v, 0));
    const colSums = Array.from({ length: maxCols }, (_, j) =>
      clipped.reduce((acc, r) => acc + r[j], 0),
    );

    const flat = cells.slice().sort((x, y) => y.p - x.p);
    const top3 = flat.slice(0, 3);

    return { clipped, cells, total, modalMax, maxRows, maxCols, rowSums, colSums, top3 };
  }, [grid]);

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;
    node.innerHTML = "";

    const plot = Plot.plot({
      width: 520,
      height: 420,
      marginTop: 28,
      marginLeft: 64,
      marginBottom: 48,
      marginRight: 24,
      style: {
        background: "transparent",
        color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        overflow: "visible",
      },
      x: {
        domain: Array.from({ length: maxCols }, (_, i) => i),
        label: `${awayName} goals →`,
        labelAnchor: "center",
        labelOffset: 36,
        tickFormat: (d: number) => String(d),
      },
      y: {
        domain: Array.from({ length: maxRows }, (_, i) => i),
        label: `↑ ${homeName} goals`,
        labelAnchor: "center",
        labelOffset: 48,
        reverse: true,
        tickFormat: (d: number) => String(d),
      },
      color: {
        type: "linear",
        domain: [0, modalMax * 0.25, modalMax * 0.6, modalMax],
        // Prism tokens materialized to sRGB — D3's color interpolator can't
        // resolve CSS custom properties, so we hard-code here and the values
        // stay in lockstep with globals.css by code review.
        range: ["#1C222B", "#4F8FA8", "#C99878", "#8E5A8A"],
        legend: true,
        label: "P(h, a)",
      },
      marks: [
        Plot.cell(cells, {
          x: "away",
          y: "home",
          fill: "p",
          stroke: "#262D37",
          strokeWidth: 0.5,
          inset: 1,
          rx: 2,
          ry: 2,
          title: (d: Cell) =>
            `${homeCode} ${d.home} – ${d.away} ${awayCode}\n${(d.p * 100).toFixed(2)}%`,
        }),
        Plot.text(cells, {
          x: "away",
          y: "home",
          text: (d: Cell) => (d.p < 0.001 ? "·" : (d.p * 100).toFixed(1)),
          fill: (d: Cell) =>
            d.p / modalMax > 0.5
              ? "#0F1216"
              : d.p / modalMax > 0.15
                ? "#EEE8DD"
                : "#A8AFBC",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 500,
        }),
        Plot.cell(
          top3.map((t, rank) => ({ ...t, rank })),
          {
            x: "away",
            y: "home",
            stroke: (d: Cell & { rank: number }) =>
              d.rank === 0
                ? "#F9B88A"
                : d.rank === 1
                  ? "#EC7C6A"
                  : "#8E5A8A",
            strokeWidth: 1.5,
            fill: "none",
            inset: 1,
            rx: 2,
            ry: 2,
          },
        ),
      ],
    });

    // Plot's default stylesheet paints the figure white — force transparent so
    // the warm-slate canvas shows through without a neutral patch.
    plot.style.background = "transparent";
    plot.style.color = "var(--text-tertiary)";
    plot.style.margin = "0";
    const swatches = plot.querySelectorAll("[class*='plot-'][class*='-swatches']");
    swatches.forEach((s) => {
      (s as HTMLElement).style.background = "transparent";
      (s as HTMLElement).style.color = "var(--text-tertiary)";
    });

    node.appendChild(plot);
    return () => {
      plot.remove();
    };
  }, [cells, homeCode, awayCode, homeName, awayName, maxCols, maxRows, modalMax, top3]);

  const topInk = ["var(--prism-peach)", "var(--prism-coral)", "var(--prism-plum)"];

  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  for (let h = 0; h < maxRows; h++) {
    for (let a = 0; a < maxCols; a++) {
      const v = clipped[h][a];
      if (h > a) pHome += v;
      else if (h === a) pDraw += v;
      else pAway += v;
    }
  }

  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: 20,
      }}
      aria-label={`Goal matrix heatmap, ${homeName} versus ${awayName}`}
    >
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3
            className="text-[13px] font-medium"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
          >
            Goal matrix · correct score
          </h3>
          <div
            className="mono text-[11px] mt-[3px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            bivariate Poisson (DC-corrected) · joint P(h, a) · Σ = {total.toFixed(3)}
          </div>
        </div>
        <div
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          {homeCode} (rows) × {awayCode} (cols)
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 220px" }}>
        <div ref={ref} role="img" aria-label="Goal matrix density heatmap" />

        <aside
          className="flex flex-col gap-5"
          style={{
            borderLeft: "1px solid var(--border-subtle)",
            paddingLeft: 20,
          }}
        >
          <div>
            <div
              className="mono text-[10px] uppercase tracking-[.08em] mb-2"
              style={{ color: "var(--text-quiet)" }}
            >
              Modal scorelines
            </div>
            {top3.map((s, i) => (
              <div
                key={`${s.home}-${s.away}`}
                className="flex items-center gap-2.5 py-2"
                style={{
                  borderBottom:
                    i < 2 ? "1px solid var(--border-subtle)" : "none",
                }}
              >
                <span
                  className="mono inline-flex items-center justify-center"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    background: `color-mix(in oklch, ${topInk[i]} 30%, var(--bg-panel-elev))`,
                    border: `1.5px solid ${topInk[i]}`,
                    fontSize: 9,
                    fontWeight: 600,
                    color: topInk[i],
                  }}
                >
                  #{i + 1}
                </span>
                <span
                  className="mono text-[14px]"
                  style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
                >
                  {s.home}−{s.away}
                </span>
                <span className="flex-1" />
                <span
                  className="mono text-[12px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {(s.p * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          <div>
            <div
              className="mono text-[10px] uppercase tracking-[.08em] mb-2"
              style={{ color: "var(--text-quiet)" }}
            >
              Triangle · 1X2 from matrix
            </div>
            <TriRow label={`${homeCode} win`} value={pHome} />
            <TriRow label="Draw" value={pDraw} />
            <TriRow label={`${awayCode} win`} value={pAway} />
          </div>

          <div>
            <div
              className="mono text-[10px] uppercase tracking-[.08em] mb-2"
              style={{ color: "var(--text-quiet)" }}
            >
              Row / column sums
            </div>
            <div className="mono text-[11px] leading-5" style={{ color: "var(--text-tertiary)" }}>
              Σ rows: {rowSums.map((s) => (s * 100).toFixed(1)).join(", ")}
            </div>
            <div className="mono text-[11px] leading-5" style={{ color: "var(--text-tertiary)" }}>
              Σ cols: {colSums.map((s) => (s * 100).toFixed(1)).join(", ")}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TriRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex items-center gap-2.5 py-1.5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <span
        className="mono text-[11px] flex-1"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      <span
        className="mono text-[12px]"
        style={{ color: "var(--text-primary)" }}
      >
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}
