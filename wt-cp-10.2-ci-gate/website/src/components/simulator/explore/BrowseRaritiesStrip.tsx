/**
 * Compact discovery strip pointing at /scenario/explore. Mounts on the
 * /scenario landing page between the mode cards and the trailer; not a
 * fourth mode card. Server component, pure link, no analytics here
 * (the explore page itself emits the depth signal).
 */

import Link from "next/link";

export function BrowseRaritiesStrip() {
  return (
    <section
      aria-label="Browse rarities"
      className="border-t border-[var(--rule)] pt-6 pb-2"
    >
      <Link
        href="/scenario/explore"
        className="group block border border-[var(--border-default)] p-5 transition-colors duration-100 hover:border-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
      >
        <div className="font-mono text-[13px] uppercase tracking-[0.10em] text-[var(--text-primary)] transition-colors duration-100 group-hover:text-[var(--accent-warm)]">
          [ Browse rarities → ]
        </div>
        <p className="mt-2 font-sans text-[12px] text-[var(--text-quiet)]">
          Pick a rarity band; see five example scenarios.
        </p>
      </Link>
    </section>
  );
}
