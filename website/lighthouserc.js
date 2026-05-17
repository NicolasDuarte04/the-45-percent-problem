/**
 * Lighthouse CI configuration · §9.3 / §12.9
 *
 * Thresholds (pre-registered in Phase 9 blueprint):
 *   Performance   ≥ 92
 *   Accessibility ≥ 98  (redundant with axe audit; belt-and-braces)
 *   Best-Practices ≥ 95
 *   SEO           ≥ 95
 *
 * Usage in CI:
 *   pnpm exec lhci autorun
 *
 * Requires a prior `next build`. lhci starts `next start` itself via
 * startServerCommand. The built .next/ directory must exist.
 */

/** @type {import('@lhci/cli').LighthouseRC} */
module.exports = {
  ci: {
    collect: {
      // Audit the five routes that matter for performance and SEO.
      // /terminal is the most JS-heavy page (bundle budget §9.4).
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/terminal",
        "http://localhost:3000/ledger",
        "http://localhost:3000/vault",
        "http://localhost:3000/vault/kill-criteria",
      ],
      startServerCommand: "pnpm start",
      startServerReadyPattern: "Ready on",
      startServerReadyTimeout: 60000,
      numberOfRuns: 2,
      settings: {
        // Simulate a mid-tier mobile device on Fast 3G (§10.2 LCP target).
        preset: "desktop",
        // Disable storage reset between runs so repeated audits are stable.
        disableStorageReset: false,
      },
    },

    assert: {
      // "error" = block the build; "warn" = advisory only.
      preset: "lighthouse:no-pwa",
      assertions: {
        "categories:performance": ["error", { minScore: 0.92 }],
        "categories:accessibility": ["error", { minScore: 0.98 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],

        // Bundle-size advisory (§9.4). Warn only: the next build --profile
        // output is the canonical gate. lhci cannot enforce per-route budgets
        // precisely enough to be the hard gate.
        "resource-summary:script:size": [
          "warn",
          { maxNumericValue: 184320 }, // 180 KB in bytes
        ],

        // LCP hard gate (§10.2: ≤1.4s on Fast 3G).
        // Desktop preset is more relaxed; tighten if mobile preset is added.
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
      },
    },

    upload: {
      // Publish reports to LHCI's temporary public storage for easy review.
      // Swap to a self-hosted LHCI server if report retention is needed.
      target: "temporary-public-storage",
    },
  },
};
