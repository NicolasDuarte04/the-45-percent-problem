import { loadFreshness, loadSnapshotMeta } from "@/lib/data/loadSnapshot";
import { LiveFreshnessStatus } from "./LiveFreshnessStatus";

export function FreshnessBanner() {
  const freshness = loadFreshness();
  const meta = loadSnapshotMeta();

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

      <LiveFreshnessStatus
        generatedAtUtc={freshness.generated_at_utc}
        maxStalenessHours={freshness.max_expected_staleness_hours}
      />

      <span className="mono" aria-label={`code sha ${meta.code_sha}`}>
        code: {meta.code_sha}
      </span>
      <span className="mono" aria-label={`tournament phase ${phaseLabel}`}>
        phase: {phaseLabel}
      </span>
    </div>
  );
}
