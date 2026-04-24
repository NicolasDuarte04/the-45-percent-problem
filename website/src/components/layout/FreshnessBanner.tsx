import { loadFreshness, loadSnapshotMeta } from "@/lib/data/loadSnapshot";

export function FreshnessBanner() {
  const freshness = loadFreshness();
  const meta = loadSnapshotMeta();

  const isStale = freshness.status === "STALE" || freshness.status === "BROKEN";
  const stalenessLabel =
    freshness.status !== "BROKEN"
      ? ` · ${freshness.current_staleness_hours.toFixed(1)}h`
      : "";

  const phaseLabel = meta.tournament_phase.replace(/_/g, " ");

  return (
    <div
      className="w-full px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b"
      style={{
        borderColor: "var(--rule)",
        color: "var(--text-quiet)",
        backgroundColor: "transparent",
        fontSize: "13px",
        letterSpacing: "0.02em",
      }}
      role="banner"
      aria-label="Data freshness status"
    >
      <span className="mono" aria-label={`snapshot id ${freshness.snapshot_id}`}>
        snapshot: {freshness.snapshot_id}
      </span>

      <span
        className="inline-flex items-center gap-1.5"
        style={{ color: isStale ? "var(--text-tertiary)" : "var(--text-quiet)" }}
        aria-label={`status ${freshness.status}${stalenessLabel}`}
      >
        {isStale && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: "var(--prism-sun)" }}
            aria-hidden
          />
        )}
        {freshness.status}{stalenessLabel}
      </span>

      <span className="mono" aria-label={`code sha ${meta.code_sha}`}>
        code: {meta.code_sha}
      </span>
      <span className="mono" aria-label={`tournament phase ${phaseLabel}`}>
        phase: {phaseLabel}
      </span>
    </div>
  );
}
