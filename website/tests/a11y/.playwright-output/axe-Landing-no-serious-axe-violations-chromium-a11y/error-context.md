# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: axe.spec.ts >> Landing (/); no serious axe violations
- Location: tests/a11y/axe.spec.ts:23:7

# Error details

```
Error: 
  [serious] color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
    target: span[aria-label="beta"]
    target: div:nth-child(2) > div > div:nth-child(2) > span
  [serious] link-in-text-block: Ensure links are distinguished from surrounding text in a way that does not rely on color
    target: .leading-relaxed > a[target="_blank"][rel="noopener noreferrer"]

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 2
Received array:  [{"description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds", "help": "Elements must meet minimum color contrast ratio thresholds", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright", "id": "color-contrast", "impact": "serious", "nodes": [{"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.78 (foreground color: #9b9792, background color: #fcfaf4, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span aria-label=\"beta\" style=\"font-family:var(--font-mono);font-size:9px;margin-left:5px;opacity:0.6;text-transform:uppercase;letter-spacing:.10em\">Beta</span>", "impact": "serious", "none": [], "target": ["span[aria-label=\"beta\"]"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8a847c, background color: #f7f4ec, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-quiet);padding:5px 10px;border:1px solid var(--border-default);border-radius:4px\">[ Historical snapshots unavailable ]</span>", "impact": "serious", "none": [], "target": ["div:nth-child(2) > div > div:nth-child(2) > span"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8a847c, background color: #f7f4ec, font size: 7.1pt (9.5px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<div class=\"mono\" style=\"font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-quiet);margin-bottom:3px\">Stage 1 · 14 · 18 Jun</div>", "impact": "serious", "none": [], "target": [".min-w-0.flex-col.flex:nth-child(1) > div:nth-child(1) > .mono"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.54 (foreground color: #8a847c, background color: #fcfaf4, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<div class=\"mono\" style=\"font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-quiet);padding:4px 9px 0 9px\">R16 · Match 01</div>", "impact": "serious", "none": [], "target": [".min-w-0.flex-col.flex:nth-child(1) > .justify-around.gap-\\[10px\\].flex-col > .bracket-match-card.overflow-hidden.bracket-fade:nth-child(1) > .mono"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.62 (foreground color: #9e9c99, background color: #fcfaf4, font size: 9.4pt (12.5px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"flex-1 truncate\" style=\"font-size:12.5px;font-weight:400;color:var(--text-secondary);letter-spacing:-0.005em\">Germany</span>", "impact": "serious", "none": [], "target": ["a[aria-label=\"Germany; team detail\"] > .truncate.flex-1"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.07 (foreground color: #b3b0aa, background color: #fcfaf4, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:11px;color:var(--text-tertiary);font-weight:400\">39<span style=\"font-size:9.5px;color:var(--text-quiet);margin-left:1px\">%</span></span>", "impact": "serious", "none": [], "target": ["a[aria-label=\"Germany; team detail\"] > span:nth-child(3)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.54 (foreground color: #8a847c, background color: #fcfaf4, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<div class=\"mono\" style=\"font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-quiet);padding:4px 9px 0 9px\">R16 · Match 02</div>", "impact": "serious", "none": [], "target": [".min-w-0.flex-col.flex:nth-child(1) > .justify-around.gap-\\[10px\\].flex-col > .bracket-match-card.overflow-hidden.bracket-fade:nth-child(2) > .mono"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.62 (foreground color: #9e9c99, background color: #fcfaf4, font size: 9.4pt (12.5px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"flex-1 truncate\" style=\"font-size:12.5px;font-weight:400;color:var(--text-secondary);letter-spacing:-0.005em\">Belgium</span>", "impact": "serious", "none": [], "target": ["a[aria-label=\"Belgium; team detail\"] > .truncate.flex-1"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 2.07 (foreground color: #b3b0aa, background color: #fcfaf4, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<span class=\"mono\" style=\"font-size:11px;color:var(--text-tertiary);font-weight:400\">39<span style=\"font-size:9.5px;color:var(--text-quiet);margin-left:1px\">%</span></span>", "impact": "serious", "none": [], "target": ["a[aria-label=\"Belgium; team detail\"] > span:nth-child(3)"]}, {"all": [], "any": [[Object]], "failureSummary": "Fix any of the following:
  Element has insufficient color contrast of 3.54 (foreground color: #8a847c, background color: #fcfaf4, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1", "html": "<div class=\"mono\" style=\"font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-quiet);padding:4px 9px 0 9px\">R16 · Match 03</div>", "impact": "serious", "none": [], "target": [".min-w-0.flex-col.flex:nth-child(1) > .justify-around.gap-\\[10px\\].flex-col > .bracket-match-card.overflow-hidden.bracket-fade:nth-child(3) > .mono"]}, …], "tags": ["cat.color", "wcag2aa", "wcag143", "TTv5", "TT13.c", "EN-301-549", "EN-9.1.4.3", "ACT", "RGAAv4", "RGAA-3.2.1"]}, {"description": "Ensure links are distinguished from surrounding text in a way that does not rely on color", "help": "Links must be distinguishable without relying on color", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/link-in-text-block?application=playwright", "id": "link-in-text-block", "impact": "serious", "nodes": [{"all": [], "any": [[Object], [Object]], "failureSummary": "Fix any of the following:
  The link has insufficient color contrast of 1.19:1 with the surrounding text. (Minimum contrast is 3:1, link text: #0f6b7d, surrounding text: #5a5550)
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
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]:
            - heading "The 45% Problem" [level=1] [ref=e21]
            - paragraph [ref=e22]: "Probabilistic pricing for FIFA World Cup 2026. M★ is a bivariate Poisson model with Dixon-Coles correction, calibrated on international match data and compared nightly to bookmaker-implied probabilities. The “45% problem” refers to a systematic divergence documented in Phase 1: market-implied championship probabilities for mid-tier contenders cluster near 45% of their model-implied values, suggesting a persistent structural mispricing that motivated this research programme."
            - paragraph [ref=e23]:
              - text: Pre-registered at
              - link "osf.io/spmkg" [ref=e24] [cursor=pointer]:
                - /url: https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321
              - text: "· tag v1.0.0-mstar-lock · Phase: pre tournament · 104 matches remaining"
          - generic:
            - generic:
              - img "Quantitative World Cup Trophy. 10,000 Monte Carlo samples from the M★ posterior."
          - paragraph [ref=e25]: A mathematical representation of 10,000 Monte Carlo samples from the M★ posterior, projected onto the FIFA World Cup trophy.
          - link "Receive the daily brief →" [ref=e27] [cursor=pointer]:
            - /url: /brief
        - generic [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]:
              - generic [ref=e32]: § 0 · Scenario
              - heading "Call the final four." [level=2] [ref=e33]
            - link "Enter the simulator →" [ref=e34] [cursor=pointer]:
              - /url: /scenario/final-four
          - paragraph [ref=e35]: Pick four semifinalists. The model has run 10,000 simulated tournaments. See where your scenario lands.
        - generic [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]:
              - generic [ref=e39]: § 1 · Championship pricing
              - heading "Tournament leaderboard" [level=2] [ref=e40]
            - generic [ref=e41]:
              - generic [ref=e42]:
                - generic [ref=e43]: MODEL STATE · 2026-05-12
                - generic [ref=e44]:
                  - button "[ CURRENT ]" [ref=e45] [cursor=pointer]
                  - generic [ref=e46]: "[ Historical snapshots unavailable ]"
              - link "All 48 teams →" [ref=e47] [cursor=pointer]:
                - /url: /bracket
          - region [ref=e49]:
            - table [ref=e52]:
              - rowgroup [ref=e53]:
                - row "# Team Championship probability Conf. Champion Final Semi 95% CI" [ref=e54]:
                  - columnheader "#" [ref=e55]
                  - columnheader "Team" [ref=e56]
                  - columnheader "Championship probability" [ref=e57]
                  - columnheader "Conf." [ref=e58]
                  - columnheader "Champion" [ref=e59]
                  - columnheader "Final" [ref=e60]
                  - columnheader "Semi" [ref=e61]
                  - columnheader "95% CI" [ref=e62]
              - rowgroup [ref=e63]:
                - row "01 ESP Spain flag Spain Spain championship probability 18.2 percent UEFA 18.2% 30.1% 42.4% 95 percent confidence interval, 17.5 to 19.0 percent" [ref=e64]:
                  - cell "01" [ref=e65]
                  - cell "ESP Spain flag Spain" [ref=e66]:
                    - link "ESP Spain flag Spain" [ref=e67] [cursor=pointer]:
                      - /url: /team/ESP
                      - text: ESP
                      - img "Spain flag" [ref=e68]
                      - text: Spain
                  - cell "Spain championship probability 18.2 percent" [ref=e70]:
                    - img "Spain championship probability 18.2 percent" [ref=e71]
                  - cell "UEFA" [ref=e73]
                  - cell "18.2%" [ref=e74]
                  - cell "30.1%" [ref=e75]
                  - cell "42.4%" [ref=e76]
                  - cell "95 percent confidence interval, 17.5 to 19.0 percent" [ref=e77]:
                    - generic "95 percent confidence interval, 17.5 to 19.0 percent" [ref=e78]: "[0.175, 0.190]"
                - row "02 FRA France flag France France championship probability 14.9 percent UEFA 14.9% 22.9% 28.5% 95 percent confidence interval, 14.2 to 15.6 percent" [ref=e79]:
                  - cell "02" [ref=e80]
                  - cell "FRA France flag France" [ref=e81]:
                    - link "FRA France flag France" [ref=e82] [cursor=pointer]:
                      - /url: /team/FRA
                      - text: FRA
                      - img "France flag" [ref=e83]
                      - text: France
                  - cell "France championship probability 14.9 percent" [ref=e85]:
                    - img "France championship probability 14.9 percent" [ref=e86]
                  - cell "UEFA" [ref=e88]
                  - cell "14.9%" [ref=e89]
                  - cell "22.9%" [ref=e90]
                  - cell "28.5%" [ref=e91]
                  - cell "95 percent confidence interval, 14.2 to 15.6 percent" [ref=e92]:
                    - generic "95 percent confidence interval, 14.2 to 15.6 percent" [ref=e93]: "[0.142, 0.156]"
                - row "03 ARG Argentina flag Argentina Argentina championship probability 13.7 percent CONMEBOL 13.7% 21.6% 27.0% 95 percent confidence interval, 13.1 to 14.4 percent" [ref=e94]:
                  - cell "03" [ref=e95]
                  - cell "ARG Argentina flag Argentina" [ref=e96]:
                    - link "ARG Argentina flag Argentina" [ref=e97] [cursor=pointer]:
                      - /url: /team/ARG
                      - text: ARG
                      - img "Argentina flag" [ref=e98]
                      - text: Argentina
                  - cell "Argentina championship probability 13.7 percent" [ref=e100]:
                    - img "Argentina championship probability 13.7 percent" [ref=e101]
                  - cell "CONMEBOL" [ref=e103]
                  - cell "13.7%" [ref=e104]
                  - cell "21.6%" [ref=e105]
                  - cell "27.0%" [ref=e106]
                  - cell "95 percent confidence interval, 13.1 to 14.4 percent" [ref=e107]:
                    - generic "95 percent confidence interval, 13.1 to 14.4 percent" [ref=e108]: "[0.131, 0.144]"
                - row "04 ENG England flag England England championship probability 8.3 percent UEFA 8.3% 14.6% 18.9% 95 percent confidence interval, 7.8 to 8.9 percent" [ref=e109]:
                  - cell "04" [ref=e110]
                  - cell "ENG England flag England" [ref=e111]:
                    - link "ENG England flag England" [ref=e112] [cursor=pointer]:
                      - /url: /team/ENG
                      - text: ENG
                      - img "England flag" [ref=e113]
                      - text: England
                  - cell "England championship probability 8.3 percent" [ref=e115]:
                    - img "England championship probability 8.3 percent" [ref=e116]
                  - cell "UEFA" [ref=e118]
                  - cell "8.3%" [ref=e119]
                  - cell "14.6%" [ref=e120]
                  - cell "18.9%" [ref=e121]
                  - cell "95 percent confidence interval, 7.8 to 8.9 percent" [ref=e122]:
                    - generic "95 percent confidence interval, 7.8 to 8.9 percent" [ref=e123]: "[0.078, 0.089]"
                - row "05 MAR Morocco flag Morocco Morocco championship probability 6.4 percent CAF 6.4% 14.2% 29.4% 95 percent confidence interval, 6.0 to 6.9 percent" [ref=e124]:
                  - cell "05" [ref=e125]
                  - cell "MAR Morocco flag Morocco" [ref=e126]:
                    - link "MAR Morocco flag Morocco" [ref=e127] [cursor=pointer]:
                      - /url: /team/MAR
                      - text: MAR
                      - img "Morocco flag" [ref=e128]
                      - text: Morocco
                  - cell "Morocco championship probability 6.4 percent" [ref=e130]:
                    - img "Morocco championship probability 6.4 percent" [ref=e131]
                  - cell "CAF" [ref=e133]
                  - cell "6.4%" [ref=e134]
                  - cell "14.2%" [ref=e135]
                  - cell "29.4%" [ref=e136]
                  - cell "95 percent confidence interval, 6.0 to 6.9 percent" [ref=e137]:
                    - generic "95 percent confidence interval, 6.0 to 6.9 percent" [ref=e138]: "[0.060, 0.069]"
                - row "06 BRA Brazil flag Brazil Brazil championship probability 6.3 percent CONMEBOL 6.3% 14.2% 30.4% 95 percent confidence interval, 5.9 to 6.8 percent" [ref=e139]:
                  - cell "06" [ref=e140]
                  - cell "BRA Brazil flag Brazil" [ref=e141]:
                    - link "BRA Brazil flag Brazil" [ref=e142] [cursor=pointer]:
                      - /url: /team/BRA
                      - text: BRA
                      - img "Brazil flag" [ref=e143]
                      - text: Brazil
                  - cell "Brazil championship probability 6.3 percent" [ref=e145]:
                    - img "Brazil championship probability 6.3 percent" [ref=e146]
                  - cell "CONMEBOL" [ref=e148]
                  - cell "6.3%" [ref=e149]
                  - cell "14.2%" [ref=e150]
                  - cell "30.4%" [ref=e151]
                  - cell "95 percent confidence interval, 5.9 to 6.8 percent" [ref=e152]:
                    - generic "95 percent confidence interval, 5.9 to 6.8 percent" [ref=e153]: "[0.059, 0.068]"
                - row "07 NED Netherlands flag Netherlands Netherlands championship probability 4.8 percent UEFA 4.8% 10.3% 17.8% 95 percent confidence interval, 4.4 to 5.3 percent" [ref=e154]:
                  - cell "07" [ref=e155]
                  - cell "NED Netherlands flag Netherlands" [ref=e156]:
                    - link "NED Netherlands flag Netherlands" [ref=e157] [cursor=pointer]:
                      - /url: /team/NED
                      - text: NED
                      - img "Netherlands flag" [ref=e158]
                      - text: Netherlands
                  - cell "Netherlands championship probability 4.8 percent" [ref=e160]:
                    - img "Netherlands championship probability 4.8 percent" [ref=e161]
                  - cell "UEFA" [ref=e163]
                  - cell "4.8%" [ref=e164]
                  - cell "10.3%" [ref=e165]
                  - cell "17.8%" [ref=e166]
                  - cell "95 percent confidence interval, 4.4 to 5.3 percent" [ref=e167]:
                    - generic "95 percent confidence interval, 4.4 to 5.3 percent" [ref=e168]: "[0.044, 0.053]"
                - row "08 GER Germany flag Germany Germany championship probability 3.8 percent UEFA 3.8% 8.6% 17.7% 95 percent confidence interval, 3.4 to 4.2 percent" [ref=e169]:
                  - cell "08" [ref=e170]
                  - cell "GER Germany flag Germany" [ref=e171]:
                    - link "GER Germany flag Germany" [ref=e172] [cursor=pointer]:
                      - /url: /team/GER
                      - text: GER
                      - img "Germany flag" [ref=e173]
                      - text: Germany
                  - cell "Germany championship probability 3.8 percent" [ref=e175]:
                    - img "Germany championship probability 3.8 percent" [ref=e176]
                  - cell "UEFA" [ref=e178]
                  - cell "3.8%" [ref=e179]
                  - cell "8.6%" [ref=e180]
                  - cell "17.7%" [ref=e181]
                  - cell "95 percent confidence interval, 3.4 to 4.2 percent" [ref=e182]:
                    - generic "95 percent confidence interval, 3.4 to 4.2 percent" [ref=e183]: "[0.034, 0.042]"
        - generic [ref=e184]:
          - generic [ref=e185]:
            - generic [ref=e186]:
              - generic [ref=e187]: § 1.5 · Modal path
              - heading "Most likely bracket" [level=2] [ref=e188]
            - link "Full bracket →" [ref=e189] [cursor=pointer]:
              - /url: /bracket
          - 'region "Each match shows the posterior probability that the favoured side advances. Click a team to open its progression page. The chain · R16 through final: is the sequence of modal outcomes; its joint likelihood is much lower than any leg alone." [ref=e191]':
            - paragraph [ref=e192]: "Each match shows the posterior probability that the favoured side advances. Click a team to open its progression page. The chain · R16 through final: is the sequence of modal outcomes; its joint likelihood is much lower than any leg alone."
            - generic [ref=e194]:
              - generic [ref=e195]:
                - generic [ref=e196]:
                  - generic [ref=e197]: Stage 1 · 14 · 18 Jun
                  - generic [ref=e199]: Round of 16
                - generic [ref=e200]:
                  - generic [ref=e201]:
                    - generic [ref=e202]: R16 · Match 01
                    - link "Spain; team detail" [ref=e203] [cursor=pointer]:
                      - /url: /team/ESP
                      - img "Spain flag" [ref=e204]
                      - generic [ref=e206]: Spain
                      - generic [ref=e207]: 61%
                    - link "Germany; team detail" [ref=e209] [cursor=pointer]:
                      - /url: /team/GER
                      - img "Germany flag" [ref=e210]
                      - generic [ref=e212]: Germany
                      - generic [ref=e213]: 39%
                  - generic [ref=e214]:
                    - generic [ref=e215]: R16 · Match 02
                    - link "Brazil; team detail" [ref=e216] [cursor=pointer]:
                      - /url: /team/BRA
                      - img "Brazil flag" [ref=e217]
                      - generic [ref=e219]: Brazil
                      - generic [ref=e220]: 61%
                    - link "Belgium; team detail" [ref=e222] [cursor=pointer]:
                      - /url: /team/BEL
                      - img "Belgium flag" [ref=e223]
                      - generic [ref=e225]: Belgium
                      - generic [ref=e226]: 39%
                  - generic [ref=e227]:
                    - generic [ref=e228]: R16 · Match 03
                    - link "France; team detail" [ref=e229] [cursor=pointer]:
                      - /url: /team/FRA
                      - img "France flag" [ref=e230]
                      - generic [ref=e232]: France
                      - generic [ref=e233]: 63%
                    - link "Korea Republic; team detail" [ref=e235] [cursor=pointer]:
                      - /url: /team/KOR
                      - img "Korea Republic flag" [ref=e236]
                      - generic [ref=e238]: Korea Republic
                      - generic [ref=e239]: 37%
                  - generic [ref=e240]:
                    - generic [ref=e241]: R16 · Match 04
                    - link "Morocco; team detail" [ref=e242] [cursor=pointer]:
                      - /url: /team/MAR
                      - img "Morocco flag" [ref=e243]
                      - generic [ref=e245]: Morocco
                      - generic [ref=e246]: 58%
                    - link "Switzerland; team detail" [ref=e248] [cursor=pointer]:
                      - /url: /team/SUI
                      - img "Switzerland flag" [ref=e249]
                      - generic [ref=e251]: Switzerland
                      - generic [ref=e252]: 42%
              - generic [ref=e274]:
                - generic [ref=e275]:
                  - generic [ref=e276]: Stage 2 · 28 · 29 Jun
                  - generic [ref=e278]: Quarterfinals
                - generic [ref=e279]:
                  - generic [ref=e280]:
                    - generic [ref=e281]: Upper A
                    - link "Spain; team detail" [ref=e282] [cursor=pointer]:
                      - /url: /team/ESP
                      - img "Spain flag" [ref=e283]
                      - generic [ref=e285]: Spain
                      - generic [ref=e286]: 58%
                    - link "Brazil; team detail" [ref=e288] [cursor=pointer]:
                      - /url: /team/BRA
                      - img "Brazil flag" [ref=e289]
                      - generic [ref=e291]: Brazil
                      - generic [ref=e292]: 42%
                  - generic [ref=e293]:
                    - generic [ref=e294]: Upper B
                    - link "France; team detail" [ref=e295] [cursor=pointer]:
                      - /url: /team/FRA
                      - img "France flag" [ref=e296]
                      - generic [ref=e298]: France
                      - generic [ref=e299]: 49%
                    - link "Morocco; team detail" [ref=e301] [cursor=pointer]:
                      - /url: /team/MAR
                      - img "Morocco flag" [ref=e302]
                      - generic [ref=e304]: Morocco
                      - generic [ref=e305]: 51%
              - generic [ref=e317]:
                - generic [ref=e318]:
                  - generic [ref=e319]: Stage 3 · 02 Jul
                  - generic [ref=e321]: Semifinal
                - generic [ref=e323]:
                  - generic [ref=e324]: Upper half
                  - link "Spain; team detail" [ref=e325] [cursor=pointer]:
                    - /url: /team/ESP
                    - img "Spain flag" [ref=e326]
                    - generic [ref=e328]: Spain
                    - generic [ref=e329]: 68%
                  - link "Brazil; team detail" [ref=e331] [cursor=pointer]:
                    - /url: /team/BRA
                    - img "Brazil flag" [ref=e332]
                    - generic [ref=e334]: Brazil
                    - generic [ref=e335]: 32%
              - generic [ref=e342]:
                - generic [ref=e343]:
                  - generic [ref=e344]: Stage 4 · 19 Jul · MetLife
                  - generic [ref=e346]: Final
                - generic [ref=e348]:
                  - generic [ref=e349]:
                    - generic [ref=e350]: M★ champion
                    - generic [ref=e351]:
                      - generic [ref=e352]: ◆
                      - img "Spain flag" [ref=e353]
                      - link "Spain" [ref=e355] [cursor=pointer]:
                        - /url: /team/ESP
                    - generic [ref=e356]: P(champion) = 18.2%
                  - generic [ref=e357]:
                    - link "Spain; team detail" [ref=e358] [cursor=pointer]:
                      - /url: /team/ESP
                      - img "Spain flag" [ref=e359]
                      - generic [ref=e361]: Spain
                      - generic [ref=e362]: 55%
                    - link "France; team detail" [ref=e364] [cursor=pointer]:
                      - /url: /team/FRA
                      - img "France flag" [ref=e365]
                      - generic [ref=e367]: France
                      - generic [ref=e368]: 45%
              - generic [ref=e375]:
                - generic [ref=e376]:
                  - generic [ref=e377]: Stage 3 · 02 Jul
                  - generic [ref=e379]: Semifinal
                - generic [ref=e381]:
                  - generic [ref=e382]: Lower half
                  - link "Morocco; team detail" [ref=e383] [cursor=pointer]:
                    - /url: /team/MAR
                    - img "Morocco flag" [ref=e384]
                    - generic [ref=e386]: Morocco
                    - generic [ref=e387]: 38%
                  - link "France; team detail" [ref=e389] [cursor=pointer]:
                    - /url: /team/FRA
                    - img "France flag" [ref=e390]
                    - generic [ref=e392]: France
                    - generic [ref=e393]: 62%
              - generic [ref=e405]:
                - generic [ref=e406]:
                  - generic [ref=e407]: Stage 2 · 28 · 29 Jun
                  - generic [ref=e409]: Quarterfinals
                - generic [ref=e410]:
                  - generic [ref=e411]:
                    - generic [ref=e412]: Lower A
                    - link "Argentina; team detail" [ref=e413] [cursor=pointer]:
                      - /url: /team/ARG
                      - img "Argentina flag" [ref=e414]
                      - generic [ref=e416]: Argentina
                      - generic [ref=e417]: 57%
                    - link "Mexico; team detail" [ref=e419] [cursor=pointer]:
                      - /url: /team/MEX
                      - img "Mexico flag" [ref=e420]
                      - generic [ref=e422]: Mexico
                      - generic [ref=e423]: 43%
                  - generic [ref=e424]:
                    - generic [ref=e425]: Lower B
                    - link "England; team detail" [ref=e426] [cursor=pointer]:
                      - /url: /team/ENG
                      - img "England flag" [ref=e427]
                      - generic [ref=e429]: England
                      - generic [ref=e430]: 52%
                    - link "Netherlands; team detail" [ref=e432] [cursor=pointer]:
                      - /url: /team/NED
                      - img "Netherlands flag" [ref=e433]
                      - generic [ref=e435]: Netherlands
                      - generic [ref=e436]: 48%
              - generic [ref=e458]:
                - generic [ref=e459]:
                  - generic [ref=e460]: Stage 1 · 14 · 18 Jun
                  - generic [ref=e462]: Round of 16
                - generic [ref=e463]:
                  - generic [ref=e464]:
                    - generic [ref=e465]: R16 · Match 05
                    - link "Argentina; team detail" [ref=e466] [cursor=pointer]:
                      - /url: /team/ARG
                      - img "Argentina flag" [ref=e467]
                      - generic [ref=e469]: Argentina
                      - generic [ref=e470]: 64%
                    - link "Ecuador; team detail" [ref=e472] [cursor=pointer]:
                      - /url: /team/ECU
                      - img "Ecuador flag" [ref=e473]
                      - generic [ref=e475]: Ecuador
                      - generic [ref=e476]: 36%
                  - generic [ref=e477]:
                    - generic [ref=e478]: R16 · Match 06
                    - link "Mexico; team detail" [ref=e479] [cursor=pointer]:
                      - /url: /team/MEX
                      - img "Mexico flag" [ref=e480]
                      - generic [ref=e482]: Mexico
                      - generic [ref=e483]: 67%
                    - link "Scotland; team detail" [ref=e485] [cursor=pointer]:
                      - /url: /team/SCO
                      - img "Scotland flag" [ref=e486]
                      - generic [ref=e488]: Scotland
                      - generic [ref=e489]: 33%
                  - generic [ref=e490]:
                    - generic [ref=e491]: R16 · Match 07
                    - link "England; team detail" [ref=e492] [cursor=pointer]:
                      - /url: /team/ENG
                      - img "England flag" [ref=e493]
                      - generic [ref=e495]: England
                      - generic [ref=e496]: 66%
                    - link "Egypt; team detail" [ref=e498] [cursor=pointer]:
                      - /url: /team/EGY
                      - img "Egypt flag" [ref=e499]
                      - generic [ref=e501]: Egypt
                      - generic [ref=e502]: 34%
                  - generic [ref=e503]:
                    - generic [ref=e504]: R16 · Match 08
                    - link "Netherlands; team detail" [ref=e505] [cursor=pointer]:
                      - /url: /team/NED
                      - img "Netherlands flag" [ref=e506]
                      - generic [ref=e508]: Netherlands
                      - generic [ref=e509]: 60%
                    - link "Portugal; team detail" [ref=e511] [cursor=pointer]:
                      - /url: /team/POR
                      - img "Portugal flag" [ref=e512]
                      - generic [ref=e514]: Portugal
                      - generic [ref=e515]: 40%
        - generic [ref=e518]:
          - generic [ref=e519]: Interlude · Trailer
          - heading "The project, in motion" [level=2] [ref=e520]
        - generic [ref=e523]:
          - generic [ref=e525]:
            - generic [ref=e526]: § 1.6 · Terminal
            - heading "Dashboard" [level=2] [ref=e527]
          - generic [ref=e528]:
            - region "Top divergences" [ref=e529]:
              - generic [ref=e530]:
                - generic [ref=e531]: widget · divergence
                - generic [ref=e532]: n = 48 markets
              - heading "Top divergences" [level=2] [ref=e533]
              - paragraph [ref=e534]: Markets where M★ disagrees most with de-vigged book consensus.
              - table [ref=e536]:
                - rowgroup [ref=e542]:
                  - row "Team M★ model Market Divergence" [ref=e543]:
                    - columnheader "Team" [ref=e544]
                    - columnheader "M★ model" [ref=e545]
                    - columnheader "Market" [ref=e546]
                    - columnheader "Divergence" [ref=e547]
                - rowgroup [ref=e548]:
                  - row "Spain flag Spain 92.3% 97.1% −4.8pp" [ref=e549]:
                    - cell "Spain flag Spain" [ref=e550]:
                      - generic [ref=e551]:
                        - img "Spain flag" [ref=e552]
                        - generic [ref=e554]: Spain
                    - cell "92.3%" [ref=e555]
                    - cell "97.1%" [ref=e556]
                    - cell "−4.8pp" [ref=e557]:
                      - generic [ref=e558]: −4.8pp
                  - row "Germany flag Germany 85.3% 89.1% −3.8pp" [ref=e559]:
                    - cell "Germany flag Germany" [ref=e560]:
                      - generic [ref=e561]:
                        - img "Germany flag" [ref=e562]
                        - generic [ref=e564]: Germany
                    - cell "85.3%" [ref=e565]
                    - cell "89.1%" [ref=e566]
                    - cell "−3.8pp" [ref=e567]:
                      - generic [ref=e568]: −3.8pp
                  - row "Switzerland flag Switzerland 83.7% 87.4% −3.7pp" [ref=e569]:
                    - cell "Switzerland flag Switzerland" [ref=e570]:
                      - generic [ref=e571]:
                        - img "Switzerland flag" [ref=e572]
                        - generic [ref=e574]: Switzerland
                    - cell "83.7%" [ref=e575]
                    - cell "87.4%" [ref=e576]
                    - cell "−3.7pp" [ref=e577]:
                      - generic [ref=e578]: −3.7pp
              - generic [ref=e579]:
                - generic [ref=e580]: sorted |E| desc
                - link "Full divergence terminal →" [ref=e581] [cursor=pointer]:
                  - /url: /terminal
            - region "Biggest movers" [ref=e582]:
              - generic [ref=e583]:
                - generic [ref=e584]: widget · momentum
                - generic [ref=e585]: Δt = 7d · preview
              - heading "Biggest movers" [level=2] [ref=e586]
              - paragraph [ref=e587]: "Largest 7-day shifts in Δ rank. Reported descriptively: pre-registered §7.2."
              - generic [ref=e589]:
                - generic [ref=e591]: Trending up
                - generic [ref=e593]: Δ ≥ +1
              - table [ref=e594]:
                - rowgroup [ref=e599]:
                  - row "Team P(champion) Δ rank · 7d" [ref=e600]:
                    - columnheader "Team" [ref=e601]
                    - columnheader "P(champion)" [ref=e602]
                    - columnheader "Δ rank · 7d" [ref=e603]
                - rowgroup [ref=e604]:
                  - row "Brazil flag Brazil 6.3% +3" [ref=e605]:
                    - cell "Brazil flag Brazil" [ref=e606]:
                      - generic [ref=e607]:
                        - img "Brazil flag" [ref=e608]
                        - generic [ref=e610]: Brazil
                    - cell "6.3%" [ref=e611]
                    - cell "+3" [ref=e612]:
                      - generic [ref=e613]: "+3"
                  - row "Netherlands flag Netherlands 4.8% +2" [ref=e614]:
                    - cell "Netherlands flag Netherlands" [ref=e615]:
                      - generic [ref=e616]:
                        - img "Netherlands flag" [ref=e617]
                        - generic [ref=e619]: Netherlands
                    - cell "4.8%" [ref=e620]
                    - cell "+2" [ref=e621]:
                      - generic [ref=e622]: "+2"
              - generic [ref=e623]:
                - generic [ref=e625]: Trending down
                - generic [ref=e627]: Δ ≤ −1
              - table [ref=e628]:
                - rowgroup [ref=e633]:
                  - row "Team P(champion) Δ rank · 7d" [ref=e634]:
                    - columnheader "Team" [ref=e635]
                    - columnheader "P(champion)" [ref=e636]
                    - columnheader "Δ rank · 7d" [ref=e637]
                - rowgroup [ref=e638]:
                  - row "Germany flag Germany 3.8% −2" [ref=e639]:
                    - cell "Germany flag Germany" [ref=e640]:
                      - generic [ref=e641]:
                        - img "Germany flag" [ref=e642]
                        - generic [ref=e644]: Germany
                    - cell "3.8%" [ref=e645]
                    - cell "−2" [ref=e646]:
                      - generic [ref=e647]: −2
                  - row "Spain flag Spain 18.2% −2" [ref=e648]:
                    - cell "Spain flag Spain" [ref=e649]:
                      - generic [ref=e650]:
                        - img "Spain flag" [ref=e651]
                        - generic [ref=e653]: Spain
                    - cell "18.2%" [ref=e654]
                    - cell "−2" [ref=e655]:
                      - generic [ref=e656]: −2
              - generic [ref=e657]:
                - generic [ref=e658]: baseline -
                - generic [ref=e659]: n = 48
        - generic [ref=e660]:
          - generic [ref=e661]:
            - generic [ref=e662]:
              - generic [ref=e663]: § 2 · This window
              - heading "Featured divergences" [level=2] [ref=e664]
            - link "Full terminal →" [ref=e665] [cursor=pointer]:
              - /url: /terminal
          - generic [ref=e666]:
            - link [ref=e667] [cursor=pointer]:
              - /url: /match/M15
              - article [ref=e668]:
                - generic [ref=e669]: § Featured divergence · 06-15 16:00Z
                - heading "Spain flag Spain vs Cabo Verde flag Cabo Verde" [level=3] [ref=e670]:
                  - img "Spain flag" [ref=e671]
                  - text: Spain vs
                  - img "Cabo Verde flag" [ref=e673]
                  - text: Cabo Verde
                - paragraph [ref=e675]: Market prices home richer than model.
                - generic [ref=e676]:
                  - generic [ref=e677]:
                    - generic [ref=e678]: p · model
                    - generic [ref=e679]: 92.3%
                  - generic [ref=e680]:
                    - generic [ref=e681]: q · market
                    - generic [ref=e682]: 97.1%
                  - generic [ref=e683]:
                    - generic [ref=e684]: edge
                    - generic "edge, negative 4.8 percentage points" [ref=e685]: −4.8pp
            - link [ref=e686] [cursor=pointer]:
              - /url: /match/M09
              - article [ref=e687]:
                - generic [ref=e688]: § Featured divergence · 06-14 17:00Z
                - heading "Germany flag Germany vs Curaçao flag Curaçao" [level=3] [ref=e689]:
                  - img "Germany flag" [ref=e690]
                  - text: Germany vs
                  - img "Curaçao flag" [ref=e692]
                  - text: Curaçao
                - paragraph [ref=e694]: Market prices home richer than model.
                - generic [ref=e695]:
                  - generic [ref=e696]:
                    - generic [ref=e697]: p · model
                    - generic [ref=e698]: 85.3%
                  - generic [ref=e699]:
                    - generic [ref=e700]: q · market
                    - generic [ref=e701]: 89.1%
                  - generic [ref=e702]:
                    - generic [ref=e703]: edge
                    - generic "edge, negative 3.8 percentage points" [ref=e704]: −3.8pp
            - link [ref=e705] [cursor=pointer]:
              - /url: /match/M04
              - article [ref=e706]:
                - generic [ref=e707]: § Featured divergence · 06-13 19:00Z
                - heading "Qatar flag Qatar vs Switzerland flag Switzerland" [level=3] [ref=e708]:
                  - img "Qatar flag" [ref=e709]
                  - text: Qatar vs
                  - img "Switzerland flag" [ref=e711]
                  - text: Switzerland
                - paragraph [ref=e713]: Market prices away richer than model.
                - generic [ref=e714]:
                  - generic [ref=e715]:
                    - generic [ref=e716]: p · model
                    - generic [ref=e717]: 83.7%
                  - generic [ref=e718]:
                    - generic [ref=e719]: q · market
                    - generic [ref=e720]: 87.4%
                  - generic [ref=e721]:
                    - generic [ref=e722]: edge
                    - generic "edge, negative 3.7 percentage points" [ref=e723]: −3.7pp
        - generic [ref=e724]:
          - generic [ref=e726]:
            - generic [ref=e727]: § 3 · Calibration
            - heading "How the model is doing" [level=2] [ref=e728]
          - generic [ref=e729]:
            - generic [ref=e730]:
              - generic [ref=e731]: Brier (lower = better)
              - generic [ref=e732]: "-"
            - generic [ref=e733]:
              - generic [ref=e734]: Log-loss
              - generic [ref=e735]: "-"
            - generic [ref=e736]:
              - generic [ref=e737]: Settled forecasts
              - generic [ref=e738]: "0"
            - generic [ref=e739]:
              - text: "Pre-tournament window. Calibration populates after the first settled forecasts. Model:"
              - generic [ref=e740]: M★ (M_STAR)
              - text: "· MC runs: 10,000."
              - link "Transparency ledger →" [ref=e741] [cursor=pointer]:
                - /url: /ledger
        - generic [ref=e742]:
          - generic [ref=e743]:
            - generic [ref=e744]:
              - generic [ref=e745]: § 4 · Research vault
              - heading "Recent writing" [level=2] [ref=e746]
            - link "All essays →" [ref=e747] [cursor=pointer]:
              - /url: /vault
          - generic [ref=e748]:
            - link "Essay The 45% problem, in three figures 45analytics Research · Phase 1 findings 2026-05-20" [ref=e749] [cursor=pointer]:
              - /url: /vault
              - generic [ref=e750]: Essay
              - generic [ref=e751]:
                - heading "The 45% problem, in three figures" [level=4] [ref=e752]
                - generic [ref=e753]: 45analytics Research · Phase 1 findings
              - generic [ref=e754]: 2026-05-20
            - link "Protocol Pre-registration, amendments, and failure modes 45analytics Research · Methodology · v12.1 2026-04-02" [ref=e755] [cursor=pointer]:
              - /url: /vault/preregistration
              - generic [ref=e756]: Protocol
              - generic [ref=e757]:
                - heading "Pre-registration, amendments, and failure modes" [level=4] [ref=e758]
                - generic [ref=e759]: 45analytics Research · Methodology · v12.1
              - generic [ref=e760]: 2026-04-02
            - link "Note Why we publish a ledger, not a record 45analytics Research · Editorial · short 2026-03-15" [ref=e761] [cursor=pointer]:
              - /url: /ledger
              - generic [ref=e762]: Note
              - generic [ref=e763]:
                - heading "Why we publish a ledger, not a record" [level=4] [ref=e764]
                - generic [ref=e765]: 45analytics Research · Editorial · short
              - generic [ref=e766]: 2026-03-15
            - link "Essay Calibration, sharpness, and the tyranny of accuracy 45analytics Research · Research · 18 min 2026-02-28" [ref=e767] [cursor=pointer]:
              - /url: /vault/models
              - generic [ref=e768]: Essay
              - generic [ref=e769]:
                - heading "Calibration, sharpness, and the tyranny of accuracy" [level=4] [ref=e770]
                - generic [ref=e771]: 45analytics Research · Research · 18 min
              - generic [ref=e772]: 2026-02-28
        - generic [ref=e773]:
          - generic [ref=e774]:
            - heading "The quantitative surface lives one click away." [level=3] [ref=e775]
            - paragraph [ref=e776]: Every number on this page is traceable to a snapshot and a code SHA in the Divergence Terminal.
          - link "Open terminal →" [ref=e777] [cursor=pointer]:
            - /url: /terminal
    - contentinfo [ref=e778]:
      - generic [ref=e779]:
        - generic [ref=e780]:
          - generic [ref=e781]: About
          - paragraph [ref=e782]:
            - strong [ref=e783]: The 45% Problem
            - text: . Probabilistic Pricing for FIFA World Cup 2026.
          - paragraph [ref=e784]: Research publication. No content on this site constitutes investment or gambling advice.
        - generic [ref=e785]:
          - generic [ref=e786]: Provenance
          - generic [ref=e787]:
            - term [ref=e788]: snapshot
            - definition [ref=e789]: 2026-05-12T12:44Z
            - term [ref=e790]: code
            - definition [ref=e791]: 9e8635ce2549523f
            - term [ref=e792]: data
            - definition [ref=e793]: sha256:49974caa284edc2eb31524afb92aca4b
        - generic [ref=e794]:
          - generic [ref=e795]: Cite
          - paragraph [ref=e796]:
            - text: Duarte Jaraba, N. (2026).
            - emphasis [ref=e797]: The 45% Problem
            - text: . OSF.
            - link "osf.io/spmkg" [ref=e798] [cursor=pointer]:
              - /url: https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321
  - status
  - button "Open Next.js Dev Tools" [ref=e804] [cursor=pointer]:
    - img [ref=e805]
  - alert [ref=e808]
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