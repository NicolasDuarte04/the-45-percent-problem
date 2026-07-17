"use client";
// rev: interactive-grid-v5
import { Fragment, useMemo, useState } from "react";
import {
  goalMatrixRampColor,
  goalMatrixTextColor,
  RAMP_COLORS as GM_RAMP_COLORS,
  RAMP_STOPS_PCT as GM_RAMP_STOPS_PCT,
} from "@/lib/viz/probabilityRamp";
import { topScorelines } from "@/lib/data/matchListing";

type TriRegion = "home" | "draw" | "away";

interface GoalMatrixHeatmapProps {
  grid: number[][];
  homeCode: string;
  awayCode: string;
  homeName: string;
  awayName: string;
}

type Pos = { h: number; a: number };
type Hover = (Pos & { source: "cell" | "scoreline" }) | null;

function fillForP(p: number, modalMax: number): string {
  if (modalMax <= 0) return goalMatrixRampColor(0);
  return goalMatrixRampColor(p / modalMax);
}

function textColorForP(p: number, modalMax: number): string {
  if (modalMax <= 0) return "#A8AFBC";
  return goalMatrixTextColor(p / modalMax);
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const r = raw / p;
  const nice = r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10;
  return nice * p;
}

function niceTicks(max: number, count = 5): number[] {
  if (max <= 0) return [0];
  const step = niceStep(max / (count - 1));
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  return ticks;
}

export function GoalMatrixHeatmap({
  grid,
  homeCode,
  awayCode,
  homeName,
  awayName,
}: GoalMatrixHeatmapProps) {
  const {
    clipped,
    total,
    modalMax,
    maxRows,
    maxCols,
    rowSums,
    colSums,
    top3,
    top3Rank,
  } = useMemo(() => {
    const clipped = grid.slice(0, 7).map((row) => row.slice(0, 7));
    const maxRows = clipped.length;
    const maxCols = clipped[0]?.length ?? 0;

    let total = 0;
    let modalMax = 0;
    for (let h = 0; h < maxRows; h++) {
      for (let a = 0; a < maxCols; a++) {
        const p = clipped[h][a];
        total += p;
        if (p > modalMax) modalMax = p;
      }
    }

    const rowSums = clipped.map((r) => r.reduce((acc, v) => acc + v, 0));
    const colSums = Array.from({ length: maxCols }, (_, j) =>
      clipped.reduce((acc, r) => acc + r[j], 0),
    );

    // Shared ranking (clip 7x7, row-major, stable desc) so the badges, the
    // modal-scoreline list, and the daily share card never disagree.
    const top3 = topScorelines(grid, 3);
    const top3Rank = new Map<string, number>();
    top3.forEach((c, rank) => top3Rank.set(`${c.home}-${c.away}`, rank));

    return {
      clipped,
      total,
      modalMax,
      maxRows,
      maxCols,
      rowSums,
      colSums,
      top3,
      top3Rank,
    };
  }, [grid]);

  // Top-3 fill colors: each rank inherits the heatmap fill of its cell so the
  // badges and pinned outline read as the same hue as the underlying density.
  const top3Fill = useMemo(
    () => top3.map((c) => fillForP(c.p, modalMax)),
    [top3, modalMax],
  );

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

  // Hover and pinned are independent: a pinned cell keeps its outline while
  // the user hovers other cells. Crosshair tracks hover, falling back to
  // pinned when nothing is hovered.
  const [hover, setHover] = useState<Hover>(null);
  const [pinned, setPinned] = useState<Pos | null>(null);
  // Triangle hover is a separate axis: hovering a 1X2 row dims the cells that
  // don't sum into that outcome. Independent of cell hover/pin so a pinned
  // cell keeps its outline while the user explores the triangle.
  const [triHover, setTriHover] = useState<TriRegion | null>(null);
  const active = hover ?? pinned;

  const togglePinned = (h: number, a: number) =>
    setPinned((prev) => (prev?.h === h && prev?.a === a ? null : { h, a }));

  const ticks = niceTicks(modalMax);
  const tickMax = ticks[ticks.length - 1] || 1;

  const focus = active;
  const focusP = focus ? clipped[focus.h][focus.a] : null;
  const focusIsPinned =
    focus !== null &&
    pinned !== null &&
    pinned.h === focus.h &&
    pinned.a === focus.a;

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
      <style>{styles}</style>

      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3
            className="text-[13px] font-medium"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Goal matrix · correct score
          </h3>
          <div
            className="mono text-[11px] mt-[3px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            bivariate Poisson (DC-corrected) · joint P(h, a) · Σ ={" "}
            {total.toFixed(3)}
          </div>
        </div>
        <div
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          {homeCode} (rows) × {awayCode} (cols)
        </div>
      </div>

      <div className="gm-layout">
        <div>
          <div className="mb-5">
            <div
              className="mono text-[10px] uppercase tracking-[.08em] mb-1.5"
              style={{ color: "var(--text-quiet)" }}
            >
              P(h, a)
            </div>
            <div
              style={{
                width: 240,
                height: 10,
                borderRadius: 2,
                background: `linear-gradient(to right, ${GM_RAMP_COLORS[0]} ${GM_RAMP_STOPS_PCT[0]}%, ${GM_RAMP_COLORS[1]} ${GM_RAMP_STOPS_PCT[1]}%, ${GM_RAMP_COLORS[2]} ${GM_RAMP_STOPS_PCT[2]}%, ${GM_RAMP_COLORS[3]} ${GM_RAMP_STOPS_PCT[3]}%)`,
              }}
            />
            <div
              className="mono text-[10px]"
              style={{
                width: 240,
                marginTop: 4,
                position: "relative",
                height: 14,
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              {ticks.map((t) => (
                <span
                  key={t}
                  style={{
                    position: "absolute",
                    left: `${(t / tickMax) * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {t.toFixed(2)}
                </span>
              ))}
            </div>
          </div>

          <div
            className="gm-wrap"
            role="img"
            aria-label="Goal matrix density heatmap"
          >
            <div className="gm-y-title mono">
              ↑ {homeName} goals{" "}
              <span style={{ color: "var(--text-quiet)" }}>(home)</span>
            </div>
            <div
              className="gm-grid"
              onMouseLeave={() =>
                setHover((prev) => (prev?.source === "cell" ? null : prev))
              }
            >
              <div />
              {Array.from({ length: maxCols }, (_, j) => (
                <div key={`x-${j}`} className="gm-tick gm-tick-x">
                  <span>{j}</span>
                </div>
              ))}
              {Array.from({ length: maxRows }, (_, idx) => {
                const h = maxRows - 1 - idx;
                return (
                  <Fragment key={`row-${h}`}>
                    <div className="gm-tick gm-tick-y">
                      <span>{h}</span>
                    </div>
                    {Array.from({ length: maxCols }, (_, a) => {
                      const p = clipped[h][a];
                      const fill = fillForP(p, modalMax);
                      const text = textColorForP(p, modalMax);
                      const rank = top3Rank.get(`${h}-${a}`);
                      const isHover = hover?.h === h && hover?.a === a;
                      const isPinned = pinned?.h === h && pinned?.a === a;
                      // V2-04 (#4): row/column crosshair hover removed.
                      // Only the cell-level hover (data-hover) and the
                      // pinned-cell outline (data-pinned) drive visual
                      // feedback. Triangle dim/highlight stays.
                      // Triangle region this cell sums into.
                      const triRegion: TriRegion =
                        h > a ? "home" : h === a ? "draw" : "away";
                      const triIn =
                        triHover !== null &&
                        triRegion === triHover &&
                        !isHover &&
                        !isPinned;
                      const triOut =
                        triHover !== null &&
                        triRegion !== triHover &&
                        !isHover &&
                        !isPinned;
                      return (
                        <button
                          type="button"
                          key={`c-${h}-${a}`}
                          className="gm-cell mono"
                          data-hover={isHover ? "" : undefined}
                          data-pinned={isPinned ? "" : undefined}
                          data-tri-in={triIn ? "" : undefined}
                          data-tri-out={triOut ? "" : undefined}
                          data-rank={rank !== undefined ? rank : undefined}
                          style={
                            {
                              background: fill,
                              color: text,
                              "--cell-fill": fill,
                            } as React.CSSProperties
                          }
                          onMouseEnter={() =>
                            setHover({ h, a, source: "cell" })
                          }
                          onFocus={() => setHover({ h, a, source: "cell" })}
                          onBlur={() =>
                            setHover((prev) =>
                              prev?.source === "cell" ? null : prev,
                            )
                          }
                          onClick={() => togglePinned(h, a)}
                          aria-pressed={isPinned}
                          aria-label={`${homeCode} ${h}. ${a} ${awayCode}, ${(p * 100).toFixed(2)}%${rank !== undefined ? `, modal rank ${rank + 1}` : ""}`}
                        >
                          {rank !== undefined ? (
                            <span
                              className="gm-cell-rank mono"
                              aria-hidden="true"
                            >
                              #{rank + 1}
                            </span>
                          ) : null}
                          {p < 0.001 ? "·" : (p * 100).toFixed(1)}
                        </button>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
            <div className="gm-x-title mono">
              {awayName} goals →{" "}
              <span style={{ color: "var(--text-quiet)" }}>(away)</span>
            </div>
          </div>
        </div>

        <aside className="gm-rail flex flex-col gap-5">
          <div>
            <div
              className="mono text-[10px] uppercase tracking-[.08em] mb-2"
              style={{ color: "var(--text-quiet)" }}
            >
              Selected cell
            </div>
            <div
              className="gm-readout"
              data-empty={focus === null || focusP === null ? "" : undefined}
              style={
                {
                  "--cell-fill":
                    focusP !== null ? fillForP(focusP, modalMax) : "transparent",
                } as React.CSSProperties
              }
            >
              <div className="gm-readout-line1">
                <span
                  className="mono text-[12px]"
                  style={{
                    color:
                      focus !== null
                        ? "var(--text-secondary)"
                        : "var(--text-quiet)",
                    letterSpacing: "-0.01em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {focus !== null
                    ? `${homeCode} ${focus.h} − ${focus.a} ${awayCode}`
                    : `${homeCode}. −. ${awayCode}`}
                </span>
                <span
                  className="mono text-[9px] uppercase tracking-[.08em]"
                  style={{
                    color: "var(--text-quiet)",
                    visibility: focusIsPinned ? "visible" : "hidden",
                  }}
                >
                  · pinned
                </span>
              </div>
              <div
                className="mono text-[20px] gm-readout-value"
                style={{
                  color:
                    focus !== null
                      ? "var(--text-primary)"
                      : "var(--text-quiet)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  marginTop: 2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {focusP !== null ? `${(focusP * 100).toFixed(3)}%` : "-.. . . %"}
              </div>
              <div
                className="mono text-[10px] uppercase tracking-[.08em]"
                style={{ color: "var(--text-quiet)", marginTop: 2 }}
              >
                {focus !== null
                  ? `exact · joint P(h=${focus.h}, a=${focus.a})`
                  : "hover or click to inspect"}
              </div>
            </div>
          </div>

          <div>
            <div
              className="mono text-[10px] uppercase tracking-[.08em] mb-2"
              style={{ color: "var(--text-quiet)" }}
            >
              Modal scorelines
            </div>
            <div
              onMouseLeave={() =>
                setHover((prev) =>
                  prev?.source === "scoreline" ? null : prev,
                )
              }
            >
            {top3.map((s, i) => {
              const isHover =
                hover?.h === s.home &&
                hover?.a === s.away &&
                hover?.source === "scoreline";
              const isPinned = pinned?.h === s.home && pinned?.a === s.away;
              const fill = top3Fill[i];
              return (
                <button
                  type="button"
                  key={`${s.home}-${s.away}`}
                  className="gm-scoreline mono"
                  data-hover={isHover ? "" : undefined}
                  data-pinned={isPinned ? "" : undefined}
                  style={
                    {
                      borderBottom:
                        i < 2 ? "1px solid var(--border-subtle)" : "none",
                      "--cell-fill": fill,
                    } as React.CSSProperties
                  }
                  onMouseEnter={() =>
                    setHover({ h: s.home, a: s.away, source: "scoreline" })
                  }
                  onFocus={() =>
                    setHover({ h: s.home, a: s.away, source: "scoreline" })
                  }
                  onBlur={() =>
                    setHover((prev) =>
                      prev?.source === "scoreline" ? null : prev,
                    )
                  }
                  onClick={() => togglePinned(s.home, s.away)}
                  aria-pressed={isPinned}
                  aria-label={`Highlight scoreline ${s.home}-${s.away}, ${(s.p * 100).toFixed(2)} percent${isPinned ? ", pinned" : ""}`}
                >
                  <span
                    className="gm-rank-badge mono"
                    style={
                      {
                        "--cell-fill": fill,
                      } as React.CSSProperties
                    }
                  >
                    #{i + 1}
                  </span>
                  <span
                    className="text-[14px]"
                    style={{
                      color: "var(--text-primary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {s.home}-{s.away}
                  </span>
                  <span className="flex-1" />
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {(s.p * 100).toFixed(2)}%
                  </span>
                </button>
              );
            })}
            </div>
          </div>

          <div>
            <div
              className="mono text-[10px] uppercase tracking-[.08em] mb-2"
              style={{ color: "var(--text-quiet)" }}
            >
              Triangle · 1X2 from matrix
            </div>
            <div onMouseLeave={() => setTriHover(null)}>
              <TriRow
                label={`${homeCode} win`}
                value={pHome}
                region="home"
                active={triHover === "home"}
                onHover={setTriHover}
              />
              <TriRow
                label="Draw"
                value={pDraw}
                region="draw"
                active={triHover === "draw"}
                onHover={setTriHover}
              />
              <TriRow
                label={`${awayCode} win`}
                value={pAway}
                region="away"
                active={triHover === "away"}
                onHover={setTriHover}
              />
            </div>
          </div>

          <div>
            <div
              className="mono text-[10px] uppercase tracking-[.08em] mb-2"
              style={{ color: "var(--text-quiet)" }}
            >
              Row / column sums
            </div>
            <div
              className="mono text-[11px] leading-5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Σ rows: {rowSums.map((s) => (s * 100).toFixed(1)).join(", ")}
            </div>
            <div
              className="mono text-[11px] leading-5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Σ cols: {colSums.map((s) => (s * 100).toFixed(1)).join(", ")}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TriRow({
  label,
  value,
  region,
  active,
  onHover,
}: {
  label: string;
  value: number;
  region: TriRegion;
  active: boolean;
  onHover: (region: TriRegion | null) => void;
}) {
  return (
    <div
      className="gm-tri-row flex items-center gap-2.5 py-1.5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
      data-active={active ? "" : undefined}
      onMouseEnter={() => onHover(region)}
    >
      <span
        className="mono text-[11px] flex-1"
        style={{
          color: active ? "var(--text-primary)" : "var(--text-tertiary)",
          transition: "color 150ms ease",
        }}
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

// All highlight colors derive from each cell's own --cell-fill, so the rank
// badges, pinned outlines, and glow inherit the heatmap palette and stay in
// visual harmony with the underlying density. Brightened variants
// (color-mix toward white in oklch) keep outlines readable when the fill is
// dark.
const styles = `
.gm-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr auto;
  gap: 6px;
  align-items: center;
}
.gm-y-title {
  grid-row: 1;
  grid-column: 1;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  padding-right: 4px;
  letter-spacing: 0.01em;
}
.gm-x-title {
  grid-row: 2;
  grid-column: 2;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-top: 8px;
  letter-spacing: 0.01em;
}
.gm-grid {
  grid-row: 1;
  grid-column: 2;
  display: grid;
  grid-template-columns: 28px repeat(7, minmax(0, 1fr));
  grid-auto-rows: 48px;
  gap: 4px;
}
.gm-tick {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}
.gm-tick-x { height: 22px; }
.gm-tick > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  border-radius: 3px;
  padding: 0 4px;
}
.gm-cell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid #262D37;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  font-family: var(--font-mono);
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 180ms ease,
    filter 150ms ease,
    opacity 150ms ease;
  will-change: transform;
}
.gm-cell[data-tri-in] {
  filter: brightness(1.1);
}
.gm-cell[data-tri-out] {
  opacity: 0.45;
}
.gm-cell:focus-visible {
  outline: 2px solid var(--text-secondary);
  outline-offset: 2px;
  z-index: 4;
}
.gm-cell[data-hover] {
  transform: scale(1.05);
  box-shadow:
    0 0 0 1px var(--cell-fill),
    0 6px 18px -2px color-mix(in oklch, var(--cell-fill) 70%, transparent);
  filter: brightness(1.18);
  z-index: 2;
}
/* V2-03 (B5): selected-cell outline uses --accent-warm so it pops uniformly
   against the heatmap palette rather than tinting with the cell's own fill.
   The amber border reads in a dense 7x7 grid where a fill-derived outline
   could blend with neighbouring cells. */
.gm-cell[data-pinned] {
  outline: 2px solid var(--accent-warm);
  outline-offset: 2px;
  box-shadow:
    0 0 0 1px var(--cell-fill),
    0 0 24px -2px color-mix(in oklch, var(--cell-fill) 75%, transparent);
  filter: brightness(1.1);
  z-index: 3;
}
.gm-cell[data-pinned][data-hover] {
  transform: scale(1.05);
  filter: brightness(1.2);
  box-shadow:
    0 0 0 1px var(--cell-fill),
    0 0 24px -2px color-mix(in oklch, var(--cell-fill) 80%, transparent),
    0 6px 18px -2px color-mix(in oklch, var(--cell-fill) 60%, transparent);
}

.gm-scoreline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  width: 100%;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition: background 150ms ease, box-shadow 150ms ease;
}
.gm-scoreline[data-hover] {
  background: color-mix(in oklch, var(--cell-fill) 14%, transparent);
}
.gm-scoreline[data-pinned] {
  background: color-mix(in oklch, var(--cell-fill) 22%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in oklch, var(--cell-fill) 60%, white 40%);
}
.gm-scoreline:focus-visible {
  outline: 2px solid color-mix(in oklch, var(--cell-fill) 60%, white 40%);
  outline-offset: -2px;
}

.gm-rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  background: color-mix(in oklch, var(--cell-fill) 35%, var(--bg-panel-elev));
  border: 1.5px solid color-mix(in oklch, var(--cell-fill) 70%, white 30%);
  color: color-mix(in oklch, var(--cell-fill) 35%, white 65%);
}

/* V2-03 (B5): in-matrix rank badges for the top-3 modal scorelines. Lets
   the user scan the heatmap and locate the most-likely cells at a glance,
   rather than reading the side panel and visually searching. Fixed
   --accent-warm so the badge pops against any cell fill. */
.gm-cell-rank {
  position: absolute;
  top: 2px;
  right: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 12px;
  padding: 0 3px;
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  color: var(--accent-warm);
  background: color-mix(in oklch, var(--bg-root) 70%, transparent);
  border: 1px solid var(--accent-warm);
  border-radius: 2px;
  pointer-events: none;
}

.gm-readout {
  padding-top: 2px;
  padding-bottom: 4px;
  min-height: 64px;
}
.gm-readout-line1 {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.gm-readout-value {
  transition: color 150ms ease;
}

.gm-tri-row {
  cursor: default;
  transition: background 150ms ease;
}
.gm-tri-row[data-active] {
  background: color-mix(in oklch, var(--text-secondary) 7%, transparent);
}

/* Two-column layout: heatmap (1fr) + fixed 220px readout rail. Moved off the
   inline style so the narrow-viewport stack can be media-queried. The rail's
   left border / padding live here (not inline) so the breakpoint can flip them
   to a top border without !important. Desktop (>720px) is unchanged. */
.gm-layout {
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr 220px;
}
.gm-rail {
  border-left: 1px solid var(--border-subtle);
  padding-left: 20px;
}
/* Below 720px the fixed 220px rail would shear off-screen under the global
   overflow-x:clip and squash the 7x7 grid. Stack the rail beneath the grid so
   it stays fully visible and the grid takes the full card width. */
@media (max-width: 720px) {
  .gm-layout {
    grid-template-columns: 1fr;
  }
  .gm-rail {
    border-left: 0;
    padding-left: 0;
    border-top: 1px solid var(--border-subtle);
    padding-top: 20px;
  }
  /* cp-28: on a phone the 8-column grid squeezes each cell below a legible
     width, and because the page (html/body) is overflow-x:clip a too-wide grid
     would be silently clipped with no way to reach the right-hand columns. Give
     the cells a fixed minimum size and let the grid scroll horizontally inside
     its own container instead: the y-axis title stays pinned while the cells
     pan. The row/column-sum readout in the rail still lists every value, so no
     information depends on the scroll. Desktop (>720px) is untouched.

     The min-width:0 chain is load-bearing: a grid/flex item defaults to
     min-width:auto (its min-content), so without it the max-content grid would
     refuse to shrink and push the whole card past the viewport (clipped, not
     scrolled). Zeroing it on the heatmap column and on gm-wrap lets gm-wrap
     shrink to the available width, at which point overflow-x:auto pans the grid
     rather than the page. */
  .gm-layout > div {
    min-width: 0;
  }
  .gm-wrap {
    min-width: 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .gm-grid {
    grid-template-columns: 24px repeat(7, minmax(40px, 1fr));
    grid-auto-rows: 40px;
    min-width: max-content;
  }
}
`;
