"use client";

import { useSyncExternalStore } from "react";

/**
 * Honest kickoff-state line for the live knockout detail header, shown only
 * while the tie has no score yet. The route is `force-static`, so a build-time
 * clock would freeze; the current state must come from the client's wall clock.
 *
 * Two states:
 *   - kickoff still in the future -> the model's modal scoreline (a pre-match
 *     projection, exactly what the page showed before).
 *   - kickoff at or before now, still score-less -> "awaiting result". The tie
 *     has started (or finished with the result not yet ingested), so it must
 *     never keep reading as a future projection.
 *
 * The clock is a one-shot external-store snapshot (mirroring DivergenceTable):
 * null through SSR and the first hydration paint so the prerendered projection
 * matches, then the mount-time timestamp lifts a past-kickoff tie into
 * "awaiting result". getSnapshot must return a cached value, so the timestamp is
 * captured once at module scope.
 */
let clientNowSnapshot: number | null = null;
function subscribeClientNow(): () => void {
  return () => {};
}
function getClientNowSnapshot(): number | null {
  if (clientNowSnapshot === null) {
    clientNowSnapshot = Date.now();
  }
  return clientNowSnapshot;
}
function getServerNowSnapshot(): number | null {
  return null;
}

export function LiveKnockoutStatusLine({
  kickoffUtc,
  modal,
}: {
  kickoffUtc: string;
  modal: { home: number; away: number } | null;
}) {
  const now = useSyncExternalStore(
    subscribeClientNow,
    getClientNowSnapshot,
    getServerNowSnapshot,
  );

  const ko = Date.parse(kickoffUtc);
  const kickedOff = now != null && !Number.isNaN(ko) && ko <= now;

  if (kickedOff) {
    return (
      <p
        className="text-[12px] mt-1 mono font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        awaiting result
      </p>
    );
  }

  if (modal) {
    return (
      <p className="text-[12px] mt-1 mono" style={{ color: "var(--text-tertiary)" }}>
        modal scoreline {modal.home}-{modal.away}
      </p>
    );
  }

  return null;
}
