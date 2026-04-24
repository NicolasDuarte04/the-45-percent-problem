import { cn } from "@/lib/utils";
import { formatCI } from "@/lib/formatters";

interface ConfidenceIntervalProps {
  lo: number;
  hi: number;
  decimals?: number;
  className?: string;
}

export function ConfidenceInterval({ lo, hi, decimals = 3, className }: ConfidenceIntervalProps) {
  const formatted = formatCI(lo, hi, decimals);
  const loLabel = (lo * 100).toFixed(1);
  const hiLabel = (hi * 100).toFixed(1);

  return (
    <span
      className={cn("mono inline-block text-right", className)}
      style={{ color: "var(--data-neutral)" }}
      aria-label={`95 percent confidence interval, ${loLabel} to ${hiLabel} percent`}
    >
      {formatted}
    </span>
  );
}
