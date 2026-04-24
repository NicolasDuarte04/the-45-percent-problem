import type { ReactNode } from "react";

interface FigureProps {
  children: ReactNode;
  caption?: ReactNode;
  /** Source citation — rendered as a trailing link in the caption when provided. */
  cite?: { href: string; label: string };
  /** Allow the figure to break the grid to ±10% on wide viewports. §8.3 */
  bleed?: boolean;
  /** Accessible label for the figure element. Defaults to caption plain text. */
  ariaLabel?: string;
}

/**
 * §8.3 / §8.4 — figure wrapper for living figures, static images, and tables.
 * Caption sits in `caption` size, --ink-quiet, italic.
 */
export function Figure({
  children,
  caption,
  cite,
  bleed = false,
  ariaLabel,
}: FigureProps) {
  return (
    <figure
      className="vault-figure"
      style={
        bleed
          ? {
              marginInline: "-10%",
              maxWidth: "none",
            }
          : undefined
      }
      aria-label={ariaLabel}
    >
      {children}
      {caption ? (
        <figcaption>
          {caption}
          {cite ? (
            <>
              {" "}
              <a href={cite.href} style={{ color: "var(--accent-focus)" }}>
                {cite.label}
              </a>
            </>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
