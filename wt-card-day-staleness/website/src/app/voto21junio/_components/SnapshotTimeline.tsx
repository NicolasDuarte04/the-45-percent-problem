/**
 * SnapshotTimeline (Session 18) — the campaign trajectory of the model number,
 * built from the REAL archived daily snapshots (the-21j-problem/data/snapshots/
 * 21j/snapshot_*.json). It plots P(Cepeda) across the campaign next to the 50%
 * tie line, then a dashed segment for the electoral-silence freeze.
 *
 * The honest story this surfaces: the model entered and stayed near 46/54 the
 * whole window (it never moved off a near-tie), then froze for electoral silence
 * a week before the vote. No interpolation or invented points: only the dates
 * that have a real snapshot are drawn; the freeze is shown as frozen, not as new
 * data. Server component (pure render of the timeline slice).
 */

import type { TimelinePoint } from "../_lib/voto-data";

const co = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

/** Short es-CO label "4 jun" from an ISO date. */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" })
    .replace(".", "");
}

export function SnapshotTimeline({ timeline }: { timeline: readonly TimelinePoint[] }) {
  if (timeline.length === 0) {
    return (
      <div className="card card-pad">
        <p>
          El archivo de snapshots diarios es la línea de tiempo del modelo. En esta vista no hay
          snapshots para mostrar.
        </p>
      </div>
    );
  }

  // Geometry. y maps P(Cepeda) onto a zoomed band [35, 65] so the near-tie and
  // its (lack of) movement are legible; the 50% tie line is the anchor.
  const W = 620;
  const H = 200;
  const padL = 20;
  const padR = 116; // room for the frozen-segment label
  const padT = 22;
  const padB = 34;
  const yLo = 35;
  const yHi = 65;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = timeline.length;
  const x = (i: number) => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (p: number) => {
    const clamped = Math.max(yLo, Math.min(yHi, p));
    return padT + innerH * (1 - (clamped - yLo) / (yHi - yLo));
  };
  const tieY = y(50);

  const pts = timeline.map((t, i) => ({ ...t, cx: x(i), cy: y(t.pCepeda) }));
  const last = pts[pts.length - 1];
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`).join(" ");
  // The frozen extension runs from the last real snapshot to the right edge.
  const frozenX2 = padL + innerW + 70;

  const flat = pts.every((p) => Math.abs(p.pCepeda - pts[0].pCepeda) < 0.05);

  return (
    <div className="card card-pad">
      <svg
        className="vt-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Trayectoria de la probabilidad de Cepeda a lo largo de la campaña, cerca del ${co(
          pts[0].pCepeda,
          0,
        )} por ciento, luego congelada por la ley de silencio`}
      >
        {/* tie reference */}
        <line x1={padL} y1={tieY} x2={padL + innerW + 70} y2={tieY} className="vt-tie" />
        <text x={padL} y={tieY - 6} className="vt-tie-lbl">
          50 · empate
        </text>

        {/* real trajectory */}
        <path d={linePath} className="vt-line" fill="none" />
        {/* frozen extension to the silence boundary */}
        <line
          x1={last.cx}
          y1={last.cy}
          x2={frozenX2}
          y2={last.cy}
          className="vt-frozen"
        />
        <text x={frozenX2 - 2} y={last.cy - 8} className="vt-frozen-lbl" textAnchor="end">
          congelado · ley de silencio
        </text>

        {/* points + date labels */}
        {pts.map((p) => (
          <g key={p.date}>
            <circle cx={p.cx} cy={p.cy} r={4.2} className="vt-dot" />
            <text x={p.cx} y={H - 14} className="vt-x-lbl" textAnchor="middle">
              {shortDate(p.date)}
            </text>
            <text x={p.cx} y={p.cy - 11} className="vt-val" textAnchor="middle">
              {co(p.pCepeda, 0)}
            </text>
          </g>
        ))}
      </svg>

      <p className="vt-caption">
        {flat
          ? `La probabilidad de Cepeda se mantuvo cerca del ${co(pts[0].pCepeda, 0)}% durante todo el periodo con snapshots: el modelo no se movió de una práctica paridad. `
          : `La probabilidad de Cepeda se movió entre ${co(
              Math.min(...pts.map((p) => p.pCepeda)),
              0,
            )}% y ${co(Math.max(...pts.map((p) => p.pCepeda)), 0)}% en el periodo con snapshots. `}
        El {shortDate(last.date)} fue el último corte publicable; a partir del 14 de junio la ley de
        silencio congeló la cifra hasta después de la votación. Cada punto es un snapshot real
        archivado, no una interpolación.
      </p>
    </div>
  );
}
