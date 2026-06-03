/**
 * §-numbered editorial header (Session 01). Ports the prototype's `.eyebrow`
 * + decorateEyebrows() ornament: a papel-quemado glyph chosen by section
 * number, the "§ N" marker, the label, and an optional serif title + sub.
 */

import type { ReactNode } from "react";

/** Ornament glyphs keyed by section number; a diamond is the fallback. */
function Ornament({ n }: { n: string }) {
  let glyph: ReactNode;
  switch (n) {
    case "0":
      glyph = (
        <svg viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.15" /><circle cx="4" cy="8" r="1.15" /><circle cx="4" cy="12" r="1.15" />
          <circle cx="7.4" cy="4" r="1.15" /><circle cx="8.6" cy="12" r="1.15" />
          <circle cx="12" cy="4" r="1.15" /><circle cx="12" cy="8" r="1.15" /><circle cx="12" cy="12" r="1.15" />
        </svg>
      );
      break;
    case "1":
      glyph = (
        <svg viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="3" y1="12" x2="3" y2="4" /><line x1="6.7" y1="12" x2="6.7" y2="6.5" />
          <line x1="10.3" y1="12" x2="10.3" y2="8.5" /><line x1="14" y1="12" x2="14" y2="10.5" />
        </svg>
      );
      break;
    case "2":
      glyph = (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.2" y="5" width="8" height="8.4" rx="1.2" /><path d="M9.5 6.5 L14 2" /><path d="M11 2 L14 2 L14 5" />
        </svg>
      );
      break;
    default:
      glyph = (
        <svg viewBox="0 0 16 16" fill="currentColor">
          <rect x="5.5" y="5.5" width="5" height="5" rx="0.6" transform="rotate(45 8 8)" />
        </svg>
      );
  }
  return (
    <span className="orn" aria-hidden="true">
      {glyph}
    </span>
  );
}

interface SectionHeaderProps {
  /** Section number shown after the § marker. Use "" for an unnumbered §. */
  n: string;
  /** Eyebrow label after "§ N ·". */
  label: string;
  title?: string;
  sub?: ReactNode;
}

export function SectionHeader({ n, label, title, sub }: SectionHeaderProps) {
  return (
    <div className={title || sub ? "section-hd" : undefined}>
      <div className="eyebrow">
        <Ornament n={n} />
        <span className="sec">§{n ? ` ${n}` : ""}</span> · {label}
      </div>
      {title ? <h2>{title}</h2> : null}
      {sub ? <p className="sub">{sub}</p> : null}
    </div>
  );
}
