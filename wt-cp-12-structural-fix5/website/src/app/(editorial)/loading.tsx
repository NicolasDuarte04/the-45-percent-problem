/**
 * Route-group loading state for (editorial). Renders inside the masthead +
 * footer chrome while the page segment streams in. The editorial canvas
 * is prose-heavy, so the skeleton shows a serif title placeholder and a
 * few paragraph-shaped rule blocks; quiet, no animation.
 */
export default function EditorialLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="mx-auto"
      style={{
        maxWidth: 1152,
        padding: "clamp(40px, 6vw, 64px) clamp(16px, 4vw, 48px)",
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
        Loading
      </span>

      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(2rem, 4vw, 2.5rem)",
          color: "var(--text-tertiary)",
          letterSpacing: "-0.02em",
          marginBottom: 32,
        }}
      >
        . . . . . . . . . . . . .
      </div>

      <div style={{ maxWidth: 640 }}>
        <ProseRule lines={4} />
        <ProseRule lines={5} />
        <ProseRule lines={3} />
        <ProseRule lines={4} />
      </div>
    </div>
  );
}

function ProseRule({ lines }: { lines: number }) {
  const rule = ". . . . . . . . . . . . . . . . . . . . . . . . . . . .";
  return (
    <div
      className="mono"
      style={{
        fontSize: 12,
        lineHeight: 1.7,
        color: "var(--text-tertiary)",
        marginBottom: 24,
      }}
    >
      {Array.from({ length: lines }, (_, i) => (
        <div key={i}>{rule}</div>
      ))}
    </div>
  );
}
