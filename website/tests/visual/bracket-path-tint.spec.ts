import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * CP-01 · Bracket path highlight.
 *
 * Asserts the persistent 12% --accent-warm tint on every KO match
 * cell whose getAdvancer() returns a non-null team, plus the
 * cascade-clear behaviour when an upstream advance is changed.
 *
 * Once the user crowns an overall champion (koAdvancers[30]), every
 * match that champion won lights up in --ui-success green: the cell
 * background switches to a stronger green mix and gains a green
 * border (data-champion-path="true"). Non-champion advancers stay in
 * the warm treatment.
 *
 * The cascade-clear was tightened in this PR: changing a single match
 * now only clears the specific downstream cells that depend on it
 * (R32 m → R16 ⌊m/2⌋ → QF ⌊m/4⌋ → SF ⌊m/8⌋ → Final), not the entire
 * next stage.
 *
 * The Phase E connector draw-in animation is verified to still play
 * (separately, not re-implemented in CP-01) and to snap-render under
 * prefers-reduced-motion: reduce.
 */

const ROUTE = "/scenario/full-bracket";

async function setupKnockoutBracket(page: Page): Promise<void> {
  await page.goto(ROUTE);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Auto-fill all" }).click();

  // Pick the first 8 of 12 best-3rd-place candidates so the KO bracket
  // unlocks. Auto-fill produces a deterministic candidate per group; the
  // particular eight do not matter for path-tint assertions.
  const thirds = page.getByRole("button", {
    name: /Group [A-L] 3rd-place candidate/,
  });
  await expect(thirds.first()).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await thirds.nth(i).click();
  }

  // BracketTree mounts only once 8 thirds are picked; wait on R32 m0.
  await expect(cellAt(page, 0, 0)).toBeVisible();
}

function cellAt(page: Page, level: number, matchIdx: number): Locator {
  // The MatchCell outer div has aria-label="Round {level+1} match {matchIdx+1}".
  return page.locator(
    `[aria-label="Round ${level + 1} match ${matchIdx + 1}"]`,
  );
}

async function pickedSideButtons(cell: Locator) {
  return {
    home: cell.locator("button").first(),
    away: cell.locator("button").nth(1),
  };
}

test.describe("Bracket path tint (CP-01)", () => {
  test("path tint persists across KO levels and clears on cascade", async ({
    page,
  }) => {
    await setupKnockoutBracket(page);

    const r32m0 = cellAt(page, 0, 0);
    const r16m0 = cellAt(page, 1, 0);
    const r32m1 = cellAt(page, 0, 1);

    // Baseline: nothing advanced yet, no path members.
    await expect(r32m0).not.toHaveAttribute("data-path-member", "true");
    await expect(r16m0).not.toHaveAttribute("data-path-member", "true");

    // Step 4: advance home at R32 m0. Cell tints.
    const r32m0Sides = await pickedSideButtons(r32m0);
    await r32m0Sides.home.click();
    await expect(r32m0).toHaveAttribute("data-path-member", "true");

    // Computed background should compose 12% --accent-warm into --bg-root.
    // We assert it is no longer the bare --bg-root colour; the colour-mix
    // resolution is browser-engine specific and not worth brittle parsing.
    const tintedBg = await r32m0.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const untintedBg = await r32m1.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(tintedBg).not.toBe(untintedBg);
    expect(tintedBg).not.toBe("rgb(0, 0, 0)");
    expect(tintedBg).not.toBe("rgba(0, 0, 0, 0)");

    // Also advance R32 m1 (the second R32 match feeding R16 m0) so the
    // R16 m0 cell has both upstream chips and is clickable on home side.
    const r32m1Sides = await pickedSideButtons(r32m1);
    await r32m1Sides.home.click();
    await expect(r32m1).toHaveAttribute("data-path-member", "true");

    // Step 5: advance home at R16 m0. Both R32 m0 and R16 m0 stay tinted.
    const r16m0Sides = await pickedSideButtons(r16m0);
    await r16m0Sides.home.click();
    await expect(r32m0).toHaveAttribute("data-path-member", "true");
    await expect(r16m0).toHaveAttribute("data-path-member", "true");

    // Step 6: change the R32 m0 advancer by clicking the away side. The
    // R32 cell stays tinted (now reflecting the new advancer); the R16
    // cell loses its tint because handleAdvance() cascade-cleared its
    // entry in koAdvancers.
    await r32m0Sides.away.click();
    await expect(r32m0).toHaveAttribute("data-path-member", "true");
    await expect(r16m0).not.toHaveAttribute("data-path-member", "true");
  });

  test("cascade-clear is scoped: picking in one half preserves the other half", async ({
    page,
  }) => {
    // Regression: handleAdvance() used to wipe every cell from the next
    // stage onward, so picking any R16 winner erased all picks across both
    // bracket halves of QF / SF / Final. The fix scopes the clear to just
    // the specific downstream path (R16 m → QF ⌊m/2⌋ → SF ⌊m/4⌋ → Final).
    await setupKnockoutBracket(page);

    // Auto-advance one full top-half path through to the Final so there
    // is a chain to preserve: R32 m0+m1 → R16 m0 → R32 m2+m3 → R16 m1 →
    // QF m0 (these feed the SF). We then pick a bottom-half R32 winner
    // and verify the QF m0 tint survives.
    async function advanceHome(level: number, m: number) {
      const cell = cellAt(page, level, m);
      const sides = await pickedSideButtons(cell);
      await sides.home.click();
      await expect(cell).toHaveAttribute("data-path-member", "true");
    }

    await advanceHome(0, 0);
    await advanceHome(0, 1);
    await advanceHome(1, 0);
    await advanceHome(0, 2);
    await advanceHome(0, 3);
    await advanceHome(1, 1);
    await advanceHome(2, 0);

    // Now pick a bottom-half R32 match (m=8 lives in the opposite half of
    // the bracket from QF m0, which is fed by R32 m0..3). Under the old
    // cascade, this click would clear every R16, QF, SF, and Final slot.
    // Under the fix, it only clears R16 m4 / QF m2 / SF m1 / Final.
    await advanceHome(0, 8);

    // QF m0 must still be tinted: nothing this pick touched should affect it.
    await expect(cellAt(page, 2, 0)).toHaveAttribute(
      "data-path-member",
      "true",
    );
    // Sanity: the R32 cells we set on the top half are still tinted too.
    await expect(cellAt(page, 0, 0)).toHaveAttribute(
      "data-path-member",
      "true",
    );
    await expect(cellAt(page, 1, 0)).toHaveAttribute(
      "data-path-member",
      "true",
    );
  });

  test("reduced motion: cell tints still render, connector draw-in is absent", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setupKnockoutBracket(page);

    const r32m0 = cellAt(page, 0, 0);
    const sides = await pickedSideButtons(r32m0);
    await sides.home.click();
    await expect(r32m0).toHaveAttribute("data-path-member", "true");

    // The Phase E connector draw-in animation gates on shouldAnimate,
    // which short-circuits under prefers-reduced-motion. The reduced-
    // motion branch clears the inline strokeDasharray/strokeDashoffset
    // styles entirely; no draw-in transition should be applied.
    const inlineStyle =
      (await page.locator("svg path").first().getAttribute("style")) ?? "";
    expect(inlineStyle).not.toContain("stroke-dashoffset");
    expect(inlineStyle).not.toContain("stroke-dasharray");
  });
});
