/**
 * 45 Analytics — parent umbrella homepage (Session 01).
 *
 * The §0 laboratory block (plain-Spanish revision), the two-product switcher,
 * and a free daily-brief CTA. Mounted at /45analytics for PR1; the card to The
 * 45% Problem points at "/" (its current home) and gets repointed to
 * /the-45-percent-problem in PR2.
 */

import { PULSO } from "../voto21junio/_lib/demo-data";
import { daysUntil } from "../voto21junio/_lib/voto-runtime";
import { ProductSwitcherCard } from "@/components/voto/ProductSwitcherCard";
import { BriefSignup } from "../voto21junio/_components/BriefSignup";
import { SNAPSHOT_STAMP } from "../voto21junio/_lib/demo-data";

export default function ParentHome() {
  const days = daysUntil();

  return (
    <div className="pshell">
      <header className="pmast">
        <a className="wm" href="/45analytics">
          45<b> </b>Analytics
        </a>
        <nav className="pnav">
          <a href="#productos">Productos</a>
          <a href="#brief">Brief diario</a>
          <span className="tag">Bogotá · CO</span>
        </nav>
      </header>

      {/* §0 · El laboratorio */}
      <section className="phero">
        <div className="eyebrow">
          <span className="sec">§ 0</span> · El laboratorio
        </div>
        <h1>
          Probabilidad bajo <em>incertidumbre</em>.
        </h1>
        <p className="manifesto">
          45 Analytics es un grupo en Bogotá que hace las cuentas sobre eventos grandes que están por
          pasar. Una elección. Una Copa del Mundo. Cosas donde todos opinan pero nadie tiene los
          números. Nosotros los publicamos. No decimos quién gana. Calculamos qué tan probable es cada
          resultado, y mostramos cómo llegamos al número.
        </p>
        <p className="thesis mono">no predecimos · calibramos · publicamos la matemática</p>
      </section>

      {/* § · Dos productos insignia */}
      <section id="productos">
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          <span className="sec">§</span> · Dos productos insignia
        </div>
        <div className="switch">
          <ProductSwitcherCard
            n="1"
            label="Académico"
            status="En vivo"
            titleLead="The"
            titleBold="45%"
            titleTail="Problem"
            desc="La Copa del Mundo, calculada partido por partido. Modelo abierto, revisable, registrado."
            stats={[
              { k: "Brier", v: "0.1842" },
              { k: "Pre-registro", v: "OSF" },
              { k: "Fase", v: "Grupos" },
            ]}
            cta="Entrar"
            href="/"
            cold
            motifSeed={21}
            motifLive={0.22}
          />
          <ProductSwitcherCard
            n="2"
            label="Cívico"
            status="Nuevo · lanza 21 jun"
            titleLead="El Voto del"
            titleBold="21 de Junio"
            desc="La segunda vuelta presidencial, calculada cada mañana. Cuánto vale tu voto, dónde, y por qué."
            stats={[
              { k: "Pulso Patrio", v: String(PULSO) },
              { k: "Faltan", v: `${days} días` },
              { k: "Método", v: "Abierto" },
            ]}
            cta="Entrar"
            href="/voto21junio"
            motifSeed={9}
            motifLive={0.26}
          />
        </div>
      </section>

      {/* § · El brief diario (free) */}
      <section className="card brief" id="brief">
        <div>
          <div className="eyebrow">
            <span className="sec">§ 3</span> · Cada mañana
          </div>
          <h3>El brief diario</h3>
          <p>
            Una cifra, su intervalo y el método detrás, en tu correo a las 07:00 COT. De ambos
            productos, sin ruido y sin costo.
          </p>
        </div>
        <BriefSignup />
      </section>

      <footer className="pfoot">
        <p className="mono">
          45 Analytics · Bogotá, Colombia. Publicación de investigación. Las cifras son estadística
          descriptiva, no consejo de inversión, apuestas ni voto.
          <br />
          Código abierto · <a href="https://github.com/45analytics">github.com/45analytics</a> ·
          pre-registro <a href="https://osf.io/8b5hd">osf.io/8b5hd</a> · <a href="/voto21junio#metodo">método</a>
          <br />
          <span style={{ color: "var(--ink-4)" }}>{SNAPSHOT_STAMP}</span>
        </p>
      </footer>
    </div>
  );
}
