import type { ReactNode } from "react";

interface MarginNoteProps {
  /** Optional superscript numeral shown inline. If omitted, no marker renders. */
  n?: number;
  children: ReactNode;
}

/**
 * §8.3 Margin note. On viewports ≥ 1280px the body text is paired with a
 * 220px side rail that carries these annotations; on narrower viewports the
 * note collapses inline below the paragraph that referenced it.
 *
 * Renders two siblings: an inline fallback and a rail-targeted block. The
 * <VaultArticle> CSS in globals.css hides whichever is inappropriate for the
 * current viewport.
 */
export function MarginNote({ n, children }: MarginNoteProps) {
  return (
    <>
      <aside className="vault-margin-inline" role="note">
        {typeof n === "number" ? (
          <sup
            className="mono"
            aria-hidden
            style={{
              marginRight: 6,
              color: "var(--text-quiet)",
              fontSize: 10,
            }}
          >
            {n}
          </sup>
        ) : null}
        {children}
      </aside>
      <aside className="vault-margin-rail" role="note">
        {typeof n === "number" ? (
          <sup
            className="mono"
            aria-hidden
            style={{
              marginRight: 4,
              color: "var(--text-quiet)",
              fontSize: 10,
            }}
          >
            {n}
          </sup>
        ) : null}
        {children}
      </aside>
    </>
  );
}
