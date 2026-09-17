"use client";

/**
 * El Voto del 21 de Junio — tweak access + canvas wrapper (Session 01).
 *
 * Reads the five live tweaks from votoTweaksStore via useSyncExternalStore (no
 * setState-in-effect), and renders the single [data-canvas="voto"] wrapper
 * whose data-theme / data-accent drive the scoped stylesheet. Light is the
 * default on first paint; a returning visitor's dark choice is applied after
 * hydration.
 */

import { useSyncExternalStore, type ReactNode } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  setTweak as storeSetTweak,
  subscribe,
  type VotoTweaks,
} from "./votoTweaksStore";

export type { Accent, Theme, VotoTweaks } from "./votoTweaksStore";

interface VotoTweaksValue extends VotoTweaks {
  setTweak: typeof storeSetTweak;
}

export function useVotoTweaks(): VotoTweaksValue {
  const tweaks = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...tweaks, setTweak: storeSetTweak };
}

export function VotoTweaksProvider({ children }: { children: ReactNode }) {
  const { theme, accent } = useVotoTweaks();
  return (
    <div
      lang="es"
      data-canvas="voto"
      data-theme={theme}
      data-accent={accent}
      className="voto-root"
      style={{ minHeight: "100vh" }}
    >
      {children}
    </div>
  );
}
