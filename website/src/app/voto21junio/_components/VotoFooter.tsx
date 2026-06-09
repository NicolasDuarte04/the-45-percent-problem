/**
 * Voto footer (Session 01 → wired in Session 08). Brand line + open-method
 * declaration + the real snapshot stamp (date · poll count · preliminar). Server
 * component, so it reads the snapshot directly. The stamp is a secondary mark;
 * the per-section preliminary marks carry the honesty load. No paid CTAs anywhere.
 */

import { getVotoData } from "../_lib/snapshot-source";

export function VotoFooter({ days }: { days: number }) {
  const { stamp } = getVotoData();
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
          Código abierto ·{" "}
          <a href="https://github.com/NicolasDuarte04/el-voto-del-21-de-junio" target="_blank" rel="noopener noreferrer">
            github.com/NicolasDuarte04/el-voto-del-21-de-junio
          </a>{" "}
          · <a href="/voto21junio/metodologia">método</a>
        </p>
        <p className="mono" style={{ marginTop: 14, color: "var(--ink-4)" }}>
          {stamp} · día {days}
        </p>
      </div>
    </footer>
  );
}
