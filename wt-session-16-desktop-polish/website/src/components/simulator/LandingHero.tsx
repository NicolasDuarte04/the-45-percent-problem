/**
 * Simulator landing hero. Per design v2 §5.1 + IMPL_PROMPT §15.2:
 * NO hero visual element. Headline + subhead only. The right side of
 * the viewport (or below the subhead on stacked layouts) is
 * intentional negative space. No trophy, no bracket animation, no
 * image, no icon.
 *
 * Phase E §8 (D.2): the redundant `[ START YOUR PREDICTION ]` button
 * is removed. The three mode cards below are themselves the call to
 * action; the button added a click without adding meaning.
 *
 * Pure server component.
 */

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
    </section>
  );
}
