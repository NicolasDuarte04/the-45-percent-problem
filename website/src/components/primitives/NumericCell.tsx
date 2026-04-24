import { cn } from "@/lib/utils";

interface NumericCellProps<T = number> {
  /** Raw value passed to `formatter`. Supports tuples/arrays for CI-style cells. */
  value: T;
  /** Pure function producing the display string. */
  formatter: (v: T) => string;
  /** Screen-reader label. Defaults to the formatted string. */
  ariaLabel?: string;
  align?: "left" | "right";
  className?: string;
}

/**
 * Unified numeric/tabular cell. Replaces MonoNumber, ProbabilityCell, OddsCell,
 * and ConfidenceInterval — all four previously returned the same
 * `<span class="mono inline-block text-right">` with a different formatter.
 */
export function NumericCell<T = number>({
  value,
  formatter,
  ariaLabel,
  align = "right",
  className,
}: NumericCellProps<T>) {
  const formatted = formatter(value);
  return (
    <span
      className={cn(
        "mono inline-block",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      style={{ color: "var(--data-neutral)" }}
      aria-label={ariaLabel ?? formatted}
    >
      {formatted}
    </span>
  );
}
