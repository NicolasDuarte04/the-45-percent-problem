"use client";

/**
 * La Tarjeta del Día (Session 01 → wired in Session 08) — the daily share-card
 * template in any of the three aspect ratios.
 *
 * This is the forwardable WhatsApp artifact: it loses ALL page context when
 * cropped or re-shared, so its honesty marks live INSIDE the card canvas, not in
 * page chrome around it. While the model is preliminary it carries a "Preliminar"
 * watermark and shows the margin interval, never a bare settled point. Figures
 * are real (useVotoData); `days` is computed server-side and passed in so server
 * and client agree. The dev Tweaks bar can override pCepeda / pulso for preview.
 */

import { CEPEDA, ESPRIELLA } from "../_lib/demo-data";
import { isPreliminary } from "../_lib/voto-data";
import { runoffStamp, TARJETA_ASPECT, type TarjetaRatio } from "../_lib/voto-runtime";
import { DotPattern } from "./DotPattern";
import { useVotoData } from "./VotoDataProvider";
import { useVotoTweaks } from "./VotoTweaksProvider";

const coSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(0)}`;

export function TarjetaPreview({ ratio, days }: { ratio: TarjetaRatio; days: number }) {
  const { model, pulso } = useVotoData();
  const { pCepeda: pcOver, pulso: plOver } = useVotoTweaks();
  const pC = pcOver ?? model.pCepeda;
  const pE = pcOver != null ? Math.round((100 - pcOver) * 10) / 10 : model.pEspriella;
  const pulsoIndex = plOver ?? pulso.index;

  const wide = ratio === "1.91:1";
  const heroSize = wide ? "20cqw" : ratio === "9:16" ? "34cqw" : "30cqw";
  const ctxSize = wide ? "4.4cqw" : "5.2cqw";
  const prelim = isPreliminary(model.sufficiency);

  return (
    <div className="tj" data-ratio={ratio} style={{ aspectRatio: TARJETA_ASPECT[ratio] }}>
      <DotPattern className="tj-campo" cols={wide ? 30 : 22} rows={wide ? 10 : 14} live={0.12} gap={12} r={2.1} seed={5} />
      <div className="tj-canvas">
        {prelim ? <div className="tj-prelim">Preliminar</div> : null}
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
              <div className="tj-split-a" style={{ flex: pC }} />
              <div className="tj-split-b" style={{ flex: pE }} />
            </div>
            <div className="tj-split-row">
              <span className="nm">
                <span className="swatch" style={{ background: "var(--peach)" }} />
                {CEPEDA.name.split(" ").slice(-1)} <b>{pC.toFixed(1)}%</b>
              </span>
              <span className="nm">
                {ESPRIELLA.name.split(" ").slice(-1)} <b>{pE.toFixed(1)}%</b>{" "}
                <span className="swatch" style={{ background: "var(--plum)" }} />
              </span>
            </div>
            {prelim ? (
              <div className="tj-range">
                Margen 80%: {coSigned(model.marginLoPp)} a {coSigned(model.marginHiPp)} pp · muy parejo
              </div>
            ) : null}
          </div>
        </div>
        <div className="tj-foot">
          <div className="tj-pulso">
            <div className="pl">Pulso Patrio</div>
            <div className="pv">{pulsoIndex}</div>
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
