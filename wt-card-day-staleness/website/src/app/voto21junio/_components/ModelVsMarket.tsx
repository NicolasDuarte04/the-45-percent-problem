/**
 * ModelVsMarket (Session 18) — the model number next to the prediction-market
 * number, framed as a divergence. The model is a win-probability from public
 * polls + Monte Carlo; the market is an implied price from a SPECULATIVE market
 * (Polymarket), sourced and dated, that never feeds the model.
 *
 * The market figure is read from a SOURCED file (model_vs_market.json) with
 * provenance, never guessed. If no sourced figure exists, this says so rather
 * than inventing one. Server component (pure render of model + market slices).
 *
 * Honesty load: both columns are implied probabilities of the same event, so
 * they are comparable. The divergence is the point — the model left the race a
 * near-tie; the market priced one side heavily. Neither column is presented as
 * the truth, and the market carries its speculative-market label.
 */

import { CEPEDA, ESPRIELLA } from "../_lib/demo-data";
import type { MarketData, ModelData } from "../_lib/voto-data";

const r0 = (n: number) => Math.round(n);

export function ModelVsMarket({ model, market }: { model: ModelData; market: MarketData }) {
  const mC = r0(model.pCepeda);
  const mE = r0(model.pEspriella);

  if (!market.available) {
    return (
      <div className="card card-pad">
        <p>
          No se pudo registrar una cifra de mercado con fuente verificable para esta segunda vuelta,
          así que no se muestra ninguna. El número del modelo (probabilidad de ganar:{" "}
          {CEPEDA.name.split(" ").slice(-1)} {mC}% · {ESPRIELLA.name.split(" ").slice(-1)} {mE}%) se
          mantiene como la única cifra publicada. No se inventa un precio de mercado.
        </p>
      </div>
    );
  }

  const qC = r0(market.cepedaPct);
  const qE = r0(market.espriellaPct);
  const aprox = market.approx ? "aprox. " : "";

  return (
    <div className="card card-pad mvm">
      <table className="mvm-table">
        <thead>
          <tr>
            <th />
            <th>El modelo</th>
            <th>El mercado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">
              <span className="swatch" style={{ background: "var(--peach)" }} /> {CEPEDA.name}
            </th>
            <td className="mono">{mC}%</td>
            <td className="mono">{aprox}{qC}%</td>
          </tr>
          <tr>
            <th scope="row">
              <span className="swatch" style={{ background: "var(--plum)" }} /> {ESPRIELLA.name}
            </th>
            <td className="mono">{mE}%</td>
            <td className="mono">{aprox}{qE}%</td>
          </tr>
        </tbody>
      </table>

      <p className="mvm-frame">
        Las dos columnas son probabilidades implícitas del mismo resultado, así que se pueden comparar.
        El modelo dejó la segunda vuelta en una práctica paridad ({mC} a {mE}); el mercado especulativo
        la valoró muy distinta ({aprox}{qE} a {aprox}{qC}). Esa brecha es el punto: el modelo no
        resolvió hacia un lado; el mercado concentró el precio en uno. Ninguna de las dos es el
        resultado.
      </p>

      <p className="mvm-src mono">
        Mercado: {market.venue} · “{market.marketLabel}” · corte {market.asOf}.{" "}
        <a className="lnk" href={market.sourceUrl} target="_blank" rel="noopener noreferrer">
          fuente
        </a>
        .
      </p>

      {market.trajectory.length > 0 ? (
        <p className="mvm-traj">
          El precio del mercado se movió durante la campaña:{" "}
          {market.trajectory.map((q, i) => (
            <span key={q.date}>
              {i > 0 ? " luego " : ""}
              {ESPRIELLA.name.split(" ").slice(-1)} {r0(q.espriellaPct)}% el {q.date} (
              <a className="lnk" href={q.sourceUrl} target="_blank" rel="noopener noreferrer">
                {q.source}
              </a>
              )
            </span>
          ))}
          .
        </p>
      ) : null}

      <p className="mvm-note">
        Polymarket es un mercado especulativo: el precio refleja el dinero que se mueve sobre el
        resultado, no una encuesta ni el número del modelo, y no alimenta el modelo. Es una
        probabilidad implícita aproximada, no una cifra del modelo ni una recomendación.
      </p>
    </div>
  );
}
