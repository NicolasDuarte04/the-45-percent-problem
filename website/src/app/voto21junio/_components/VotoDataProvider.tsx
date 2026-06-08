"use client";

/**
 * El Voto del 21 de Junio — real-data context (Session 08).
 *
 * The client components on the voto surface (ProbabilidadCard, PulsoPanel,
 * PulsoTicker, TarjetaPreview, MapaResult) cannot read the filesystem. So the
 * server layout reads the snapshots once via `getVotoData()` and seeds this
 * context with the resulting plain-serialisable `VotoData`. The value is
 * identical on the server and the client's first render (it is passed as props),
 * so there is no hydration mismatch.
 *
 * Components read their figures + each source's `data_sufficiency` from here.
 * The dev-only Tweaks bar still overrides pCepeda / pulso via votoTweaksStore;
 * this context supplies the real baseline those overrides sit on top of.
 */

import { createContext, useContext, type ReactNode } from "react";
import { demoVotoData, type VotoData } from "../_lib/voto-data";

const VotoDataContext = createContext<VotoData | null>(null);

export function VotoDataProvider({ data, children }: { data: VotoData; children: ReactNode }) {
  return <VotoDataContext.Provider value={data}>{children}</VotoDataContext.Provider>;
}

/**
 * Read the seeded snapshot bundle. Falls back to the all-demo bundle if a
 * component is somehow rendered outside the provider — fail safe, never crash,
 * and the demo data is self-labelling.
 */
export function useVotoData(): VotoData {
  return useContext(VotoDataContext) ?? demoVotoData();
}
