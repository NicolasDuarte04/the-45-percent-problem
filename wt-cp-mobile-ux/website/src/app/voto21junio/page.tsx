/**
 * El Voto del 21 de Junio — home (Session 01).
 *
 * Ports the prototype's voto-home with the plain-Spanish copy revision and the
 * free-product rule applied (the old §7 "El Círculo" paywall is replaced with
 * a free brief + free Guía). Sections beyond the prompt's §1-§3 (the §4 mapa
 * callout, §5 Pulso panel, §6 toolkit, §7 free, §8 founders link) are ported
 * from the prototype, which is the spec.
 */

import { daysUntil } from "./_lib/voto-runtime";
import { TopBar } from "./_components/TopBar";
import { VotoFooter } from "./_components/VotoFooter";
import { HeroCountdown } from "./_components/HeroCountdown";
import { ProbabilidadCard } from "./_components/ProbabilidadCard";
import { OrientationBlock } from "./_components/OrientationBlock";
import { SectionHeader } from "./_components/SectionHeader";
import { TarjetaPreview } from "./_components/TarjetaPreview";
import { PulsoPanel } from "./_components/PulsoPanel";
import { DotPattern } from "./_components/DotPattern";
import { BriefSignup } from "./_components/BriefSignup";

export default function VotoHome() {
  const days = daysUntil();

  return (
    <>
      <TopBar variant="home" />
      <main>
        {/* §1 · the hook lands cold */}
        <HeroCountdown days={days}>
          <ProbabilidadCard />
        </HeroCountdown>

        {/* §2 · qué es esto */}
        <OrientationBlock />

        {/* §3 · La Tarjeta del Día */}
        <section className="section wrap home-tarjeta">
          <SectionHeader
            n="3"
            label="El activo de la campaña"
            title="La Tarjeta del Día"
            sub="Una imagen al día, hecha sola a las 07:00 de la mañana. La cifra del día, lista para mandar por WhatsApp. Hecha para reenviar, no para clicar."
          />
          <div className="tarjeta-wrap">
            <TarjetaPreview ratio="1:1" days={days} />
            <div className="tarjeta-row">
              <a className="btn btn-accent" href="/voto21junio/tarjeta">
                Compartir <span className="arr">→</span>
              </a>
              <a className="btn btn-ghost" href="/voto21junio/tarjeta">
                Ver formatos
              </a>
            </div>
          </div>
        </section>

        <hr className="rule wrap" style={{ border: 0 }} />

        {/* §4 · Mapa callout */}
        <section className="section wrap home-mapa">
          <div className="card card-pad">
            <SectionHeader n="4" label="Función destacada" />
            <div className="maparow" style={{ marginTop: 14 }}>
              <div>
                <h2 className="mapa-callout-h">El Mapa del Voto Decisivo</h2>
                <p className="sub" style={{ marginTop: 8 }}>
                  Cuatro cifras sobre <strong>tu propio municipio</strong>: cuántos votos lo inclinan,
                  y cuánto del margen nacional puede mover.
                </p>
              </div>
              <DotPattern className="campo-mini" cols={7} rows={9} live={0.3} gap={11} r={2.6} seed={3} />
            </div>
            <a className="btn btn-ink" style={{ marginTop: 18 }} href="/voto21junio/mapa">
              Ver el mapa de mi municipio <span className="arr">→</span>
            </a>
          </div>
        </section>

        {/* §5 · Pulso Patrio */}
        <section className="section wrap home-pulso">
          <SectionHeader
            n="5"
            label="El índice"
            title="Pulso Patrio"
            sub="Un índice de movilización 0-100 compuesto por cinco señales, recalculado cada minuto."
          />
          <PulsoPanel />
        </section>

        {/* §6 · Mobilization toolkit */}
        <section className="section wrap">
          <SectionHeader n="6" label="Caja de herramientas" title="Para movilizar, no para alarmar" />
          <div className="toolkit">
            <a className="card tk" href="/voto21junio#metodo">
              <span className="gl">¶</span>
              <div>
                <h3>Habla con tu tío</h3>
                <p>Guía de conversación: datos, no insultos.</p>
              </div>
              <span className="arr">→</span>
            </a>
            <a className="card tk" href="/voto21junio/mapa">
              <span className="gl">±</span>
              <div>
                <h3>
                  Tu voto <span className="subraya">vale más</span>
                </h3>
                <p>Cuánto pesa tu voto en tu municipio.</p>
              </div>
              <span className="arr">→</span>
            </a>
            <a className="card tk" href="/voto21junio/tarjeta">
              <span className="gl">↗</span>
              <div>
                <h3>Comparte la cifra</h3>
                <p>La Tarjeta del Día, lista para WhatsApp.</p>
              </div>
              <span className="arr">→</span>
            </a>
          </div>
        </section>

        {/* §7 · Free brief + Guía (paywall removed; the product never gates content) */}
        <section className="section wrap">
          <SectionHeader n="7" label="Gratis, de principio a fin" />
          <div className="duo">
            <div className="card card-pad offer">
              <span className="pill">El brief diario</span>
              <h3>Una cifra cada mañana, en tu correo</h3>
              <p>La cifra del día, su intervalo y el método detrás. Sin costo, sin ruido.</p>
              <BriefSignup />
            </div>
            <div className="card card-pad offer">
              <span className="pill" style={{ background: "var(--panel)", color: "var(--ink-3)" }}>
                Guía · PDF
              </span>
              <h3>Guía del 21 de Junio</h3>
              <p>Cómo leer las probabilidades, qué hacer con tu municipio, y el método sin tecnicismos.</p>
              <a className="btn btn-ghost" href="/voto21junio#metodo" style={{ marginTop: 14 }}>
                Descargar la guía
              </a>
            </div>
          </div>
        </section>

        {/* §8 · Position + method → founders' note */}
        <section className="section wrap home-about" id="metodo">
          <div className="card card-pad">
            <SectionHeader n="8" label="Posición y método" />
            <p className="about-note" style={{ marginTop: 14 }}>
              Somos honestos sobre dónde estamos parados, y aún más rigurosos con la matemática. Esa
              declaración vive en una sola página; el resto del producto son números.
              <br />
              <br />
              <a className="lnk" href="/voto21junio/quienes-somos">
                Leer la nota de los fundadores <span className="arr">→</span>
              </a>
            </p>
          </div>
        </section>
      </main>
      <VotoFooter days={days} />
    </>
  );
}
