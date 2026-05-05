/**
 * Page-scope chrome for the Tournament Scenario Simulator.
 *
 * Renders the top mast strip per design v1 §4.1 (left: project / surface /
 * tournament; right: optional submission timestamp), the hairline rule, and
 * the page <main>. Children render inside a max-width container so the
 * landing's editorial layout and the dashboard's data layouts share spacing.
 *
 * Pure server component — no client interactivity.
 */

interface SimulatorChromeProps {
  children: React.ReactNode;
  /**
   * Optional right-aligned metadata strip on the masthead.
   * For permalink pages: ISO submission timestamp. For the landing: omit.
   */
  rightMeta?: string;
  /**
   * Container width. Both variants are now 1152px to match the site
   * masthead (the previous 720px "narrow" felt squashed for the team
   * grid and build modes). Kept as a prop for future flexibility.
   */
  width?: "narrow" | "wide";
}

export function SimulatorChrome({
  children,
  rightMeta,
  width = "narrow",
}: SimulatorChromeProps) {
  // Both narrow and wide align with the site masthead (max-width: 1152).
  // Internal sections cap their own reading widths where appropriate.
  void width;
  const containerCls = "mx-auto max-w-[1152px] px-4 md:px-12";

  return (
    <div className="min-h-screen w-full text-[var(--text-primary)]">
      <header className={`${containerCls} pt-8 pb-4`}>
        <div className="flex items-baseline justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]">
          <span>45ANALYTICS / TOURNAMENT SCENARIO / WC 2026</span>
          {rightMeta ? <span className="tabular-nums">{rightMeta}</span> : null}
        </div>
        <hr className="mt-3 border-0 border-b border-[var(--rule)]" />
      </header>

      <main className={`${containerCls} pb-16`}>{children}</main>
    </div>
  );
}
