/**
 * Mode-selector cards per design v2 §5.2 + Patch v2.1 §2:
 * three equal-weight options with mono uppercase headings (NEUTRAL color
 * by default — warm accent only on hover, never on resting state), serif
 * sub-explanation, time estimate in 12pt sans at 60% opacity.
 *
 * Pure server component. Each card is an <a> link to its mode-specific
 * route. Those routes are scaffolded in subsequent steps; in Phase A they
 * may 404 — that's intentional, this step ships only the visual entry
 * point.
 *
 * Patch v2.1 §2 verification: open with no hover state. All three headings
 * must read in the neutral mono color. Hover any card; only that card's
 * heading and border tint warm. Move cursor away; tint clears.
 */

import Link from "next/link";

interface ModeOption {
  href: string;
  heading: string;
  subhead: string;
  duration: string;
}

const MODES: readonly ModeOption[] = [
  {
    href: "/scenario/final-four",
    heading: "[ FINAL FOUR ]",
    subhead: "Who makes the semifinals?",
    duration: "30 seconds.",
  },
  {
    href: "/scenario/champions-path",
    heading: "[ CHAMPION'S PATH ]",
    subhead: "Tell us your team's story to the final.",
    duration: "About a minute.",
  },
  {
    href: "/scenario/full-bracket",
    heading: "[ FULL BRACKET ]",
    subhead: "Call the whole tournament.",
    duration: "A few minutes. For the obsessives.",
  },
] as const;

export function ModeSelectorCards() {
  return (
    <section
      id="mode-selector"
      aria-labelledby="mode-selector-heading"
      className="border-t border-[var(--rule)] pt-10 pb-12"
    >
      <h2
        id="mode-selector-heading"
        className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]"
      >
        Choose your mode
      </h2>

      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {MODES.map((mode) => (
          <li key={mode.href} className="contents">
            <Link
              href={mode.href}
              className="group block border border-[var(--border-default)] p-5 transition-colors duration-100 hover:border-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
            >
              <div className="font-mono text-[13px] uppercase tracking-[0.10em] text-[var(--text-primary)] transition-colors duration-100 group-hover:text-[var(--accent-warm)]">
                {mode.heading}
              </div>
              <p className="mt-3 font-serif text-[16px] leading-[1.45] text-[var(--text-primary)]">
                {mode.subhead}
              </p>
              <p className="mt-3 font-sans text-[12px] text-[var(--text-quiet)]">
                {mode.duration}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
