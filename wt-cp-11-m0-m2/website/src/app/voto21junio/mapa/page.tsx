/**
 * Mapa del Voto Decisivo (Session 01).
 *
 * Three-step narrative + inline share card for the selected municipio. The
 * municipio typeahead / search and share-card image generation are Session 05,
 * so this renders the resolved-result view directly (default Bogotá, switchable
 * via the Tweaks bar) with the figures labeled as demo data.
 */

import type { Metadata } from "next";
import { TopBar } from "../_components/TopBar";
import { SectionHeader } from "../_components/SectionHeader";
import { MapaResult } from "../_components/MapaResult";

export const metadata: Metadata = {
  title: "Mapa del Voto Decisivo · El Voto del 21 de Junio",
};

export default function MapaPage() {
  return (
    <>
      <TopBar variant="inner" />
      <main className="wrap">
        <section className="section" style={{ paddingTop: 18 }}>
          <SectionHeader n="3" label="Mapa del Voto Decisivo" />
          <div className="lede-h" style={{ marginTop: 14 }}>
            <h1>
              ¿Cuánto mueves <em>tú</em>?
            </h1>
            <p className="sub">
              Cuánto pesas en la segunda vuelta, empezando por cuánto del margen nacional está en tus
              manos. La búsqueda por municipio llega pronto; por ahora mostramos datos de ejemplo.
            </p>
          </div>
          <MapaResult />
        </section>
      </main>
    </>
  );
}
