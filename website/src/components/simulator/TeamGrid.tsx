"use client";

/**
 * 48-team grid for the Tournament Scenario Simulator.
 *
 * Per the May-2026 mandate ("NO frontend component is permitted to hardcode
 * team pairings; all structural reads go through the SoT") this component
 * imports the canonical TEAMS list from `@/lib/data/wc2026-official-draw`,
 * which is the same module that seeds the Postgres `teams` table. No
 * parallel hardcoded roster.
 *
 * Polish: staggered entrance + gentle hover "breathing" scale on every
 * cell. The motion is viewport-triggered (the wall reveals once it scrolls
 * into view, not on every navigation back to the simulator landing) and
 * routes through `useReducedMotionAware` so the entire effect collapses
 * to instant for users who set `prefers-reduced-motion: reduce`. Hover
 * is a 1.04 scale over the standard 180ms micro preset; small enough
 * to feel alive, not jittery.
 *
 * Layout per design v1 §2.1 unchanged: 6-column grid at desktop,
 * 3-column at mobile. Alphabetical by display name (NOT by group, NOT
 * by Elo) so the user picks freely without anchoring on the model's
 * own opinion.
 */

import { motion } from "framer-motion";
import { TEAMS } from "@/lib/data/wc2026-official-draw";
import { Flag } from "@/components/primitives/Flag";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";

export function TeamGrid() {
  // Sorted at render time. The canonical TEAMS export is in draw order;
  // alphabetical sort is presentation-only and does not mutate the SoT.
  const sorted = [...TEAMS].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "en"),
  );

  // Single transition preset. `micro` is short enough (180ms) to feel
  // good on both the entry stagger and the hover pulse, so we route
  // both through one curve. useReducedMotionAware collapses everything
  // to instant for users with `prefers-reduced-motion: reduce`.
  const transition = useReducedMotionAware("micro");

  return (
    <section
      aria-labelledby="team-grid-heading"
      className="border-t border-[var(--rule)] pt-10 pb-12"
    >
      <h2
        id="team-grid-heading"
        className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]"
      >
        WC 2026 qualifiers · 48 teams, alphabetical
      </h2>

      <ul
        className="mt-6 grid grid-cols-3 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-6"
        // Background-on-rule + 1px gap creates the hairline grid effect
        // without doubled borders between cells.
      >
        {sorted.map((team, index) => (
          <motion.li
            key={team.fifa_code}
            // Entry: faintly faded + slightly scaled down → identity
            // once the cell intersects the viewport. The 0.012s
            // per-cell stagger spreads the 48-cell reveal across
            // ~580ms total: readable as a wave, not a single fade.
            // viewport.once = true so navigating away and back doesn't
            // re-fire the wave.
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            // Hover: small scale lift signals "this is interactive"
            // and gives the wall a touch of life on idle pointer.
            whileHover={{ scale: 1.04 }}
            transition={{ ...transition, delay: index * 0.012 }}
            className="flex flex-col items-center justify-center bg-[var(--bg-root)] p-3 text-center"
          >
            <Flag code={team.fifa_code} size={24} />
            <div className="mt-2 font-mono text-[20px] tabular-nums tracking-[0.05em] text-[var(--text-primary)] sm:text-[24px]">
              {team.fifa_code}
            </div>
            <div className="mt-1 font-sans text-[10px] leading-tight text-[var(--text-quiet)] sm:text-[11px]">
              {team.display_name}
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
