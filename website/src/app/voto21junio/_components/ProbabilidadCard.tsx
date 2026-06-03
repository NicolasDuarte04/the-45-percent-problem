"use client";

/**
 * §1 "Probabilidad del día" card (Session 01). The two-candidate split with
 * count-up percentages that react to the Tweaks bar. Names only, equal visual
 * weight, never a candidate color (peach / plum from the non-partisan prism).
 * The disclaimer carries the real first-round anchor and labels the figures as
 * a model's probabilities, not a prediction.
 */

import { NATIONAL_R1, CEPEDA, ESPRIELLA } from "../_lib/demo-data";
import { derived } from "../_lib/voto-runtime";
import { useCountUp } from "./useCountUp";
import { useVotoTweaks } from "./VotoTweaksProvider";

/** es-CO decimal comma. */
const co = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

export function ProbabilidadCard() {
  const { pCepeda, pulso } = useVotoTweaks();
  const d = derived(pCepeda, pulso);
  const pA = useCountUp(d.pC, { decimals: 1 });
  const pB = useCountUp(d.pE, { decimals: 1 });

  return (
    <div className="card card-pad prob-card">
      <div className="prob-head">
        <span className="ttl">Probabilidad del día · ganar la 2ª vuelta</span>
        <span className="stamp mono">07:00 COT</span>
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
        <div className="psplit-a" style={{ flex: d.pC }} />
        <div className="psplit-b" style={{ flex: d.pE }} />
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
      <p className="disclaim">
        Publicación cívica e investigativa. Las cifras son probabilidades de un modelo abierto, no
        pronósticos ni recomendaciones.{" "}
        <strong style={{ color: "var(--ink-3)", fontWeight: 600 }}>Primera vuelta (real):</strong>{" "}
        {ESPRIELLA.name.split(" ").slice(-1)} {co(NATIONAL_R1.espriella)}%&nbsp;· {CEPEDA.name.split(" ").slice(-1)}{" "}
        {co(NATIONAL_R1.cepeda)}%&nbsp;· otros {co(NATIONAL_R1.otros)}%. Intervalo y código en{" "}
        <a className="lnk" href="/voto21junio#metodo">
          Metodología
        </a>
        .
      </p>
    </div>
  );
}
