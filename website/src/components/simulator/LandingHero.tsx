/**
 * Simulator landing hero. Per design v2 §5.1 + IMPL_PROMPT §15.2:
 * NO hero visual element. Headline + subhead + CTA only. The right side
 * of the viewport (or below the CTA on stacked layouts) is intentional
 * negative space. No trophy, no bracket animation, no image, no icon.
 *
 * Pure server component.
 */

import Link from "next/link";

export function LandingHero() {
  return (
    <section className="pt-12 pb-16 sm:pt-20 sm:pb-24" aria-labelledby="sim-hero">
      <h1
        id="sim-hero"
        className="font-serif text-[36px] leading-[1.05] tracking-tight sm:text-[56px] sm:leading-[1.02] text-[var(--text-primary)]"
      >
        Call the World Cup. See if the model agrees.
      </h1>

      <p className="mt-6 font-mono text-[14px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]">
        WC 2026 · 10,000 simulated tournaments · M&#9733; model
      </p>

      <div className="mt-10">
        <Link
          href="#mode-selector"
          className="inline-block border border-[var(--border-default)] px-5 py-3 font-mono text-[13px] uppercase tracking-[0.10em] text-[var(--text-primary)] transition-colors duration-100 hover:border-[var(--accent-warm)] hover:text-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)] focus:ring-offset-0"
        >
          [ START YOUR PREDICTION ]
        </Link>
      </div>
    </section>
  );
}
