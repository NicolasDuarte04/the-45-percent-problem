import Link from "next/link";

export interface SubNavLink {
  href: string;
  label: string;
  /** Glyph rendered before the label ("←") or after ("→"). */
  direction?: "back" | "forward";
}

interface SubNavProps {
  links: SubNavLink[];
}

/**
 * Quiet breadcrumb row for quant detail pages. Slate-ink-soft by default,
 * darkens to slate-ink on hover, neutral padding so the row aligns against
 * the top of whatever panel sits below.
 */
export function SubNav({ links }: SubNavProps) {
  return (
    <nav
      className="flex flex-wrap items-center gap-x-1 gap-y-1"
      aria-label="Section breadcrumbs"
    >
      {links.map((l, i) => (
        <SubNavItem key={`${l.href}-${i}`} link={l} isLast={i === links.length - 1} />
      ))}
    </nav>
  );
}

function SubNavItem({ link, isLast }: { link: SubNavLink; isLast: boolean }) {
  const glyph =
    link.direction === "back" ? (
      <span aria-hidden="true" style={{ opacity: 0.7 }}>
        ←&nbsp;
      </span>
    ) : null;
  const glyphAfter =
    link.direction === "forward" ? (
      <span aria-hidden="true" style={{ opacity: 0.7 }}>
        &nbsp;→
      </span>
    ) : null;

  return (
    <>
      <Link
        href={link.href}
        className="subnav-link transition-colors duration-[120ms] rounded-sm"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          lineHeight: 1,
          padding: "6px 10px",
          color: "var(--text-tertiary)",
          textDecoration: "none",
        }}
      >
        {glyph}
        {link.label}
        {glyphAfter}
      </Link>
      {!isLast && (
        <span
          className="mono"
          aria-hidden="true"
          style={{
            fontSize: 11,
            color: "var(--text-quiet)",
            padding: "0 2px",
          }}
        >
          ·
        </span>
      )}
    </>
  );
}
