/**
 * FoundersNote (Session 01) — the open-partisan declaration. It appears in
 * exactly one place (the "Quiénes somos" page) and is never duplicated. It
 * states the position once: we do not want Iván Cepeda to win. Everywhere else
 * the math is the math. Signed "45 Analytics" — no personal byline. No em
 * dashes anywhere. Calm register, no alarmism.
 */

export function FoundersNote() {
  return (
    <article className="about-note">
      <p style={{ marginBottom: 18 }}>
        Vamos a decir de frente lo que pensamos, una sola vez, y después dejamos que hablen los
        números. No queremos que Iván Cepeda gane la segunda vuelta. Esa es nuestra postura y
        preferimos ponerla sobre la mesa; esconderla sería peor que decirla.
      </p>
      <p style={{ marginBottom: 18 }}>
        Eso no cambia la matemática. El modelo es abierto, el código es público y los supuestos están
        a la vista. Si un día el número favorece un resultado que no nos gusta, lo publicamos igual.
        Cuando nos equivoquemos, lo corregimos dentro de 48 horas y lo dejamos escrito. La
        credibilidad de este proyecto vive ahí, no en el volumen.
      </p>
      <p style={{ marginBottom: 18 }}>
        No le decimos por quién votar. Le mostramos qué tan apretada está la cosa, cuánto vale su voto
        y qué puede hacer con eso. La decisión es suya.
      </p>
      <p className="mono" style={{ fontSize: 13, color: "var(--ink-3)" }}>
        45 Analytics · Bogotá
      </p>
    </article>
  );
}
