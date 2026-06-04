/**
 * Mapa share card (Session 01). The personalized "cuánto mueves tú" card,
 * rendered inline (image generation is Session 05). Copy is the plain-Spanish
 * share-card revision; no em dashes. Pure/presentational.
 */

import { fmt, campoSvg } from "../_lib/voto-runtime";
import type { Municipio } from "../_lib/demo-data";

/** Stable seed from the municipio name so the motif is deterministic. */
function seedFor(name: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return (h >>> 0) % 50;
}

export function MapaShareCard({ muni }: { muni: Municipio }) {
  return (
    <div className="mc">
      <div
        className="mc-campo"
        aria-hidden="true"
        dangerouslySetInnerHTML={{
          __html: campoSvg({ cols: 22, rows: 14, live: 0.12, gap: 12, r: 2.1, seed: seedFor(muni.name) }),
        }}
      />
      <div className="mc-in">
        <div className="mc-top">
          <div className="mc-brand">
            El Voto <b>·</b> 45 Analytics
          </div>
          <div className="mc-muni">{muni.name}</div>
        </div>
        <div className="mc-body">
          <div className="mc-k">Tú, en {muni.name}, mueves</div>
          <div className="mc-big">
            {muni.share.toFixed(1)}
            <small>%</small>
          </div>
          <div className="mc-cap">
            del margen nacional. Con {fmt(muni.flip)} votos más, {muni.name} gira. Tú puedes ser uno.
          </div>
        </div>
        <div className="mc-foot">
          <span>El Voto del 21 de Junio</span>
          <span>
            método: <b>45analytics.com</b>
          </span>
        </div>
      </div>
    </div>
  );
}
