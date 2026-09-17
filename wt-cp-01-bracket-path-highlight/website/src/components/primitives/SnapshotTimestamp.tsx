import { cn } from "@/lib/utils";

interface SnapshotTimestampProps {
  id: string;
  stalenessHours?: number;
  className?: string;
}

type FreshnessLevel = "FRESH" | "STALE" | "BROKEN";

function freshnessLevel(hours: number | undefined): FreshnessLevel {
  if (hours === undefined) return "FRESH";
  if (hours > 26) return "BROKEN";
  if (hours > 20) return "STALE";
  return "FRESH";
}

const levelStyle: Record<FreshnessLevel, { color: string; label: string }> = {
  FRESH: { color: "var(--edge-positive)", label: "FRESH" },
  STALE: { color: "var(--gate-fired)", label: "STALE" },
  BROKEN: { color: "var(--edge-negative)", label: "BROKEN" },
};

export function SnapshotTimestamp({ id, stalenessHours, className }: SnapshotTimestampProps) {
  const level = freshnessLevel(stalenessHours);
  const { color, label } = levelStyle[level];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className="mono"
        style={{ color: "var(--data-neutral)" }}
        aria-label={`snapshot ${id}`}
      >
        {id}
      </span>
      <span
        className="mono text-[10px] px-1 py-px border"
        style={{ color, borderColor: color }}
        aria-label={`freshness status ${label}`}
      >
        {label}
      </span>
    </span>
  );
}
