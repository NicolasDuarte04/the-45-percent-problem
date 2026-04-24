import { cn } from "@/lib/utils";

interface MonoNumberProps {
  value: number;
  decimals?: number;
  align?: "left" | "right";
  className?: string;
  "aria-label"?: string;
}

export function MonoNumber({
  value,
  decimals = 2,
  align = "right",
  className,
  "aria-label": ariaLabel,
}: MonoNumberProps) {
  const formatted = value.toFixed(decimals);
  return (
    <span
      className={cn(
        "mono inline-block",
        align === "right" ? "text-right" : "text-left",
        className
      )}
      style={{ color: "var(--data-neutral)" }}
      aria-label={ariaLabel ?? formatted}
    >
      {formatted}
    </span>
  );
}
