"use client";

/**
 * Free daily-brief signup (Session 01). UI only — the email capture backend is
 * Session 12. The CTA is "Recibir el brief" (free), never "Suscribirme": the
 * product does not gate content. On submit it confirms locally so the
 * interaction reads as complete during the prototype phase.
 */

import { useState } from "react";

export function BriefSignup() {
  const [done, setDone] = useState(false);
  return (
    <form
      className="brief-form"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <input type="email" required placeholder="tu@correo.co" aria-label="Tu correo" />
      <button type="submit" className="btn btn-accent">
        {done ? "Listo ✓" : "Recibir el brief"}
      </button>
    </form>
  );
}
