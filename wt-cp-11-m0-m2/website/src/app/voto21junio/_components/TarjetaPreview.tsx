"use client";

/**
 * La Tarjeta del Día (Session 01) — the daily share-card template, rendered in
 * any of the three aspect ratios. Ports the prototype's renderTarjeta. Numbers
 * are live (react to the Tweaks bar); `days` is computed server-side and passed
 * in so server and client agree. The Tarjeta auto-generation pipeline is
 * Session 07; this is the on-page preview.
 */

import { CEPEDA, ESPRIELLA } from "../_lib/demo-data";
import { derived, runoffStamp, TARJETA_ASPECT, type TarjetaRatio } from "../_lib/voto-runtime";
import { DotPattern } from "./DotPattern";
import { useVotoTweaks } from "./VotoTweaksProvider";

export function TarjetaPreview({ ratio, days }: { ratio: TarjetaRatio; days: number }) {
  const { pCepeda, pulso } = useVotoTweaks();
  const d = derived(pCepeda, pulso);
  const wide = ratio === "1.91:1";
  const heroSize = wide ? "20cqw" : ratio === "9:16" ? "34cqw" : "30cqw";
  const ctxSize = wide ? "4.4cqw" : "5.2cqw";
  const dlt = d.pulsoDelta;

  return (
    <div className="tj" data-ratio={ratio} style={{ aspectRatio: TARJETA_ASPECT[ratio] }}>
      <DotPattern className="tj-campo" cols={wide ? 30 : 22} rows={wide ? 10 : 14} live={0.12} gap={12} r={2.1} seed={5} />
      <div className="tj-canvas">
        <div className="tj-top">
          <div className="tj-brand">
            El Voto <b>·</b> 45 Analytics
          </div>
          <div className="tj-fecha">{runoffStamp()} · 2026</div>
        </div>
        <div className="tj-body">
          <div className="tj-kicker">Segunda vuelta presidencial</div>
          <div className="tj-hero" style={{ fontSize: heroSize }}>
            {days}
            <span className="unit" style={{ fontSize: ".42em" }}>
              {" "}
              días
            </span>
          </div>
          <div className="tj-ctx" style={{ fontSize: ctxSize }}>
            para que tú decidas la segunda vuelta.
          </div>
          <div className="tj-split">
            <div className="tj-split-bar">
              <div className="tj-split-a" style={{ flex: d.pC }} />
              <div className="tj-split-b" style={{ flex: d.pE }} />
            </div>
            <div className="tj-split-row">
              <span className="nm">
                <span className="swatch" style={{ background: "var(--peach)" }} />
                {CEPEDA.name.split(" ").slice(-1)} <b>{d.pC.toFixed(1)}%</b>
              </span>
              <span className="nm">
                {ESPRIELLA.name.split(" ").slice(-1)} <b>{d.pE.toFixed(1)}%</b>{" "}
                <span className="swatch" style={{ background: "var(--plum)" }} />
              </span>
            </div>
          </div>
        </div>
        <div className="tj-foot">
          <div className="tj-pulso">
            <div className="pl">Pulso Patrio</div>
            <div className="pv">
              {d.pulso}{" "}
              {dlt > 0 ? (
                <span className="up">▲ +{dlt}</span>
              ) : dlt < 0 ? (
                <span className="up" style={{ color: "var(--rose)" }}>
                  ▼ −{Math.abs(dlt)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="tj-method">
            método abierto
            <br />
            <b>45analytics.com</b>
          </div>
        </div>
      </div>
    </div>
  );
}
