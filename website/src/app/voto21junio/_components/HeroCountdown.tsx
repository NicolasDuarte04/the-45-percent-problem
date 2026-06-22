/**
 * §1 hero block (Session 01) — the "N días" countdown, the locked headline,
 * and the plain-Spanish lede. The headline is on the copy revision's
 * do-not-change list; the lede is the revised plain-Spanish §1 body. The
 * papel-quemado underline stays on "La decides tú."
 *
 * Session 20: once the vote has closed (eventClosed), the live countdown and
 * the go-vote mobilization copy are replaced with a past-tense closed state —
 * the election is over, the figure shown is the frozen final pre-electoral
 * forecast, and the certified result is pending. No live "0 días / qué puede
 * hacer usted" framing is allowed to sit on a settled page.
 */

import type { ReactNode } from "react";
import { SectionHeader } from "./SectionHeader";
import { DotPattern } from "./DotPattern";

export function HeroCountdown({
  days,
  eventClosed = false,
  children,
}: {
  days: number;
  eventClosed?: boolean;
  children?: ReactNode;
}) {
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
        {eventClosed ? (
          <>
            <SectionHeader n="1" label="La jornada terminó" />
            <div className="countdown" style={{ marginTop: 14 }}>
              <span className="u">Votación cerrada · 21 de junio</span>
            </div>
            <h1>
              La segunda vuelta <em className="subraya">ya se votó.</em>
            </h1>
            <p className="lede">
              La votación del 21 de junio terminó. Lo que ves aquí es la última cifra que publicó el
              modelo antes del cierre, ya congelada. Cuando la Registraduría certifique el conteo,
              publicamos el resultado oficial y mostramos qué tan cerca estuvo el modelo.{" "}
              <a className="lnk" href="/voto21junio/resultado">
                Ver la cifra final y el resultado <span className="arr">→</span>
              </a>
            </p>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
      {children}
    </section>
  );
}
