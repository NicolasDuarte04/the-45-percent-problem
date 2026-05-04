import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./tests/visual/.playwright-output",
  snapshotDir: "./tests/visual/__snapshots__",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // Anti-aliasing and subpixel font rendering differ slightly between the
  // local Playwright Docker image and the GitHub-hosted runner that uses the
  // same image. Allow up to 5% pixel drift on screenshot snapshots so those
  // host-level differences don't break otherwise-stable visuals. Per-test
  // overrides (e.g. tighter tolerances) still win.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.05 },
  },
  use: {
    baseURL: "http://localhost:3000",
    colorScheme: "dark",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // In CI a `next build` has already run; reuse the production artifact.
    // Locally, `next dev` is faster (no prior build required).
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
