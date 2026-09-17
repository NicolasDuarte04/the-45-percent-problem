"use client";

import { useEffect, useState } from "react";

/**
 * Honest freshness status (cp-14-pre).
 *
 * The snapshot pipeline writes `current_staleness_hours: 0.0` and
 * `status: "FRESH"` as frozen literals into every freshness.json (see
 * scripts/regenerate_snapshot_from_batch.py), so trusting those fields makes
 * the banner claim FRESH no matter how old the payload is. Instead we derive
 * the age client-side from `generated_at_utc` (the one field that is a real
 * timestamp) against the current wall clock, and recompute it on an interval so
 * a long-open tab cannot keep asserting freshness it no longer has.
 *
 * Threshold: a snapshot is FRESH while its age is within
 * `max_expected_staleness_hours` (26h in the published payload), which matches
 * the nightly-plus-on-demand cadence with headroom for a skipped or late run;
 * older than that and it is labelled STALE. We never touch the frozen literal
 * or the generators, so the snapshot contract (status === "FRESH") still holds.
 */
export function LiveFreshnessStatus({
  generatedAtUtc,
  maxStalenessHours,
}: {
  generatedAtUtc: string;
  maxStalenessHours: number;
}) {
  const [hours, setHours] = useState<number | null>(null);

  useEffect(() => {
    const compute = () => {
      const ageMs = Date.now() - Date.parse(generatedAtUtc);
      setHours(ageMs / 3_600_000);
    };
    compute();
    const interval = setInterval(compute, 60_000);
    return () => clearInterval(interval);
  }, [generatedAtUtc]);

  // On the static prerender and before hydration the true age is unknown, so we
  // show no freshness claim rather than a stale or hardcoded one.
  if (hours === null) {
    return (
      <span
        className="inline-flex items-center"
        style={{ color: "var(--text-quiet)" }}
        aria-label="freshness status pending"
      >
        snapshot age pending
      </span>
    );
  }

  const isStale = hours > maxStalenessHours;
  const status = isStale ? "STALE" : "FRESH";

  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{ color: isStale ? "var(--text-tertiary)" : "var(--text-quiet)" }}
      aria-label={`status ${status}, ${hours.toFixed(1)} hours since snapshot`}
    >
      {isStale && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: "var(--prism-sun)" }}
          aria-hidden
        />
      )}
      {status} · {hours.toFixed(1)}h
    </span>
  );
}
