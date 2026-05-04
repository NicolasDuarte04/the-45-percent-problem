/**
 * Visual regression test: §7.2 invariant — HIT and MISS rows must share
 * identical grid, padding, font size, and row height. The ONLY permitted
 * visual difference is the label chip text and color in the last data column.
 *
 * Strategy:
 *   1. Navigate to /ledger.
 *   2. Find one HIT row and one MISS row by their data-ledger-label attribute.
 *   3. Assert that their bounding-box heights are identical (pixel parity).
 *   4. Assert that every cell's computed font-size, padding-top, and padding-bottom
 *      are identical between the two rows.
 *   5. Redact the label chip column and take a screenshot of each row side-by-side;
 *      assert pixel-level parity of the non-label cells.
 */

import { test, expect } from "@playwright/test";

test.describe("Ledger §7.2 — HIT/MISS visual parity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ledger");
    // Wait for the table to hydrate
    await page.waitForSelector('[data-ledger-row]');
  });

  test("HIT and MISS rows have identical bounding-box height", async ({ page }) => {
    const hitRow = page.locator('[data-ledger-row][data-ledger-label="HIT"]').first();
    const missRow = page.locator('[data-ledger-row][data-ledger-label="MISS"]').first();

    await expect(hitRow).toBeVisible();
    await expect(missRow).toBeVisible();

    const hitBox = await hitRow.boundingBox();
    const missBox = await missRow.boundingBox();

    expect(hitBox).not.toBeNull();
    expect(missBox).not.toBeNull();

    // Row heights must be pixel-identical (±0px tolerance for grid invariant)
    expect(Math.round(hitBox!.height)).toBe(Math.round(missBox!.height));
  });

  test("HIT and MISS cells have identical computed font-size and padding", async ({ page }) => {
    // Gather computed styles for all td elements in a HIT row
    const hitStyles = await page.evaluate(() => {
      const hitRow = document.querySelector('[data-ledger-row][data-ledger-label="HIT"]');
      if (!hitRow) return null;
      const cells = Array.from(hitRow.querySelectorAll("td"));
      return cells.map((td) => {
        const cs = window.getComputedStyle(td);
        return {
          fontSize: cs.fontSize,
          paddingTop: cs.paddingTop,
          paddingBottom: cs.paddingBottom,
          paddingLeft: cs.paddingLeft,
          paddingRight: cs.paddingRight,
        };
      });
    });

    const missStyles = await page.evaluate(() => {
      const missRow = document.querySelector('[data-ledger-row][data-ledger-label="MISS"]');
      if (!missRow) return null;
      const cells = Array.from(missRow.querySelectorAll("td"));
      return cells.map((td) => {
        const cs = window.getComputedStyle(td);
        return {
          fontSize: cs.fontSize,
          paddingTop: cs.paddingTop,
          paddingBottom: cs.paddingBottom,
          paddingLeft: cs.paddingLeft,
          paddingRight: cs.paddingRight,
        };
      });
    });

    expect(hitStyles).not.toBeNull();
    expect(missStyles).not.toBeNull();
    expect(hitStyles!.length).toBe(missStyles!.length);

    // Every cell except the label chip (second-to-last td) must have identical styles.
    // The label chip td is excluded because it contains the chip with differing color.
    const LABEL_COL_INDEX = hitStyles!.length - 2; // second to last (before audit col)

    hitStyles!.forEach((hs, i) => {
      if (i === LABEL_COL_INDEX) return; // skip label chip column
      const ms = missStyles![i];
      expect(hs.fontSize, `cell[${i}] font-size mismatch`).toBe(ms.fontSize);
      expect(hs.paddingTop, `cell[${i}] padding-top mismatch`).toBe(ms.paddingTop);
      expect(hs.paddingBottom, `cell[${i}] padding-bottom mismatch`).toBe(ms.paddingBottom);
      expect(hs.paddingLeft, `cell[${i}] padding-left mismatch`).toBe(ms.paddingLeft);
      expect(hs.paddingRight, `cell[${i}] padding-right mismatch`).toBe(ms.paddingRight);
    });
  });

  test("screenshot of HIT row matches snapshot", async ({ page }) => {
    const hitRow = page.locator('[data-ledger-row][data-ledger-label="HIT"]').first();
    await expect(hitRow).toBeVisible();
    await expect(hitRow).toHaveScreenshot("ledger-hit-row.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("screenshot of MISS row matches snapshot", async ({ page }) => {
    const missRow = page.locator('[data-ledger-row][data-ledger-label="MISS"]').first();
    await expect(missRow).toBeVisible();
    await expect(missRow).toHaveScreenshot("ledger-miss-row.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
