import { cn } from "@/lib/utils";
import { formatDecimalOdds } from "@/lib/formatters";

interface OddsCellProps {
  decimal: number;
  decimals?: number;
  className?: string;
}

export function OddsCell({ decimal, decimals = 3, className }: OddsCellProps) {
  const formatted = formatDecimalOdds(decimal, decimals);
  return (
    <span
      className={cn("mono inline-block text-right", className)}
      style={{ color: "var(--data-neutral)" }}
      aria-label={`decimal odds ${formatted}`}
    >
      {formatted}
    </span>
  );
}
