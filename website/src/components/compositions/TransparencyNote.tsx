"use client";

import { useState } from "react";

// Per-page-load dismissal, keyed by `id` so two notes on different routes
// dismiss independently. Mirrors the in-memory flag used by
// TerminalTransparencyBanner (the #102 pattern): the banner is always visible
// on a fresh document load and on any new tab, and a dismissal only persists
// across in-session client-side navigation. See that component for the full
// rationale on why a module-level flag is preferred over sessionStorage.
const dismissedThisLoad = new Set<string>();

/**
 * Additive disclosure note for the quant surfaces, reusing the #102
 * transparency-banner treatment (peach accent, info glyph, role="note", never
 * an error/alert). Discloses frozen or pending data without disturbing the
 * host page layout. Copy is supplied by the caller as children.
 */
export function TransparencyNote({
  id,
  ariaLabel = "Transparency note",
  children,
}: {
  id: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  // Lazy initializer rather than a setState-in-effect: on a fresh document load
  // the set is empty, so the server prerender and first client render agree
  // (hydration matches) and the note shows. On an in-session client-side
  // navigation the set carries prior dismissals, so a dismissed note stays
  // hidden with no flash. The set resets on every full document load, so the
  // note reappears on hard refresh and in any new tab.
  const [visible, setVisible] = useState(() => !dismissedThisLoad.has(id));

  if (!visible) return null;

  return (
    <div
      className="shrink-0 px-4 md:px-6 py-2.5 border-b"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--prism-peach) 9%, var(--bg-panel))",
        borderColor:
          "color-mix(in srgb, var(--prism-peach) 30%, var(--border-subtle))",
      }}
      role="note"
      aria-label={ariaLabel}
    >
      <div className="max-w-[1152px] mx-auto px-0 md:px-12 flex items-start gap-2.5">
        <InfoGlyph />
        <p
          /* Integer line-height (not leading-[1.5] = 17.25px) keeps the note's
             total height a whole number of pixels, so mounting it above the
             /ledger table cannot shift the table's sub-pixel alignment and flip
             the row-clipped visual-regression snapshots by 1px. */
          className="flex-1 text-[11.5px] leading-[18px]"
          style={{ color: "var(--text-secondary)", margin: 0 }}
        >
          {children}
        </p>
        <button
          type="button"
          onClick={() => {
            dismissedThisLoad.add(id);
            setVisible(false);
          }}
          aria-label="Dismiss transparency note"
          className="shrink-0 -mr-1 px-1.5 leading-none transition-colors duration-[120ms]"
          style={{ color: "var(--text-tertiary)", fontSize: "16px" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function InfoGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 mt-[2px]"
      style={{ color: "var(--prism-peach)" }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1.25" fill="currentColor" />
    </svg>
  );
}
