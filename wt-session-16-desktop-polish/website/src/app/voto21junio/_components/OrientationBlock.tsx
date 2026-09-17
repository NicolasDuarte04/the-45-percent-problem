/**
 * §2 "Qué es esto" orientation block (Session 01). The signature dotplot
 * anchors the section; the body is the copy revision's plain-Spanish §2 text in
 * the deliberate *usted* register. The caption is plain Spanish — the technical
 * term "distribución posterior" lives only on the methodology page (#78 review).
 */

import { signatureSvg } from "../_lib/voto-runtime";
import { SectionHeader } from "./SectionHeader";

export function OrientationBlock() {
  return (
    <section className="orient wrap" style={{ paddingTop: 30 }}>
      <SectionHeader n="2" label="Qué es esto" />
      <div
        className="signature"
        style={{ marginTop: 16 }}
        dangerouslySetInnerHTML={{ __html: signatureSvg() }}
      />
      <div className="sig-cap">
        <span className="pq">▦</span> Cómo se reparte el margen nacional · 2ª vuelta
      </div>
      <p className="orient-body">
        Esto no es una campaña. No es un sitio para votar. No es una casa de apuestas. Es un grupo de
        45 Analytics que hace los números de la segunda vuelta todos los días y los publica abiertos.
        Las cuentas, el código, los supuestos. También nuestra postura política, porque esconderla
        sería peor que decirla. El número no le dice por quién votar. Le dice qué tan apretada está la
        cosa y cuánto vale su voto.
      </p>
      <div className="orient-cta">
        <a className="lnk" href="/voto21junio/metodologia">
          Cómo funciona <span className="arr">→</span>
        </a>
        <a className="lnk" href="/voto21junio/quienes-somos">
          Quiénes somos <span className="arr">→</span>
        </a>
      </div>
    </section>
  );
}
