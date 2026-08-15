import { describe, expect, it } from "vitest";
import {
  DIVERGENCE_KNOCKOUT_PENDING_NOTE,
  DIVERGENCE_STALE_ODDS_NOTE,
  divergenceMatchHref,
  isDivergenceRowUpcoming,
  upcomingDivergenceRows,
} from "@/lib/data/divergenceFilter";
import type { DivergenceRow, DivergenceSnapshot } from "@/lib/data/schemas";

// cp-29: a divergence row is a pre-match edge. Once its fixture kicks off the
// edge is post-hoc and must not be shown as a live signal. The filter is
// anchored to the snapshot's generated_at_utc so it is deterministic at render.
function row(kickoff: string): DivergenceRow {
  return { row_id: kickoff, match_id: kickoff, kickoff_utc: kickoff } as unknown as DivergenceRow;
}

function snapshot(generated: string, kickoffs: string[]): DivergenceSnapshot {
  return {
    snapshot_id: "s",
    generated_at_utc: generated,
    rows: kickoffs.map(row),
  } as unknown as DivergenceSnapshot;
}

describe("isDivergenceRowUpcoming", () => {
  const ref = "2026-07-04T22:00:00Z";

  it("keeps a fixture that kicks off after the reference", () => {
    expect(isDivergenceRowUpcoming(row("2026-07-05T20:00:00Z"), ref)).toBe(true);
  });

  it("drops a fixture that already kicked off", () => {
    expect(isDivergenceRowUpcoming(row("2026-06-28T02:00:00+00:00"), ref)).toBe(false);
  });

  it("drops a fixture kicking off exactly at the reference (in play, not pre-match)", () => {
    expect(isDivergenceRowUpcoming(row(ref), ref)).toBe(false);
  });

  it("fails open (keeps the row) on an unparseable timestamp", () => {
    expect(isDivergenceRowUpcoming(row("not-a-date"), ref)).toBe(true);
    expect(isDivergenceRowUpcoming(row("2026-07-05T20:00:00Z"), "bad-ref")).toBe(true);
  });
});

describe("upcomingDivergenceRows", () => {
  it("filters settled group-stage rows out but keeps future fixtures", () => {
    const snap = snapshot("2026-07-04T22:57:29Z", [
      "2026-06-28T02:00:00+00:00", // settled group match
      "2026-06-28T02:00:00+00:00", // settled group match
      "2026-07-05T20:00:00Z", // upcoming
    ]);
    const kept = upcomingDivergenceRows(snap);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.kickoff_utc).toBe("2026-07-05T20:00:00Z");
  });

  it("empties a snapshot whose rows have all kicked off", () => {
    const snap = snapshot("2026-07-04T22:57:29Z", [
      "2026-06-28T02:00:00+00:00",
      "2026-06-28T02:00:00+00:00",
    ]);
    expect(upcomingDivergenceRows(snap)).toHaveLength(0);
  });
});

describe("DIVERGENCE_KNOCKOUT_PENDING_NOTE", () => {
  it("states group-stage and knockout coverage are both complete (cp-44)", () => {
    expect(DIVERGENCE_KNOCKOUT_PENDING_NOTE).toContain("Group-stage divergence coverage is complete");
    // cp-44 archive posture: the tournament is over, so the note reads as a
    // completed record, not a live feed.
    expect(DIVERGENCE_KNOCKOUT_PENDING_NOTE).toContain("coverage is complete");
    expect(DIVERGENCE_KNOCKOUT_PENDING_NOTE).not.toContain("pending");
    expect(DIVERGENCE_KNOCKOUT_PENDING_NOTE).not.toContain("is live");
  });

  it("carries no em or en dashes", () => {
    expect(DIVERGENCE_KNOCKOUT_PENDING_NOTE).not.toMatch(/[\u2013\u2014]/);
    expect(DIVERGENCE_STALE_ODDS_NOTE).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("divergenceMatchHref", () => {
  it("routes group rows (GRP) to the graded /match/[id]", () => {
    expect(divergenceMatchHref({ match_id: "M67", round: "GRP" })).toBe("/match/M67");
  });

  it("routes knockout rows (KO-FD) to the ungraded /match/live/[id]", () => {
    expect(divergenceMatchHref({ match_id: "KO-FD537377", round: "R16" })).toBe(
      "/match/live/KO-FD537377",
    );
  });

  it("routes by KO- id even when the round field is absent", () => {
    expect(divergenceMatchHref({ match_id: "KO-FD537383" })).toBe("/match/live/KO-FD537383");
  });
});
