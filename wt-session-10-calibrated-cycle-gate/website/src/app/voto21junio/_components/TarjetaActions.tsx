"use client";

/**
 * Tarjeta share / download actions (Session 01). Share copies the link; PNG
 * export is Session 07, so the download button confirms locally for now. Both
 * are free actions — the product never gates content.
 */

import { useState } from "react";

export function TarjetaActions() {
  const [shareLabel, setShareLabel] = useState<"idle" | "copied">("idle");
  const [pngLabel, setPngLabel] = useState("PNG");

  const onShare = async () => {
    const url = "https://45analytics.com/voto21junio/tarjeta";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "El Voto del 21 de Junio", url });
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard?.writeText(url);
      setShareLabel("copied");
      setTimeout(() => setShareLabel("idle"), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="actions">
      <button type="button" className="btn btn-accent" onClick={onShare}>
        {shareLabel === "copied" ? (
          "Listo ✓"
        ) : (
          <>
            Compartir <span className="arr">→</span>
          </>
        )}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ flex: "0 0 auto", width: "auto", padding: "0 18px" }}
        onClick={() => {
          setPngLabel("Generando…");
          setTimeout(() => setPngLabel("PNG"), 1200);
        }}
      >
        {pngLabel}
      </button>
    </div>
  );
}
