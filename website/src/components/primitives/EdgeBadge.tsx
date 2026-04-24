import { cn } from "@/lib/utils";

interface EdgeBadgeProps {
  edge: number;
  threshold?: number;
  decimals?: number;
  className?: string;
}

export function EdgeBadge({ edge, threshold = 0.03, decimals = 1, className }: EdgeBadgeProps) {
  const isPositive = edge >= 0;
  const absEdge = Math.abs(edge);
  const absFormatted = (absEdge * 100).toFixed(decimals);
  const sign = isPositive ? "+" : "−";
  const formatted = `${sign}${absFormatted}pp`;

  const meetsThreshold = absEdge >= threshold;

  const textColor = meetsThreshold
    ? isPositive ? "var(--prism-mint)" : "var(--prism-rose)"
    : "var(--text-quiet)";

  const bgColor = meetsThreshold
    ? isPositive
      ? "color-mix(in oklch, var(--prism-mint) 18%, transparent)"
      : "color-mix(in oklch, var(--prism-rose) 18%, transparent)"
    : "transparent";

  const absLabel = (absEdge * 100).toFixed(decimals);
  const signLabel = isPositive ? "positive" : "negative";

  return (
    <span
      className={cn("mono inline-flex items-center px-1.5 py-0.5 font-medium rounded", className)}
      style={{
        color: textColor,
        backgroundColor: bgColor,
        borderRadius: "var(--radius-sm)",
      }}
      aria-label={`edge, ${signLabel} ${absLabel} percentage points`}
    >
      {formatted}
    </span>
  );
}
