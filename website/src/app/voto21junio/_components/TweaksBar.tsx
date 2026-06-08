"use client";

/**
 * Tweaks bar (Session 01) — the prototype's five-tweak live panel.
 *
 * Preserves all five tweaks from the prototype: accent (Petróleo / Terracota),
 * dark mode, P(Cepeda), Pulso Patrio, and municipio. Every screen reacts live
 * via the shared VotoTweaksProvider context.
 *
 * GATED so normal visitors never see it: renders only in development, or when
 * the URL carries ?tweaks=1 (the flag is remembered for the session so it
 * survives client navigation). This is the dev-only affordance the session
 * prompt asks for.
 */

import { useState, useSyncExternalStore } from "react";
import { useVotoData } from "./VotoDataProvider";
import { useVotoTweaks } from "./VotoTweaksProvider";

const MUNICIPIOS = ["Bogotá", "Medellín", "Envigado", "Quibdó", "San Andrés"] as const;

const noopSubscribe = () => () => {};

/** Dev always; in production only when ?tweaks=1 has been seen this session. */
function computeEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tweaks") === "1") sessionStorage.setItem("voto_tweaks_panel", "1");
    return sessionStorage.getItem("voto_tweaks_panel") === "1";
  } catch {
    return false;
  }
}

function useTweaksEnabled(): boolean {
  // useSyncExternalStore avoids a setState-in-effect and starts disabled on the
  // server (getServerSnapshot), so SSR never renders the dev panel.
  return useSyncExternalStore(noopSubscribe, computeEnabled, () => false);
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

export function TweaksBar() {
  const enabled = useTweaksEnabled();
  const [open, setOpen] = useState(true);
  const t = useVotoTweaks();
  const { model, pulso } = useVotoData();
  // The overrides are null until the dev drags a slider; the slider then sits on
  // the real snapshot baseline.
  const pCepeda = t.pCepeda ?? model.pCepeda;
  const pulsoVal = t.pulso ?? pulso.index;

  if (!enabled) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 14,
        bottom: 14,
        zIndex: 100,
        width: open ? 248 : "auto",
        background: "var(--panel-elev)",
        border: "1px solid var(--rule-strong)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-lift)",
        padding: open ? 16 : "8px 12px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...labelStyle,
          background: "none",
          border: 0,
          cursor: "pointer",
          padding: 0,
          minHeight: 28,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--accent-ink)",
        }}
        aria-expanded={open}
      >
        Tweaks {open ? "▾" : "▸"}
      </button>

      {open ? (
        <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
          {/* Accent */}
          <div>
            <div style={labelStyle}>Acento</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {(["petroleo", "terracota"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => t.setTweak("accent", a)}
                  style={{
                    flex: 1,
                    minHeight: 36,
                    fontSize: 12,
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${t.accent === a ? "var(--accent)" : "var(--rule-strong)"}`,
                    background: t.accent === a ? "var(--accent-soft)" : "transparent",
                    color: t.accent === a ? "var(--accent-ink)" : "var(--ink-3)",
                  }}
                >
                  {a === "petroleo" ? "Petróleo" : "Terracota"}
                </button>
              ))}
            </div>
          </div>

          {/* Dark mode */}
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 36, cursor: "pointer" }}>
            <span style={labelStyle}>Modo oscuro</span>
            <input
              type="checkbox"
              checked={t.theme === "dark"}
              onChange={(e) => t.setTweak("theme", e.target.checked ? "dark" : "light")}
            />
          </label>

          {/* P(Cepeda) */}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>P(Cepeda) · {pCepeda.toFixed(1)}%</span>
            <input
              type="range"
              min={40}
              max={55}
              step={0.5}
              value={pCepeda}
              onChange={(e) => t.setTweak("pCepeda", Number(e.target.value))}
            />
          </label>

          {/* Pulso */}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>Pulso Patrio · {pulsoVal}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={pulsoVal}
              onChange={(e) => t.setTweak("pulso", Number(e.target.value))}
            />
          </label>

          {/* Municipio */}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>Municipio</span>
            <select
              value={t.municipio}
              onChange={(e) => t.setTweak("municipio", e.target.value)}
              style={{ minHeight: 36, fontSize: 13, fontFamily: "var(--font-sans)", borderRadius: "var(--radius-sm)", border: "1px solid var(--rule-strong)", background: "var(--panel-elev)", color: "var(--ink)", padding: "0 8px" }}
            >
              {MUNICIPIOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
