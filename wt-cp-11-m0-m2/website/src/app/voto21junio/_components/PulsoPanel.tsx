"use client";

/**
 * §5 Pulso Patrio detail panel (Session 01). The composite index as a hero
 * number with its overnight delta, plus the five input signals that compose
 * it. Reacts live to the Tweaks bar. The dedicated Pulso backend + page are
 * Sessions 04 / 06; here the five inputs are demo fixtures.
 */

import { PULSO_INPUTS } from "../_lib/demo-data";
import { derived } from "../_lib/voto-runtime";
import { useCountUp } from "./useCountUp";
import { useVotoTweaks } from "./VotoTweaksProvider";

export function PulsoPanel() {
  const { pCepeda, pulso } = useVotoTweaks();
  const d = derived(pCepeda, pulso);
  const big = useCountUp(d.pulso, { decimals: 0 });
  const dlt = d.pulsoDelta;

  return (
    <div className="card card-pad">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="stat-lbl">Índice compuesto</span>
        <span className="mono" style={{ fontSize: 12 }}>
          {dlt === 0 ? (
            <span style={{ color: "var(--ink-4)" }}>±0 desde anoche</span>
          ) : dlt > 0 ? (
            <span className="delta-up">▲ +{dlt} desde anoche</span>
          ) : (
            <span className="delta-dn">▼ −{Math.abs(dlt)} desde anoche</span>
          )}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 }}>
        <span className="mono" style={{ fontSize: 52, fontWeight: 600, color: "var(--ink)", lineHeight: 0.9 }}>
          {big}
        </span>
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-4)" }}>
          / 100
        </span>
      </div>
      <div className="pulso-inputs">
        {PULSO_INPUTS.map((i) => (
          <div className="pulso-input" key={i.nm}>
            <span className="nm">{i.nm}</span>
            <span className="v">{i.v}</span>
            <div className="track">
              <i style={{ width: `${i.v}%` }} />
            </div>
          </div>
        ))}
      </div>
      <a className="lnk" href="/voto21junio#metodo" style={{ display: "inline-block", marginTop: 16, fontSize: 13 }}>
        Cómo se calcula <span className="arr">→</span>
      </a>
    </div>
  );
}
