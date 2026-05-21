import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * CP-02 · Tiered gauge fills + rolling percentage + inline tension line.
 *
 * Verifies that:
 *  - each gauge segment's inline background binds to its index-matched
 *    CP-00 band token (5 distinct resolved colours);
 *  - the percentage value rolls (not snaps) when the band changes;
 *  - the LONG SHOT tension line renders when the build lands below 1%
 *    and dismisses on band change, on isComplete=false, and after 6s
 *    of inactivity;
 *  - reduced motion collapses the tension-line entry transition.
 *
 * Stability notes. The test drives the gauge through the real Final
 * Four UI rather than mounting the component in isolation, because
 * CP-02 mandates no surface outside LiveAgreementGauge.tsx be touched.
 * Four very-low-pS teams from `src/lib/sim/snapshotProbs.ts` are picked
 * so the joint scenario count in 10,000 simulations is ~0 (LONG SHOT
 * band). The picker cell's accessible name is "{CODE}{display}", so we
 * locate by the inner `span.tabular-nums` whose text is exactly the
 * three-letter FIFA code.
 */

const ROUTE = "/scenario/final-four";
const LONG_SHOT_PICKS = ["GHA", "IRQ", "JOR", "CPV"] as const;
const STRONG_PICKS = ["ESP", "FRA", "BRA", "ARG"] as const;
const GAUGE_SECTION = 'section[aria-labelledby="live-gauge-heading"]';

function pickerCell(page: Page, code: string): Locator {
  return page
    .locator(
      `button[role="option"]:has(span.tabular-nums:text-is("${code}"))`,
    )
    .first();
}

async function pickByCode(page: Page, code: string): Promise<void> {
  const cell = pickerCell(page, code);
  await expect(cell).toBeVisible();
  await cell.click();
}

async function fillScenario(
  page: Page,
  codes: readonly string[],
): Promise<void> {
  for (const code of codes) {
    await pickByCode(page, code);
  }
  await expect(
    page.locator(`${GAUGE_SECTION} [data-active="true"]`),
  ).toBeVisible();
}

async function resetIfPossible(page: Page): Promise<void> {
  const reset = page.getByRole("button", { name: /^\[\s*Reset\s*\]$/ });
  const visible = await reset.first().isVisible().catch(() => false);
  if (visible) {
    await reset.first().click();
  }
  // After reset the picker re-expands and the gauge falls back to ghost
  // state (no data-active="true"). Wait for that before the next pick.
  await expect(
    page.locator(`${GAUGE_SECTION} [data-active="true"]`),
  ).toHaveCount(0);
}

function tensionLine(page: Page): Locator {
  return page.locator('p[role="status"]', { hasText: /^long shot\./ });
}

test.describe("Live agreement gauge tiered fills (CP-02)", () => {
  test("each segment binds to a distinct band token", async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForLoadState("networkidle");

    // The five segment fills carry inline background-color bound to
    // --band-{common,plausible,uncommon,rare,vanishing}. Even pre-
    // isComplete (no data-active="true"), the inline style resolves
    // through the CSS cascade against [data-canvas="simulator"]; so
    // the 5 resolved colours must all be distinct, which is the
    // CP-02 outcome and the CP-00 cascade probe in one shot.
    const fills = page.locator(
      `${GAUGE_SECTION} ul[aria-hidden="true"] > li > span`,
    );
    await expect(fills).toHaveCount(5);

    const colours = await fills.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).backgroundColor),
    );
    expect(colours).toHaveLength(5);
    expect(new Set(colours).size).toBe(5);
    // The vanishing band token equals var(--accent-warm) which on the
    // simulator canvas resolves to rgb(249, 184, 138). The other four
    // tokens differ.
    expect(colours[4]).toBe("rgb(249, 184, 138)");
  });

  test("active segment background reflects the live band index", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.waitForLoadState("networkidle");

    await fillScenario(page, LONG_SHOT_PICKS);

    const active = page.locator(`${GAUGE_SECTION} [data-active="true"]`);
    const activeBg = await active.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    // Four very-low-pS teams co-occurring as SF lands in band index 4
    // (vanishing). Asserting that the active segment's resolved colour
    // equals the band-vanishing token confirms the lookup is live, not
    // a static class.
    expect(activeBg).toBe("rgb(249, 184, 138)");
  });

  test("percentage rolls rather than snapping when the band lights up", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.waitForLoadState("networkidle");

    // The visible percent text lives in a tabular-nums span inside the
    // gauge section. Pre-isComplete it is whitespace; on isComplete=true
    // the rolling number hook eases the displayed value from 0 to the
    // canonical target over ~220ms.
    const percentSpan = page.locator(
      `${GAUGE_SECTION} span.tabular-nums[aria-hidden="true"]`,
    );

    await fillScenario(page, STRONG_PICKS);

    // Sample the rendered text at 30ms intervals for up to 800ms.
    // The roll should pass through at least 2 distinct values; an
    // implementation that snaps would emit only the final value.
    const samples = new Set<string>();
    const deadline = Date.now() + 800;
    while (Date.now() < deadline) {
      const raw = (await percentSpan.textContent()) ?? "";
      const t = raw.trim();
      if (t) samples.add(t);
      if (samples.size >= 2) break;
      await page.waitForTimeout(30);
    }
    expect(samples.size).toBeGreaterThanOrEqual(2);
  });

  test("LONG SHOT tension line renders, dismisses after 6s, and clears on band change", async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto(ROUTE);
    await page.waitForLoadState("networkidle");

    await fillScenario(page, LONG_SHOT_PICKS);
    await expect(tensionLine(page)).toBeVisible();
    await expect(tensionLine(page)).toHaveText(
      /^long shot\. only \d[\d,]* in 10,000 sims agree\.$/,
    );

    // Sit on the LONG SHOT band without further input. After 6s the
    // line self-dismisses; allow a 1s safety margin.
    await page.waitForTimeout(6_500);
    await expect(tensionLine(page)).toHaveCount(0);

    // Re-trigger LONG SHOT after a reset; the per-render `expired` flag
    // must reset to false when the new arming begins, even when the
    // picks are byte-identical to the previously-expired session.
    await resetIfPossible(page);
    await fillScenario(page, LONG_SHOT_PICKS);
    await expect(tensionLine(page)).toBeVisible();

    // Clearing a single slot drops isComplete to false, which exits the
    // LONG SHOT band: the tension line dismisses immediately without
    // waiting on the 6s timer. (The picker auto-collapses at 4 picks,
    // so we target the filled slot button, whose aria-label promises
    // "click to clear".)
    const filledSlot = page
      .getByRole("button", { name: /Slot SF\d filled with .+; click to clear/ })
      .first();
    await filledSlot.click();
    await expect(tensionLine(page)).toHaveCount(0);
  });

  test("reduced motion collapses the tension-line entry transition", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ROUTE);
    await page.waitForLoadState("networkidle");

    await fillScenario(page, LONG_SHOT_PICKS);
    const line = tensionLine(page);
    await expect(line).toBeVisible();

    // Under reduced motion, useReducedMotionAware collapses the micro
    // preset to duration:0; AnimatePresence + motion.p mount the line
    // already at opacity 1. Sample at t=0 and t=50ms; both should be 1.
    const opacityAtMount = await line.evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity),
    );
    await page.waitForTimeout(50);
    const opacityShortlyAfter = await line.evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity),
    );
    expect(opacityAtMount).toBeCloseTo(1, 2);
    expect(opacityShortlyAfter).toBeCloseTo(1, 2);
    expect(Math.abs(opacityAtMount - opacityShortlyAfter)).toBeLessThan(0.05);
  });
});
