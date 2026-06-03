/**
 * La Tarjeta del Día showcase (Session 01). The daily share card in its three
 * aspect ratios (square / horizontal / vertical) plus the WhatsApp-thumbnail
 * legibility test. Auto-generation is Session 07; this is the showcase.
 */

import type { Metadata } from "next";
import { TopBar } from "../_components/TopBar";
import { TarjetaPreview } from "../_components/TarjetaPreview";
import { TarjetaActions } from "../_components/TarjetaActions";
import { daysUntil } from "../_lib/voto-runtime";

export const metadata: Metadata = {
  title: "La Tarjeta del Día · El Voto del 21 de Junio",
};

export default function TarjetaPage() {
  const days = daysUntil();

  return (
    <>
      <TopBar variant="inner" />
      <main className="wrap voto-tarjeta">
        <section className="section" style={{ paddingTop: 18 }}>
          <div className="eyebrow">
            <span className="sec">§ 2</span> · El activo de la campaña
          </div>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, marginTop: 14, maxWidth: "15ch" }}>
            La Tarjeta del Día
          </h1>
          <p className="sub" style={{ fontSize: 15, color: "var(--ink-3)", marginTop: 12, maxWidth: "42ch", lineHeight: 1.55 }}>
            Una imagen al día, hecha sola a las 07:00 de la mañana. La cifra del día, lista para mandar
            por WhatsApp. Hecha para reenviar, no para clicar.
          </p>
        </section>

        {/* 1:1 */}
        <section className="fmt">
          <div className="fmt-hd">
            <div className="nm">
              Cuadrada<span>Instagram · WhatsApp · feed</span>
            </div>
            <div className="dim">1080 × 1080</div>
          </div>
          <div className="fmt-stage">
            <div className="stage-sq">
              <TarjetaPreview ratio="1:1" days={days} />
            </div>
          </div>
          <TarjetaActions />
        </section>

        {/* 1.91:1 */}
        <section className="fmt">
          <div className="fmt-hd">
            <div className="nm">
              Horizontal<span>X · vista previa de enlace · Open Graph</span>
            </div>
            <div className="dim">1200 × 630</div>
          </div>
          <div className="fmt-stage">
            <div className="stage-wide">
              <TarjetaPreview ratio="1.91:1" days={days} />
            </div>
          </div>
        </section>

        {/* 9:16 */}
        <section className="fmt">
          <div className="fmt-hd">
            <div className="nm">
              Vertical<span>Stories · TikTok · estados</span>
            </div>
            <div className="dim">1080 × 1920</div>
          </div>
          <div className="fmt-stage">
            <div className="stage-story">
              <TarjetaPreview ratio="9:16" days={days} />
            </div>
          </div>
        </section>

        {/* WhatsApp thumbnail safety test */}
        <section className="thumbtest">
          <div className="lbl">Prueba: miniatura de WhatsApp (~100 px)</div>
          <div className="thumbs">
            <figure style={{ margin: 0 }}>
              <div className="t1">
                <TarjetaPreview ratio="1:1" days={days} />
              </div>
              <figcaption>1:1</figcaption>
            </figure>
            <figure style={{ margin: 0 }}>
              <div className="tw">
                <TarjetaPreview ratio="1.91:1" days={days} />
              </div>
              <figcaption>1.91:1</figcaption>
            </figure>
            <figure style={{ margin: 0 }}>
              <div className="ts">
                <TarjetaPreview ratio="9:16" days={days} />
              </div>
              <figcaption>9:16</figcaption>
            </figure>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--ink-4)", marginTop: 18, lineHeight: 1.55 }}>
            El número de días y la marca siguen legibles al tamaño de miniatura: la jerarquía aguanta
            la reducción.
          </p>
        </section>
      </main>
    </>
  );
}
