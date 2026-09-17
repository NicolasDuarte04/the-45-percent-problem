"use client";

/**
 * Mapa result view (Session 01). Renders the resolved-municipio state of the
 * Mapa: the hero share figure, the three-step narrative, the first-round
 * disclosure, and the inline share card. The municipio comes from the Tweaks
 * bar (default Bogotá); the typeahead / municipio search is Session 05, so
 * there is no search input here yet.
 */

import { useState } from "react";
import { getMuni } from "../_lib/voto-runtime";
import { useCountUp } from "./useCountUp";
import { useVotoData } from "./VotoDataProvider";
import { useVotoTweaks } from "./VotoTweaksProvider";
import { MapaPanel } from "./MapaPanel";
import { MapaShareCard } from "./MapaShareCard";

export function MapaResult() {
  const { mapa } = useVotoData();
  const { municipio } = useVotoTweaks();
  const muni = getMuni(municipio);
  const share = useCountUp(muni.share, { decimals: 1 });
  const [discOpen, setDiscOpen] = useState(false);
  const [shareLabel, setShareLabel] = useState<"idle" | "copied">("idle");
  const [a, b, o] = muni.r1;

  const onShare = async () => {
    const url = `https://45analytics.com/voto21junio/mapa?m=${encodeURIComponent(muni.name)}`;
    const text = `Yo, en ${muni.name}, muevo el ${muni.share}% del margen nacional. ¿Cuánto mueves tú?`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "El Voto del 21 de Junio", text, url });
      } catch {
        /* user dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard?.writeText(url);
      setShareLabel("copied");
      setTimeout(() => setShareLabel("idle"), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="result">
      {/* Session 16: .mapa-main / .mapa-side are display:contents below
          1024px (layout-transparent, mobile unchanged) and become the two
          columns of the desktop grid. */}
      <div className="mapa-main">
      <div className="mapa-prelim">
        <span className="prelim-chip">Preliminar</span>
        <span>
          Estimación por {mapa.granularity}, no por municipio. El reparto por municipio que ves abajo es
          un ejemplo ilustrativo.
        </span>
      </div>
      <div className="muni-head">
        <h2>{muni.name}</h2>
        <span className="dep">{muni.dept}</span>
      </div>

      <div className="hero-num">
        <div className="k">Tú, en {muni.name}, mueves</div>
        <div className="big mono">
          {share}
          <small>%</small>
        </div>
        <div className="cap">del margen nacional. Tú estás dentro de esa cifra.</div>
      </div>

      <MapaPanel muni={muni} />

      <button
        type="button"
        className="disc-toggle"
        aria-expanded={discOpen}
        aria-controls="mapa-disc"
        onClick={() => setDiscOpen((v) => !v)}
      >
        Ver el reparto de la primera vuelta <span className="ar">▾</span>
      </button>
      <div id="mapa-disc" className={`disc${discOpen ? " open" : ""}`}>
        <div className="card nbox" style={{ marginTop: 6 }}>
          <div className="k">Reparto en primera vuelta · {muni.name}</div>
          <div className="r1bar">
            <div className="a" style={{ flex: a }} />
            <div className="b" style={{ flex: b }} />
            <div className="o" style={{ flex: o }} />
          </div>
          <div className="r1leg">
            <span>
              <span className="swatch" style={{ background: "var(--peach)" }} />
              Cepeda <b style={{ color: "var(--ink)" }}>{a}%</b>
            </span>
            <span>
              <span className="swatch" style={{ background: "var(--plum)" }} />
              Espriella <b style={{ color: "var(--ink)" }}>{b}%</b>
            </span>
            <span>
              <span className="swatch" style={{ background: "var(--ink-4)" }} />
              otros <b style={{ color: "var(--ink)" }}>{o}%</b>
            </span>
          </div>
        </div>
      </div>
      </div>

      <aside className="mapa-side">
      <h3 className="mapa-share-h">Tu tarjeta para compartir</h3>
      <MapaShareCard muni={muni} />
      <div className="share-row">
        <button type="button" className="btn btn-accent" onClick={onShare}>
          {shareLabel === "copied" ? (
            "Enlace copiado ✓"
          ) : (
            <>
              Compartir mi cifra <span className="arr">→</span>
            </>
          )}
        </button>
        <button type="button" className="btn btn-ghost" style={{ flex: "0 0 auto", width: "auto", padding: "0 18px" }}>
          Descargar
        </button>
      </div>
      <p className="loop-note">
        Quien lo reciba verá la cifra de su propio municipio. Así crece la cuenta.
      </p>
      </aside>
    </div>
  );
}
