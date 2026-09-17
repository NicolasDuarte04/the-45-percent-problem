import Link from "next/link";

interface SectionHeadProps {
  eyebrow: string;
  title: string;
  rightSlot?: React.ReactNode;
}

/**
 * Editorial section header: eyebrow (mono, § marked in accent) above a
 * serif title, with an optional right-slot pill/link.
 */
export function SectionHead({ eyebrow, title, rightSlot }: SectionHeadProps) {
  const eyebrowParts = eyebrow.split(/(§)/).map((part, i) =>
    part === "§" ? (
      <span key={i} style={{ color: "var(--accent-focus)" }}>
        §
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );

  return (
    <div
      style={{
        marginBottom: 20,
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 14,
          }}
        >
          {eyebrowParts}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            letterSpacing: "-0.015em",
            fontSize: 28,
            lineHeight: 1.2,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h2>
      </div>
      {rightSlot}
    </div>
  );
}

interface GhostLinkProps {
  href: string;
  children: React.ReactNode;
}

/** Pill-style link used in SectionHead rightSlot. */
export function GhostLink({ href, children }: GhostLinkProps) {
  return (
    <Link
      href={href}
      className="no-underline inline-flex items-center"
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--text-primary)",
        border: "1px solid rgb(31 31 31 / 0.28)",
        borderRadius: 6,
        padding: "6px 12px",
        gap: 4,
        background: "transparent",
      }}
    >
      {children}
    </Link>
  );
}
