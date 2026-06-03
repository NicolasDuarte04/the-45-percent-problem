/**
 * Voto top bar (Session 01). Two variants from the prototype: the home
 * wordmark, and the inner-page "← Inicio" back link + compact wordmark.
 */

export function TopBar({ variant }: { variant: "home" | "inner" }) {
  if (variant === "home") {
    return (
      <header className="topbar">
        <a className="wordmark" href="/voto21junio">
          El Voto del <b>21 de Junio</b>
          <small>45 Analytics · método abierto</small>
        </a>
      </header>
    );
  }
  return (
    <header className="topbar">
      <a className="back" href="/voto21junio">
        <span aria-hidden="true">←</span> Inicio
      </a>
      <a className="wm" href="/voto21junio">
        El Voto del <b>21 de Junio</b>
      </a>
    </header>
  );
}
