/**
 * El Voto del 21 de Junio — route-group layout (Session 01).
 *
 * Establishes the scoped "voto" canvas (light default, dark via the Tweaks
 * bar), loads the scoped stylesheets, and mounts the two persistent surfaces:
 * the Pulso Patrio ticker (top of every /voto21junio* route) and the dev-only
 * Tweaks bar. The page bodies render their own top bar + footer so each screen
 * keeps the prototype's back/wordmark variants.
 *
 * viewport: theme-color matches the cream canvas and viewport-fit=cover lets
 * the cream extend through env(safe-area-inset-top). The VotoTweaksProvider
 * keeps the theme-color meta in step when dark mode is toggled.
 */

import type { Metadata, Viewport } from "next";
import "./voto.css";
import "./voto-pages.css";
import { VotoTweaksProvider } from "./_components/VotoTweaksProvider";
import { PulsoTicker } from "./_components/PulsoTicker";
import { TweaksBar } from "./_components/TweaksBar";

export const metadata: Metadata = {
  title: "El Voto del 21 de Junio · 45 Analytics",
  description:
    "Movilización cuantificada para la segunda vuelta presidencial del 21 de junio de 2026. " +
    "Probabilidad bajo incertidumbre; no predecimos, calibramos, y publicamos la matemática.",
};

export const viewport: Viewport = {
  themeColor: "#F7F4EC",
  viewportFit: "cover",
};

export default function VotoLayout({ children }: { children: React.ReactNode }) {
  return (
    <VotoTweaksProvider>
      <PulsoTicker />
      {children}
      <TweaksBar />
    </VotoTweaksProvider>
  );
}
