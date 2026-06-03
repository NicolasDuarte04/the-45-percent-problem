/**
 * Mapa del Voto Decisivo — three-step narrative (Session 01).
 *
 * Ports the prototype's arc: a national statistic resolved into a chain of
 * small real conversations (DÓNDE ESTÁS / QUÉ HARÍA FALTA / QUÉ PUEDES HACER).
 * Copy is the plain-Spanish revision; the papel-quemado underline stays on
 * "alcanza". Pure/presentational — takes a resolved municipio.
 */

import { fmt, groupsFor } from "../_lib/voto-runtime";
import type { Municipio } from "../_lib/demo-data";

export function MapaPanel({ muni }: { muni: Municipio }) {
  const groups = groupsFor(muni);
  const cepedaLeads = muni.r1[0] > muni.r1[1];

  return (
    <ol className="arc">
      <li className="step">
        <span className="step-n">01</span>
        <div className="step-c">
          <div className="step-lbl">Dónde estás</div>
          <p className="step-body">
            En {muni.name}, <b className="step-fig">{fmt(muni.abst)}</b> personas que pueden votar no
            fueron en la primera vuelta. Tú eres una de ellas.
          </p>
        </div>
      </li>
      <li className="step">
        <span className="step-n">02</span>
        <div className="step-c">
          <div className="step-lbl">Qué haría falta</div>
          <p className="step-body">
            {cepedaLeads ? (
              <>
                Con <b className="step-fig">{fmt(muni.flip)}</b> votos más en la segunda vuelta,{" "}
                {muni.name} gira hacia Espriella.
              </>
            ) : (
              <>
                {muni.name} ya se inclina a Espriella; <b className="step-fig">{fmt(muni.flip)}</b>{" "}
                votos más amplían el margen.
              </>
            )}
          </p>
        </div>
      </li>
      <li className="step step-key">
        <span className="step-n">03</span>
        <div className="step-c">
          <div className="step-lbl">Qué puedes hacer tú</div>
          <p className="step-body">
            Habla con <b>4 personas</b> que no votaron. En {muni.name} hay{" "}
            <b className="step-fig">{fmt(groups)}</b> grupos como el tuyo.{" "}
            Si la mitad lo hace, <span className="subraya">alcanza</span>.
          </p>
        </div>
      </li>
    </ol>
  );
}
