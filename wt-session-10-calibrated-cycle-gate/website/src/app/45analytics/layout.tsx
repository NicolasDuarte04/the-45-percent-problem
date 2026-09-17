/**
 * 45 Analytics parent umbrella — layout (Session 01).
 *
 * Mounted at /45analytics for PR1 (additive, so the live WC homepage at / is
 * untouched). PR2 relocates The 45% Problem to /the-45-percent-problem and
 * moves this page to /. Reuses the voto canvas for tokens, but has no Pulso
 * ticker (the ticker belongs to El Voto, not the umbrella). The dev-only
 * Tweaks bar is included so accent / theme can be exercised in review.
 */

import type { Metadata, Viewport } from "next";
import "../voto21junio/voto.css";
import "./parent.css";
import { VotoTweaksProvider } from "../voto21junio/_components/VotoTweaksProvider";
import { TweaksBar } from "../voto21junio/_components/TweaksBar";

export const metadata: Metadata = {
  title: "45 Analytics · Probabilidad bajo incertidumbre",
  description:
    "Laboratorio de investigación en Bogotá. Modelos probabilísticos para eventos que el público " +
    "necesita entender bajo incertidumbre. No predecimos, calibramos, y publicamos la matemática.",
};

export const viewport: Viewport = {
  themeColor: "#F7F4EC",
  viewportFit: "cover",
};

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <VotoTweaksProvider>
      {children}
      <TweaksBar />
    </VotoTweaksProvider>
  );
}
