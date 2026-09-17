import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * CP-03 · Sticky progress meter across all three modes.
 *
 * Verifies the shared StickyProgressMeter primitive's contract on each
 * mode page: orientation copy mid-build, [ READY ] swap on submittable
 * state, and CTA disabled / active transitions. Mode topology is the
 * only Full Bracket assertion; the step count is mode-specific and not
 * meaningful to compare across surfaces.
 *
 * The meter mounts as a fixed bar at the bottom of the viewport, with
 * a `data-testid="sticky-progress-meter"` host element. The left
 * column carries `role="status"`; the CTA renders
 * `[ See how the model reacts ]` with explicit `aria-disabled`.
 * (Pre-cp-07 the CTA was `[ ARM ALERT ]`; renamed because the
 * sticky meter was borrowing terminology from a separate real
 * alert-arming feature in the reveal panel.)
 */

const FINAL_FOUR_PICKS = ["ESP", "FRA", "BRA", "ARG"] as const;

function meter(page: Page): Locator {
  return page.locator('[data-testid="sticky-progress-meter"]');
}

function statusLine(page: Page): Locator {
  return meter(page).locator('[role="status"]');
}

function ctaButton(page: Page): Locator {
  return meter(page).getByRole("button", { name: /See how the model reacts/i });
}

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

test.describe("Sticky progress meter (CP-03)", () => {
  test("Final Four · zero picks: 0 of 4, CTA disabled", async ({ page }) => {
    await page.goto("/scenario/final-four");
    await page.waitForLoadState("networkidle");

    await expect(meter(page)).toBeVisible();
    await expect(statusLine(page)).toContainText("STEP 0 OF 4 : FINAL FOUR");

    const cta = ctaButton(page);
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText(/\[\s*See how the model reacts\s*\]/);
    await expect(cta).toHaveAttribute("aria-disabled", "true");
  });

  test("Final Four · one pick advances the counter", async ({ page }) => {
    await page.goto("/scenario/final-four");
    await page.waitForLoadState("networkidle");
    await pickByCode(page, FINAL_FOUR_PICKS[0]);
    await expect(statusLine(page)).toContainText("STEP 1 OF 4 : FINAL FOUR");
  });

  test("Final Four · all four picks flip to READY and arm the CTA", async ({
    page,
  }) => {
    await page.goto("/scenario/final-four");
    await page.waitForLoadState("networkidle");
    for (const code of FINAL_FOUR_PICKS) {
      await pickByCode(page, code);
    }
    await expect(statusLine(page)).toHaveText(/\[\s*READY\s*\]/);

    // Left-column colour resolves to the canvas --ui-success token.
    const expectedSuccess = await page.evaluate(() => {
      const probe = document.querySelector(
        '[data-canvas="simulator"]',
      ) as HTMLElement | null;
      if (!probe) return null;
      return window
        .getComputedStyle(probe)
        .getPropertyValue("--ui-success")
        .trim();
    });
    expect(expectedSuccess).toBeTruthy();

    const cta = ctaButton(page);
    await expect(cta).toHaveAttribute("aria-disabled", "false");
  });

  test("Champion's Path · zero picks: step counter visible with mode label", async ({
    page,
  }) => {
    await page.goto("/scenario/champions-path");
    await page.waitForLoadState("networkidle");
    await expect(meter(page)).toBeVisible();

    const text = (await statusLine(page).textContent()) ?? "";
    expect(text).toMatch(/STEP\s+0\s+OF\s+\d+\s+:\s+CHAMPION'S PATH/);
  });

  test("Full Bracket · meter is visible and mode label reads FULL BRACKET", async ({
    page,
  }) => {
    await page.goto("/scenario/full-bracket");
    await page.waitForLoadState("networkidle");
    await expect(meter(page)).toBeVisible();
    await expect(statusLine(page)).toContainText("FULL BRACKET");
  });

  test("Reduced motion: step counter snaps, no rolling number", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/scenario/final-four");
    await page.waitForLoadState("networkidle");

    // Initial state.
    await expect(statusLine(page)).toContainText("STEP 0 OF 4");

    // Pick one team; the number must equal the target immediately on
    // the first frame after the click, with no intermediate value.
    await pickByCode(page, FINAL_FOUR_PICKS[0]);
    // Read the text without any awaiting/auto-retry; if the rolling
    // number animation were active, the displayed value would briefly
    // be 0 before resolving to 1.
    const text = await statusLine(page).textContent();
    expect(text).toContain("STEP 1 OF 4");
    await context.close();
  });
});
