# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: axe.spec.ts >> Research Vault index (/vault); no serious axe violations
- Location: tests/a11y/axe.spec.ts:23:7

# Error details

```
Error: 
  [serious] color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
    target: span[aria-label="beta"]
    target: header > .vault-eyebrow
  [serious] link-in-text-block: Ensure links are distinguished from surrounding text in a way that does not rely on color
    target: a[target="_blank"]

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 2
Received array:  [{"description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds", "help": "Elements must meet minimum color contrast ratio thresholds", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright", "id": "color-contrast", "impact": "serious", "nodes": [{"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.78 (foreground color: #9b9792, background color: #fcfaf4, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span aria-label=\"beta\" style=\"font-family:var(--font-mono);font-size:9px;margin-left:5px;opacity:0.6;text-transform:uppercase;letter-spacing:.10em\">Beta</span>", "impact": "serious", "none": [], "target": ["span[aria-label=\"beta\"]"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8a847c, background color: #f7f4ec, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<p class=\"vault-eyebrow\" style=\"margin-bottom:16px\">Research Vault</p>", "impact": "serious", "none": [], "target": ["header > .vault-eyebrow"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.08 (foreground color: #8a847c, background color: #eeeae0, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<p class=\"vault-eyebrow\" style=\"margin-bottom:12px\">§ I · Essays</p>", "impact": "serious", "none": [], "target": ["article:nth-child(1) > .vault-eyebrow"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.08 (foreground color: #8a847c, background color: #eeeae0, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:11px;line-height:22px;font-weight:500;letter-spacing:0.04em;color:var(--text-quiet);white-space:nowrap;text-align:right;text-transform:none\">20 min</span>", "impact": "serious", "none": [], "target": ["a[href$=\"methodology\"] > .mono"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.08 (foreground color: #8a847c, background color: #eeeae0, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:11px;line-height:22px;font-weight:500;letter-spacing:0.04em;color:var(--text-quiet);white-space:nowrap;text-align:right;text-transform:none\">10 to 12 min</span>", "impact": "serious", "none": [], "target": ["a[href$=\"the-45-percent\"] > .mono"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.08 (foreground color: #8a847c, background color: #eeeae0, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:11px;line-height:22px;font-weight:500;letter-spacing:0.04em;color:var(--text-quiet);white-space:nowrap;text-align:right;text-transform:none\">5 to 6 min</span>", "impact": "serious", "none": [], "target": ["a[href$=\"why-probabilities\"] > .mono"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.08 (foreground color: #8a847c, background color: #eeeae0, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:11px;line-height:22px;font-weight:500;letter-spacing:0.04em;color:var(--text-quiet);white-space:nowrap;text-align:right;text-transform:none\">12 to 15 min</span>", "impact": "serious", "none": [], "target": ["a[href$=\"models\"] > .mono"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.08 (foreground color: #8a847c, background color: #eeeae0, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:11px;line-height:22px;font-weight:500;letter-spacing:0.04em;color:var(--text-quiet);white-space:nowrap;text-align:right;text-transform:none\">10 min</span>", "impact": "serious", "none": [], "target": ["a[href$=\"simulation\"] > .mono"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.08 (foreground color: #8a847c, background color: #eeeae0, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:11px;line-height:22px;font-weight:500;letter-spacing:0.04em;color:var(--text-quiet);white-space:nowrap;text-align:right;text-transform:none\">8 min</span>", "impact": "serious", "none": [], "target": ["a[href$=\"market-layer\"] > .mono"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.08 (foreground color: #8a847c, background color: #eeeae0, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:11px;line-height:22px;font-weight:500;letter-spacing:0.04em;color:var(--text-quiet);white-space:nowrap;text-align:right;text-transform:none\">10 to 12 min</span>", "impact": "serious", "none": [], "target": ["a[href$=\"volatility-gate\"] > .mono"]}, …], "tags": ["cat.color", "wcag2aa", "wcag143", "TTv5", "TT13.c", "EN-301-549", "EN-9.1.4.3", "ACT", "RGAAv4", "RGAA-3.2.1"]}, {"description": "Ensure links are distinguished from surrounding text in a way that does not rely on color", "help": "Links must be distinguishable without relying on color", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/link-in-text-block?application=playwright", "id": "link-in-text-block", "impact": "serious", "nodes": [{"all": [], "any": [[Object], [Object]], "failureSummary": "Fix any of the following:
  The link has insufficient color contrast of 1.19:1 with the surrounding text. (Minimum contrast is 3:1, link text: #0f6b7d, surrounding text: #5a5550)
  The link has no styling (such as underline) to distinguish it from the surrounding text", "html": "<a href=\"https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:var(--accent-focus);text-decoration:none\">osf.io/spmkg</a>", "impact": "serious", "none": [], "target": ["a[target=\"_blank\"]"]}], "tags": ["cat.color", "wcag2a", "wcag141", "TTv5", "TT13.a", "EN-301-549", "EN-9.1.4.1", "RGAAv4", "RGAA-10.6.1"]}]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - link "The 45% Problem" [ref=e6] [cursor=pointer]:
            - /url: /
          - link "Today’s brief" [ref=e7] [cursor=pointer]:
            - /url: /brief
          - link "Open terminal →" [ref=e8] [cursor=pointer]:
            - /url: /terminal
            - text: Open terminal
            - generic [ref=e9]: →
        - navigation "Primary" [ref=e10]:
          - link "Overview" [ref=e11] [cursor=pointer]:
            - /url: /
          - link "Matches" [ref=e12] [cursor=pointer]:
            - /url: /terminal
          - link "Ledger" [ref=e13] [cursor=pointer]:
            - /url: /ledger
          - link "Bracket" [ref=e14] [cursor=pointer]:
            - /url: /bracket
          - link "Vault" [ref=e15] [cursor=pointer]:
            - /url: /vault
          - link "Scenario Simulatorbeta" [ref=e16] [cursor=pointer]:
            - /url: /scenario
            - text: Scenario SimulatorBeta
    - main [ref=e17]:
      - generic [ref=e19]:
        - generic [ref=e20]:
          - paragraph [ref=e21]: Research Vault
          - heading "The methodology, written for the web." [level=1] [ref=e22]
          - paragraph [ref=e23]: In the v1.0 site the methodology lived inside a PDF. Here it lives in prose, with living figures that read from the current snapshot. A non-specialist can follow the argument; a specialist can verify it.
        - region "Vault pillars" [ref=e24]:
          - article [ref=e25]:
            - paragraph [ref=e26]: § I · Essays
            - heading "Long-form" [level=2] [ref=e27]
            - paragraph [ref=e28]: Web-native readings of the methodology. Each piece stands alone; figures inside read from the current snapshot.
            - list [ref=e29]:
              - listitem [ref=e30]:
                - link "Methodology 20 min" [ref=e31] [cursor=pointer]:
                  - /url: /vault/methodology
                  - generic [ref=e32]: Methodology
                  - generic [ref=e33]: 20 min
              - listitem [ref=e34]:
                - link "The 45% Problem 10 to 12 min" [ref=e35] [cursor=pointer]:
                  - /url: /vault/the-45-percent
                  - generic [ref=e36]: The 45% Problem
                  - generic [ref=e37]: 10 to 12 min
              - listitem [ref=e38]:
                - link "Why probabilities, not predictions 5 to 6 min" [ref=e39] [cursor=pointer]:
                  - /url: /vault/why-probabilities
                  - generic [ref=e40]: Why probabilities, not predictions
                  - generic [ref=e41]: 5 to 6 min
              - listitem [ref=e42]:
                - link "Anatomy of M0 through M★ 12 to 15 min" [ref=e43] [cursor=pointer]:
                  - /url: /vault/models
                  - generic [ref=e44]: Anatomy of M0 through M★
                  - generic [ref=e45]: 12 to 15 min
              - listitem [ref=e46]:
                - link "Bivariate Poisson & Monte Carlo 10 min" [ref=e47] [cursor=pointer]:
                  - /url: /vault/simulation
                  - generic [ref=e48]: Bivariate Poisson & Monte Carlo
                  - generic [ref=e49]: 10 min
              - listitem [ref=e50]:
                - link "De-vigging, edge, and the power method 8 min" [ref=e51] [cursor=pointer]:
                  - /url: /vault/market-layer
                  - generic [ref=e52]: De-vigging, edge, and the power method
                  - generic [ref=e53]: 8 min
              - listitem [ref=e54]:
                - link "The five gate rules 10 to 12 min" [ref=e55] [cursor=pointer]:
                  - /url: /vault/volatility-gate
                  - generic [ref=e56]: The five gate rules
                  - generic [ref=e57]: 10 to 12 min
              - listitem [ref=e58]:
                - link "Brier, log-loss, CLV in plain English 8 min" [ref=e59] [cursor=pointer]:
                  - /url: /vault/evaluation
                  - generic [ref=e60]: Brier, log-loss, CLV in plain English
                  - generic [ref=e61]: 8 min
          - article [ref=e62]:
            - paragraph [ref=e63]: § II · Artifacts
            - heading "Record of method" [level=2] [ref=e64]
            - paragraph [ref=e65]: Sources of record. The Phase 1 framework PDF and the OSF pre-registration lockdown.
            - list [ref=e66]:
              - listitem [ref=e67]:
                - link "Phase 1 framework (PDF) Artifact" [ref=e68] [cursor=pointer]:
                  - /url: /vault/framework
                  - generic [ref=e69]: Phase 1 framework (PDF)
                  - generic [ref=e70]: Artifact
              - listitem [ref=e71]:
                - link "OSF pre-registration Artifact" [ref=e72] [cursor=pointer]:
                  - /url: /vault/preregistration
                  - generic [ref=e73]: OSF pre-registration
                  - generic [ref=e74]: Artifact
          - article [ref=e75]:
            - paragraph [ref=e76]: § III · Status
            - heading "Public commitments" [level=2] [ref=e77]
            - paragraph [ref=e78]: "The kill-criteria statement is a pre-registered commitment: if M★ underperforms the null baseline by the Round of 16, the project publishes a null result."
            - list [ref=e79]:
              - listitem [ref=e80]:
                - link "Kill-criteria statement 7 to 9 min" [ref=e81] [cursor=pointer]:
                  - /url: /vault/kill-criteria
                  - generic [ref=e82]: Kill-criteria statement
                  - generic [ref=e83]: 7 to 9 min
        - region "Reference materials" [ref=e84]:
          - article [ref=e85]:
            - generic [ref=e86]:
              - paragraph [ref=e87]: § IV · Reference
              - heading "Glossary & notation" [level=2] [ref=e88]
              - paragraph [ref=e89]: Definitions, the symbol table mirroring the paper, and the canonical citation block.
            - list [ref=e90]:
              - listitem [ref=e91]:
                - link "Glossary A to Z" [ref=e92] [cursor=pointer]:
                  - /url: /vault/glossary
              - listitem [ref=e93]:
                - link "Symbol table" [ref=e94] [cursor=pointer]:
                  - /url: /vault/notation
              - listitem [ref=e95]:
                - link "Bibliography" [ref=e96] [cursor=pointer]:
                  - /url: /vault/references
              - listitem [ref=e97]:
                - link "BibTeX & APA" [ref=e98] [cursor=pointer]:
                  - /url: /vault/citation
    - contentinfo [ref=e99]:
      - generic [ref=e100]:
        - generic [ref=e101]:
          - generic [ref=e102]: About
          - paragraph [ref=e103]:
            - strong [ref=e104]: The 45% Problem
            - text: . Probabilistic Pricing for FIFA World Cup 2026.
          - paragraph [ref=e105]: Research publication. No content on this site constitutes investment or gambling advice.
        - generic [ref=e106]:
          - generic [ref=e107]: Provenance
          - generic [ref=e108]:
            - term [ref=e109]: snapshot
            - definition [ref=e110]: 2026-05-12T12:44Z
            - term [ref=e111]: code
            - definition [ref=e112]: 9e8635ce2549523f
            - term [ref=e113]: data
            - definition [ref=e114]: sha256:49974caa284edc2eb31524afb92aca4b
        - generic [ref=e115]:
          - generic [ref=e116]: Cite
          - paragraph [ref=e117]:
            - text: Duarte Jaraba, N. (2026).
            - emphasis [ref=e118]: The 45% Problem
            - text: . OSF.
            - link "osf.io/spmkg" [ref=e119] [cursor=pointer]:
              - /url: https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321
  - status
  - button "Open Next.js Dev Tools" [ref=e125] [cursor=pointer]:
    - img [ref=e126]
  - alert [ref=e129]
```

# Test source

```ts
  1  | /**
  2  |  * axe-core accessibility audit · §10.1 / §12.9
  3  |  *
  4  |  * Audits the five primary routes for WCAG 2.2 AA compliance.
  5  |  * Any serious or critical violation fails the build.
  6  |  *
  7  |  * Runs against the production build (`next start`) via the webServer
  8  |  * config in playwright.a11y.config.ts. Do not run against `next dev`.
  9  |  */
  10 | 
  11 | import { test, expect } from "@playwright/test";
  12 | import AxeBuilder from "@axe-core/playwright";
  13 | 
  14 | const AUDITED_ROUTES = [
  15 |   { path: "/", label: "Landing" },
  16 |   { path: "/terminal", label: "Divergence Terminal" },
  17 |   { path: "/ledger", label: "Transparency Ledger" },
  18 |   { path: "/vault", label: "Research Vault index" },
  19 |   { path: "/vault/kill-criteria", label: "Kill-criteria status" },
  20 | ];
  21 | 
  22 | for (const route of AUDITED_ROUTES) {
  23 |   test(`${route.label} (${route.path}); no serious axe violations`, async ({ page }) => {
  24 |     const response = await page.goto(route.path);
  25 | 
  26 |     // Guard: page must load successfully before we audit it.
  27 |     expect(
  28 |       response?.status(),
  29 |       `${route.path} returned HTTP ${response?.status()}`
  30 |     ).toBeLessThan(400);
  31 | 
  32 |     const results = await new AxeBuilder({ page })
  33 |       .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  34 |       .analyze();
  35 | 
  36 |     const blocking = results.violations.filter(
  37 |       (v) => v.impact === "serious" || v.impact === "critical"
  38 |     );
  39 | 
  40 |     expect(
  41 |       blocking,
  42 |       blocking
  43 |         .map(
  44 |           (v) =>
  45 |             `\n  [${v.impact}] ${v.id}: ${v.description}\n` +
  46 |             v.nodes
  47 |               .slice(0, 2)
  48 |               .map((n) => `    target: ${n.target.join(", ")}`)
  49 |               .join("\n")
  50 |         )
  51 |         .join("")
> 52 |     ).toHaveLength(0);
     |       ^ Error: 
  53 |   });
  54 | }
  55 | 
```