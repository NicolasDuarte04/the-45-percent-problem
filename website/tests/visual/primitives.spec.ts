import { test, expect, type Locator, type Page } from "@playwright/test";

const PAGE = "/dev/primitives";

test.describe("Primitives showcase — render correctness", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForLoadState("networkidle");
  });

  test("page loads and heading is visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "/dev/primitives" })).toBeVisible();
  });

  // ── MonoNumber ──────────────────────────────────────────────────────────────
  test.describe("MonoNumber", () => {
    test("renders zero (0.00)", async ({ page }) => {
      const section = sectionFor(page, "MonoNumber");
      await expect(section.getByText("0.00", { exact: true })).toBeVisible();
    });

    test("renders small decimal (0.042)", async ({ page }) => {
      const section = sectionFor(page, "MonoNumber");
      await expect(section.getByText("0.042", { exact: true })).toBeVisible();
    });

    test("renders large value (1234567.89)", async ({ page }) => {
      const section = sectionFor(page, "MonoNumber");
      await expect(section.getByText("1234567.89", { exact: true })).toBeVisible();
    });

    test("renders negative value (-42.5)", async ({ page }) => {
      const section = sectionFor(page, "MonoNumber");
      await expect(section.getByText("-42.5", { exact: true })).toBeVisible();
    });

    test("screenshot — all MonoNumber variants", async ({ page }) => {
      await expect(sectionFor(page, "MonoNumber")).toHaveScreenshot("mono-number.png");
    });
  });

  // ── ProbabilityCell ─────────────────────────────────────────────────────────
  test.describe("ProbabilityCell", () => {
    test("near-zero renders 0.8%", async ({ page }) => {
      const section = sectionFor(page, "ProbabilityCell");
      await expect(section.getByText("0.8%", { exact: true })).toBeVisible();
    });

    test("mid renders 41.2%", async ({ page }) => {
      const section = sectionFor(page, "ProbabilityCell");
      await expect(section.getByText("41.2%", { exact: true })).toBeVisible();
    });

    test("near-certain renders 97.3%", async ({ page }) => {
      const section = sectionFor(page, "ProbabilityCell");
      await expect(section.getByText("97.3%", { exact: true })).toBeVisible();
    });

    test("boundary: 0.0% is rendered", async ({ page }) => {
      const section = sectionFor(page, "ProbabilityCell");
      await expect(section.getByText("0.0%", { exact: true })).toBeVisible();
    });

    test("boundary: 100.0% is rendered", async ({ page }) => {
      const section = sectionFor(page, "ProbabilityCell");
      await expect(section.getByText("100.0%", { exact: true })).toBeVisible();
    });

    test("aria-label on 41.2% says '41.2 percent'", async ({ page }) => {
      const section = sectionFor(page, "ProbabilityCell");
      await expect(section.locator("[aria-label='41.2 percent']")).toBeVisible();
    });

    test("screenshot — all ProbabilityCell variants", async ({ page }) => {
      await expect(sectionFor(page, "ProbabilityCell")).toHaveScreenshot("probability-cell.png");
    });
  });

  // ── OddsCell ────────────────────────────────────────────────────────────────
  test.describe("OddsCell", () => {
    test("short-price renders 1.150", async ({ page }) => {
      const section = sectionFor(page, "OddsCell");
      await expect(section.getByText("1.150", { exact: true })).toBeVisible();
    });

    test("evens renders 2.000", async ({ page }) => {
      const section = sectionFor(page, "OddsCell");
      await expect(section.getByText("2.000", { exact: true })).toBeVisible();
    });

    test("long-price renders 12.500", async ({ page }) => {
      const section = sectionFor(page, "OddsCell");
      await expect(section.getByText("12.500", { exact: true })).toBeVisible();
    });

    test("extreme renders 250.000", async ({ page }) => {
      const section = sectionFor(page, "OddsCell");
      await expect(section.getByText("250.000", { exact: true })).toBeVisible();
    });

    test("screenshot — all OddsCell variants", async ({ page }) => {
      await expect(sectionFor(page, "OddsCell")).toHaveScreenshot("odds-cell.png");
    });
  });

  // ── EdgeBadge ───────────────────────────────────────────────────────────────
  test.describe("EdgeBadge", () => {
    test("positive above threshold renders +4.7pp", async ({ page }) => {
      const section = sectionFor(page, "EdgeBadge");
      await expect(section.getByText("+4.7pp", { exact: true })).toBeVisible();
    });

    test("negative above threshold renders −5.1pp (unicode minus)", async ({ page }) => {
      const section = sectionFor(page, "EdgeBadge");
      // The EdgeBadge uses Unicode minus '−' (U+2212), not hyphen '-'
      await expect(section.getByText("−5.1pp", { exact: true })).toBeVisible();
    });

    test("below-threshold positive is muted (not edge-positive color)", async ({ page }) => {
      const section = sectionFor(page, "EdgeBadge");
      const el = section.getByText("+1.2pp", { exact: true });
      await expect(el).toBeVisible();
      const color = await el.evaluate((n) => getComputedStyle(n).color);
      // Muted tertiary, NOT the teal edge-positive (110, 231, 183)
      expect(color).not.toBe("rgb(110, 231, 183)");
    });

    test("zero renders +0.0pp", async ({ page }) => {
      const section = sectionFor(page, "EdgeBadge");
      await expect(section.getByText("+0.0pp", { exact: true })).toBeVisible();
    });

    test("negative below threshold renders −0.8pp", async ({ page }) => {
      const section = sectionFor(page, "EdgeBadge");
      await expect(section.getByText("−0.8pp", { exact: true })).toBeVisible();
    });

    test("screenshot — all EdgeBadge variants", async ({ page }) => {
      await expect(sectionFor(page, "EdgeBadge")).toHaveScreenshot("edge-badge.png");
    });
  });

  // ── DivergenceBar ───────────────────────────────────────────────────────────
  test.describe("DivergenceBar", () => {
    test("renders 5 bars with role=img", async ({ page }) => {
      const section = sectionFor(page, "DivergenceBar");
      const bars = section.locator('[role="img"]');
      await expect(bars).toHaveCount(5);
    });

    test("positive edge bar: aria-label shows model > market", async ({ page }) => {
      const bar = page.getByRole("img", { name: /model 62\.0%, market 51\.0%/ });
      await expect(bar).toBeVisible();
    });

    test("negative edge bar: aria-label shows model < market", async ({ page }) => {
      const bar = page.getByRole("img", { name: /model 28\.0%, market 44\.0%/ });
      await expect(bar).toBeVisible();
    });

    test("near-parity bar exists", async ({ page }) => {
      const bar = page.getByRole("img", { name: /model 33\.0%, market 34\.0%/ });
      await expect(bar).toBeVisible();
    });

    test("near-zero bar exists", async ({ page }) => {
      const bar = page.getByRole("img", { name: /model 4\.0%, market 2\.0%/ });
      await expect(bar).toBeVisible();
    });

    test("screenshot — all DivergenceBar variants", async ({ page }) => {
      await expect(sectionFor(page, "DivergenceBar")).toHaveScreenshot("divergence-bar.png");
    });
  });

  // ── SnapshotTimestamp ───────────────────────────────────────────────────────
  test.describe("SnapshotTimestamp", () => {
    test("fresh renders FRESH pill", async ({ page }) => {
      const section = sectionFor(page, "SnapshotTimestamp");
      await expect(section.getByText("FRESH", { exact: true }).first()).toBeVisible();
    });

    test("stale renders STALE pill", async ({ page }) => {
      const section = sectionFor(page, "SnapshotTimestamp");
      await expect(section.getByText("STALE", { exact: true })).toBeVisible();
    });

    test("broken renders BROKEN pill", async ({ page }) => {
      const section = sectionFor(page, "SnapshotTimestamp");
      await expect(section.getByText("BROKEN", { exact: true })).toBeVisible();
    });

    test("renders the snapshot ID string", async ({ page }) => {
      const section = sectionFor(page, "SnapshotTimestamp");
      await expect(section.getByText("2026-04-23T00:00Z", { exact: true }).first()).toBeVisible();
    });

    test("screenshot — all SnapshotTimestamp variants", async ({ page }) => {
      await expect(sectionFor(page, "SnapshotTimestamp")).toHaveScreenshot("snapshot-timestamp.png");
    });
  });

  // ── GateStatusPill ──────────────────────────────────────────────────────────
  test.describe("GateStatusPill", () => {
    test("OPEN pill is visible (aria-label)", async ({ page }) => {
      const section = sectionFor(page, "GateStatusPill");
      await expect(section.locator("[aria-label='gate status OPEN']")).toBeVisible();
    });

    test("FIRED pill is visible", async ({ page }) => {
      const section = sectionFor(page, "GateStatusPill");
      await expect(
        section.locator("[aria-label^='gate status FIRED']").first()
      ).toBeVisible();
    });

    test("FIRED with rules shows tooltip on hover", async ({ page }) => {
      const section = sectionFor(page, "GateStatusPill");
      // The FIRED pill with rulesTripped — last FIRED pill in the section
      const firedWithRules = section
        .locator("[aria-label*='named_event']");
      await firedWithRules.hover();
      await expect(page.getByText("Rules tripped:")).toBeVisible();
      await expect(page.getByText(/named_event/)).toBeVisible();
    });

    test("screenshot — all GateStatusPill variants", async ({ page }) => {
      await expect(sectionFor(page, "GateStatusPill")).toHaveScreenshot("gate-status-pill.png");
    });
  });

  // ── HashChip ────────────────────────────────────────────────────────────────
  test.describe("HashChip", () => {
    test("code_sha chip renders truncated SHA (a1b2c3d)", async ({ page }) => {
      const section = sectionFor(page, "HashChip");
      await expect(section.getByText("a1b2c3d", { exact: true })).toBeVisible();
    });

    test("both chips are buttons", async ({ page }) => {
      const section = sectionFor(page, "HashChip");
      const buttons = section.getByRole("button");
      await expect(buttons).toHaveCount(2);
    });

    test("chip has descriptive aria-label", async ({ page }) => {
      const section = sectionFor(page, "HashChip");
      const btn = section.getByRole("button", { name: /code SHA.*click to copy/i });
      await expect(btn).toBeVisible();
    });

    test("screenshot — HashChip variants", async ({ page }) => {
      await expect(sectionFor(page, "HashChip")).toHaveScreenshot("hash-chip.png");
    });
  });

  // ── ConfidenceInterval ──────────────────────────────────────────────────────
  test.describe("ConfidenceInterval", () => {
    test("tight CI renders lower bound (0.038)", async ({ page }) => {
      const section = sectionFor(page, "ConfidenceInterval");
      // The CI span contains "0.038" as part of "[0.038, 0.047]"
      await expect(section.locator("span").filter({ hasText: "0.038" }).first()).toBeVisible();
    });

    test("high probability CI renders upper bound (0.891)", async ({ page }) => {
      const section = sectionFor(page, "ConfidenceInterval");
      await expect(section.locator("span").filter({ hasText: "0.891" }).first()).toBeVisible();
    });

    test("CI has aria-label describing range in percent", async ({ page }) => {
      const section = sectionFor(page, "ConfidenceInterval");
      const el = section.locator("[aria-label*='3.8 to 4.7 percent']");
      await expect(el).toBeVisible();
    });

    test("screenshot — all ConfidenceInterval variants", async ({ page }) => {
      await expect(sectionFor(page, "ConfidenceInterval")).toHaveScreenshot("confidence-interval.png");
    });
  });

  // ── KillCriteriaBanner ──────────────────────────────────────────────────────
  test.describe("KillCriteriaBanner", () => {
    test("two active banners render (active=false produces no output)", async ({ page }) => {
      const section = sectionFor(page, "KillCriteriaBanner");
      const alerts = section.getByRole("alert");
      await expect(alerts).toHaveCount(2);
    });

    test("active banner with condition is visible", async ({ page }) => {
      await expect(
        page.getByText("M_STAR.log_loss > M0.log_loss by R16")
      ).toBeVisible();
    });

    test("active banner links to /vault/kill-criteria", async ({ page }) => {
      const section = sectionFor(page, "KillCriteriaBanner");
      const link = section.getByRole("link", { name: /vault\/kill-criteria/ });
      await expect(link.first()).toBeVisible();
      await expect(link.first()).toHaveAttribute("href", "/vault/kill-criteria");
    });

    test("screenshot — KillCriteriaBanner variants", async ({ page }) => {
      await expect(sectionFor(page, "KillCriteriaBanner")).toHaveScreenshot(
        "kill-criteria-banner.png"
      );
    });
  });

  // ── Full-page screenshot ─────────────────────────────────────────────────────
  test("full page screenshot", async ({ page }) => {
    await expect(page).toHaveScreenshot("primitives-full-page.png", { fullPage: true });
  });
});

/** Returns the section element whose h2 exactly matches the given title. */
function sectionFor(page: Page, title: string): Locator {
  return page.locator("section").filter({ has: page.locator(`h2:text-is("${title}")`) });
}
