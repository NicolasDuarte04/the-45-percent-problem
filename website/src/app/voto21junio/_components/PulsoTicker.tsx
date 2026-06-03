"use client";

/**
 * Pulso Patrio ticker (Session 01) — persistent top bar on /voto21junio*.
 *
 * Ports the prototype's mountTicker engine: a sticky strip that rotates five
 * values on mobile (all-in-a-row on desktop via CSS), pulses "fresh" every
 * ~15s, supports swipe, and opens a detail drawer on tap. Clean numeric
 * content only — no sparkline. Per the copy revision the candidate rows read
 * "Cepeda 48.0%" / "Espriella 52.0%" (the verb "gana" is dropped — probability,
 * not prediction). Reacts live to the Tweaks bar via the shared context.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ENCUESTAS_COUNT } from "../_lib/demo-data";
import { derived } from "../_lib/voto-runtime";
import { useVotoTweaks } from "./VotoTweaksProvider";

type TickerKey = "pulso" | "cepeda" | "espriella" | "encuestas" | "update";

const DETAIL: Record<TickerKey, readonly [string, string]> = {
  pulso: [
    "Pulso Patrio",
    "Índice compuesto de movilización (0-100). Sube cuando crece el interés, el registro y la intención declarada de votar.",
  ],
  cepeda: [
    "Cepeda",
    "Probabilidad de que Iván Cepeda gane la segunda vuelta, según el modelo abierto. Cifra de ejemplo.",
  ],
  espriella: [
    "Espriella",
    "Probabilidad de que Abelardo de la Espriella gane la segunda vuelta. Es el complemento de la cifra de Cepeda.",
  ],
  encuestas: [
    "Encuestas integradas",
    "41 encuestas públicas ponderadas por casa encuestadora, tamaño y antigüedad.",
  ],
  update: [
    "Última actualización",
    "El Pulso se recalcula cada minuto. El destello indica que acaban de llegar datos frescos.",
  ],
};

const ROTATE_MS = 3400;
const FRESH_MS = 15_000;
const COUNT = 5;

export function PulsoTicker() {
  const { pCepeda, pulso } = useVotoTweaks();
  const d = derived(pCepeda, pulso);
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

  const dlt = d.pulsoDelta;
  const dStr = dlt === 0 ? "±0" : dlt > 0 ? `▲ +${dlt}` : `▼ −${Math.abs(dlt)}`;
  const dCls = dlt > 0 ? "delta-up" : dlt < 0 ? "delta-dn" : "";

  const items: ReadonlyArray<{ key: TickerKey; lbl: string; val: string; delta?: string; dCls?: string }> = [
    { key: "pulso", lbl: "Pulso", val: String(d.pulso), delta: dStr, dCls },
    { key: "cepeda", lbl: "Cepeda", val: `${d.pC.toFixed(1)}%` },
    { key: "espriella", lbl: "Espriella", val: `${d.pE.toFixed(1)}%` },
    { key: "encuestas", lbl: "Encuestas", val: String(ENCUESTAS_COUNT) },
    { key: "update", lbl: "Actualizado", val: fresh ? "ahora" : "hace 1 min" },
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
    pulso: String(d.pulso),
    cepeda: `${d.pC.toFixed(1)}%`,
    espriella: `${d.pE.toFixed(1)}%`,
    encuestas: String(ENCUESTAS_COUNT),
    update: "hace 1 min",
  };

  return (
    <>
      <div
        className="ticker ticker-live"
        aria-label="Pulso Patrio — índice de movilización en vivo"
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
