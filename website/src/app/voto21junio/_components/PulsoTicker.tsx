"use client";

/**
 * Pulso Patrio ticker (Session 01 → wired in Session 08) — persistent top bar.
 *
 * A sticky strip that rotates five values on mobile (all-in-a-row on desktop via
 * CSS), pulses "fresh", supports swipe, and opens a detail drawer on tap. Clean
 * numeric content only — no sparkline. The candidate rows read "Cepeda 46.4%" /
 * "Espriella 53.6%": probability, not a prediction; the verb "gana" is never used.
 *
 * Figures are real (from useVotoData), gated by data_sufficiency. The dev Tweaks
 * bar can override pCepeda / pulso for preview.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useVotoData } from "./VotoDataProvider";
import { useVotoTweaks } from "./VotoTweaksProvider";

type TickerKey = "pulso" | "cepeda" | "espriella" | "encuestas" | "update";

const ROTATE_MS = 3400;
const FRESH_MS = 15_000;
const COUNT = 5;

export function PulsoTicker() {
  const { model, pulso, encuestasCount } = useVotoData();
  const { pCepeda: pcOver, pulso: plOver } = useVotoTweaks();
  const pC = pcOver ?? model.pCepeda;
  const pE = pcOver != null ? Math.round((100 - pcOver) * 10) / 10 : model.pEspriella;
  const pulsoIndex = plOver ?? pulso.index;

  const [idx, setIdx] = useState(0);
  const [fresh, setFresh] = useState(false);
  const [openKey, setOpenKey] = useState<TickerKey | null>(null);
  const touchX = useRef<number | null>(null);

  const reduce =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Mobile auto-rotate.
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % COUNT), ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  // "Fresh data" pulse — steady cadence, skipped under reduced motion.
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      setFresh(true);
      const off = setTimeout(() => setFresh(false), 4000);
      return () => clearTimeout(off);
    }, FRESH_MS);
    return () => clearInterval(t);
  }, [reduce]);

  const prelimNote = model.sufficiency !== "ok" ? " Cifra preliminar." : "";
  const DETAIL: Record<TickerKey, readonly [string, string]> = {
    pulso: [
      "Pulso Patrio",
      `Índice compuesto de movilización (0-100), ${pulso.inputsLive} de ${pulso.inputsTotal} señales en vivo. Mide cuánto se habla, no quién va adelante.`,
    ],
    cepeda: [
      "Cepeda",
      `Probabilidad de que Iván Cepeda gane la segunda vuelta, según el modelo abierto.${prelimNote}`,
    ],
    espriella: [
      "Espriella",
      "Probabilidad de que Abelardo de la Espriella gane la segunda vuelta. Es el complemento de la cifra de Cepeda.",
    ],
    encuestas: [
      "Encuestas integradas",
      `${encuestasCount} encuestas públicas ponderadas por casa encuestadora, tamaño y antigüedad.`,
    ],
    update: [
      "Última actualización",
      "El Pulso se recalcula con cada nuevo registro. El destello indica que acaban de llegar datos frescos.",
    ],
  };

  const items: ReadonlyArray<{ key: TickerKey; lbl: string; val: string; delta?: string; dCls?: string }> = [
    {
      key: "pulso",
      lbl: "Pulso",
      val: String(pulsoIndex),
      ...(pulso.delta != null
        ? {
            delta: pulso.delta === 0 ? "±0" : pulso.delta > 0 ? `▲ +${pulso.delta}` : `▼ −${Math.abs(pulso.delta)}`,
            dCls: pulso.delta > 0 ? "delta-up" : pulso.delta < 0 ? "delta-dn" : "",
          }
        : {}),
    },
    { key: "cepeda", lbl: "Cepeda", val: `${pC.toFixed(1)}%` },
    { key: "espriella", lbl: "Espriella", val: `${pE.toFixed(1)}%` },
    { key: "encuestas", lbl: "Encuestas", val: String(encuestasCount) },
    { key: "update", lbl: "Actualizado", val: fresh ? "ahora" : "hoy" },
  ];

  const select = useCallback((key: TickerKey) => {
    setOpenKey((k) => (k === key ? null : key));
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 30) setIdx((i) => (i + (dx < 0 ? 1 : COUNT - 1)) % COUNT);
    touchX.current = null;
  };

  const drawerValue: Record<TickerKey, string> = {
    pulso: String(pulsoIndex),
    cepeda: `${pC.toFixed(1)}%`,
    espriella: `${pE.toFixed(1)}%`,
    encuestas: String(encuestasCount),
    update: "hoy",
  };

  return (
    <>
      <div
        className="ticker ticker-live"
        aria-label="Pulso Patrio · índice de movilización en vivo"
      >
        <div className="ticker-brand">
          <span className="ticker-pulse-dot" />
          <span>Pulso&nbsp;Patrio</span>
        </div>
        <div className="ticker-viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="ticker-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                className="ticker-item"
                onClick={() => select(it.key)}
                aria-label={`${it.lbl}: ${it.val}`}
              >
                <span className="lbl">{it.lbl}</span>
                <span className={`val${fresh ? " fresh" : ""}`}>{it.val}</span>
                {it.delta ? <span className={`delta ${it.dCls}`}>{it.delta}</span> : null}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={`ticker-drawer${openKey ? " open" : ""}`}>
        <div className="ticker-drawer-inner">
          {openKey ? (
            <>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                <span className="sec">Pulso</span> · {DETAIL[openKey][0]}
              </div>
              <div
                className="mono"
                style={{ fontSize: 40, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}
              >
                {drawerValue[openKey]}
              </div>
              <p style={{ fontSize: 13.5, color: "var(--ink-3)", marginTop: 12, maxWidth: "40ch" }}>
                {DETAIL[openKey][1]}
              </p>
              <a className="lnk" href="/voto21junio#metodo" style={{ display: "inline-block", marginTop: 14, fontSize: 13 }}>
                Ver detalle del Pulso →
              </a>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
