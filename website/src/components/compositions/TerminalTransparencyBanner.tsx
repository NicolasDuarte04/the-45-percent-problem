"use client";

import { useEffect, useState } from "react";

// In-memory, per-page-load dismissal flag.
//
// NOTE (spec resolution): the brief asked for sessionStorage, but it also
// requires the banner to be "always visible on first page-load" and to
// "return on hard refresh / new tab". sessionStorage survives a hard refresh
// within the same tab, which contradicts both. A module-level flag instead
// persists only across in-session *client-side* navigation (the SPA keeps this
// module loaded) and resets on every full document load — i.e. it reappears on
// hard refresh and in any new tab, and never persists across sessions. That is
// exactly the requested behavior; the storage mechanism differs by necessity.
let dismissedThisLoad = false;

// Main-branch URL of the gap doc surfaced in the Stage 1 diagnosis.
const READINESS_DOC_URL =
  "https://github.com/NicolasDuarte04/the-45-percent-problem/blob/main/PINNACLE_INGESTION_READINESS.md";

/**
 * Transparency banner for the Divergence Terminal. Discloses that the
 * `q (mercado)` column currently shows synthetic, Elo-derived odds (not live
 * Pinnacle lines) pending real ingestion (cp-14). Disclosure, not failure:
 * `role="note"`, peach accent, info glyph — never an error/alert treatment.
 */
export function TerminalTransparencyBanner() {
  // Start visible so the prerendered (force-static) HTML carries the banner and
  // it shows before hydration. dismissedThisLoad is always false at module init
  // on a fresh load, so SSR and first client render match. The effect only
  // hides it on an in-session re-visit after the user dismissed it earlier.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (dismissedThisLoad) setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="shrink-0 px-4 md:px-6 py-2.5 border-b"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--prism-peach) 9%, var(--bg-panel))",
        borderColor:
          "color-mix(in srgb, var(--prism-peach) 30%, var(--border-subtle))",
      }}
      role="note"
      aria-label="Transparencia metodológica"
    >
      <div className="max-w-[1152px] mx-auto px-0 md:px-12 flex items-start gap-2.5">
        <InfoGlyph />
        <p
          className="flex-1 text-[11.5px] leading-[1.5]"
          style={{ color: "var(--text-secondary)", margin: 0 }}
        >
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            Transparencia metodológica.
          </span>{" "}
          La columna <span className="mono">q (mercado)</span> actualmente muestra
          valores sintéticos derivados del modelo Elo, generados pre-torneo. NO son
          cuotas en vivo de Pinnacle. La ingestión de cuotas reales está pendiente y
          se documentará como <span className="italic">deviation</span> en OSF cuando
          se habilite. Mientras tanto, esta vista funciona como exposición de la
          metodología pre-registrada, no como señal activa de divergencia entre modelo
          y mercado.{" "}
          <a
            href={READINESS_DOC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors duration-[120ms]"
            style={{ color: "var(--accent-focus)" }}
          >
            Documentación de la brecha&nbsp;→
          </a>
        </p>
        <button
          type="button"
          onClick={() => {
            dismissedThisLoad = true;
            setVisible(false);
          }}
          aria-label="Descartar aviso de transparencia"
          className="shrink-0 -mr-1 px-1.5 leading-none transition-colors duration-[120ms]"
          style={{ color: "var(--text-tertiary)", fontSize: "16px" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function InfoGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 mt-[2px]"
      style={{ color: "var(--prism-peach)" }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1.25" fill="currentColor" />
    </svg>
  );
}
