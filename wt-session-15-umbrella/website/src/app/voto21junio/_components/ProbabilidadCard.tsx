"use client";

/**
 * §1 "Probabilidad del día" card (Session 01 → wired in Session 08).
 *
 * Two-candidate win-probability split with count-up percentages. Names only,
 * equal visual weight, never a candidate color (peach / plum from the
 * non-partisan prism). The figures are real now: they read from the snapshot
 * via useVotoData() and gate on the model's data_sufficiency.
 *
 *  - "thin" (today): the real probabilities AND the margin credible interval,
 *    with a persistent "Preliminar" mark and the plain-Spanish framing that the
 *    race is too close for a firm call. No winner call, no "gana", no "favorito".
 *  - "ok": the same component, headline framing, still with the interval.
 *
 * The dev Tweaks bar can override pCepeda (preview only); the real baseline is
 * the default.
 */

import { NATIONAL_R1, CEPEDA, ESPRIELLA } from "../_lib/demo-data";
import { isPreliminary } from "../_lib/voto-data";
import { useCountUp } from "./useCountUp";
import { useVotoData } from "./VotoDataProvider";
import { useVotoTweaks } from "./VotoTweaksProvider";

/** es-CO decimal comma; keeps an explicit sign for signed values. */
const co = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
const coSigned = (n: number, d = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${co(Math.abs(n), d)}`;

export function ProbabilidadCard() {
  const { model } = useVotoData();
  const { pCepeda: override } = useVotoTweaks();
  const pC = override ?? model.pCepeda;
  const pE = override != null ? Math.round((100 - override) * 10) / 10 : model.pEspriella;
  const pA = useCountUp(pC, { decimals: 1 });
  const pB = useCountUp(pE, { decimals: 1 });

  const prelim = isPreliminary(model.sufficiency);
  const crossesTie = model.marginLoPp < 0 && model.marginHiPp > 0;

  return (
    <div className="card card-pad prob-card">
      <div className="prob-head">
        <span className="ttl">Probabilidad del día · ganar la 2ª vuelta</span>
        {prelim ? <span className="prelim-chip">Preliminar</span> : <span className="stamp mono">07:00 COT</span>}
      </div>
      <div className="psplit-names">
        <span>
          <span className="swatch" style={{ background: "var(--peach)" }} />
          {CEPEDA.name}
        </span>
        <span>
          {ESPRIELLA.name}
          <span className="swatch" style={{ background: "var(--plum)", margin: "0 0 0 6px" }} />
        </span>
      </div>
      <div className="psplit-bar">
        <div className="psplit-a" style={{ flex: pC }} />
        <div className="psplit-b" style={{ flex: pE }} />
      </div>
      <div className="psplit-pcts">
        <span className="p">
          {pA}
          <small>%</small>
        </span>
        <span className="p" style={{ textAlign: "right" }}>
          {pB}
          <small>%</small>
        </span>
      </div>

      {prelim ? (
        <div className="prob-prelim">
          <p className="prob-frame">
            Está muy parejo. Por ahora el modelo no da una cifra firme: el resultado puede inclinarse a
            cualquiera de los dos según los supuestos.
          </p>
          <p className="prob-range mono">
            Margen nacional (intervalo 80%): {coSigned(model.marginLoPp)} a {coSigned(model.marginHiPp)} pp
            {crossesTie ? " · cruza el empate" : ""}
          </p>
        </div>
      ) : null}

      <p className="disclaim">
        Publicación cívica e investigativa. Las cifras son probabilidades de un modelo abierto, no
        pronósticos ni recomendaciones.{" "}
        <strong style={{ color: "var(--ink-3)", fontWeight: 600 }}>Primera vuelta (real):</strong>{" "}
        {ESPRIELLA.name.split(" ").slice(-1)} {co(NATIONAL_R1.espriella)}%&nbsp;· {CEPEDA.name.split(" ").slice(-1)}{" "}
        {co(NATIONAL_R1.cepeda)}%&nbsp;· otros {co(NATIONAL_R1.otros)}%. Intervalo y código en{" "}
        <a className="lnk" href="/voto21junio/metodologia">
          Metodología
        </a>
        .
      </p>
    </div>
  );
}
