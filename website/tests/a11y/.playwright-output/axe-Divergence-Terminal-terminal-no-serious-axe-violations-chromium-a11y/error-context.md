# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: axe.spec.ts >> Divergence Terminal (/terminal); no serious axe violations
- Location: tests/a11y/axe.spec.ts:23:7

# Error details

```
Error: 
  [serious] aria-conditional-attr: Ensure ARIA attributes are used as described in the specification of the element's role
    target: div[data-index="0"]
    target: div[data-index="1"]
  [critical] aria-required-children: Ensure elements with an ARIA role that require child roles contain them
    target: div[data-index="0"]
    target: div[data-index="1"]
  [serious] color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
    target: span[aria-label="beta"]
    target: .items-end > .text-\[10px\].mono
  [serious] link-in-text-block: Ensure links are distinguished from surrounding text in a way that does not rely on color
    target: a[data-guide-id="osf-link"]
    target: .leading-relaxed > a[target="_blank"][rel="noopener noreferrer"]

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 4
Received array:  [{"description": "Ensure ARIA attributes are used as described in the specification of the element's role", "help": "ARIA attributes must be used as specified for the element's role", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/aria-conditional-attr?application=playwright", "id": "aria-conditional-attr", "impact": "serious", "nodes": [Array], "tags": [Array]}, {"description": "Ensure elements with an ARIA role that require child roles contain them", "help": "Certain ARIA roles must contain particular children", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/aria-required-children?application=playwright", "id": "aria-required-children", "impact": "critical", "nodes": [Array], "tags": [Array]}, {"description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds", "help": "Elements must meet minimum color contrast ratio thresholds", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright", "id": "color-contrast", "impact": "serious", "nodes": [Array], "tags": [Array]}, {"description": "Ensure links are distinguished from surrounding text in a way that does not rely on color", "help": "Links must be distinguishable without relying on color", "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/link-in-text-block?application=playwright", "id": "link-in-text-block", "impact": "serious", "nodes": [Array], "tags": [Array]}]
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
            - heading "Divergence Terminal" [level=1] [ref=e20]
            - paragraph [ref=e21]: Model-vs-market divergence · sorted by |E| descending · snapshot 2026-05-12T12:44Z
          - generic [ref=e22]:
            - link "How to read this" [ref=e23] [cursor=pointer]:
              - /url: /terminal?guide=1
              - img [ref=e24]
              - text: How to read this
            - generic [ref=e26]: Guided tour · 7 steps · ~90s
        - generic [ref=e28]:
          - text: "Research publication. Divergences are descriptive statistics: model-implied probability minus de-vigged market-implied probability. No content on this terminal constitutes investment or gambling advice. Methodology pre-registered at"
          - link "osf.io/spmkg" [ref=e29] [cursor=pointer]:
            - /url: https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321
          - text: .
        - generic [ref=e31]:
          - search "Terminal filters" [ref=e32]:
            - generic [ref=e33]: "Filter:"
            - combobox "Filter by round" [ref=e34]:
              - option "All rounds" [selected]
              - option "GRP"
              - option "R32"
              - option "R16"
              - option "QF"
              - option "SF"
              - option "3P"
              - option "FIN"
            - combobox "Filter by market" [ref=e35]:
              - option "All markets" [selected]
              - option "1X2"
              - option "BTTS"
              - option "O/U 2.5"
              - option "AH −0.5"
              - option "AH +0.5"
              - option "Adv. KO"
            - combobox "Filter by gate status" [ref=e36]:
              - option "All gate states" [selected]
              - option "Open only"
            - combobox "Filter by edge band" [ref=e37]:
              - option "All |E|" [selected]
              - option "|E| ≥ 3%"
              - option "|E| ≥ 5%"
            - combobox "Filter by team name" [ref=e38]
          - grid "Divergence terminal. 48 rows" [ref=e39]:
            - row "Column headers" [ref=e40]:
              - columnheader "Sort by Kickoff (UTC)" [ref=e41]:
                - button "Sort by Kickoff (UTC)" [ref=e42]: Kickoff (UTC)
              - columnheader "Sort by Round" [ref=e43]:
                - button "Sort by Round" [ref=e44]: Round
              - columnheader "Matchup" [ref=e45]
              - columnheader "Market" [ref=e46]
              - columnheader "Outcome" [ref=e47]
              - columnheader "Sort by p (model)" [ref=e48]:
                - button "Sort by p (model)" [ref=e49]: p (model)
              - columnheader "Sort by q (mkt)" [ref=e50]:
                - button "Sort by q (mkt)" [ref=e51]: q (mkt)
              - columnheader "Divergence" [ref=e52]
              - columnheader "Sort by Edge E, descending" [ref=e53]:
                - button "Sort by Edge E, descending" [ref=e54]:
                  - text: Edge E
                  - generic [ref=e55]: ▼
              - columnheader "Pre-registered edge threshold" [ref=e56]: ε
              - columnheader "Sort by Gate" [ref=e57]:
                - button "Sort by Gate" [ref=e58]: Gate
            - generic [ref=e60]:
              - row "Expand details for Spain vs Cabo Verde 1X2 HOME" [ref=e61]:
                - generic "Expand details for Spain vs Cabo Verde 1X2 HOME" [ref=e62] [cursor=pointer]:
                  - gridcell "kickoff 06-15 16:00Z" [ref=e63]: 06-15 16:00Z
                  - gridcell "GRP" [ref=e64]
                  - gridcell "ESP Spain flag Spain ‒ Cabo Verde Cabo Verde flag CPV" [ref=e65]:
                    - link "ESP Spain flag Spain ‒ Cabo Verde Cabo Verde flag CPV" [ref=e66]:
                      - /url: /match/M15
                      - text: ESP
                      - img "Spain flag" [ref=e67]
                      - text: Spain ‒ Cabo Verde
                      - img "Cabo Verde flag" [ref=e69]
                      - text: CPV
                  - gridcell "1X2" [ref=e71]
                  - gridcell "HOME" [ref=e72]
                  - gridcell "92.3 percent" [ref=e73]:
                    - generic "92.3 percent" [ref=e74]: 92.3%
                  - gridcell "97.1 percent" [ref=e75]:
                    - generic "97.1 percent" [ref=e76]: 97.1%
                  - gridcell "model 92.3%, market 97.1%" [ref=e77]:
                    - img "model 92.3%, market 97.1%" [ref=e78]:
                      - img [ref=e79]
                  - gridcell "edge, negative 4.8 percentage points exact edge -482 basis points, -4.824 percentage points" [ref=e82]:
                    - generic "edge, negative 4.8 percentage points" [ref=e83]: −4.8pp
                    - generic "exact edge -482 basis points, -4.824 percentage points":
                      - generic: −482 bps
                      - generic: ·
                      - generic: 4.824%
                  - gridcell "threshold 3 percent" [ref=e84]:
                    - generic "threshold 3 percent" [ref=e85]: 3%
                  - gridcell "gate status OPEN" [ref=e86]:
                    - generic "gate status OPEN" [ref=e87]: Open
              - row "Expand details for Germany vs Curaçao 1X2 HOME" [ref=e88]:
                - generic "Expand details for Germany vs Curaçao 1X2 HOME" [ref=e89] [cursor=pointer]:
                  - gridcell "kickoff 06-14 17:00Z" [ref=e90]: 06-14 17:00Z
                  - gridcell "GRP" [ref=e91]
                  - gridcell "GER Germany flag Germany ‒ Curaçao Curaçao flag CUW" [ref=e92]:
                    - link "GER Germany flag Germany ‒ Curaçao Curaçao flag CUW" [ref=e93]:
                      - /url: /match/M09
                      - text: GER
                      - img "Germany flag" [ref=e94]
                      - text: Germany ‒ Curaçao
                      - img "Curaçao flag" [ref=e96]
                      - text: CUW
                  - gridcell "1X2" [ref=e98]
                  - gridcell "HOME" [ref=e99]
                  - gridcell "85.3 percent" [ref=e100]:
                    - generic "85.3 percent" [ref=e101]: 85.3%
                  - gridcell "89.1 percent" [ref=e102]:
                    - generic "89.1 percent" [ref=e103]: 89.1%
                  - gridcell "model 85.3%, market 89.1%" [ref=e104]:
                    - img "model 85.3%, market 89.1%" [ref=e105]:
                      - img [ref=e106]
                  - gridcell "edge, negative 3.8 percentage points exact edge -382 basis points, -3.818 percentage points" [ref=e109]:
                    - generic "edge, negative 3.8 percentage points" [ref=e110]: −3.8pp
                    - generic "exact edge -382 basis points, -3.818 percentage points":
                      - generic: −382 bps
                      - generic: ·
                      - generic: 3.818%
                  - gridcell "threshold 3 percent" [ref=e111]:
                    - generic "threshold 3 percent" [ref=e112]: 3%
                  - gridcell "gate status OPEN" [ref=e113]:
                    - generic "gate status OPEN" [ref=e114]: Open
              - row "Expand details for Qatar vs Switzerland 1X2 AWAY" [ref=e115]:
                - generic "Expand details for Qatar vs Switzerland 1X2 AWAY" [ref=e116] [cursor=pointer]:
                  - gridcell "kickoff 06-13 19:00Z" [ref=e117]: 06-13 19:00Z
                  - gridcell "GRP" [ref=e118]
                  - gridcell "QAT Qatar flag Qatar ‒ Switzerland Switzerland flag SUI" [ref=e119]:
                    - link "QAT Qatar flag Qatar ‒ Switzerland Switzerland flag SUI" [ref=e120]:
                      - /url: /match/M04
                      - text: QAT
                      - img "Qatar flag" [ref=e121]
                      - text: Qatar ‒ Switzerland
                      - img "Switzerland flag" [ref=e123]
                      - text: SUI
                  - gridcell "1X2" [ref=e125]
                  - gridcell "AWAY" [ref=e126]
                  - gridcell "83.7 percent" [ref=e127]:
                    - generic "83.7 percent" [ref=e128]: 83.7%
                  - gridcell "87.4 percent" [ref=e129]:
                    - generic "87.4 percent" [ref=e130]: 87.4%
                  - gridcell "model 83.7%, market 87.4%" [ref=e131]:
                    - img "model 83.7%, market 87.4%" [ref=e132]:
                      - img [ref=e133]
                  - gridcell "edge, negative 3.7 percentage points exact edge -366 basis points, -3.656 percentage points" [ref=e136]:
                    - generic "edge, negative 3.7 percentage points" [ref=e137]: −3.7pp
                    - generic "exact edge -366 basis points, -3.656 percentage points":
                      - generic: −366 bps
                      - generic: ·
                      - generic: 3.656%
                  - gridcell "threshold 3 percent" [ref=e138]:
                    - generic "threshold 3 percent" [ref=e139]: 3%
                  - gridcell "gate status OPEN" [ref=e140]:
                    - generic "gate status OPEN" [ref=e141]: Open
              - row "Expand details for Spain vs Cabo Verde 1X2 DRAW" [ref=e142]:
                - generic "Expand details for Spain vs Cabo Verde 1X2 DRAW" [ref=e143] [cursor=pointer]:
                  - gridcell "kickoff 06-15 16:00Z" [ref=e144]: 06-15 16:00Z
                  - gridcell "GRP" [ref=e145]
                  - gridcell "ESP Spain flag Spain ‒ Cabo Verde Cabo Verde flag CPV" [ref=e146]:
                    - link "ESP Spain flag Spain ‒ Cabo Verde Cabo Verde flag CPV" [ref=e147]:
                      - /url: /match/M15
                      - text: ESP
                      - img "Spain flag" [ref=e148]
                      - text: Spain ‒ Cabo Verde
                      - img "Cabo Verde flag" [ref=e150]
                      - text: CPV
                  - gridcell "1X2" [ref=e152]
                  - gridcell "DRAW" [ref=e153]
                  - gridcell "5.4 percent" [ref=e154]:
                    - generic "5.4 percent" [ref=e155]: 5.4%
                  - gridcell "2.2 percent" [ref=e156]:
                    - generic "2.2 percent" [ref=e157]: 2.2%
                  - gridcell "model 5.4%, market 2.2%" [ref=e158]:
                    - img "model 5.4%, market 2.2%" [ref=e159]:
                      - img [ref=e160]
                  - gridcell "edge, positive 3.2 percentage points exact edge 325 basis points, 3.249 percentage points" [ref=e163]:
                    - generic "edge, positive 3.2 percentage points" [ref=e164]: +3.2pp
                    - generic "exact edge 325 basis points, 3.249 percentage points":
                      - generic: +325 bps
                      - generic: ·
                      - generic: 3.249%
                  - gridcell "threshold 3 percent" [ref=e165]:
                    - generic "threshold 3 percent" [ref=e166]: 3%
                  - gridcell "gate status OPEN" [ref=e167]:
                    - generic "gate status OPEN" [ref=e168]: Open
              - row "Expand details for Mexico vs South Africa 1X2 HOME" [ref=e169]:
                - generic "Expand details for Mexico vs South Africa 1X2 HOME" [ref=e170] [cursor=pointer]:
                  - gridcell "kickoff 06-11 19:00Z" [ref=e171]: 06-11 19:00Z
                  - gridcell "GRP" [ref=e172]
                  - gridcell "MEX Mexico flag Mexico ‒ South Africa South Africa flag RSA" [ref=e173]:
                    - link "MEX Mexico flag Mexico ‒ South Africa South Africa flag RSA" [ref=e174]:
                      - /url: /match/M01
                      - text: MEX
                      - img "Mexico flag" [ref=e175]
                      - text: Mexico ‒ South Africa
                      - img "South Africa flag" [ref=e177]
                      - text: RSA
                  - gridcell "1X2" [ref=e179]
                  - gridcell "HOME" [ref=e180]
                  - gridcell "73.1 percent" [ref=e181]:
                    - generic "73.1 percent" [ref=e182]: 73.1%
                  - gridcell "75.8 percent" [ref=e183]:
                    - generic "75.8 percent" [ref=e184]: 75.8%
                  - gridcell "model 73.1%, market 75.8%" [ref=e185]:
                    - img "model 73.1%, market 75.8%" [ref=e186]:
                      - img [ref=e187]
                  - gridcell "edge, negative 2.7 percentage points exact edge -272 basis points, -2.719 percentage points" [ref=e190]:
                    - generic "edge, negative 2.7 percentage points" [ref=e191]: −2.7pp
                    - generic "exact edge -272 basis points, -2.719 percentage points":
                      - generic: −272 bps
                      - generic: ·
                      - generic: 2.719%
                  - gridcell "threshold 3 percent" [ref=e192]:
                    - generic "threshold 3 percent" [ref=e193]: 3%
                  - gridcell "gate status OPEN" [ref=e194]:
                    - generic "gate status OPEN" [ref=e195]: Open
              - row "Expand details for Saudi Arabia vs Uruguay 1X2 AWAY" [ref=e196]:
                - generic "Expand details for Saudi Arabia vs Uruguay 1X2 AWAY" [ref=e197] [cursor=pointer]:
                  - gridcell "kickoff 06-15 22:00Z" [ref=e198]: 06-15 22:00Z
                  - gridcell "GRP" [ref=e199]
                  - gridcell "KSA Saudi Arabia flag Saudi Arabia ‒ Uruguay Uruguay flag URU" [ref=e200]:
                    - link "KSA Saudi Arabia flag Saudi Arabia ‒ Uruguay Uruguay flag URU" [ref=e201]:
                      - /url: /match/M16
                      - text: KSA
                      - img "Saudi Arabia flag" [ref=e202]
                      - text: Saudi Arabia ‒ Uruguay
                      - img "Uruguay flag" [ref=e204]
                      - text: URU
                  - gridcell "1X2" [ref=e206]
                  - gridcell "AWAY" [ref=e207]
                  - gridcell "72.2 percent" [ref=e208]:
                    - generic "72.2 percent" [ref=e209]: 72.2%
                  - gridcell "74.8 percent" [ref=e210]:
                    - generic "74.8 percent" [ref=e211]: 74.8%
                  - gridcell "model 72.2%, market 74.8%" [ref=e212]:
                    - img "model 72.2%, market 74.8%" [ref=e213]:
                      - img [ref=e214]
                  - gridcell "edge, negative 2.6 percentage points exact edge -264 basis points, -2.644 percentage points" [ref=e217]:
                    - generic "edge, negative 2.6 percentage points" [ref=e218]: −2.6pp
                    - generic "exact edge -264 basis points, -2.644 percentage points":
                      - generic: −264 bps
                      - generic: ·
                      - generic: 2.644%
                  - gridcell "threshold 3 percent" [ref=e219]:
                    - generic "threshold 3 percent" [ref=e220]: 3%
                  - gridcell "gate status OPEN" [ref=e221]:
                    - generic "gate status OPEN" [ref=e222]: Open
              - row "Expand details for Germany vs Curaçao 1X2 DRAW" [ref=e223]:
                - generic "Expand details for Germany vs Curaçao 1X2 DRAW" [ref=e224] [cursor=pointer]:
                  - gridcell "kickoff 06-14 17:00Z" [ref=e225]: 06-14 17:00Z
                  - gridcell "GRP" [ref=e226]
                  - gridcell "GER Germany flag Germany ‒ Curaçao Curaçao flag CUW" [ref=e227]:
                    - link "GER Germany flag Germany ‒ Curaçao Curaçao flag CUW" [ref=e228]:
                      - /url: /match/M09
                      - text: GER
                      - img "Germany flag" [ref=e229]
                      - text: Germany ‒ Curaçao
                      - img "Curaçao flag" [ref=e231]
                      - text: CUW
                  - gridcell "1X2" [ref=e233]
                  - gridcell "DRAW" [ref=e234]
                  - gridcell "9.6 percent" [ref=e235]:
                    - generic "9.6 percent" [ref=e236]: 9.6%
                  - gridcell "7.3 percent" [ref=e237]:
                    - generic "7.3 percent" [ref=e238]: 7.3%
                  - gridcell "model 9.6%, market 7.3%" [ref=e239]:
                    - img "model 9.6%, market 7.3%" [ref=e240]:
                      - img [ref=e241]
                  - gridcell "edge, positive 2.3 percentage points exact edge 227 basis points, 2.270 percentage points" [ref=e244]:
                    - generic "edge, positive 2.3 percentage points" [ref=e245]: +2.3pp
                    - generic "exact edge 227 basis points, 2.270 percentage points":
                      - generic: +227 bps
                      - generic: ·
                      - generic: 2.270%
                  - gridcell "threshold 3 percent" [ref=e246]:
                    - generic "threshold 3 percent" [ref=e247]: 3%
                  - gridcell "gate status OPEN" [ref=e248]:
                    - generic "gate status OPEN" [ref=e249]: Open
              - row "Expand details for Côte d'Ivoire vs Ecuador 1X2 AWAY" [ref=e250]:
                - generic "Expand details for Côte d'Ivoire vs Ecuador 1X2 AWAY" [ref=e251] [cursor=pointer]:
                  - gridcell "kickoff 06-14 23:00Z" [ref=e252]: 06-14 23:00Z
                  - gridcell "GRP" [ref=e253]
                  - gridcell "CIV Côte d'Ivoire flag Côte d'Ivoire ‒ Ecuador Ecuador flag ECU" [ref=e254]:
                    - link "CIV Côte d'Ivoire flag Côte d'Ivoire ‒ Ecuador Ecuador flag ECU" [ref=e255]:
                      - /url: /match/M10
                      - text: CIV
                      - img "Côte d'Ivoire flag" [ref=e256]
                      - text: Côte d'Ivoire ‒ Ecuador
                      - img "Ecuador flag" [ref=e258]
                      - text: ECU
                  - gridcell "1X2" [ref=e260]
                  - gridcell "AWAY" [ref=e261]
                  - gridcell "65.6 percent" [ref=e262]:
                    - generic "65.6 percent" [ref=e263]: 65.6%
                  - gridcell "67.7 percent" [ref=e264]:
                    - generic "67.7 percent" [ref=e265]: 67.7%
                  - gridcell "model 65.6%, market 67.7%" [ref=e266]:
                    - img "model 65.6%, market 67.7%" [ref=e267]:
                      - img [ref=e268]
                  - gridcell "edge, negative 2.1 percentage points exact edge -214 basis points, -2.139 percentage points" [ref=e271]:
                    - generic "edge, negative 2.1 percentage points" [ref=e272]: −2.1pp
                    - generic "exact edge -214 basis points, -2.139 percentage points":
                      - generic: −214 bps
                      - generic: ·
                      - generic: 2.139%
                  - gridcell "threshold 3 percent" [ref=e273]:
                    - generic "threshold 3 percent" [ref=e274]: 3%
                  - gridcell "gate status OPEN" [ref=e275]:
                    - generic "gate status OPEN" [ref=e276]: Open
              - row "Expand details for Qatar vs Switzerland 1X2 DRAW" [ref=e277]:
                - generic "Expand details for Qatar vs Switzerland 1X2 DRAW" [ref=e278] [cursor=pointer]:
                  - gridcell "kickoff 06-13 19:00Z" [ref=e279]: 06-13 19:00Z
                  - gridcell "GRP" [ref=e280]
                  - gridcell "QAT Qatar flag Qatar ‒ Switzerland Switzerland flag SUI" [ref=e281]:
                    - link "QAT Qatar flag Qatar ‒ Switzerland Switzerland flag SUI" [ref=e282]:
                      - /url: /match/M04
                      - text: QAT
                      - img "Qatar flag" [ref=e283]
                      - text: Qatar ‒ Switzerland
                      - img "Switzerland flag" [ref=e285]
                      - text: SUI
                  - gridcell "1X2" [ref=e287]
                  - gridcell "DRAW" [ref=e288]
                  - gridcell "10.4 percent" [ref=e289]:
                    - generic "10.4 percent" [ref=e290]: 10.4%
                  - gridcell "8.3 percent" [ref=e291]:
                    - generic "8.3 percent" [ref=e292]: 8.3%
                  - gridcell "model 10.4%, market 8.3%" [ref=e293]:
                    - img "model 10.4%, market 8.3%" [ref=e294]:
                      - img [ref=e295]
                  - gridcell "edge, positive 2.1 percentage points exact edge 213 basis points, 2.128 percentage points" [ref=e298]:
                    - generic "edge, positive 2.1 percentage points" [ref=e299]: +2.1pp
                    - generic "exact edge 213 basis points, 2.128 percentage points":
                      - generic: +213 bps
                      - generic: ·
                      - generic: 2.128%
                  - gridcell "threshold 3 percent" [ref=e300]:
                    - generic "threshold 3 percent" [ref=e301]: 3%
                  - gridcell "gate status OPEN" [ref=e302]:
                    - generic "gate status OPEN" [ref=e303]: Open
              - row "Expand details for Haiti vs Scotland 1X2 AWAY" [ref=e304]:
                - generic "Expand details for Haiti vs Scotland 1X2 AWAY" [ref=e305] [cursor=pointer]:
                  - gridcell "kickoff 06-14 00:00Z" [ref=e306]: 06-14 00:00Z
                  - gridcell "GRP" [ref=e307]
                  - gridcell "HAI Haiti flag Haiti ‒ Scotland Scotland flag SCO" [ref=e308]:
                    - link "HAI Haiti flag Haiti ‒ Scotland Scotland flag SCO" [ref=e309]:
                      - /url: /match/M06
                      - text: HAI
                      - img "Haiti flag" [ref=e310]
                      - text: Haiti ‒ Scotland
                      - img "Scotland flag" [ref=e312]
                      - text: SCO
                  - gridcell "1X2" [ref=e314]
                  - gridcell "AWAY" [ref=e315]
                  - gridcell "63.3 percent" [ref=e316]:
                    - generic "63.3 percent" [ref=e317]: 63.3%
                  - gridcell "65.3 percent" [ref=e318]:
                    - generic "65.3 percent" [ref=e319]: 65.3%
                  - gridcell "model 63.3%, market 65.3%" [ref=e320]:
                    - img "model 63.3%, market 65.3%" [ref=e321]:
                      - img [ref=e322]
                  - gridcell "edge, negative 2.0 percentage points exact edge -197 basis points, -1.972 percentage points" [ref=e325]:
                    - generic "edge, negative 2.0 percentage points" [ref=e326]: −2.0pp
                    - generic "exact edge -197 basis points, -1.972 percentage points":
                      - generic: −197 bps
                      - generic: ·
                      - generic: 1.972%
                  - gridcell "threshold 3 percent" [ref=e327]:
                    - generic "threshold 3 percent" [ref=e328]: 3%
                  - gridcell "gate status OPEN" [ref=e329]:
                    - generic "gate status OPEN" [ref=e330]: Open
              - row "Expand details for Canada vs Bosnia & Herzegovina 1X2 HOME" [ref=e331]:
                - generic "Expand details for Canada vs Bosnia & Herzegovina 1X2 HOME" [ref=e332] [cursor=pointer]:
                  - gridcell "kickoff 06-12 19:00Z" [ref=e333]: 06-12 19:00Z
                  - gridcell "GRP" [ref=e334]
                  - gridcell "CAN Canada flag Canada ‒ Bosnia & Herzegovina Bosnia & Herzegovina flag BIH" [ref=e335]:
                    - link "CAN Canada flag Canada ‒ Bosnia & Herzegovina Bosnia & Herzegovina flag BIH" [ref=e336]:
                      - /url: /match/M03
                      - text: CAN
                      - img "Canada flag" [ref=e337]
                      - text: Canada ‒ Bosnia & Herzegovina
                      - img "Bosnia & Herzegovina flag" [ref=e339]
                      - text: BIH
                  - gridcell "1X2" [ref=e341]
                  - gridcell "HOME" [ref=e342]
                  - gridcell "58.6 percent" [ref=e343]:
                    - generic "58.6 percent" [ref=e344]: 58.6%
                  - gridcell "60.2 percent" [ref=e345]:
                    - generic "60.2 percent" [ref=e346]: 60.2%
                  - gridcell "model 58.6%, market 60.2%" [ref=e347]:
                    - img "model 58.6%, market 60.2%" [ref=e348]:
                      - img [ref=e349]
                  - gridcell "edge, negative 1.6 percentage points exact edge -163 basis points, -1.628 percentage points" [ref=e352]:
                    - generic "edge, negative 1.6 percentage points" [ref=e353]: −1.6pp
                    - generic "exact edge -163 basis points, -1.628 percentage points":
                      - generic: −163 bps
                      - generic: ·
                      - generic: 1.628%
                  - gridcell "threshold 3 percent" [ref=e354]:
                    - generic "threshold 3 percent" [ref=e355]: 3%
                  - gridcell "gate status OPEN" [ref=e356]:
                    - generic "gate status OPEN" [ref=e357]: Open
              - row "Expand details for Spain vs Cabo Verde 1X2 AWAY" [ref=e358]:
                - generic "Expand details for Spain vs Cabo Verde 1X2 AWAY" [ref=e359] [cursor=pointer]:
                  - gridcell "kickoff 06-15 16:00Z" [ref=e360]: 06-15 16:00Z
                  - gridcell "GRP" [ref=e361]
                  - gridcell "ESP Spain flag Spain ‒ Cabo Verde Cabo Verde flag CPV" [ref=e362]:
                    - link "ESP Spain flag Spain ‒ Cabo Verde Cabo Verde flag CPV" [ref=e363]:
                      - /url: /match/M15
                      - text: ESP
                      - img "Spain flag" [ref=e364]
                      - text: Spain ‒ Cabo Verde
                      - img "Cabo Verde flag" [ref=e366]
                      - text: CPV
                  - gridcell "1X2" [ref=e368]
                  - gridcell "AWAY" [ref=e369]
                  - gridcell "2.2 percent" [ref=e370]:
                    - generic "2.2 percent" [ref=e371]: 2.2%
                  - gridcell "0.7 percent" [ref=e372]:
                    - generic "0.7 percent" [ref=e373]: 0.7%
                  - gridcell "model 2.2%, market 0.7%" [ref=e374]:
                    - img "model 2.2%, market 0.7%" [ref=e375]:
                      - img [ref=e376]
                  - gridcell "edge, positive 1.6 percentage points exact edge 157 basis points, 1.574 percentage points" [ref=e379]:
                    - generic "edge, positive 1.6 percentage points" [ref=e380]: +1.6pp
                    - generic "exact edge 157 basis points, 1.574 percentage points":
                      - generic: +157 bps
                      - generic: ·
                      - generic: 1.574%
                  - gridcell "threshold 3 percent" [ref=e381]:
                    - generic "threshold 3 percent" [ref=e382]: 3%
                  - gridcell "gate status OPEN" [ref=e383]:
                    - generic "gate status OPEN" [ref=e384]: Open
              - row "Expand details for Germany vs Curaçao 1X2 AWAY" [ref=e385]:
                - generic "Expand details for Germany vs Curaçao 1X2 AWAY" [ref=e386] [cursor=pointer]:
                  - gridcell "kickoff 06-14 17:00Z" [ref=e387]: 06-14 17:00Z
                  - gridcell "GRP" [ref=e388]
                  - gridcell "GER Germany flag Germany ‒ Curaçao Curaçao flag CUW" [ref=e389]:
                    - link "GER Germany flag Germany ‒ Curaçao Curaçao flag CUW" [ref=e390]:
                      - /url: /match/M09
                      - text: GER
                      - img "Germany flag" [ref=e391]
                      - text: Germany ‒ Curaçao
                      - img "Curaçao flag" [ref=e393]
                      - text: CUW
                  - gridcell "1X2" [ref=e395]
                  - gridcell "AWAY" [ref=e396]
                  - gridcell "5.1 percent" [ref=e397]:
                    - generic "5.1 percent" [ref=e398]: 5.1%
                  - gridcell "3.6 percent" [ref=e399]:
                    - generic "3.6 percent" [ref=e400]: 3.6%
                  - gridcell "model 5.1%, market 3.6%" [ref=e401]:
                    - img "model 5.1%, market 3.6%" [ref=e402]:
                      - img [ref=e403]
                  - gridcell "edge, positive 1.5 percentage points exact edge 155 basis points, 1.548 percentage points" [ref=e406]:
                    - generic "edge, positive 1.5 percentage points" [ref=e407]: +1.5pp
                    - generic "exact edge 155 basis points, 1.548 percentage points":
                      - generic: +155 bps
                      - generic: ·
                      - generic: 1.548%
                  - gridcell "threshold 3 percent" [ref=e408]:
                    - generic "threshold 3 percent" [ref=e409]: 3%
                  - gridcell "gate status OPEN" [ref=e410]:
                    - generic "gate status OPEN" [ref=e411]: Open
              - row "Expand details for Belgium vs Egypt 1X2 HOME" [ref=e412]:
                - generic "Expand details for Belgium vs Egypt 1X2 HOME" [ref=e413] [cursor=pointer]:
                  - gridcell "kickoff 06-15 19:00Z" [ref=e414]: 06-15 19:00Z
                  - gridcell "GRP" [ref=e415]
                  - gridcell "BEL Belgium flag Belgium ‒ Egypt Egypt flag EGY" [ref=e416]:
                    - link "BEL Belgium flag Belgium ‒ Egypt Egypt flag EGY" [ref=e417]:
                      - /url: /match/M13
                      - text: BEL
                      - img "Belgium flag" [ref=e418]
                      - text: Belgium ‒ Egypt
                      - img "Egypt flag" [ref=e420]
                      - text: EGY
                  - gridcell "1X2" [ref=e422]
                  - gridcell "HOME" [ref=e423]
                  - gridcell "57.2 percent" [ref=e424]:
                    - generic "57.2 percent" [ref=e425]: 57.2%
                  - gridcell "58.8 percent" [ref=e426]:
                    - generic "58.8 percent" [ref=e427]: 58.8%
                  - gridcell "model 57.2%, market 58.8%" [ref=e428]:
                    - img "model 57.2%, market 58.8%" [ref=e429]:
                      - img [ref=e430]
                  - gridcell "edge, negative 1.5 percentage points exact edge -153 basis points, -1.530 percentage points" [ref=e433]:
                    - generic "edge, negative 1.5 percentage points" [ref=e434]: −1.5pp
                    - generic "exact edge -153 basis points, -1.530 percentage points":
                      - generic: −153 bps
                      - generic: ·
                      - generic: 1.530%
                  - gridcell "threshold 3 percent" [ref=e435]:
                    - generic "threshold 3 percent" [ref=e436]: 3%
                  - gridcell "gate status OPEN" [ref=e437]:
                    - generic "gate status OPEN" [ref=e438]: Open
          - generic [ref=e439]: 48 rows · snapshot 2026-05-12T12:44Z · click any row to expand model breakdown and edge history
        - generic [ref=e441]:
          - paragraph [ref=e442]: "p (model) . M★ model-implied probability for the outcome. q (mkt) ; de-vigged market-implied probability from source_book. E ; edge: p(model) − q(market). Positive = model implies higher probability than market."
          - paragraph [ref=e443]: "Rows where the Volatility Gate tripped are annotated with a ◆ dot and remain visible: the gate annotates, it does not filter. Gate rules are shown in the Gate column hover-card. ε is the pre-registered edge threshold (3% mainline / 5% longshot)."
          - paragraph [ref=e444]: "Click any row to expand the model breakdown and edge_E history sparkline. URL encodes all active filters: copy the address bar to share a specific view."
          - paragraph [ref=e445]:
            - link "Open the guided walkthrough →" [ref=e446] [cursor=pointer]:
              - /url: /terminal?guide=1
    - contentinfo [ref=e447]:
      - generic [ref=e448]:
        - generic [ref=e449]:
          - generic [ref=e450]: About
          - paragraph [ref=e451]:
            - strong [ref=e452]: The 45% Problem
            - text: . Probabilistic Pricing for FIFA World Cup 2026.
          - paragraph [ref=e453]: Research publication. No content on this site constitutes investment or gambling advice.
        - generic [ref=e454]:
          - generic [ref=e455]: Provenance
          - generic [ref=e456]:
            - term [ref=e457]: snapshot
            - definition [ref=e458]: 2026-05-12T12:44Z
            - term [ref=e459]: code
            - definition [ref=e460]: 9e8635ce2549523f
            - term [ref=e461]: data
            - definition [ref=e462]: sha256:49974caa284edc2eb31524afb92aca4b
        - generic [ref=e463]:
          - generic [ref=e464]: Cite
          - paragraph [ref=e465]:
            - text: Duarte Jaraba, N. (2026).
            - emphasis [ref=e466]: The 45% Problem
            - text: . OSF.
            - link "osf.io/spmkg" [ref=e467] [cursor=pointer]:
              - /url: https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321
  - status
  - button "Open Next.js Dev Tools" [ref=e473] [cursor=pointer]:
    - img [ref=e474]
  - alert [ref=e477]
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