/**
 * Route-group loading state for (quant). Renders inside the masthead +
 * footer chrome while the page segment streams in. Keeps the terminal
 * aesthetic: mono labels, tertiary-text dotted rules, no animation.
 *
 * Group-level placement (not per-route) is the minimum-surface fix for
 * the missing-loading-boundary problem identified in
 * docs/perf/nav-perf-2026-05-27.md. Per-route refinements (a table-
 * shaped /ledger skeleton, a matrix-shaped /bracket skeleton) are a
 * follow-up.
 */
export default function QuantLoading() {
  const placeholderRow = (
    <div
      className="mono"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 80px 80px 80px 80px 80px",
        gap: 12,
        padding: "10px 0",
        borderTop: "1px solid var(--border-subtle)",
        fontSize: 12,
        color: "var(--text-tertiary)",
      }}
    >
      <span>. . . . . . . . . . . . . . . . . . . .</span>
      <span style={{ textAlign: "right" }}>. . . .</span>
      <span style={{ textAlign: "right" }}>. . . .</span>
      <span style={{ textAlign: "right" }}>. . . .</span>
      <span style={{ textAlign: "right" }}>. . . .</span>
      <span style={{ textAlign: "right" }}>. . . .</span>
    </div>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="flex flex-col"
      style={{
        backgroundColor: "var(--bg-root)",
        color: "var(--text-primary)",
      }}
    >
      <div
        className="shrink-0 px-4 md:px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-0 md:px-12">
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            Loading
          </span>
          <div
            className="mono"
            style={{
              marginTop: 4,
              fontSize: 18,
              color: "var(--text-tertiary)",
            }}
          >
            . . . . . . . . . . . . . . . .
          </div>
        </div>
      </div>

      <div className="max-w-[1152px] w-full mx-auto px-4 md:px-12 py-6">
        {placeholderRow}
        {placeholderRow}
        {placeholderRow}
        {placeholderRow}
        {placeholderRow}
        {placeholderRow}
        {placeholderRow}
        {placeholderRow}
      </div>
    </div>
  );
}
