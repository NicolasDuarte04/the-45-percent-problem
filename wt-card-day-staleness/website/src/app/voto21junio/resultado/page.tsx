/**
 * Resultado (Session 18) — the post-election research and accountability page.
 *
 * This is where the forecast becomes a research artifact. It shows, honestly:
 *   1. the locked final pre-electoral forecast (the last model number),
 *   2. how the number moved (or did not) across the campaign, from the archived
 *      daily snapshots,
 *   3. the model next to the prediction market, framed as a divergence,
 *   4. the official result, gated on real certified data (PENDING in PR-A), and
 *   5. the calibration post-mortem, also gated (PENDING in PR-A).
 *
 * Hard rules honoured here: no result value is pre-filled; the result and the
 * post-mortem render as pending until a real, certified result file exists. No
 * em or en dashes rendered; no affirmative gana/apuesta/favorito/pronostico
 * framing; candidates named, never described. Server component (reads the
 * snapshot bundle directly).
 */

import type { Metadata } from "next";
import { CEPEDA, ESPRIELLA } from "../_lib/demo-data";
import { getVotoData } from "../_lib/snapshot-source";
import { daysUntil } from "../_lib/voto-runtime";
import { TopBar } from "../_components/TopBar";
import { SectionHeader } from "../_components/SectionHeader";
import { VotoFooter } from "../_components/VotoFooter";
import { SnapshotTimeline } from "../_components/SnapshotTimeline";
import { ModelVsMarket } from "../_components/ModelVsMarket";

export const metadata: Metadata = {
  title: "Resultado y reconciliación · El Voto del 21 de Junio",
  description:
    "La cifra final del modelo antes de la votación, su trayectoria, el modelo frente al mercado, y, " +
    "con datos certificados, el resultado oficial y la autocrítica de calibración.",
};

const REPO_URL = "https://github.com/NicolasDuarte04/el-voto-del-21-de-junio";
const co = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
const coSigned = (n: number, d = 1) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${co(Math.abs(n), d)}`;
const r0 = (n: number) => Math.round(n);
const last = (name: string) => name.split(" ").slice(-1).join(" ");

export default function ResultadoPage() {
  const { model, market, timeline, result } = getVotoData();
  const days = daysUntil();
  const real = !model.isFallback;
  const crossesTie = model.marginLoPp < 0 && model.marginHiPp > 0;

  return (
    <>
      <TopBar variant="inner" />
      <main className="wrap metodo">
        {/* Intro */}
        <section className="section" style={{ paddingTop: 18 }}>
          <SectionHeader
            n=""
            label="Cuentas claras"
            title="Resultado y reconciliación"
            sub="El modelo no se borra después de la votación: se rinde cuentas. Aquí está la última cifra antes del voto, cómo se movió, el modelo frente al mercado, y, con datos certificados, el resultado y la autocrítica."
          />
        </section>

        {/* 1 · Cifra final pre-electoral */}
        <section className="section">
          <SectionHeader n="" label="La última cifra" title="Cifra final pre-electoral" />
          <div className="card card-pad">
            {real ? (
              <>
                <p>
                  Esta es la última cifra que publicó el modelo antes de la votación, congelada por la
                  ley de silencio electoral. Corte del {model.snapshotDate}, con {model.nPolls} encuestas.
                  No se actualizó después.
                </p>
                <div className="res-grid">
                  <div className="res-cell">
                    <span className="stat-lbl">Probabilidad de ganar</span>
                    <span className="stat-val">
                      {last(CEPEDA.name)} {r0(model.pCepeda)}% · {last(ESPRIELLA.name)}{" "}
                      {r0(model.pEspriella)}%
                    </span>
                  </div>
                  <div className="res-cell">
                    <span className="stat-lbl">Cuota de dos vías (Cepeda), intervalo 80%</span>
                    <span className="stat-val">
                      {co(model.shareCepedaLoPct)}% a {co(model.shareCepedaHiPct)}%
                    </span>
                  </div>
                  <div className="res-cell">
                    <span className="stat-lbl">Margen nacional, intervalo 80%</span>
                    <span className="stat-val">
                      {coSigned(model.marginLoPp)} a {coSigned(model.marginHiPp)} pp
                      {crossesTie ? " · cruza el empate" : ""}
                    </span>
                  </div>
                  <div className="res-cell">
                    <span className="stat-lbl">Estado declarado por el modelo</span>
                    <span className="stat-val">
                      {model.sufficiency === "ok" ? "Estable" : "Preliminar, muy parejo"}
                    </span>
                  </div>
                </div>
                <p className="res-honest">
                  El modelo se marcó a sí mismo como preliminar: el ganador cambia de un lado a otro
                  según supuestos defendibles, así que no anunció una cifra firme. Margen positivo es
                  ventaja de {ESPRIELLA.name}. La cuota de dos vías quedó casi en mitad y mitad.
                </p>
              </>
            ) : (
              <p>
                En esta vista las cifras son datos de ejemplo. En producción la página lee el snapshot
                real congelado del modelo.
              </p>
            )}
          </div>
        </section>

        {/* 2 · Cómo se movió (timeline) */}
        <section className="section">
          <SectionHeader
            n=""
            label="La trayectoria"
            title="Cómo se movió la cifra"
            sub="Cada punto es un snapshot diario real archivado. La línea de tiempo se preserva como registro de investigación."
          />
          <SnapshotTimeline timeline={timeline} />
        </section>

        {/* 3 · Modelo frente a mercado */}
        <section className="section">
          <SectionHeader
            n=""
            label="Dos cifras, una comparación"
            title="El modelo frente al mercado"
            sub="El número del modelo junto al precio del mercado especulativo, como divergencia. El mercado no es una encuesta ni una predicción del modelo."
          />
          <ModelVsMarket model={model} market={market} />
        </section>

        {/* 4 · Resultado oficial — gated on real certified data */}
        <section className="section">
          <SectionHeader n="" label="La cuenta oficial" title="El resultado oficial" />
          {result && result.available ? (
            <div className="card card-pad">
              <p className="res-honest">
                {result.certified
                  ? "Resultado certificado"
                  : result.provisional
                    ? "Resultado provisional (boletín, no certificado)"
                    : "Resultado"}
                {result.source ? ` · fuente: ${result.source}` : ""}
                {result.asOf ? ` · corte ${result.asOf}` : ""}.
              </p>
              <div className="res-grid">
                <div className="res-cell">
                  <span className="stat-lbl">{CEPEDA.name}</span>
                  <span className="stat-val">{co(result.cepedaPct ?? 0)}%</span>
                </div>
                <div className="res-cell">
                  <span className="stat-lbl">{ESPRIELLA.name}</span>
                  <span className="stat-val">{co(result.espriellaPct ?? 0)}%</span>
                </div>
              </div>
              {result.cepedaPct != null && result.espriellaPct != null ? (
                <ResultVsModel
                  cepedaPct={result.cepedaPct}
                  espriellaPct={result.espriellaPct}
                  marginLoPp={model.marginLoPp}
                  marginHiPp={model.marginHiPp}
                />
              ) : null}
              {result.sourceUrl ? (
                <p className="mono" style={{ marginTop: 12 }}>
                  <a className="lnk" href={result.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Ver la fuente oficial <span className="arr">→</span>
                  </a>
                </p>
              ) : null}
            </div>
          ) : (
            <div className="card card-pad res-pending">
              <span className="prelim-chip">Pendiente de certificación</span>
              <p style={{ marginTop: 12 }}>
                El resultado oficial de la Registraduría se publica aquí en cuanto esté certificado.
                Hasta entonces no se muestra ninguna cifra de resultado, ni boletines provisionales sin
                etiquetar. Solo datos reales, con su fuente y su fecha.
              </p>
            </div>
          )}
        </section>

        {/* 5 · Calibración (post-mortem) — gated on real certified data */}
        <section className="section">
          <SectionHeader n="" label="Qué acertó y qué no" title="Autocrítica de calibración" />
          <div className="card card-pad res-pending">
            <span className="prelim-chip">Pendiente del resultado</span>
            <p style={{ marginTop: 12 }}>
              El análisis posterior se publica con el resultado certificado: dónde el modelo se quedó
              corto y por qué, dicho sin rodeos. El modelo dijo que estaba muy parejo, así que no se va
              a atribuir después una cifra que no dio. Si erró o se quedó corto frente al mercado, lo
              dirá esta sección, con el mecanismo.
            </p>
          </div>
        </section>

        {/* 6 · Permanente: metodología, código, archivo */}
        <section className="section">
          <SectionHeader n="" label="Para verificar" title="Metodología, código y archivo" />
          <div className="card card-pad metodo-repo">
            <p>
              La metodología, el código y el archivo de snapshots quedan publicados de forma permanente
              como registro citable. No le pedimos que nos crea: cualquiera puede leer el modelo y
              correr el mismo número.
            </p>
            <p className="mono metodo-repo-paths">
              model/aggregate_polls.py · model/simulate_runoff.py · config.yaml ·
              data/snapshots/21j/
            </p>
            <div className="tarjeta-row" style={{ marginTop: 14 }}>
              <a className="btn btn-ghost" href="/voto21junio/metodologia">
                Leer la metodología
              </a>
              <a className="btn btn-accent" href={REPO_URL} target="_blank" rel="noopener noreferrer">
                Ver el código en GitHub <span className="arr">→</span>
              </a>
            </div>
          </div>
        </section>
      </main>
      <VotoFooter days={days} />
    </>
  );
}

/**
 * Factual result-versus-model line: states plainly whether the model's 80%
 * margin interval contained the certified result. No spin, no favouring a side.
 * margin sign convention: positive = De la Espriella lead (percentage points).
 */
function ResultVsModel({
  cepedaPct,
  espriellaPct,
  marginLoPp,
  marginHiPp,
}: {
  cepedaPct: number;
  espriellaPct: number;
  marginLoPp: number;
  marginHiPp: number;
}) {
  const realMargin = espriellaPct - cepedaPct; // + = Espriella lead
  const contained = realMargin >= marginLoPp && realMargin <= marginHiPp;
  return (
    <p className="res-honest" style={{ marginTop: 14 }}>
      Margen real: {coSigned(realMargin)} pp (positivo, ventaja de {ESPRIELLA.name}). El intervalo del
      80% del modelo iba de {coSigned(marginLoPp)} a {coSigned(marginHiPp)} pp, así que{" "}
      {contained ? "sí contuvo el resultado." : "no contuvo el resultado."}
    </p>
  );
}
