/**
 * 48-team grid for the Tournament Scenario Simulator.
 *
 * Per the May-2026 mandate ("NO frontend component is permitted to hardcode
 * team pairings; all structural reads go through the SoT") this component
 * imports the canonical TEAMS list from `@/lib/data/wc2026-official-draw`,
 * which is the same module that seeds the Postgres `teams` table. No
 * parallel hardcoded roster.
 *
 * Phase A scope: STATIC visual layout only. No selection, no drag, no
 * onClick state. The Phase B/C build modes (Final Four / Champion's Path /
 * Full Bracket) will wrap this component with their own selection logic.
 *
 * Layout per design v1 §2.1: 6-column grid at desktop, 3-column at mobile.
 * Alphabetical by display name (NOT by group, NOT by Elo) so the user
 * picks freely without anchoring on the model's own opinion.
 *
 * Pure server component.
 */

import { TEAMS } from "@/lib/data/wc2026-official-draw";

export function TeamGrid() {
  // Sorted at render time. The canonical TEAMS export is in draw order;
  // alphabetical sort is presentation-only and does not mutate the SoT.
  const sorted = [...TEAMS].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "en"),
  );

  return (
    <section
      aria-labelledby="team-grid-heading"
      className="border-t border-[var(--rule)] pt-10 pb-12"
    >
      <h2
        id="team-grid-heading"
        className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]"
      >
        WC 2026 qualifiers — 48 teams, alphabetical
      </h2>

      <ul
        className="mt-6 grid grid-cols-3 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-6"
        // Background-on-rule + 1px gap creates the hairline grid effect
        // without doubled borders between cells.
      >
        {sorted.map((team) => (
          <li
            key={team.fifa_code}
            className="bg-[var(--bg-root)] p-3 text-center"
          >
            <div className="font-mono text-[20px] tabular-nums tracking-[0.05em] text-[var(--text-primary)] sm:text-[24px]">
              {team.fifa_code}
            </div>
            <div className="mt-1 font-sans text-[10px] leading-tight text-[var(--text-quiet)] sm:text-[11px]">
              {team.display_name}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
