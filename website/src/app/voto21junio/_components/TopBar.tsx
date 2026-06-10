/**
 * Voto top bar (Session 01). Two variants from the prototype: the home
 * wordmark, and the inner-page "← Inicio" back link + compact wordmark.
 *
 * Session 16: a desktop-only inline nav (.topnav, display:none below
 * 1024px) mirrors the WC masthead so the wide top bar is not a lone
 * wordmark floating in cream. Mobile renders exactly as before.
 */

function TopNav() {
  return (
    <nav className="topnav" aria-label="Secciones">
      <a href="/voto21junio/mapa">El Mapa</a>
      <a href="/voto21junio/tarjeta">La Tarjeta</a>
      <a href="/voto21junio/metodologia">Metodología</a>
      <a href="/voto21junio/quienes-somos">Quiénes somos</a>
    </nav>
  );
}

export function TopBar({ variant }: { variant: "home" | "inner" }) {
  if (variant === "home") {
    return (
      <header className="topbar">
        <a className="wordmark" href="/voto21junio">
          El Voto del <b>21 de Junio</b>
          <small>45 Analytics · método abierto</small>
        </a>
        <TopNav />
      </header>
    );
  }
  return (
    <header className="topbar">
      <a className="back" href="/voto21junio">
        <span aria-hidden="true">←</span> Inicio
      </a>
      <TopNav />
      <a className="wm" href="/voto21junio">
        El Voto del <b>21 de Junio</b>
      </a>
    </header>
  );
}
