import { cn } from "@/lib/utils";
import { formatProbability } from "@/lib/formatters";

interface ProbabilityCellProps {
  p: number;
  decimals?: number;
  className?: string;
}

export function ProbabilityCell({ p, decimals = 1, className }: ProbabilityCellProps) {
  const formatted = formatProbability(p, decimals);
  const pct = (p * 100).toFixed(decimals);
  return (
    <span
      className={cn("mono inline-block text-right", className)}
      style={{ color: "var(--data-neutral)" }}
      aria-label={`${pct} percent`}
    >
      {formatted}
    </span>
  );
}
