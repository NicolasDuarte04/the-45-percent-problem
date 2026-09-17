/**
 * §1 hero block (Session 01) — the "N días" countdown, the locked headline,
 * and the plain-Spanish lede. The headline is on the copy revision's
 * do-not-change list; the lede is the revised plain-Spanish §1 body. The
 * papel-quemado underline stays on "La decides tú."
 */

import type { ReactNode } from "react";
import { SectionHeader } from "./SectionHeader";
import { DotPattern } from "./DotPattern";

export function HeroCountdown({ days, children }: { days: number; children?: ReactNode }) {
  return (
    <section className="hero wrap" style={{ position: "relative", paddingTop: 8 }}>
      <DotPattern
        className="hero-campo"
        cols={18}
        rows={13}
        live={0.16}
        gap={13}
        r={2.6}
        seed={11}
        mask="linear-gradient(255deg,#000 46%,transparent 86%)"
      />
      <div className="hero-inner">
        <SectionHeader n="1" label="El día decisivo" />
        <div className="countdown" style={{ marginTop: 14 }}>
          <span className="n mono">{days}</span>
          <span className="u">días</span>
        </div>
        <h1>
          La segunda vuelta no la decide el país.{" "}
          <em className="subraya">La decides tú.</em>
        </h1>
        <p className="lede">
          Cada mañana publicamos un número: qué tan probable es que gane cada candidato hoy, con la
          información del día. Mostramos cómo lo calculamos. Mostramos qué tan apretado está. Y le
          decimos qué puede hacer usted.
        </p>
      </div>
      {children}
    </section>
  );
}
