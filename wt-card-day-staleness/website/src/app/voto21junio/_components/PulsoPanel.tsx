"use client";

/**
 * §5 Pulso Patrio detail panel (Session 01 → wired in Session 08).
 *
 * The composite index as a hero number plus the five input signals that compose
 * it, read from the real pulso snapshot. Today only 1 of 5 signals is live and
 * the snapshot is "demo" grade, so the panel carries a persistent
 * "preliminar · N de 5 señales" mark, greys the signals that have no reading,
 * and shows no overnight delta (there is only one reading — no honest comparison).
 *
 * The dev Tweaks bar can override the index (preview only).
 */

import { useVotoData } from "./VotoDataProvider";
import { useCountUp } from "./useCountUp";
import { useVotoTweaks } from "./VotoTweaksProvider";

export function PulsoPanel() {
  const { pulso } = useVotoData();
  const { pulso: override } = useVotoTweaks();
  const index = override ?? pulso.index;
  const big = useCountUp(index, { decimals: 0 });
  const prelim = pulso.sufficiency !== "ok";
  const partial = pulso.inputsLive < pulso.inputsTotal;

  return (
    <div className="card card-pad">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="stat-lbl">
          {partial ? `Pulso · ${pulso.inputsLive} de ${pulso.inputsTotal} señales` : "Índice compuesto"}
        </span>
        {pulso.delta == null ? (
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-4)" }}>
            primer registro
          </span>
        ) : (
          <span className="mono" style={{ fontSize: 12 }}>
            {pulso.delta > 0 ? (
              <span className="delta-up">▲ +{pulso.delta} desde anoche</span>
            ) : pulso.delta < 0 ? (
              <span className="delta-dn">▼ −{Math.abs(pulso.delta)} desde anoche</span>
            ) : (
              <span style={{ color: "var(--ink-4)" }}>±0 desde anoche</span>
            )}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <span className="mono" style={{ fontSize: 52, fontWeight: 600, color: "var(--ink)", lineHeight: 0.9 }}>
          {big}
        </span>
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-4)" }}>
          / 100
        </span>
      </div>
      {prelim ? (
        <div className="pulso-prelim">
          <span className="prelim-chip">Preliminar</span>
          <span>
            {pulso.inputsLive} de {pulso.inputsTotal} señales en vivo · mide cuánto se habla, no quién va
            adelante
          </span>
        </div>
      ) : null}
      <div className="pulso-inputs" style={{ marginTop: 14 }}>
        {pulso.signals.map((s) => (
          <div className={`pulso-input${s.available ? "" : " is-off"}`} key={s.nm}>
            <span className="nm">{s.nm}</span>
            {s.available && s.v != null ? (
              <>
                <span className="v">{s.v}</span>
                <div className="track">
                  <i style={{ width: `${s.v}%` }} />
                </div>
              </>
            ) : (
              <>
                <span className="v" style={{ color: "var(--ink-4)" }}>
                  sin señal
                </span>
                <div className="track">
                  <i style={{ width: "0%" }} />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <a className="lnk" href="/voto21junio/metodologia" style={{ display: "inline-block", marginTop: 16, fontSize: 13 }}>
        Cómo se calcula <span className="arr">→</span>
      </a>
    </div>
  );
}
