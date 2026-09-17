import { describe, it, expect } from "vitest";
import { getLiveHook } from "@/lib/sim/getLiveHook";

describe("getLiveHook (Phase D Workstream 3. Option C)", () => {
  it("returns REALISTIC at p ≥ 5%", () => {
    expect(getLiveHook(500, 10000)).toBe("REALISTIC");
    expect(getLiveHook(2500, 10000)).toBe("REALISTIC");
    expect(getLiveHook(10000, 10000)).toBe("REALISTIC");
  });

  it("returns BOLD CALL between 1% and 5%", () => {
    expect(getLiveHook(100, 10000)).toBe("BOLD CALL");
    expect(getLiveHook(300, 10000)).toBe("BOLD CALL");
    expect(getLiveHook(499, 10000)).toBe("BOLD CALL");
  });

  it("returns LONG SHOT below 1%", () => {
    expect(getLiveHook(99, 10000)).toBe("LONG SHOT");
    expect(getLiveHook(10, 10000)).toBe("LONG SHOT");
    expect(getLiveHook(0, 10000)).toBe("LONG SHOT");
  });

  it("treats vanishingly rare (< 0.1%) as LONG SHOT; no fourth tier", () => {
    expect(getLiveHook(5, 10000)).toBe("LONG SHOT");
    expect(getLiveHook(1, 100000)).toBe("LONG SHOT");
  });

  it("handles total=0 by returning LONG SHOT", () => {
    expect(getLiveHook(0, 0)).toBe("LONG SHOT");
  });

  it("never returns scientific rarity vocabulary", () => {
    const allHooks = new Set<string>();
    for (let c = 0; c <= 10000; c += 250) {
      allHooks.add(getLiveHook(c, 10000));
    }
    for (const h of allHooks) {
      expect(h).not.toMatch(/Common|Plausible|Uncommon|Rare|Vanishingly/);
    }
  });
});
