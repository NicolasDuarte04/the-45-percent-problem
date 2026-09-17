/**
 * axe-core accessibility audit · §10.1 / §12.9
 *
 * Audits the five primary routes for WCAG 2.2 AA compliance.
 * Any serious or critical violation fails the build.
 *
 * Runs against the production build (`next start`) via the webServer
 * config in playwright.a11y.config.ts. Do not run against `next dev`.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AUDITED_ROUTES = [
  { path: "/", label: "Landing" },
  { path: "/terminal", label: "Divergence Terminal" },
  { path: "/ledger", label: "Transparency Ledger" },
  { path: "/vault", label: "Research Vault index" },
  { path: "/vault/kill-criteria", label: "Kill-criteria status" },
];

for (const route of AUDITED_ROUTES) {
  test(`${route.label} (${route.path}); no serious axe violations`, async ({ page }) => {
    const response = await page.goto(route.path);

    // Guard: page must load successfully before we audit it.
    expect(
      response?.status(),
      `${route.path} returned HTTP ${response?.status()}`
    ).toBeLessThan(400);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    expect(
      blocking,
      blocking
        .map(
          (v) =>
            `\n  [${v.impact}] ${v.id}: ${v.description}\n` +
            v.nodes
              .slice(0, 2)
              .map((n) => `    target: ${n.target.join(", ")}`)
              .join("\n")
        )
        .join("")
    ).toHaveLength(0);
  });
}
