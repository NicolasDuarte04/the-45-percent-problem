interface ProgressionSparklineProps {
  /** Six probabilities in GRP → R16 → QF → SF → FIN → CHA order, each in [0, 1]. */
  values: [number, number, number, number, number, number];
  /** Accent color for the stroke and area; defaults to prism-peach (M★ lineage). */
  stroke?: string;
  width?: number;
  height?: number;
  ariaLabel?: string;
}

const STAGE_LABELS = ["GRP", "R16", "QF", "SF", "FIN", "CHA"];

/**
 * Six-point sparkline of a team's round-by-round marginal probability. The
 * shape of the decay is the tell: stronger teams flatten toward the right,
 * weaker teams dive early. Coordinates are scaled to 0..1 on the Y axis so
 * every row in the leaderboard can be compared at a glance.
 *
 * Rendered as a pure SVG so there's no JS hydration cost.
 */
export function ProgressionSparkline({
  values,
  stroke = "var(--prism-peach)",
  width = 120,
  height = 22,
  ariaLabel,
}: ProgressionSparklineProps) {
  const pad = 1.5;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const n = values.length;

  const xs = values.map((_, i) => pad + (i * innerW) / (n - 1));
  const ys = values.map((v) => pad + (1 - v) * innerH);

  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${ys[i].toFixed(2)}`).join(" ");
  const area =
    `M${xs[0].toFixed(2)},${(height - pad).toFixed(2)} ` +
    xs.map((x, i) => `L${x.toFixed(2)},${ys[i].toFixed(2)}`).join(" ") +
    ` L${xs[n - 1].toFixed(2)},${(height - pad).toFixed(2)} Z`;

  const label =
    ariaLabel ??
    `Stage progression: ${values
      .map((v, i) => `${STAGE_LABELS[i]} ${(v * 100).toFixed(0)}%`)
      .join(", ")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      style={{ display: "block", overflow: "visible" }}
    >
      <path d={area} fill={stroke} opacity={0.16} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Head-dot: anchors the rightmost value so the eye lands on the champion bucket. */}
      <circle
        cx={xs[n - 1]}
        cy={ys[n - 1]}
        r={1.8}
        fill={stroke}
      />
    </svg>
  );
}
