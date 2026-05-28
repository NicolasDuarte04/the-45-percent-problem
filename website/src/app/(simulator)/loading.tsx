/**
 * Route-group loading state for (simulator). Renders inside the masthead +
 * footer chrome while the page segment streams in. Mirrors the
 * scenario landing hero + mode-card layout with quiet placeholders so the
 * page does not jump when the real content arrives.
 */
export default function SimulatorLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="mx-auto"
      style={{
        maxWidth: 1152,
        padding: "clamp(32px, 5vw, 56px) clamp(16px, 4vw, 48px)",
        color: "var(--text-primary)",
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          display: "block",
          marginBottom: 14,
        }}
      >
        Loading scenario simulator
      </span>

      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(2rem, 4vw, 2.5rem)",
          color: "var(--text-tertiary)",
          letterSpacing: "-0.02em",
          marginBottom: 28,
        }}
      >
        . . . . . . . . . . . . . . . .
      </div>

      <div
        className="mono"
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          marginBottom: 40,
          lineHeight: 1.7,
        }}
      >
        <div>. . . . . . . . . . . . . . . . . . . . . . . . . . .</div>
        <div>. . . . . . . . . . . . . . . . . . . . .</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        <ModeCardSkeleton />
        <ModeCardSkeleton />
        <ModeCardSkeleton />
      </div>
    </div>
  );
}

function ModeCardSkeleton() {
  return (
    <div
      className="border"
      style={{
        borderColor: "var(--border-subtle)",
        padding: 20,
        minHeight: 160,
        backgroundColor: "var(--bg-panel)",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 12,
        }}
      >
        . . . . . . .
      </div>
      <div
        className="mono"
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          lineHeight: 1.7,
        }}
      >
        <div>. . . . . . . . . . . . . . . .</div>
        <div>. . . . . . . . . . . . .</div>
        <div>. . . . . . . . . . . . . . . . . .</div>
      </div>
    </div>
  );
}
