# Design Patch v2.1 — Color and Behavior Fixes

**Project:** 45analytics / The 45% Problem
**Feature:** Tournament Scenario Simulator
**Audience:** UI/UX Design Agent (continuation of the v2 build)
**Scope:** Three small patches. Do not redesign anything outside the named surfaces. Do not introduce new tokens.

The v2 build is in good shape. This patch addresses three specific issues spotted in walkthrough. Each one is local, named, and reversible.

---

## Patch 1 — Remove the cyan from `[ select opponent ]` buttons (Champion's Path)

**Location:** Champion's Path mode, Round of 16 / Quarterfinal / Semifinal / Final stage cells, the `[ select opponent ]` action button on each empty stage.

**Problem:** The current build renders these buttons in a bright cyan/teal that is not part of the design system. It looks like the `--accent-focus` token has been mistakenly used as a `color` or `border` value. Cyan introduces a third color into a system that is supposed to be neutral plus one warm accent plus state colors. It breaks the discipline.

**Fix:** Render `[ select opponent ]` buttons in the same style as every other action button in the simulator:
- 1px solid border in `--border-default`
- Sharp corners (`border-radius: 0`)
- Monospace label, current text color (`--text-primary`)
- No fill in the default state
- Hover state: invert to bone fill with black text (existing pattern from `MonoBtn`)
- Focus ring uses `--accent-focus` as an `outline`, not as a fill or text color

**Verification check:** With the page open, no element on the Champion's Path screen should be cyan. The only colors visible should be: bone text, neutral grays, the dark canvas, and (on hover) the warm accent on the CTA at the bottom. If you see cyan anywhere besides the focus ring on a keyboard-focused element, the patch is incomplete.

---

## Patch 2 — Mode selector card headings should be neutral, not warm

**Location:** Mode selector screen ("Choose your mode"), the three card headings: `FINAL FOUR`, `CHAMPION'S PATH`, `FULL BRACKET`.

**Problem:** All three card headings currently render in the warm terracotta accent (`--accent-warm`). Per the v2 brief, the warm accent has exactly three permitted uses: CTA hover, PROMOTED state, Trade Ticket flag border. The mode selector headings are not on that list. Spending the accent here weakens its signal when it later appears on a PROMOTED prediction (where it actually matters).

**Fix:** Change the default color of the mode card headings from `--accent-warm` to `--text-primary` (or whatever the standard mono uppercase eyebrow token is in the existing system). The warm accent is permitted to appear **only on hover**: when the user moves their cursor over a card, the heading and the card border tint warm. On mouseout, both return to neutral. On focus (keyboard), use the `--accent-focus` outline pattern, not the warm tint.

**Verification check:** Open the mode selector with no hover state. All three headings should read in the same neutral color as the rest of the mono labels in the simulator (e.g. `REALITY SCORE`, `MODEL SHA`, `SNAPSHOT`). Hover over any one card; only that card's heading and border should tint warm. Move the cursor away; the warm tint should disappear.

---

## Patch 3 — Suppress rarity band and 1-in-N during build

**Location:** All three modes during construction (Final Four with fewer than 4 picks; Champion's Path with the path not yet fully resolved; Full Bracket before the final match is decided). The element to change: the bottom-right "rarity tag" that currently shows `Common · 1 in 1` (visible in Champion's Path screenshot) and any equivalent partial rarity readout in the other modes.

**Problem:** A rarity band rendered on a partially-built scenario is mathematically meaningless and editorially harmful. With only one or two constraints set, almost every simulation matches, so the band defaults to "Common · 1 in 1." This devalues the band before the user has earned it. The rarity band is supposed to feel like a verdict; right now it is rendering as a counter.

**Fix:** While the user is building, hide the rarity band and the 1-in-N restatement entirely. Only the partial **percentage** is allowed to render in this phase, and even that is optional (the v1 / v2 spec calls it "Partial Reality Score" in the Full Bracket; the same reasoning applies to the others). The rarity band and the 1-in-N appear **only at submit**, as part of the reveal sequence specified in v2 §5.6 (band at 100ms, 1-in-N at 200ms).

Concretely:
- In Final Four mode, hide the band and 1-in-N until all four slots are filled and the user has submitted.
- In Champion's Path mode, hide the band and 1-in-N until the path is fully resolved (every stage has both an opponent and a W/L) and the user has submitted.
- In Full Bracket mode, the partial percentage may continue to render (it is genuinely informative as the bracket fills). The band and 1-in-N still wait for submit.

**Verification check:** Start each mode and stop midway through. The bottom-right area should show no rarity word ("Common", "Plausible", etc.) and no "1 in N" line. Submit the prediction; both elements appear in the reveal sequence as already implemented.

---

## What stays untouched

Do not change:
- The two-register system (editorial hero, technical dashboard).
- The reveal sequence timings (band 100ms, 1-in-N 200ms, ticket 400ms, gate 1000ms).
- The PROMOTED warm chevron and color treatment in the dashboard.
- The DEAD strikethrough and muted-red state label.
- The "Comparing yourself to the model" integrity footer on the dashboard.
- The Champion's Path narrative sentence builder (this is working; do not adjust).
- Any copy not explicitly named above.

---

## Deliverable

Updated build with these three fixes applied. No new tokens. No new colors. No new components. Just three localized corrections.

Ping me when done; we will then commission the landing-page hero animation as a separate piece.
