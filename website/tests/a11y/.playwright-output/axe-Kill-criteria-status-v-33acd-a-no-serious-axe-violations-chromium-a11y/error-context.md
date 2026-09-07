# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: axe.spec.ts >> Kill-criteria status (/vault/kill-criteria); no serious axe violations
- Location: tests/a11y/axe.spec.ts:23:7

# Error details

```
Error: 
  [serious] aria-prohibited-attr: Ensure ARIA attributes are not prohibited for an element's role
    target: span[aria-label="\\{M_0, M_1, M_2, M_3\\}"]
    target: p:nth-child(10) > .katex-inline:nth-child(1)
  [serious] color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
    target: span[aria-label="beta"]
    target: .mb-6 > .vault-eyebrow:nth-child(1)
  [serious] link-in-text-block: Ensure links are distinguished from surrounding text in a way that does not rely on color
    target: a[target="_blank"]

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 3
Received array:  [{"description": "Ensure ARIA attributes are not prohibited for an element's role", "help": "Elements must only use permitted ARIA attributes", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/aria-prohibited-attr?application=playwright", "id": "aria-prohibited-attr", "impact": "serious", "nodes": [{"all": [], "any": [], "failureSummary": "Fix all of the following:
  aria-label attribute cannot be used on a span with no valid role attribute.", "html": "<span class=\"katex-inline\" aria-label=\"\\{M_0, M_1, M_2, M_3\\}\">", "impact": "serious", "none": [[Object]], "target": ["span[aria-label=\"\\\\{M_0, M_1, M_2, M_3\\\\}\"]"]}, {"all": [], "any": [], "failureSummary": "Fix all of the following:
  aria-label attribute cannot be used on a span with no valid role attribute.", "html": "<span class=\"katex-inline\" aria-label=\"d_i = \\mathcal{L}^{M_0}_i - \\mathcal{L}^{M^{\\star}}_i\">", "impact": "serious", "none": [[Object]], "target": ["p:nth-child(10) > .katex-inline:nth-child(1)"]}, {"all": [], "any": [], "failureSummary": "Fix all of the following:
  aria-label attribute cannot be used on a span with no valid role attribute.", "html": "<span class=\"katex-inline\" aria-label=\"d\">", "impact": "serious", "none": [[Object]], "target": ["span[aria-label=\"d\"]"]}, {"all": [], "any": [], "failureSummary": "Fix all of the following:
  aria-label attribute cannot be used on a span with no valid role attribute.", "html": "<span class=\"katex-inline\" aria-label=\"\\sigma_{CV} = 0.006587\">", "impact": "serious", "none": [[Object]], "target": ["span[aria-label=\"\\\\sigma_{CV} = 0.006587\"]"]}, {"all": [], "any": [], "failureSummary": "Fix all of the following:
  aria-label attribute cannot be used on a span with no valid role attribute.", "html": "<span class=\"katex-inline\" aria-label=\"\\Delta_{vs M_0} = -0.04096\">", "impact": "serious", "none": [[Object]], "target": ["span[aria-label=\"\\\\Delta_{vs M_0} = -0.04096\"]"]}, {"all": [], "any": [], "failureSummary": "Fix all of the following:
  aria-label attribute cannot be used on a span with no valid role attribute.", "html": "<span class=\"katex-inline\" aria-label=\"6.22\">", "impact": "serious", "none": [[Object]], "target": ["span[aria-label=\"6.22\"]"]}, {"all": [], "any": [], "failureSummary": "Fix all of the following:
  aria-label attribute cannot be used on a span with no valid role attribute.", "html": "<span class=\"katex-inline\" aria-label=\"\\mathrm{m\\_star\\_vs\\_m0\\_gap\\_se} = 1.7518\">", "impact": "serious", "none": [[Object]], "target": ["p:nth-child(28) > .katex-inline"]}, {"all": [], "any": [], "failureSummary": "Fix all of the following:
  aria-label attribute cannot be used on a span with no valid role attribute.", "html": "<span class=\"katex-inline\" aria-label=\"p = 0.003\">", "impact": "serious", "none": [[Object]], "target": ["span[aria-label=\"p = 0.003\"]"]}, {"all": [], "any": [], "failureSummary": "Fix all of the following:
  aria-label attribute cannot be used on a span with no valid role attribute.", "html": "<span class=\"katex-inline\" aria-label=\"\\mathcal{L}\">", "impact": "serious", "none": [[Object]], "target": ["span[aria-label=\"\\\\mathcal{L}\"]"]}, {"all": [], "any": [], "failureSummary": "Fix all of the following:
  aria-label attribute cannot be used on a span with no valid role attribute.", "html": "<span class=\"katex-inline\" aria-label=\"d_i\">", "impact": "serious", "none": [[Object]], "target": ["span[aria-label=\"d_i\"]"]}, …], "tags": ["cat.aria", "wcag2a", "wcag412", "EN-301-549", "EN-9.4.1.2", "RGAAv4", "RGAA-7.1.1"]}, {"description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds", "help": "Elements must meet minimum color contrast ratio thresholds", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright", "id": "color-contrast", "impact": "serious", "nodes": [{"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.78 (foreground color: #9b9792, background color: #fcfaf4, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span aria-label=\"beta\" style=\"font-family:var(--font-mono);font-size:9px;margin-left:5px;opacity:0.6;text-transform:uppercase;letter-spacing:.10em\">Beta</span>", "impact": "serious", "none": [], "target": ["span[aria-label=\"beta\"]"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8a847c, background color: #f7f4ec, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<p class=\"vault-eyebrow\" style=\"margin:0\">§ V · Status page</p>", "impact": "serious", "none": [], "target": [".mb-6 > .vault-eyebrow:nth-child(1)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8a847c, background color: #f7f4ec, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"vault-eyebrow\" style=\"color:var(--text-quiet)\"><span aria-hidden=\"true\" style=\"margin-right:12px\">·</span>8 min read</span>", "impact": "serious", "none": [], "target": [".vault-eyebrow:nth-child(2)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8a847c, background color: #f7f4ec, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"vault-eyebrow\" style=\"color:var(--text-quiet)\"><span aria-hidden=\"true\" style=\"margin-right:12px\">·</span>last revised 2026-04-22</span>", "impact": "serious", "none": [], "target": [".vault-eyebrow:nth-child(3)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8a847c, background color: #f7f4ec, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"vault-eyebrow\" style=\"color:var(--text-quiet)\"><span aria-hidden=\"true\" style=\"margin-right:12px\">·</span>snapshot 2026-05-12T12:44Z</span>", "impact": "serious", "none": [], "target": [".vault-eyebrow:nth-child(4)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.2 (foreground color: #aba69e, background color: #f7f4ec, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span style=\"color:var(--text-quiet);opacity:0.7\">code<!-- -->:</span>", "impact": "serious", "none": [], "target": [".inline-flex > span:nth-child(1)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8a847c, background color: #f7f4ec, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span>9e8635c</span>", "impact": "serious", "none": [], "target": [".inline-flex > span:nth-child(2)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 1.3 (foreground color: #88e0b6, background color: #eeeae0, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:13px;font-weight:500;color:var(--color-prism-mint);letter-spacing:0.04em\">CLEARED<!-- -->: <!-- -->6.22<!-- --> SE / <!-- -->2.0<!-- --> SE</span>", "impact": "serious", "none": [], "target": ["div:nth-child(2) > div:nth-child(1) > .mono:nth-child(1)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.49 (foreground color: #e76e8a, background color: #eeeae0, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:13px;font-weight:500;color:var(--color-prism-rose);letter-spacing:0.04em\">WARNING<!-- -->: <!-- -->1.75<!-- --> SE / <!-- -->2.0<!-- --> SE</span>", "impact": "serious", "none": [], "target": ["div:nth-child(2) > div:nth-child(2) > .mono:nth-child(1)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8a847c, background color: #f7f4ec, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<figcaption class=\"vault-pullquote-cite\">. <!-- -->this project's pre-registration, OSF 2026-04-22</figcaption>", "impact": "serious", "none": [], "target": ["figcaption"]}, …], "tags": ["cat.color", "wcag2aa", "wcag143", "TTv5", "TT13.c", "EN-301-549", "EN-9.1.4.3", "ACT", "RGAAv4", "RGAA-3.2.1"]}, {"description": "Ensure links are distinguished from surrounding text in a way that does not rely on color", "help": "Links must be distinguishable without relying on color", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/link-in-text-block?application=playwright", "id": "link-in-text-block", "impact": "serious", "nodes": [{"all": [], "any": [[Object], [Object]], "failureSummary": "Fix any of the following:
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
      - article [ref=e19]:
        - generic [ref=e21]:
          - generic [ref=e22]:
            - paragraph [ref=e23]: § V · Status page
            - generic [ref=e24]: ·8 min read
            - generic [ref=e25]: ·last revised 2026-04-22
            - generic [ref=e26]: ·snapshot 2026-05-12T12:44Z
          - heading "Kill criteria" [level=1] [ref=e27]
          - paragraph [ref=e28]: If M★ performs worse than the null baseline by the Round of 16, this project publishes a null result.
          - generic [ref=e29]:
            - generic [ref=e30]: By The 45% Problem project
            - generic [ref=e31]: ·
            - button "code SHA 9e8635ce2549523f, click to copy" [ref=e32] [cursor=pointer]:
              - generic [ref=e33]: "code:"
              - generic [ref=e34]: 9e8635c
        - generic [ref=e36]:
          - generic [ref=e37]:
            - paragraph [ref=e39]:
              - text: In Phase 8, the kill criterion's pre-flight sanity gate fired a warning. M2, the candidate that won the cross-validation log-loss battery, beat M0 by 1.75 standard errors under one of two SE conventions on disk, falling short of the pre-registered 2.0 SE bar by 0.25 SE under that reading. Under the other reading, in
              - code [ref=e40]: data/calibration/champion_model.json
              - text: ", the gap is 6.22 SE and the bar is cleared decisively. The pre-registered consequence on a sanity-gate firing was"
              - code [ref=e41]: pivot_paper_framing
              - text: ", the procedural obligation reflected in this essay. M2 stays as M★, sealed in"
              - code [ref=e42]: champion_model.json
              - text: with
              - code [ref=e43]: "CHAMPION_LOCKED: true"
              - text: . The live R16 checkpoint, on cumulative tournament forecasts, is still ahead.
            - paragraph [ref=e44]: This page describes the criterion that fired the warning, the inequality it encodes, the two SE conventions that produce different gap numbers from the same locked data, the two stages at which the criterion is evaluated, and what the firing has and has not changed about the project's operations. The procedural argument for why a pre-registered stopping rule is necessary at all sits at the bottom; the substantive event the rule produced sits at the top.
            - generic [ref=e45]: · · ·
            - heading "The mathematical statement" [level=2] [ref=e46]:
              - link "The mathematical statement" [ref=e47] [cursor=pointer]:
                - /url: "#the-mathematical-statement"
            - paragraph [ref=e48]: The kill criterion is a two-condition gate. Both conditions must hold for M★ to remain the live trading model. Failure on either condition fires the criterion.
            - heading "The two-condition gate" [level=3] [ref=e49]:
              - link "The two-condition gate" [ref=e50] [cursor=pointer]:
                - /url: "#the-two-condition-gate"
            - paragraph [ref=e51]:
              - text: The first condition is that M★ has the lowest mean cross-validation log-loss across the candidate set
              - 'generic "\\{M_0, M_1, M_2, M_3\\}" [ref=e52]':
                - generic [ref=e53]:
                  - math [ref=e55]:
                    - generic [ref=e57]:
                      - generic [ref=e58]: "{"
                      - generic [ref=e59]:
                        - generic [ref=e60]: M
                        - generic [ref=e61]: "0"
                      - generic [ref=e62]: ","
                      - generic [ref=e63]:
                        - generic [ref=e64]: M
                        - generic [ref=e65]: "1"
                      - generic [ref=e66]: ","
                      - generic [ref=e67]:
                        - generic [ref=e68]: M
                        - generic [ref=e69]: "2"
                      - generic [ref=e70]: ","
                      - generic [ref=e71]:
                        - generic [ref=e72]: M
                        - generic [ref=e73]: "3"
                      - generic [ref=e74]: "}"
                  - generic [ref=e76]:
                    - text: "{"
                    - generic [ref=e77]:
                      - text: M
                      - generic [ref=e82]: "0"
                    - text: ","
                    - generic [ref=e86]:
                      - text: M
                      - generic [ref=e91]: "1"
                    - text: ","
                    - generic [ref=e95]:
                      - text: M
                      - generic [ref=e100]: "2"
                    - text: ","
                    - generic [ref=e104]:
                      - text: M
                      - generic [ref=e109]: "3"
                    - text: "}"
              - text: . The second condition is that M★'s log-loss must beat M0's by at least 2 standard errors of the difference.
            - paragraph [ref=e113]: The two-condition structure is load-bearing. Without the first condition, the project could re-label any model as M★ retroactively. Without the second condition, the project could promote a model that beats M0 by a hair on sampling variance and call the result an edge. The pre-registration sealed both conditions before the tournament began.
            - heading "The decision inequality" [level=3] [ref=e114]:
              - link "The decision inequality" [ref=e115] [cursor=pointer]:
                - /url: "#the-decision-inequality"
            - paragraph [ref=e116]:
              - text: Let
              - 'generic "d_i = \\mathcal{L}^{M_0}_i - \\mathcal{L}^{M^{\\star}}_i" [ref=e117]':
                - generic [ref=e118]:
                  - math [ref=e120]:
                    - generic [ref=e122]:
                      - generic [ref=e123]:
                        - generic [ref=e124]: d
                        - generic [ref=e125]: i
                      - generic [ref=e126]: =
                      - generic [ref=e127]:
                        - generic [ref=e128]: L
                        - generic [ref=e129]: i
                        - generic [ref=e130]:
                          - generic [ref=e131]: M
                          - generic [ref=e132]: "0"
                      - generic [ref=e133]: −
                      - generic [ref=e134]:
                        - generic [ref=e135]: L
                        - generic [ref=e136]: i
                        - generic [ref=e137]:
                          - generic [ref=e138]: M
                          - generic [ref=e139]: ⋆
                  - generic [ref=e140]:
                    - generic [ref=e141]:
                      - generic [ref=e142]:
                        - text: d
                        - generic [ref=e147]: i
                      - text: =
                    - generic [ref=e151]:
                      - generic [ref=e152]:
                        - text: L
                        - generic [ref=e156]:
                          - generic [ref=e157]: i
                          - generic [ref=e160]:
                            - text: M
                            - generic [ref=e165]: "0"
                      - text: −
                    - generic [ref=e173]:
                      - text: L
                      - generic [ref=e177]:
                        - generic [ref=e178]: i
                        - generic [ref=e181]:
                          - text: M
                          - generic [ref=e187]: ⋆
              - text: be the per-match log-loss difference (positive
              - generic "d" [ref=e191]:
                - generic [ref=e192]:
                  - math [ref=e194]:
                    - generic [ref=e197]: d
                  - generic [ref=e199]: d
              - text: "means M★ is better than M0). The criterion requires:"
            - 'math "\\overline{d} \\;\\geq\\; 2 \\cdot \\mathrm{SE}\\!\\big(\\overline{d}\\big)" [ref=e200]':
              - generic [ref=e202]:
                - math [ref=e204]:
                  - generic [ref=e206]:
                    - generic [ref=e207]:
                      - generic [ref=e208]: d
                      - generic [ref=e209]: ‾
                    - generic [ref=e210]: ≥
                    - generic [ref=e211]: "2"
                    - generic [ref=e212]: ⋅
                    - generic [ref=e213]:
                      - generic [ref=e214]: S
                      - generic [ref=e215]: E
                    - generic: ⁣
                    - generic [ref=e216]: (
                    - generic [ref=e217]:
                      - generic [ref=e218]: d
                      - generic [ref=e219]: ‾
                    - generic [ref=e220]: )
                - generic [ref=e221]:
                  - generic [ref=e222]:
                    - generic [ref=e227]: d
                    - text: ≥
                  - generic [ref=e229]: 2 ⋅
                  - generic [ref=e230]:
                    - generic [ref=e231]: SE
                    - generic [ref=e232]: (
                    - generic [ref=e237]: d
                    - generic [ref=e239]: )
            - paragraph [ref=e240]: "The criterion fires when this inequality fails:"
            - 'math "\\overline{d} \\;<\\; 2 \\cdot \\mathrm{SE}\\!\\big(\\overline{d}\\big)" [ref=e241]':
              - generic [ref=e243]:
                - math [ref=e245]:
                  - generic [ref=e247]:
                    - generic [ref=e248]:
                      - generic [ref=e249]: d
                      - generic [ref=e250]: ‾
                    - generic [ref=e251]: <
                    - generic [ref=e252]: "2"
                    - generic [ref=e253]: ⋅
                    - generic [ref=e254]:
                      - generic [ref=e255]: S
                      - generic [ref=e256]: E
                    - generic: ⁣
                    - generic [ref=e257]: (
                    - generic [ref=e258]:
                      - generic [ref=e259]: d
                      - generic [ref=e260]: ‾
                    - generic [ref=e261]: )
                - generic [ref=e262]:
                  - generic [ref=e263]:
                    - generic [ref=e268]: d
                    - text: <
                  - generic [ref=e270]: 2 ⋅
                  - generic [ref=e271]:
                    - generic [ref=e272]: SE
                    - generic [ref=e273]: (
                    - generic [ref=e278]: d
                    - generic [ref=e280]: )
            - paragraph [ref=e281]:
              - text: The firing condition is "M★ does not beat M0 by 2 SE." This can happen in two ways. M★ might beat M0 by less than 2 SE, which is what the paired-difference SE reading in
              - code [ref=e282]: evaluation/cv_battery_result.json
              - text: "reports for Phase 8: a 1.75 SE gap, falling 0.25 SE short of the bar. M★ might also fail to beat M0 at all, which would be a stronger failure mode. Both fire the criterion under that reading; both trigger the same pre-registered consequence ("
              - code [ref=e283]: pivot_paper_framing
              - text: ). The marginal-SE reading in
              - code [ref=e284]: champion_model.json
              - text: reports 6.22 SE for the same comparison, which clears the bar. The two readings, and what they mean, are documented in the "Dual SE reading" subsection below.
            - paragraph [ref=e285]:
              - text: The threshold value is 2.0 standard errors, sealed in
              - code [ref=e286]: pre_reg_constants.yaml::kill_criterion.threshold_standard_errors
              - text: and mirrored at
              - code [ref=e287]: kill.ll_gap_se
              - text: . The threshold cannot be modified during the tournament without an OSF amendment, which is itself a public artifact.
            - heading "Why two standard errors" [level=3] [ref=e288]:
              - link "Why two standard errors" [ref=e289] [cursor=pointer]:
                - /url: "#why-two-standard-errors"
            - paragraph [ref=e290]: The choice of 2 SE rather than zero is a deliberate buffer at our sample size. With 64 World Cup matches plus a small calibration hold-out, a 1-SE rule fires on roughly 16% of repeated draws of an honest null hypothesis. The 2-SE bar moves the false-positive rate to roughly 2.5% one-sided, while still being permissive enough that any genuine model improvement should clear it.
            - paragraph [ref=e291]:
              - text: The 2-SE choice also accounts for the multiple-comparison structure across the four shadow models. A 1-SE rule applied independently to each shadow candidate would inflate the family-wise false-positive rate above 50%; the 2-SE rule, combined with the Bonferroni correction on the Diebold-Mariano comparisons described in
              - link "Evaluation" [ref=e292] [cursor=pointer]:
                - /url: /vault/evaluation
              - text: ", keeps the family-wise rate below 5%."
            - note [ref=e293]:
              - paragraph [ref=e294]:
                - text: An earlier draft of this page used a no-margin rule (any positive improvement over M0 was deemed sufficient). That draft predated Phase 8 and did not match the actual locked criterion in
                - code [ref=e295]: pre_reg_constants.yaml
                - text: . The 2-SE rule is the rule that fired.
            - generic [ref=e296]: · · ·
            - heading "Dual SE reading" [level=2] [ref=e297]:
              - link "Dual SE reading" [ref=e298] [cursor=pointer]:
                - /url: "#dual-se-reading"
            - paragraph [ref=e299]: The same 0.041 log-loss gap between M2 and M0 produces two different SE numbers in the two locked CV files. Both files are signed; both are sealed; both are part of the OSF pre-registration record. They disagree because they use different standard-error conventions, not because the underlying data disagrees.
            - heading "The marginal-SE reading" [level=3] [ref=e300]:
              - link "The marginal-SE reading" [ref=e301] [cursor=pointer]:
                - /url: "#the-marginal-se-reading"
            - paragraph [ref=e302]:
              - code [ref=e303]: data/calibration/champion_model.json
              - text: reports
              - 'generic "\\sigma_{CV} = 0.006587" [ref=e304]':
                - generic [ref=e305]:
                  - math [ref=e307]:
                    - generic [ref=e309]:
                      - generic [ref=e310]:
                        - generic [ref=e311]: σ
                        - generic [ref=e312]:
                          - generic [ref=e313]: C
                          - generic [ref=e314]: V
                      - generic [ref=e315]: =
                      - generic [ref=e316]: "0.006587"
                  - generic [ref=e317]:
                    - generic [ref=e318]:
                      - generic [ref=e319]:
                        - text: σ
                        - generic [ref=e325]: CV
                      - text: =
                    - generic [ref=e329]: "0.006587"
              - text: ", M2's own marginal sigma over the five-fold cross-validation mean. Dividing the locked"
              - 'generic "\\Delta_{vs M_0} = -0.04096" [ref=e330]':
                - generic [ref=e331]:
                  - math [ref=e333]:
                    - generic [ref=e335]:
                      - generic [ref=e336]:
                        - generic [ref=e337]: Δ
                        - generic [ref=e338]:
                          - generic [ref=e339]: v
                          - generic [ref=e340]: s
                          - generic [ref=e341]:
                            - generic [ref=e342]: M
                            - generic [ref=e343]: "0"
                      - generic [ref=e344]: =
                      - generic [ref=e345]: −
                      - generic [ref=e346]: "0.04096"
                  - generic [ref=e347]:
                    - generic [ref=e348]:
                      - generic [ref=e349]:
                        - text: Δ
                        - generic [ref=e355]:
                          - text: vs
                          - generic [ref=e356]:
                            - text: M
                            - generic [ref=e361]: "0"
                      - text: =
                    - generic [ref=e368]: −0.04096
              - text: by this sigma yields a gap of
              - generic "6.22" [ref=e369]:
                - generic [ref=e370]:
                  - math [ref=e372]:
                    - generic [ref=e375]: "6.22"
                  - generic [ref=e377]: "6.22"
              - text: SE. The file carries
              - code [ref=e378]: "CHAMPION_LOCKED: true"
              - text: . Under this convention the sanity bar is cleared decisively.
            - paragraph [ref=e379]: The marginal-SE reading treats each model's CV-mean uncertainty as a property of that model alone, comparable to a confidence interval on the model's own log-loss. It does not directly model the per-fold correlation between M2 and M0 losses on the same matches.
            - heading "The paired-difference SE reading" [level=3] [ref=e380]:
              - link "The paired-difference SE reading" [ref=e381] [cursor=pointer]:
                - /url: "#the-paired-difference-se-reading"
            - paragraph [ref=e382]:
              - code [ref=e383]: evaluation/cv_battery_result.json
              - text: reports
              - 'generic "\\mathrm{m\\_star\\_vs\\_m0\\_gap\\_se} = 1.7518" [ref=e384]':
                - generic [ref=e385]:
                  - math [ref=e387]:
                    - generic [ref=e389]:
                      - generic [ref=e390]:
                        - generic [ref=e391]: m
                        - generic [ref=e392]: _
                        - generic [ref=e393]: s
                        - generic [ref=e394]: t
                        - generic [ref=e395]: a
                        - generic [ref=e396]: r
                        - generic [ref=e397]: _
                        - generic [ref=e398]: v
                        - generic [ref=e399]: s
                        - generic [ref=e400]: _
                        - generic [ref=e401]: m
                        - generic [ref=e402]: "0"
                        - generic [ref=e403]: _
                        - generic [ref=e404]: g
                        - generic [ref=e405]: a
                        - generic [ref=e406]: p
                        - generic [ref=e407]: _
                        - generic [ref=e408]: s
                        - generic [ref=e409]: e
                      - generic [ref=e410]: =
                      - generic [ref=e411]: "1.7518"
                  - generic [ref=e412]:
                    - generic [ref=e413]:
                      - generic [ref=e414]: m_star_vs_m0_gap_se
                      - text: =
                    - generic [ref=e415]: "1.7518"
              - text: ", computed as a paired-difference SE on per-fold log-loss differences. The file carries"
              - code [ref=e416]: "sanity_gate_passed: false"
              - text: and a
              - code [ref=e417]: decision_narrative
              - text: "that contains the phrase \"WARNING: sanity gate NOT passed\". Under this convention the bar is not cleared and the sanity-gate warning fires."
            - paragraph [ref=e418]:
              - text: The paired-difference SE acknowledges that M2 and M0 are evaluated on the same per-fold match samples and that their per-match log-losses are correlated. It is the SE convention most commonly used in the forecast-evaluation literature (Diebold-Mariano and its descendants). The pre-registered Diebold-Mariano machinery described in
              - link "Evaluation" [ref=e419] [cursor=pointer]:
                - /url: /vault/evaluation
              - text: is closer in spirit to this reading than to the marginal one.
            - heading "How to read the two together" [level=3] [ref=e420]:
              - link "How to read the two together" [ref=e421] [cursor=pointer]:
                - /url: "#how-to-read-the-two-together"
            - paragraph [ref=e422]: Neither file is wrong. Both readings answer different questions about the same data. The marginal SE asks "how precisely do we know M2's own CV mean log-loss?" The paired-difference SE asks "how precisely do we know the gap between M2 and M0 on the same evaluation samples?" The paired-difference SE is almost always the smaller of the two when the two models are correlated on the per-match level, which they are here.
            - paragraph [ref=e423]:
              - text: The protocol seals both conventions implicitly by sealing both files. The pre-registration's primary criterion (lowest mean CV log-loss with adequate gap to runner-up) does not depend on the SE convention, and M2 wins under that criterion in both files. The 2.0-SE sanity gate does depend on the convention. The honest report is that the sanity-gate warning fired under the paired-difference reading and did not fire under the marginal reading. The locked file is
              - code [ref=e424]: champion_model.json
              - text: ; M2 is M★; the warning is documented here.
            - generic [ref=e425]: · · ·
            - heading "The two checkpoints" [level=2] [ref=e426]:
              - link "The two checkpoints" [ref=e427] [cursor=pointer]:
                - /url: "#the-two-checkpoints"
            - paragraph [ref=e428]: The same 2-SE rule is applied at two stages of the project. The Phase 8 sanity gate runs on cross-validation hold-out data before the tournament begins. The R16 live checkpoint runs on cumulative tournament forecasts once the Round of 16 settles. Both stages use the same machinery; they differ only in which sample of log-losses they evaluate.
            - heading "The Phase 8 sanity gate" [level=3] [ref=e429]:
              - link "The Phase 8 sanity gate" [ref=e430] [cursor=pointer]:
                - /url: "#the-phase-8-sanity-gate"
            - paragraph [ref=e431]: "The Phase 8 sanity gate ran the kill criterion as a pre-flight check on the cross-validation hold-out (calibration 2010 to 2021, hold-out 2022 World Cup), before the 2026 tournament started. The full adjudication table:"
            - table [ref=e432]:
              - rowgroup [ref=e433]:
                - row "Model Mean CV LL Marginal SE Δ vs M0 DM p vs M0 Status" [ref=e434]:
                  - columnheader "Model" [ref=e435]
                  - columnheader "Mean CV LL" [ref=e436]
                  - columnheader "Marginal SE" [ref=e437]
                  - columnheader "Δ vs M0" [ref=e438]
                  - columnheader "DM p vs M0" [ref=e439]
                  - columnheader "Status" [ref=e440]
              - rowgroup [ref=e441]:
                - 'row "M2_fifa 0.99337 0.00659 −0.04096 0.0032 Champion (CHAMPION_LOCKED: true); sanity-gate warning under paired-difference SE" [ref=e442]':
                  - cell "M2_fifa" [ref=e443]:
                    - strong [ref=e444]: M2_fifa
                  - cell "0.99337" [ref=e445]
                  - cell "0.00659" [ref=e446]
                  - cell "−0.04096" [ref=e447]
                  - cell "0.0032" [ref=e448]
                  - 'cell "Champion (CHAMPION_LOCKED: true); sanity-gate warning under paired-difference SE" [ref=e449]':
                    - text: Champion (
                    - code [ref=e450]: "CHAMPION_LOCKED: true"
                    - text: ); sanity-gate warning under paired-difference SE
                - row "M3_macro 1.02694 0.02949 −0.00739 0.3443 Eligible; below M0 in point estimate" [ref=e451]:
                  - cell "M3_macro" [ref=e452]:
                    - strong [ref=e453]: M3_macro
                  - cell "1.02694" [ref=e454]
                  - cell "0.02949" [ref=e455]
                  - cell "−0.00739" [ref=e456]
                  - cell "0.3443" [ref=e457]
                  - cell "Eligible; below M0 in point estimate" [ref=e458]
                - row "M0_elo 1.03433 0.03844 0.000 1.0000 Baseline" [ref=e459]:
                  - cell "M0_elo" [ref=e460]:
                    - strong [ref=e461]: M0_elo
                  - cell "1.03433" [ref=e462]
                  - cell "0.03844" [ref=e463]
                  - cell "0.000" [ref=e464]
                  - cell "1.0000" [ref=e465]
                  - cell "Baseline" [ref=e466]
                - row "M1_form 1.08110 0.07514 +0.04677 0.0061 Disqualified (significantly worse than M0)" [ref=e467]:
                  - cell "M1_form" [ref=e468]:
                    - strong [ref=e469]: M1_form
                  - cell "1.08110" [ref=e470]
                  - cell "0.07514" [ref=e471]
                  - cell "+0.04677" [ref=e472]
                  - cell "0.0061" [ref=e473]
                  - cell "Disqualified (significantly worse than M0)" [ref=e474]
            - paragraph [ref=e475]:
              - text: Values are from the locked
              - code [ref=e476]: data/calibration/cv_battery_results.json
              - text: . M2 cleared the primary criterion by having the lowest mean log-loss across the candidate set, with a 1.49 SE gap to the runner-up (M3_macro) and a Diebold-Mariano test against M0 returning
              - generic "p = 0.003" [ref=e477]:
                - generic [ref=e478]:
                  - math [ref=e480]:
                    - generic [ref=e482]:
                      - generic [ref=e483]: p
                      - generic [ref=e484]: =
                      - generic [ref=e485]: "0.003"
                  - generic [ref=e486]:
                    - generic [ref=e487]: p =
                    - generic [ref=e488]: "0.003"
              - text: .
            - paragraph [ref=e489]:
              - text: The 2-SE sanity gate, applied with the paired-difference SE in
              - code [ref=e490]: evaluation/cv_battery_result.json
              - text: ", reports a 1.75 SE gap and"
              - code [ref=e491]: "sanity_gate_passed: false"
              - text: . The same gap measured with M2's marginal sigma in
              - code [ref=e492]: champion_model.json
              - text: is 6.22 SE. The pre-registered consequence (
              - code [ref=e493]: "kill.action: pivot_paper_framing"
              - text: ") took effect under the paired-difference reading: the paper's framing pivoted to the sanity-gate-warning narrative, and the project committed to acknowledging the warning transparently in the public ledger and the vault essays. M★ was not demoted; the pre-registered action is a framing pivot, not an automatic identity change. The pipeline did not abort; the engine continues to run, and the forecast log continues to record every model's probabilities, edges, and divergences."
            - heading "The R16 live checkpoint" [level=3] [ref=e494]:
              - link "The R16 live checkpoint" [ref=e495] [cursor=pointer]:
                - /url: "#the-r16-live-checkpoint"
            - paragraph [ref=e496]: The same 2-SE rule will be re-evaluated once the Round of 16 settles, on cumulative match-level log-losses from the start of the tournament through the end of R16. The check fires once, after all eight R16 matches are settled; it is not re-run weekly thereafter.
            - paragraph [ref=e497]:
              - text: The R16 live check is the kill criterion's first contact with live tournament data. M★ is M2_fifa, sealed in
              - code [ref=e498]: champion_model.json
              - text: . The comparison is a real M2-versus-M0 head-to-head on live forecasts, not a degenerate self-comparison. The check will fire if M2 fails to beat M0 by at least 2 SE on cumulative match-level log-losses through the end of R16.
            - paragraph [ref=e499]: The formal null-result publication track is reserved for the R16 checkpoint. If M★ (M2_fifa) is less than 2 SE better than M0 on cumulative live log-losses at R16, the project publishes a null-result report within 72 hours of the firing, following the template committed in the pre-registration. The Phase 8 sanity gate firing caused the framing pivot only; the formal null-result track did not trigger at Phase 8 and remains the live tournament's contingency.
            - generic [ref=e500]: · · ·
            - heading "Operational response" [level=2] [ref=e501]:
              - link "Operational response" [ref=e502] [cursor=pointer]:
                - /url: "#operational-response"
            - paragraph [ref=e503]: The Phase 8 sanity gate firing triggered a specific, pre-registered set of changes. The changes are operational rather than computational. The engine still runs the same way; the claims the project is willing to make from its outputs have changed.
            - paragraph [ref=e504]:
              - strong [ref=e505]: "What changed:"
            - list [ref=e506]:
              - listitem [ref=e507]:
                - text: The paper's framing pivoted from "we built a model that finds market mispricings" to the kill-criterion narrative described in
                - link "The 45% Problem" [ref=e508] [cursor=pointer]:
                  - /url: /vault/the-45-percent
                - text: .
              - listitem [ref=e509]: The vault essays, this page, and the live ledger acknowledge the sanity-gate warning under the paired-difference SE reading. The project's brand commitment is to acknowledge the warning visibly, not to bury it inside the locked file.
              - listitem [ref=e510]: The R16 live checkpoint is treated as a real test of M2 against M0 on live forecasts, not a procedural formality.
            - paragraph [ref=e511]:
              - strong [ref=e512]: "What did not change:"
            - list [ref=e513]:
              - listitem [ref=e514]:
                - text: The engine continues to run on its 60-second tick during live tournament hours and 5-minute tick off-hours. Forecasts for all five model variants (M0, M1, M2, M3, M★) are logged with their respective probabilities, divergences, and gate decisions in
                - code [ref=e515]: forecast_log.jsonl
                - text: and
                - code [ref=e516]: gate_log.jsonl
                - text: .
              - listitem [ref=e517]:
                - text: The de-vigging machinery, divergence calculation, and
                - link "Volatility Gate" [ref=e518] [cursor=pointer]:
                  - /url: /vault/volatility-gate
                - text: all remain active. They continue to produce flagged divergences and gate decisions against M★'s (M2_fifa) probabilities.
              - listitem [ref=e519]:
                - text: CLV continues to be tracked on the M★ row, measuring whether M2's probabilities lead the market over time. The same metric runs against the four shadow models as pseudo-CLV (see
                - link "Evaluation" [ref=e520] [cursor=pointer]:
                  - /url: /vault/evaluation
                - text: ).
              - listitem [ref=e521]: The R16 live checkpoint remains wired and will be evaluated when the Round of 16 settles, on a live M2-versus-M0 comparison.
            - note [ref=e522]:
              - paragraph [ref=e523]: An OSF amendment is the only path to changing M★'s identity during the tournament. The amendment, if filed, would be a public artifact with its own time-stamped registry record. There is no quiet substitution available, and no version of the live site where the displayed model can shift between M0, M2, or any other candidate without leaving an audit trail.
            - paragraph [ref=e524]:
              - text: The signed Git tag
              - code [ref=e525]: v1.0.0-mstar-lock
              - text: and the OSF pre-registration both record the state of the project at the moment of the Phase 8 firing. The signed tag cannot be moved or backdated without invalidating its cryptographic signature; the OSF record cannot be amended without producing a visible fork in the audit trail. Together they make the firing, and the operational response that followed it, permanently verifiable.
            - generic [ref=e526]: · · ·
            - heading "Live status" [level=2] [ref=e527]:
              - link "Live status" [ref=e528] [cursor=pointer]:
                - /url: "#live-status"
            - paragraph [ref=e529]: The block below reflects the current state of the kill criterion as of the most recent snapshot. It updates nightly with each build.
            - 'status "Kill criterion status; marginal: CLEARED; paired-difference: WARNING" [ref=e530]':
              - generic [ref=e531]:
                - generic [ref=e532]: KILL CRITERION
                - generic [ref=e533]: 2026-04-23
              - generic [ref=e534]:
                - 'generic "Marginal SE reading: CLEARED at 6.22 SE" [ref=e535]':
                  - generic [ref=e536]: "CLEARED: 6.22 SE / 2.0 SE"
                  - generic [ref=e537]: marginal sigma (champion_model.json)
                  - generic [ref=e538]: CHAMPION_LOCKED = true; M2_fifa sealed under the protocol's primary criterion.
                - 'generic "Paired-difference SE reading: WARNING at 1.75 SE" [ref=e539]':
                  - generic [ref=e540]: "WARNING: 1.75 SE / 2.0 SE"
                  - generic [ref=e541]: paired-difference SE (cv_battery_result.json)
                  - generic [ref=e542]: "Sanity gate did not clear the 2.0 SE threshold under this convention; M2_fifa retained per the protocol's primary criterion (`pivot_paper_framing`)."
              - paragraph [ref=e543]:
                - text: "Condition:"
                - code [ref=e544]: M2 vs M0 stratified CV log-loss
              - paragraph [ref=e545]: Two SE readings; locked under the marginal reading; warning logged under the paired-difference reading; R16 live checkpoint is the next adjudication.
            - paragraph [ref=e546]:
              - text: "The status block reads from the snapshot and renders the dual reading: a"
              - code [ref=e547]: "WARNING: 1.75 SE / 2.0 SE (paired-difference)"
              - text: badge alongside a
              - code [ref=e548]: "CLEARED: 6.22 SE / 2.0 SE (marginal)"
              - text: reference and the Phase 8 timestamp. The badge state will be re-evaluated when the R16 live checkpoint resolves on live tournament data.
            - paragraph [ref=e549]:
              - text: The
              - link "Transparency Ledger" [ref=e550] [cursor=pointer]:
                - /url: /ledger
              - text: shows the full kill-criteria check panel alongside the rolling calibration metrics (Brier, log-loss, RPS) and the per-team probability cards. The ledger and this page read from the same snapshot, so they cannot disagree about the criterion's state.
            - generic [ref=e551]: · · ·
            - heading "Why pre-registering the stopping rule matters" [level=2] [ref=e552]:
              - link "Why pre-registering the stopping rule matters" [ref=e553] [cursor=pointer]:
                - /url: "#why-pre-registering-the-stopping-rule-matters"
            - paragraph [ref=e554]: "Pre-registering the kill criterion before the tournament prevents the worst form of result-chasing: keeping a model alive indefinitely because no one has formally decided when to stop. The same logic applies to post-hoc threshold tuning. With the 2 SE bar sealed before the cross-validation battery ran, there was no path to retroactively soften the bar to 1.75 SE in order to keep M2 as M★."
            - paragraph [ref=e555]:
              - text: Pre-registration also removes the option to quietly remove the project from public record if the criterion fires. The OSF DOI
              - code [ref=e556]: 10.17605/OSF.IO/8B5HD
              - text: and the signed Git tag
              - code [ref=e557]: v1.0.0-mstar-lock
              - text: are public, time-stamped, and cryptographically verifiable. The Phase 8 sanity-gate warning is now part of that permanent record. The model cards have been updated with the dual SE reading; the terminal displays the warning badge alongside the cleared marginal reading; the forecast log carries every model's probabilities and divergences against M★ (M2_fifa) in every row.
            - figure ". this project's pre-registration, OSF 2026-04-22" [ref=e558]:
              - blockquote [ref=e559]:
                - paragraph [ref=e560]: Publishing a null result under a pre-registered stopping rule is not failure. It is the project working as designed.
              - generic [ref=e561]: . this project's pre-registration, OSF 2026-04-22
            - paragraph [ref=e562]: The Phase 8 sanity-gate warning is the strongest available vindication of the pre-registration discipline. Without the 2-SE bar, the project would have launched a public website with M2 as M★ and either quietly suppressed the paired-difference SE warning that one of the two locked files surfaces, or reported only the marginal reading that clears the bar without acknowledging the other. Pre-registration forces both readings into the public record. With the bar in place, the project published an honest dual reading on day one and a clear plan for the R16 checkpoint that follows on live tournament data. The criterion was not theatre; it bound on the very first run.
            - generic [ref=e563]: · · ·
            - heading "Where to go next" [level=2] [ref=e564]:
              - link "Where to go next" [ref=e565] [cursor=pointer]:
                - /url: "#where-to-go-next"
            - list [ref=e566]:
              - listitem [ref=e567]:
                - strong [ref=e568]:
                  - link "The 45% Problem" [ref=e569] [cursor=pointer]:
                    - /url: /vault/the-45-percent
                - text: ": the lead essay that frames the project's purpose and reads the Phase 8 sanity-gate warning as part of the project's brand commitment."
              - listitem [ref=e570]:
                - strong [ref=e571]:
                  - link "Models" [ref=e572] [cursor=pointer]:
                    - /url: /vault/models
                - text: ": the four-candidate ablation, the cross-validation battery, and the table that adjudicated champion selection."
              - listitem [ref=e573]:
                - strong [ref=e574]:
                  - link "Evaluation" [ref=e575] [cursor=pointer]:
                    - /url: /vault/evaluation
                - text: ": Brier, log-loss, RPS, and the Diebold-Mariano machinery the kill criterion is built on."
              - listitem [ref=e576]:
                - strong [ref=e577]:
                  - link "Pre-registration" [ref=e578] [cursor=pointer]:
                    - /url: /vault/preregistration
                - text: ": the OSF DOI, the signed Git tag, the sealed"
                - code [ref=e579]: pre_reg_constants.yaml
                - text: ", and the procedural commitments the criterion enforces."
              - listitem [ref=e580]:
                - strong [ref=e581]:
                  - link "Notation" [ref=e582] [cursor=pointer]:
                    - /url: /vault/notation
                - text: ": the symbol table for"
                - 'generic "\\mathcal{L}" [ref=e583]':
                  - generic [ref=e584]:
                    - math [ref=e586]:
                      - generic [ref=e589]: L
                    - generic [ref=e591]: L
                - text: ","
                - generic "d_i" [ref=e592]:
                  - generic [ref=e593]:
                    - math [ref=e595]:
                      - generic [ref=e598]:
                        - generic [ref=e599]: d
                        - generic [ref=e600]: i
                    - generic [ref=e603]:
                      - text: d
                      - generic [ref=e608]: i
                - text: ","
                - 'generic "\\overline{d}" [ref=e612]':
                  - generic [ref=e613]:
                    - math [ref=e615]:
                      - generic [ref=e618]:
                        - generic [ref=e619]: d
                        - generic [ref=e620]: ‾
                    - generic [ref=e627]: d
                - text: ","
                - 'generic "\\mathrm{SE}" [ref=e629]':
                  - generic [ref=e630]:
                    - math [ref=e632]:
                      - generic [ref=e634]:
                        - generic [ref=e635]: S
                        - generic [ref=e636]: E
                    - generic [ref=e639]: SE
                - text: ", and related quantities."
          - navigation "Table of contents" [ref=e641]:
            - generic [ref=e642]: Contents
            - list [ref=e643]:
              - listitem [ref=e644]:
                - link "The mathematical statement" [ref=e645] [cursor=pointer]:
                  - /url: "#the-mathematical-statement"
              - listitem [ref=e646]:
                - link "The two-condition gate" [ref=e647] [cursor=pointer]:
                  - /url: "#the-two-condition-gate"
              - listitem [ref=e648]:
                - link "The decision inequality" [ref=e649] [cursor=pointer]:
                  - /url: "#the-decision-inequality"
              - listitem [ref=e650]:
                - link "Why two standard errors" [ref=e651] [cursor=pointer]:
                  - /url: "#why-two-standard-errors"
              - listitem [ref=e652]:
                - link "Dual SE reading" [ref=e653] [cursor=pointer]:
                  - /url: "#dual-se-reading"
              - listitem [ref=e654]:
                - link "The marginal-SE reading" [ref=e655] [cursor=pointer]:
                  - /url: "#the-marginal-se-reading"
              - listitem [ref=e656]:
                - link "The paired-difference SE reading" [ref=e657] [cursor=pointer]:
                  - /url: "#the-paired-difference-se-reading"
              - listitem [ref=e658]:
                - link "How to read the two together" [ref=e659] [cursor=pointer]:
                  - /url: "#how-to-read-the-two-together"
              - listitem [ref=e660]:
                - link "The two checkpoints" [ref=e661] [cursor=pointer]:
                  - /url: "#the-two-checkpoints"
              - listitem [ref=e662]:
                - link "The Phase 8 sanity gate" [ref=e663] [cursor=pointer]:
                  - /url: "#the-phase-8-sanity-gate"
              - listitem [ref=e664]:
                - link "The R16 live checkpoint" [ref=e665] [cursor=pointer]:
                  - /url: "#the-r16-live-checkpoint"
              - listitem [ref=e666]:
                - link "Operational response" [ref=e667] [cursor=pointer]:
                  - /url: "#operational-response"
              - listitem [ref=e668]:
                - link "Live status" [ref=e669] [cursor=pointer]:
                  - /url: "#live-status"
              - listitem [ref=e670]:
                - link "Why pre-registering the stopping rule matters" [ref=e671] [cursor=pointer]:
                  - /url: "#why-pre-registering-the-stopping-rule-matters"
              - listitem [ref=e672]:
                - link "Where to go next" [ref=e673] [cursor=pointer]:
                  - /url: "#where-to-go-next"
        - generic [ref=e675]:
          - region "Cite this snapshot" [ref=e676]:
            - heading "Cite this snapshot" [level=3] [ref=e677]
            - generic [ref=e678]:
              - paragraph [ref=e679]: "The 45% Problem project (2026). Kill criteria: pre-registered null-result conditions. Research Vault. https://the45percent.org/vault/kill-criteria"
              - generic [ref=e680]:
                - generic "BibTeX citation" [ref=e681]: "@misc{forty_five_percent_kill_2026, title = {Kill criteria: pre-registered null-result conditions}, author = {{The 45\\% Problem project}}, year = {2026}, howpublished = {Research Vault}, url = {https://the45percent.org/vault/kill-criteria}, }"
                - button "Copy BibTeX to clipboard" [ref=e682] [cursor=pointer]: copy
          - region "What to read next" [ref=e683]:
            - heading "What to read next" [level=3] [ref=e684]
            - list [ref=e685]:
              - listitem [ref=e686]:
                - link "Transparency Ledger Live calibration metrics and the kill-criterion check." [ref=e687] [cursor=pointer]:
                  - /url: /ledger
                  - generic [ref=e688]: Transparency Ledger
                  - text: Live calibration metrics and the kill-criterion check.
              - listitem [ref=e689]:
                - link "Pre-registration The full set of pre-registered commitments." [ref=e690] [cursor=pointer]:
                  - /url: /vault/preregistration
                  - generic [ref=e691]: Pre-registration
                  - text: The full set of pre-registered commitments.
    - contentinfo [ref=e692]:
      - generic [ref=e693]:
        - generic [ref=e694]:
          - generic [ref=e695]: About
          - paragraph [ref=e696]:
            - strong [ref=e697]: The 45% Problem
            - text: . Probabilistic Pricing for FIFA World Cup 2026.
          - paragraph [ref=e698]: Research publication. No content on this site constitutes investment or gambling advice.
        - generic [ref=e699]:
          - generic [ref=e700]: Provenance
          - generic [ref=e701]:
            - term [ref=e702]: snapshot
            - definition [ref=e703]: 2026-05-12T12:44Z
            - term [ref=e704]: code
            - definition [ref=e705]: 9e8635ce2549523f
            - term [ref=e706]: data
            - definition [ref=e707]: sha256:49974caa284edc2eb31524afb92aca4b
        - generic [ref=e708]:
          - generic [ref=e709]: Cite
          - paragraph [ref=e710]:
            - text: Duarte Jaraba, N. (2026).
            - emphasis [ref=e711]: The 45% Problem
            - text: . OSF.
            - link "osf.io/spmkg" [ref=e712] [cursor=pointer]:
              - /url: https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321
  - status
  - button "Open Next.js Dev Tools" [ref=e718] [cursor=pointer]:
    - img [ref=e719]
  - alert [ref=e722]
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