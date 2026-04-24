/**
 * Playwright config for the axe-core accessibility audit suite (§12.9).
 *
 * Distinct from the visual-regression config (playwright.config.ts) so
 * the two suites can run independently in CI with different webServer
 * strategies:
 *   - Visual tests → `next dev` (HMR, no prior build required)
 *   - a11y tests   → `next start` (production build, matches Lighthouse env)
 *
 * Usage:
 *   pnpm run test:a11y                  # local (reuses existing server)
 *   pnpm exec playwright test --config playwright.a11y.config.ts  # explicit
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/a11y",
  outputDir: "./tests/a11y/.playwright-output",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://localhost:3000",
    // Audit both light (editorial) and dark (quant) canvases.
    // colorScheme is not forced here — pages use data-canvas attribute,
    // not prefers-color-scheme, for canvas selection.
  },

  projects: [
    {
      name: "chromium-a11y",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Requires a production build (`next build`) to have run first.
  // In CI this is guaranteed by the build step that precedes test:a11y.
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
