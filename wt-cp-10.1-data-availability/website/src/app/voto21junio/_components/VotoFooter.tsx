/**
 * Voto footer (Session 01). Brand line + open-method declaration + demo
 * snapshot stamp. The figures are labeled "datos de ejemplo" per the honesty
 * rule. No paid CTAs anywhere.
 */

import { SNAPSHOT_STAMP } from "../_lib/demo-data";

export function VotoFooter({ days }: { days: number }) {
  return (
    <footer className="foot">
      <div className="wrap">
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 19, color: "var(--ink)", marginBottom: 14 }}>
          El Voto del 21 de Junio
        </div>
        <p className="mono">
          Publicación cívica de <a href="/45analytics">45 Analytics</a> · Bogotá.
          <br />
          Probabilidad bajo incertidumbre. No predecimos; calibramos. Publicamos la matemática.
          <br />
          Código abierto · <a href="https://github.com/45analytics/voto-21-junio">github.com/45analytics/voto-21-junio</a> ·
          método: <a href="/voto21junio#metodo">45analytics.com/voto21junio</a>
        </p>
        <p className="mono" style={{ marginTop: 14, color: "var(--ink-4)" }}>
          {SNAPSHOT_STAMP} · día {days}
        </p>
      </div>
    </footer>
  );
}
