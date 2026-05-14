/**
 * Unit tests for the one-tap social composer string assembled by
 * TicketShareButton. The composer is a brand-locked format:
 *   `1 in N. {storyLine}. {permalink}`
 * with a 280-character cap (X's hard limit).
 */

import { describe, expect, it } from "vitest";
import { buildComposerString } from "@/components/simulator/TicketShareButton";

describe("buildComposerString", () => {
  const URL_BASE = "https://45analytics.com/scenario/p/abc123";

  it("assembles the locked format with a single trailing period before the URL", () => {
    const out = buildComposerString(5, 10_000, "Argentina lifts the trophy", URL_BASE);
    expect(out).toBe("1 in 2,000. Argentina lifts the trophy. https://45analytics.com/scenario/p/abc123");
  });

  it("collapses a trailing period on the storyLine to a single period", () => {
    const out = buildComposerString(5, 10_000, "Argentina lifts the trophy.", URL_BASE);
    expect(out).toBe("1 in 2,000. Argentina lifts the trophy. https://45analytics.com/scenario/p/abc123");
  });

  it("collapses multiple trailing periods to a single period", () => {
    const out = buildComposerString(5, 10_000, "Argentina lifts the trophy...", URL_BASE);
    expect(out).toBe("1 in 2,000. Argentina lifts the trophy. https://45analytics.com/scenario/p/abc123");
  });

  it("uses the 1-in-N+ floor form when count is zero", () => {
    const out = buildComposerString(0, 10_000, "An unseen scenario", URL_BASE);
    expect(out).toMatch(/^1 in 10,000\+\. /);
  });

  it("truncates the storyLine with a single ellipsis when the total would exceed 280 chars", () => {
    const longStory = "x".repeat(400);
    const out = buildComposerString(5, 10_000, longStory, URL_BASE);
    expect(out.length).toBeLessThanOrEqual(280);
    expect(out).toContain("…");
    // Ellipsis is exactly one character.
    const ellipses = out.match(/…/g) ?? [];
    expect(ellipses.length).toBe(1);
    // Permalink remains intact at the tail.
    expect(out.endsWith(URL_BASE)).toBe(true);
  });

  it("does not truncate when the composed string is already under 280 chars", () => {
    const story = "Short story";
    const out = buildComposerString(5, 10_000, story, URL_BASE);
    expect(out).not.toContain("…");
    expect(out.length).toBeLessThanOrEqual(280);
  });

  it("contains no emoji, no hashtags, and no via attribution", () => {
    const out = buildComposerString(5, 10_000, "Argentina lifts the trophy", URL_BASE);
    expect(out).not.toMatch(/[#@]/);
    expect(out).not.toMatch(/via/i);
    expect(out).not.toMatch(/posted from/i);
  });
});
