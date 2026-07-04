import { describe, it, expect } from "vitest";
import {
  loadLiveKnockouts,
  loadLiveKnockoutIfPresent,
} from "@/lib/data/loadSnapshot";
import { generateStaticParams } from "@/app/(quant)/match/live/[id]/page";

// cp-28: the live knockout cards (matches_live/, KO-FD ids) now open a per-match
// detail page at /match/live/[id]. These tests pin the loader + route-params
// contract the page relies on: a committed card id resolves, an unknown id does
// not (so the page 404s), and generateStaticParams enumerates exactly the
// committed cards.

describe("loadLiveKnockoutIfPresent (cp-28)", () => {
  const committed = loadLiveKnockouts();

  it("there is at least one committed knockout card to resolve", () => {
    expect(committed.length).toBeGreaterThan(0);
  });

  it("resolves a committed card id to a full, ungraded card", () => {
    const id = committed[0].match_id;
    const card = loadLiveKnockoutIfPresent(id);
    expect(card).not.toBeNull();
    expect(card!.match_id).toBe(id);
    // The centerpiece surface: a score-distribution matrix must be present.
    expect(Array.isArray(card!.p_model_goals)).toBe(true);
    expect(card!.p_model_goals.length).toBeGreaterThan(0);
    expect(Array.isArray(card!.p_model_goals[0])).toBe(true);
    // The graded wall: every live card carries a hard graded:false.
    expect(card!.live_provenance.graded).toBe(false);
    // Knockout-only headline number is present and normalised.
    expect(card!.p_advance_home + card!.p_advance_away).toBeCloseTo(1, 6);
  });

  it("returns null for an unknown id (the page 404s on these)", () => {
    expect(loadLiveKnockoutIfPresent("KO-FD000000")).toBeNull();
    expect(loadLiveKnockoutIfPresent("does-not-exist")).toBeNull();
    // A group-stage id lives in matches/, NOT matches_live/, so the live loader
    // must not resolve it: the two namespaces stay disjoint.
    expect(loadLiveKnockoutIfPresent("M1")).toBeNull();
  });
});

describe("generateStaticParams for /match/live/[id] (cp-28)", () => {
  it("enumerates exactly the committed knockout card ids", async () => {
    const params = await generateStaticParams();
    const committedIds = loadLiveKnockouts()
      .map((m) => m.match_id)
      .sort();
    const paramIds = params.map((p) => p.id).sort();
    expect(paramIds).toEqual(committedIds);
  });

  it("every enumerated id resolves through the detail loader", () => {
    for (const { match_id } of loadLiveKnockouts()) {
      expect(loadLiveKnockoutIfPresent(match_id)).not.toBeNull();
    }
  });
});
