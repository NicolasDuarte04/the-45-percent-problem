# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: axe.spec.ts >> Transparency Ledger (/ledger); no serious axe violations
- Location: tests/a11y/axe.spec.ts:23:7

# Error details

```
Error: 
  [serious] color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
    target: span[aria-label="beta"]
    target: .items-end > .text-\[10px\].mono
  [serious] link-in-text-block: Ensure links are distinguished from surrounding text in a way that does not rely on color
    target: .transition-colors[target="_blank"][rel="noopener noreferrer"]
    target: .leading-relaxed > a[target="_blank"][rel="noopener noreferrer"]

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 2
Received array:  [{"description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds", "help": "Elements must meet minimum color contrast ratio thresholds", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright", "id": "color-contrast", "impact": "serious", "nodes": [{"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.54 (foreground color: #707782, background color: #1c222b, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span aria-label=\"beta\" style=\"font-family:var(--font-mono);font-size:9px;margin-left:5px;opacity:0.6;text-transform:uppercase;letter-spacing:.10em\">Beta</span>", "impact": "serious", "none": [], "target": ["span[aria-label=\"beta\"]"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 4.05 (foreground color: #6d7585, background color: #0f1216, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono text-[10px]\" style=\"color:var(--text-quiet)\">Guided tour · <!-- -->4<!-- --> steps · ~<!-- -->60<!-- -->s</span>", "impact": "serious", "none": [], "target": [".items-end > .text-\\[10px\\].mono"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 4.05 (foreground color: #6d7585, background color: #0f1216, font size: 10.1pt (13.5px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono inline-flex items-center px-1.5 py-0.5 font-medium rounded\" style=\"color:var(--text-quiet);background-color:transparent;border-radius:var(--radius-sm)\" aria-label=\"edge, negative 2.0 percentage points\">−2.0pp</span>", "impact": "serious", "none": [], "target": ["tr[data-ledger-row=\"fc-2026-06-13-GER-JAP-1x2-M0\"] > .px-2:nth-child(7) > .inline-flex.py-0\\.5.font-medium"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 4.05 (foreground color: #6d7585, background color: #0f1216, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono inline-flex items-center gap-1.5 px-1.5 py-px text-[11px] border font-medium\" style=\"color:var(--text-quiet);border-color:var(--border-subtle);background-color:transparent;border-radius:var(--radius-sm)\" aria-label=\"gate status OPEN\">Open</span>", "impact": "serious", "none": [], "target": ["tr[data-ledger-row=\"fc-2026-06-13-GER-JAP-1x2-M0\"] > .px-2:nth-child(8) > .py-px.gap-1\\.5[aria-label=\"gate status OPEN\"]"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.59 (foreground color: #515764, background color: #0f1216, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span style=\"color:var(--text-quiet);opacity:0.7\">code<!-- -->:</span>", "impact": "serious", "none": [], "target": ["tr[data-ledger-row=\"fc-2026-06-13-GER-JAP-1x2-M0\"] > .px-2:nth-child(14) > .justify-end.gap-1\\.5.flex > .ease-out.gap-1[type=\"button\"] > span:nth-child(1)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 4.05 (foreground color: #6d7585, background color: #0f1216, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span>e49a18c</span>", "impact": "serious", "none": [], "target": ["tr[data-ledger-row=\"fc-2026-06-13-GER-JAP-1x2-M0\"] > .px-2:nth-child(14) > .justify-end.gap-1\\.5.flex > .ease-out.gap-1[type=\"button\"] > span:nth-child(2)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 4.05 (foreground color: #6d7585, background color: #0f1216, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono inline-flex items-center gap-1.5 px-1.5 py-px text-[11px] border font-medium\" style=\"color:var(--text-quiet);border-color:var(--border-subtle);background-color:transparent;border-radius:var(--radius-sm)\" aria-label=\"gate status OPEN\">Open</span>", "impact": "serious", "none": [], "target": ["tr[data-ledger-row=\"fc-2026-06-12-ARG-CAN-1x2-M0\"] > .px-2:nth-child(8) > .py-px.gap-1\\.5[aria-label=\"gate status OPEN\"]"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.59 (foreground color: #515764, background color: #0f1216, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span style=\"color:var(--text-quiet);opacity:0.7\">code<!-- -->:</span>", "impact": "serious", "none": [], "target": ["tr[data-ledger-row=\"fc-2026-06-12-ARG-CAN-1x2-M0\"] > .px-2:nth-child(14) > .justify-end.gap-1\\.5.flex > .ease-out.gap-1[type=\"button\"] > span:nth-child(1)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 4.05 (foreground color: #6d7585, background color: #0f1216, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span>e49a18c</span>", "impact": "serious", "none": [], "target": ["tr[data-ledger-row=\"fc-2026-06-12-ARG-CAN-1x2-M0\"] > .px-2:nth-child(14) > .justify-end.gap-1\\.5.flex > .ease-out.gap-1[type=\"button\"] > span:nth-child(2)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 4.05 (foreground color: #6d7585, background color: #0f1216, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<div class=\"mono text-[10px] uppercase tracking-[.08em]\" style=\"color:var(--text-quiet)\">About</div>", "impact": "serious", "none": [], "target": [".space-y-2:nth-child(1) > .uppercase.tracking-\\[\\.08em\\].text-\\[10px\\]"]}, …], "tags": ["cat.color", "wcag2aa", "wcag143", "TTv5", "TT13.c", "EN-301-549", "EN-9.1.4.3", "ACT", "RGAAv4", "RGAA-3.2.1"]}, {"description": "Ensure links are distinguished from surrounding text in a way that does not rely on color", "help": "Links must be distinguishable without relying on color", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/link-in-text-block?application=playwright", "id": "link-in-text-block", "impact": "serious", "nodes": [{"all": [], "any": [[Object], [Object]], "failureSummary": "Fix any of the following:
  The link has insufficient color contrast of 1.26:1 with the surrounding text. (Minimum contrast is 3:1, link text: #7ed0e8, surrounding text: #a8afbc)
  The link has no styling (such as underline) to distinguish it from the surrounding text", "html": "<a href=\"https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"transition-colors duration-[120ms]\" style=\"color:var(--accent-focus)\">osf.io/spmkg</a>", "impact": "serious", "none": [], "target": [".transition-colors[target=\"_blank\"][rel=\"noopener noreferrer\"]"]}, {"all": [], "any": [[Object], [Object]], "failureSummary": "Fix any of the following:
  The link has insufficient color contrast of 1.26:1 with the surrounding text. (Minimum contrast is 3:1, link text: #7ed0e8, surrounding text: #a8afbc)
  The link has no styling (such as underline) to distinguish it from the surrounding text", "html": "<a href=\"https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:var(--accent-focus);text-decoration:none\">osf.io/spmkg</a>", "impact": "serious", "none": [], "target": [".leading-relaxed > a[target=\"_blank\"][rel=\"noopener noreferrer\"]"]}], "tags": ["cat.color", "wcag2a", "wcag141", "TTv5", "TT13.a", "EN-301-549", "EN-9.1.4.1", "RGAAv4", "RGAA-10.6.1"]}]
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
        - navigation "Primary" [ref=e8]:
          - link "Overview" [ref=e9] [cursor=pointer]:
            - /url: /
          - link "Matches" [ref=e10] [cursor=pointer]:
            - /url: /terminal
          - link "Ledger" [ref=e11] [cursor=pointer]:
            - /url: /ledger
          - link "Bracket" [ref=e12] [cursor=pointer]:
            - /url: /bracket
          - link "Vault" [ref=e13] [cursor=pointer]:
            - /url: /vault
          - link "Scenario Simulatorbeta" [ref=e14] [cursor=pointer]:
            - /url: /scenario
            - text: Scenario SimulatorBeta
    - main [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e18]:
          - generic [ref=e19]:
            - heading "Transparency Ledger" [level=1] [ref=e20]
            - paragraph [ref=e21]:
              - text: Append-only forecast record · 2 records ·
              - generic [ref=e22]: 1 HIT
              - text: ·
              - generic [ref=e23]: 1 MISS
              - text: ·
              - generic [ref=e24]: 0 NEUTRAL
          - generic [ref=e25]:
            - link "How to read this" [ref=e26] [cursor=pointer]:
              - /url: /ledger?guide=1
              - img [ref=e27]
              - text: How to read this
            - generic [ref=e29]: Guided tour · 4 steps · ~60s
        - generic [ref=e31]:
          - text: "Pre-registration invariant §7.2: hits and misses are rendered with identical visual weight. No forecast is ever deleted. Calibration, not accuracy, is the evaluation metric. Methodology pre-registered at"
          - link "osf.io/spmkg" [ref=e32] [cursor=pointer]:
            - /url: https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321
          - text: .
        - generic [ref=e33]:
          - region "Evaluation metrics summary" [ref=e34]:
            - generic [ref=e35]:
              - generic [ref=e36]:
                - heading "Evaluation Metrics" [level=2] [ref=e37]
                - paragraph [ref=e38]: 0 matches settled · snapshot 2026-05-12T12:44Z
              - 'generic "Kill criteria: tripped" [ref=e39]':
                - generic [ref=e40]: ◆
                - generic [ref=e41]: KILL CRITERIA TRIPPED
            - generic [ref=e42]:
              - generic [ref=e43]:
                - paragraph [ref=e44]: "Proper Scoring Rules: lower is better"
                - table [ref=e46]:
                  - rowgroup [ref=e47]:
                    - row "Metric M0 M1 M2 M3 M-star champion model" [ref=e48]:
                      - columnheader "Metric" [ref=e49]
                      - columnheader "M0" [ref=e50]
                      - columnheader "M1" [ref=e51]
                      - columnheader "M2" [ref=e52]
                      - columnheader "M3" [ref=e53]
                      - columnheader "M-star champion model" [ref=e54]: M★
                  - rowgroup [ref=e55]:
                    - 'row "Brier Brier for M0: not available Brier for M1: not available Brier for M2: not available Brier for M3: not available Brier for M_STAR: not available" [ref=e56]':
                      - cell "Brier" [ref=e57]
                      - 'cell "Brier for M0: not available" [ref=e58]': .
                      - 'cell "Brier for M1: not available" [ref=e59]': .
                      - 'cell "Brier for M2: not available" [ref=e60]': .
                      - 'cell "Brier for M3: not available" [ref=e61]': .
                      - 'cell "Brier for M_STAR: not available" [ref=e62]': .
                    - 'row "Log-loss Log-loss for M0: not available Log-loss for M1: not available Log-loss for M2: not available Log-loss for M3: not available Log-loss for M_STAR: not available" [ref=e63]':
                      - cell "Log-loss" [ref=e64]
                      - 'cell "Log-loss for M0: not available" [ref=e65]': .
                      - 'cell "Log-loss for M1: not available" [ref=e66]': .
                      - 'cell "Log-loss for M2: not available" [ref=e67]': .
                      - 'cell "Log-loss for M3: not available" [ref=e68]': .
                      - 'cell "Log-loss for M_STAR: not available" [ref=e69]': .
                    - 'row "RPS RPS for M0: not available RPS for M1: not available RPS for M2: not available RPS for M3: not available RPS for M_STAR: not available" [ref=e70]':
                      - cell "RPS" [ref=e71]
                      - 'cell "RPS for M0: not available" [ref=e72]': .
                      - 'cell "RPS for M1: not available" [ref=e73]': .
                      - 'cell "RPS for M2: not available" [ref=e74]': .
                      - 'cell "RPS for M3: not available" [ref=e75]': .
                      - 'cell "RPS for M_STAR: not available" [ref=e76]': .
                - generic [ref=e77]:
                  - generic [ref=e78]:
                    - generic [ref=e79]: Cumulative CLV (M★)
                    - generic "Cumulative CLV +0 basis points" [ref=e80]: +0 bps
                  - generic [ref=e81]:
                    - generic [ref=e82]: CLV z-score
                    - generic "CLV z-score 0.00" [ref=e83]: "0.00"
                  - generic [ref=e84]:
                    - text: "Pre-registered kill condition: M2 vs M0 stratified CV log-loss"
                    - generic [ref=e85]:
                      - text: · gap
                      - generic "gap 1.75 SE of 2.0 SE" [ref=e86]: 1.75 SE / 2.0 SE
              - generic [ref=e87]:
                - paragraph [ref=e88]: "Calibration: Reliability Diagram"
                - 'generic "Reliability diagram: no data available" [ref=e89]': "No settled forecasts: diagram available after first matches settle."
                - paragraph [ref=e90]: Points on the diagonal indicate perfect calibration. Each point represents one decile bin; size reflects sample count. Only bins with n ≥ 1 are rendered.
          - region "Forecast Record" [ref=e91]:
            - heading "Forecast Record" [level=2] [ref=e92]
            - region "Forecast ledger table" [ref=e93]:
              - generic [ref=e94]:
                - generic [ref=e95]: "Filter model:"
                - button "ALL" [pressed] [ref=e96]
                - button "M★" [ref=e97]
                - generic [ref=e98]: 2 records
              - table [ref=e100]:
                - rowgroup [ref=e101]:
                  - row "Settled (UTC) Match Model Market / Outcome p (model) q (mkt devigged) E at close Gate Brier Log-loss RPS CLV (bps) Label Audit" [ref=e102]:
                    - columnheader "Settled (UTC)" [ref=e103] [cursor=pointer]: Settled (UTC)▼
                    - columnheader "Match" [ref=e104]
                    - columnheader "Model" [ref=e105] [cursor=pointer]
                    - columnheader "Market / Outcome" [ref=e106]
                    - columnheader "p (model)" [ref=e107] [cursor=pointer]
                    - columnheader "q (mkt devigged)" [ref=e108]
                    - columnheader "E at close" [ref=e109] [cursor=pointer]
                    - columnheader "Gate" [ref=e110]
                    - columnheader "Brier" [ref=e111] [cursor=pointer]
                    - columnheader "Log-loss" [ref=e112]
                    - columnheader "RPS" [ref=e113]
                    - columnheader "CLV (bps)" [ref=e114]
                    - columnheader "Label" [ref=e115] [cursor=pointer]
                    - columnheader "Audit" [ref=e116]
                - rowgroup [ref=e117]:
                  - row "settled at 2026-06-13T22:00:00Z GER vs JAP M-star champion model 1X2 2 17.0 percent 19.0 percent edge, negative 2.0 percentage points gate status OPEN Brier contribution 0.6889 Log-loss contribution 1.7720 RPS contribution 0.3925 CLV negative 80 basis points miss code SHA e49a18c654c30821, click to copy View full audit record for forecast fc-2026-06-13-GER-JAP-1x2-M0" [ref=e118]:
                    - cell "settled at 2026-06-13T22:00:00Z" [ref=e119]: 06-13 22:00Z
                    - cell "GER vs JAP" [ref=e120]:
                      - link "GER vs JAP" [ref=e121] [cursor=pointer]:
                        - /url: /match/2026-06-13_GER_JAP
                    - cell "M-star champion model" [ref=e122]: M★
                    - cell "1X2 2" [ref=e123]
                    - cell "17.0 percent" [ref=e124]:
                      - generic "17.0 percent" [ref=e125]: 17.0%
                    - cell "19.0 percent" [ref=e126]:
                      - generic "19.0 percent" [ref=e127]: 19.0%
                    - cell "edge, negative 2.0 percentage points" [ref=e128]:
                      - generic "edge, negative 2.0 percentage points" [ref=e129]: −2.0pp
                    - cell "gate status OPEN" [ref=e130]:
                      - generic "gate status OPEN" [ref=e131]: Open
                    - cell "Brier contribution 0.6889" [ref=e132]:
                      - generic "0.6889" [ref=e133]
                    - cell "Log-loss contribution 1.7720" [ref=e134]:
                      - generic "1.7720" [ref=e135]
                    - cell "RPS contribution 0.3925" [ref=e136]:
                      - generic "0.3925" [ref=e137]
                    - cell "CLV negative 80 basis points" [ref=e138]:
                      - generic [ref=e139]: −80
                    - cell "miss" [ref=e140]:
                      - generic "miss" [ref=e141]:
                        - generic [ref=e142]: ◆
                        - text: MISS
                    - cell "code SHA e49a18c654c30821, click to copy View full audit record for forecast fc-2026-06-13-GER-JAP-1x2-M0" [ref=e143]:
                      - generic [ref=e144]:
                        - button "code SHA e49a18c654c30821, click to copy" [ref=e145] [cursor=pointer]:
                          - generic [ref=e146]: "code:"
                          - generic [ref=e147]: e49a18c
                        - link "View full audit record for forecast fc-2026-06-13-GER-JAP-1x2-M0" [ref=e148] [cursor=pointer]:
                          - /url: /ledger/fc-2026-06-13-GER-JAP-1x2-M0
                          - text: audit →
                  - row "settled at 2026-06-12T22:00:00Z ARG vs CAN M-star champion model 1X2 1 72.0 percent 68.0 percent edge, positive 4.0 percentage points gate status OPEN Brier contribution 0.0784 Log-loss contribution 0.3285 RPS contribution 0.0392 CLV positive 120 basis points hit code SHA e49a18c654c30821, click to copy View full audit record for forecast fc-2026-06-12-ARG-CAN-1x2-M0" [ref=e149]:
                    - cell "settled at 2026-06-12T22:00:00Z" [ref=e150]: 06-12 22:00Z
                    - cell "ARG vs CAN" [ref=e151]:
                      - link "ARG vs CAN" [ref=e152] [cursor=pointer]:
                        - /url: /match/2026-06-12_ARG_CAN
                    - cell "M-star champion model" [ref=e153]: M★
                    - cell "1X2 1" [ref=e154]
                    - cell "72.0 percent" [ref=e155]:
                      - generic "72.0 percent" [ref=e156]: 72.0%
                    - cell "68.0 percent" [ref=e157]:
                      - generic "68.0 percent" [ref=e158]: 68.0%
                    - cell "edge, positive 4.0 percentage points" [ref=e159]:
                      - generic "edge, positive 4.0 percentage points" [ref=e160]: +4.0pp
                    - cell "gate status OPEN" [ref=e161]:
                      - generic "gate status OPEN" [ref=e162]: Open
                    - cell "Brier contribution 0.0784" [ref=e163]:
                      - generic "0.0784" [ref=e164]
                    - cell "Log-loss contribution 0.3285" [ref=e165]:
                      - generic "0.3285" [ref=e166]
                    - cell "RPS contribution 0.0392" [ref=e167]:
                      - generic "0.0392" [ref=e168]
                    - cell "CLV positive 120 basis points" [ref=e169]:
                      - generic [ref=e170]: "+120"
                    - cell "hit" [ref=e171]:
                      - generic "hit" [ref=e172]:
                        - generic [ref=e173]: ◆
                        - text: HIT
                    - cell "code SHA e49a18c654c30821, click to copy View full audit record for forecast fc-2026-06-12-ARG-CAN-1x2-M0" [ref=e174]:
                      - generic [ref=e175]:
                        - button "code SHA e49a18c654c30821, click to copy" [ref=e176] [cursor=pointer]:
                          - generic [ref=e177]: "code:"
                          - generic [ref=e178]: e49a18c
                        - link "View full audit record for forecast fc-2026-06-12-ARG-CAN-1x2-M0" [ref=e179] [cursor=pointer]:
                          - /url: /ledger/fc-2026-06-12-ARG-CAN-1x2-M0
                          - text: audit →
              - paragraph [ref=e180]:
                - text: "Default sort: reverse-chronological. HIT / MISS / NEUTRAL rows share identical grid, padding, and type size. §7.2 invariant. No “win rate” or ROI sorting is exposed."
                - link "Glossary" [ref=e181] [cursor=pointer]:
                  - /url: /vault/glossary
          - region "Highest-Confidence Misses · M★" [ref=e182]:
            - generic [ref=e183]:
              - heading "Highest-Confidence Misses · M★" [level=2] [ref=e184]
              - paragraph [ref=e185]: "Pre-registered §7.6: the three forecasts where M★ assigned the highest probability to a modal outcome that did not occur. This is the inverse of a highlight reel: the strongest statement of calibration discipline the ledger makes."
            - list "Three highest-confidence M★ misses" [ref=e186]:
              - listitem [ref=e187]:
                - generic [ref=e188]:
                  - generic [ref=e189]:
                    - generic [ref=e190]: "#1"
                    - link "GER vs JAP" [ref=e191] [cursor=pointer]:
                      - /url: /ledger/fc-2026-06-13-GER-JAP-1x2-M0
                    - generic [ref=e192]: 1X2
                  - generic "miss" [ref=e193]: ◆ MISS
                - paragraph [ref=e194]:
                  - text: M★ assigned modal probability
                  - generic "61.0 percent to 1" [ref=e195]: 61.0%
                  - text: "to outcome 1, but the realized outcome was 2 (model probability on realized:"
                  - generic "17.0 percent" [ref=e196]: 17.0%
                  - text: "). Edge at close:"
                  - generic [ref=e197]: −2.0pp
                  - text: ". Gate: Open."
                - paragraph [ref=e198]:
                  - text: "This miss is reported without editorial framing. A miss at high confidence is informative: it tests calibration discipline, not model failure. A well-calibrated 62% prediction misses 38% of the time by design. See the"
                  - link "glossary" [ref=e199] [cursor=pointer]:
                    - /url: /vault/glossary
                  - text: for the HIT/MISS/NEUTRAL definition.
                - link "Full audit record →" [ref=e201] [cursor=pointer]:
                  - /url: /ledger/fc-2026-06-13-GER-JAP-1x2-M0
    - contentinfo [ref=e202]:
      - generic [ref=e203]:
        - generic [ref=e204]:
          - generic [ref=e205]: About
          - paragraph [ref=e206]:
            - strong [ref=e207]: The 45% Problem
            - text: . Probabilistic Pricing for FIFA World Cup 2026.
          - paragraph [ref=e208]: Research publication. No content on this site constitutes investment or gambling advice.
        - generic [ref=e209]:
          - generic [ref=e210]: Provenance
          - generic [ref=e211]:
            - term [ref=e212]: snapshot
            - definition [ref=e213]: 2026-05-12T12:44Z
            - term [ref=e214]: code
            - definition [ref=e215]: 9e8635ce2549523f
            - term [ref=e216]: data
            - definition [ref=e217]: sha256:49974caa284edc2eb31524afb92aca4b
        - generic [ref=e218]:
          - generic [ref=e219]: Cite
          - paragraph [ref=e220]:
            - text: Duarte Jaraba, N. (2026).
            - emphasis [ref=e221]: The 45% Problem
            - text: . OSF.
            - link "osf.io/spmkg" [ref=e222] [cursor=pointer]:
              - /url: https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321
  - status
  - button "Open Next.js Dev Tools" [ref=e228] [cursor=pointer]:
    - img [ref=e229]
  - alert [ref=e232]
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