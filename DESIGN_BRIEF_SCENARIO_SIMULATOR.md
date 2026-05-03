# Design Brief — Tournament Scenario Simulator

**Project:** 45analytics / The 45% Problem
**Feature:** Tournament Scenario Simulator (FIFA World Cup 2026)
**Audience for this brief:** UI/UX Design Agent
**Output expected:** Component designs, share-card templates, dashboard states, email templates, and a tokenized style sheet that extends (does not replace) the existing 45analytics design system.

---

## 0. Context and Mission

45analytics is a probabilistic pricing framework for the FIFA World Cup 2026. The product is not a prediction tool. It is a market-comparison engine built on 10,000 Monte Carlo simulations of the tournament, a Bivariate Poisson match model, and a calibrated comparison against de-vigged bookmaker probabilities.

The Tournament Scenario Simulator is a public-facing feature. Its purpose is to bring streamers, Instagram users, and casual fans into contact with the model in a way that is genuinely viral, while never compromising the scientific posture of the project. The viral hook is a single number, the **Reality Score**, expressed with its explicit denominator (e.g. `0.42% — 42 of 10,000 simulations`), and a single shareable artifact, the **Digital Trade Ticket**.

The design must read as Bloomberg Terminal, not DraftKings. It must read as research instrument, not casino. Every design decision is judged against that standard.

---

## 1. Visual Integrity and Aesthetic Foundation

This section governs every other section. Read it first. Apply it everywhere.

### 1.1 The Aesthetic Reference

The reference is the institutional quant terminal. Think Bloomberg, FactSet, Reuters Eikon, the older Wolfram displays. Specific visual properties:

- **Monospace-first typography.** The existing project monospace stack is the default body face. Numbers especially must always be monospace, with tabular figures, so that columns of probabilities align vertically.
- **Sharp corners.** `border-radius: 0` everywhere. No exceptions. No "soft" rounding on cards, buttons, inputs, or images.
- **High density.** Information per square pixel is high. Whitespace exists for grouping, not decoration. Avoid the airy, generous spacing common in consumer SaaS.
- **Thin rules, not boxes.** Use 1px hairline rules to separate sections rather than bordered cards with shadows.
- **No drop shadows. No glows. No gradients.** Solid fills only.
- **No illustrations.** No mascots. No icon families with personality. If iconography is needed, use minimal geometric glyphs (squares, triangles, hairline arrows) drawn at 1px stroke.
- **Restrained palette.** Backgrounds are black or near-black. Text is bone white or muted neutral. One accent color (the existing 45analytics accent; if undefined, propose an amber consistent with terminal references). Status colors (ALIVE / DEAD / PROMOTED) are introduced sparingly and only for state semantics.

### 1.2 Typography Stack (existing tokens, do not replace)

Use the existing 45analytics typography tokens. The agent should propose how to map them to this feature, not replace them. The expected mapping:

- **Monospace** for all numerical values, prediction IDs, scenario blocks, system metadata (timestamps, SHAs), and primary body copy in dense data zones.
- **Serif** for headline moments and transitional copy where editorial tone is appropriate (the home hero of the simulator, the mode-selection screen, the post-submit confirmation).
- **Sans** for secondary metadata, helper text, and form labels where monospace would be illegible at small sizes.

### 1.3 Design Tokens to Honor

The agent must consume the existing 45analytics token file (colors, type scale, spacing scale). New tokens introduced for this feature should be additive, namespaced (`--scenario-*`, `--reality-*`, `--state-*`), and documented in the design hand-off.

### 1.4 Density and Grid

Adopt a 12-column grid at desktop, 4-column at mobile. Gutters tight (16px desktop, 12px mobile). All component padding on a 4px subgrid. Vertical rhythm anchored to the monospace cap height; do not use a separate baseline grid.

### 1.5 Motion

Motion is functional, never decorative. Permitted:

- 100ms opacity fades on state transitions.
- Single-frame "tick" updates when probabilities refresh (no easing curves; instant value swap with a 60ms flash to communicate change).
- Numerical count-up animations are forbidden. Probabilities snap to value.

---

## 2. Component Design — The Three Prediction Modes

All three modes share the same submission engine, the same Reality Score function, and the same Digital Trade Ticket output. They differ only in the construction interface.

The mode selector is a single horizontal strip on entry: three options, equal weight, monospace labels, hairline divider. No "recommended" badge. The user picks.

### 2.1 Mode A — Final Four

**Goal:** Lowest-friction entry. Target completion under 30 seconds.

**Interaction:**

- A single screen with four labeled slots: `SF1`, `SF2`, `SF3`, `SF4` (or `SEMIFINAL [1..4]`). Slots are blank on load.
- Below the slots, a 48-team grid (the WC 2026 qualifiers). Teams are listed in three-letter FIFA codes (ARG, BRA, ENG, etc.) plus the full name in smaller Sans below. The grid is alphabetical, not seeded; seeding implies authority that the model does not endorse here.
- User taps four teams. Each tap fills the next empty slot. A team can be deselected by tapping it in the slot row.
- A "live" Reality Score reads at the top of the screen and updates after the fourth selection: `REALITY SCORE: pending` until four are picked, then `REALITY SCORE: 1.84% (184 / 10,000 simulations)`.

**Visual treatment:**

- Slots are 1px-bordered rectangles, full height of the slot row, no fill. Filled slot shows team code in 32pt monospace, full team name in 12pt sans below.
- Team grid is a dense table, 6 columns at desktop, 3 at mobile. Each cell is selectable; selected state is solid accent fill with black text (inverted).

**Copy:**

- Heading (Serif): "Pick the four semifinalists."
- Subhead (Sans): "We compare your scenario against 10,000 simulations of the tournament."
- CTA (Mono): `[ COMPUTE REALITY SCORE ]` (button is a sharp-cornered, 1px-bordered hit area with the bracketed mono label).

### 2.2 Mode B — Champion's Path

**Goal:** Narrative engagement. One team's story from R16 to Final. Target completion 60 to 90 seconds.

**Interaction:**

- Step 1: User picks a team from the 48-team grid. This is "their team."
- Step 2: A linear path is rendered horizontally: `R16 — QF — SF — F`. (For this brief only, the en-dash is used to describe the visual; the actual rendered separators in the UI must be vertical hairline rules or the word `>` in monospace, not dashes.) Each stage shows the user's team in fixed position on the left, an empty opponent slot on the right, and a result toggle (`W` or `L`) in the center.
- Step 3: For each stage, the user selects the opponent (filtered to teams the model considers reachable at that stage in at least 1 of 10,000 runs; teams below this threshold are greyed) and the result.
- The path resolves only if every stage is consistent. If the user picks `L` at QF, the SF and F stages auto-disable and grey out, and the Reality Score is computed against "team eliminated at QF by opponent X."

**Visual treatment:**

- The path is a single horizontal track at desktop, vertically stacked at mobile.
- Each stage is a 1px-bordered cell; the team-of-interest sits in a fixed column on the left of each cell.
- The result toggle is a two-cell switch: `[ W ][ L ]`, sharp-cornered, monospace.
- Below the path, an inline "narrative" line in serif renders the scenario in plain English as it builds: "Mexico beats USA in the Round of 16, beats Germany in the Quarterfinal, falls to Brazil in the Semifinal." This is the share-friendly story.

**Copy:**

- Heading (Serif): "Trace your team's path."
- Subhead (Sans): "Each stage is filtered to opponents the model considers reachable."

### 2.3 Mode C — Full Bracket

**Goal:** Power-user mode. Yields a research-grade record of fully specified user beliefs.

**Interaction:**

- A complete 16-team knockout bracket from the Round of 16 onwards is rendered.
- The Round of 16 slots are pre-populated with the 16 group-stage qualifiers projected by the user via group-winner / group-runner-up dropdowns in a top panel; the user does not need to fill all 32 group-stage matches, only the 12 group winners and 12 runners-up. (This is the deliberate friction reduction that makes the Full Bracket feasible without sacrificing the bracket's research value.)
- Each match cell is a 1px-bordered horizontal strip with two team rows. The user clicks the team they want to advance. The advancing team auto-populates the next round.
- The Reality Score updates progressively: as soon as Round of 16 is complete, a partial Reality Score is shown for "your R16 outcomes match X of 10,000 simulations." This continues to refine through QF, SF, and F.

**Visual treatment:**

- Bracket renders left-to-right at desktop, vertically scrollable on mobile (do not attempt to compress a full bracket into a phone-width view; let it scroll).
- All match cells use the same hairline-bordered, sharp-cornered strip pattern. No team logos. Three-letter team codes in monospace, full names in 10pt sans below.
- Selected (advancing) team is inverted: solid accent fill, black text.
- Eliminated teams in completed match cells fade to 40% opacity. They remain visible (so the user can review their reasoning) but recede.

**Copy:**

- Heading (Serif): "Build the full bracket."
- Subhead (Sans): "Twelve group winners, twelve runners-up, then the knockouts. Your scenario is scored against 10,000 simulations."

### 2.4 Cross-Mode Interaction Patterns

- **Team grid sort:** alphabetical only. No power rankings, no Elo, no FIFA points visible during selection. (We do not want to anchor user choices on the model's own opinion; the resulting data is more valuable if the user picks freely.)
- **Reality Score zone:** always anchored at the top of the viewport, sticky on scroll, monospace, with the denominator in 80% opacity to the right of the percentage.
- **Reset control:** a small `[ RESET ]` button in the top-right of every mode. Confirms with a one-line dialog.

---

## 3. The Reality Score Display

The Reality Score is the hero number of the entire feature. Treat it with the visual weight it deserves, and never strip it of its denominator.

### 3.1 Anatomy

```
REALITY SCORE
0.42%
42 / 10,000 simulations
```

- **Label** ("REALITY SCORE"): 11pt monospace, letter-spacing +0.05em, 70% opacity.
- **Hero number** ("0.42%"): the dominant element. 64pt at desktop, 48pt at mobile. Monospace, tabular figures, full opacity.
- **Denominator** ("42 / 10,000 simulations"): 14pt monospace, 60% opacity, immediately below the hero number with 4px gap. The denominator is non-negotiable. It is what separates this from a casino number.

### 3.2 Resolution Floor

When the matching count is below 30 (i.e. Reality Score below 0.3%), append a quiet subline in 11pt sans:

`Below the resolution of this simulation. Treat as: rare.`

This is intellectually honest and adds credibility. It also makes higher Reality Scores feel earned by contrast.

### 3.3 Comparative Context (Optional, for Final Four and Champion's Path)

Below the Reality Score, an optional one-line comparison may render: `Median scenario in this mode: 1.20% (120 / 10,000)`. This contextualizes the user's pick against the distribution of all submitted predictions in the same mode. Keep this opt-in and visually quiet (60% opacity, 11pt mono).

---

## 4. The Digital Trade Ticket — Share Artifact Spec

The Trade Ticket is the single image artifact the user shares. It must read as a screenshot from a quant terminal, not a fantasy-football graphic. Two formats are required.

### 4.1 Shared Anatomy (both formats)

Top to bottom:

1. **Top rule and header.** A 1px hairline rule across the full width. Above the rule, in 11pt monospace at 70% opacity, left-aligned: `45ANALYTICS / TOURNAMENT SCENARIO / WC 2026`. Right-aligned on the same row: the submission timestamp in `YYYY-MM-DD HH:MM UTC` format.

2. **Reality Score block.** Centered or left-aligned (format-dependent, see below). Hero number, denominator, optional resolution-floor caveat. This is the visual focal point.

3. **Scenario block.** A compact, ticker-style listing of the user's prediction. Mode-dependent format:
   - Final Four: `SF: ARG  BRA  FRA  ENG`
   - Champion's Path: `R16  MEX > USA   QF  MEX > GER   SF  MEX < BRA`
   - Full Bracket: render all 15 knockout matches in a 3-column grid: `R16 (8 rows)`, `QF (4 rows)`, `SF (2 rows)`, plus a single Final row at the bottom. Use `>` for advancement.

4. **Prediction ID strip.** A 1px-bordered strip near the bottom: `PREDICTION ID  #45A-2026-KZ8X`. Right of this, the share permalink in 10pt mono: `45analytics.com/p/KZ8X`.

5. **Footer.** Single line, 9pt mono, 50% opacity: `MODEL SHA a3f9c1   SNAPSHOT 2026-05-31T23:00Z   N=10,000`. This signals quant rigor to those who recognize it; it disappears for those who do not.

6. **Watermark (subtle).** The 45analytics wordmark in the bottom-right corner at 40% opacity, 10pt sans. No logo. No tagline. No "share with friends" prompt.

### 4.2 Format A — 1080x1080 (Instagram Feed, Twitter/X)

- 64px outer padding on all sides.
- Reality Score block centered, dominant. Hero number at 220pt monospace; the card's vertical center is the hero number's baseline.
- Scenario block sits in the lower third, left-aligned, 28pt monospace.
- Prediction ID strip and footer in the bottom 120px.
- Background: solid black (or the existing 45analytics deep background token).

### 4.3 Format B — 1080x1920 (Instagram Stories, TikTok)

- 80px outer padding, with a safe zone of 240px from the top and 320px from the bottom (Instagram UI obscures these zones).
- Header rule and metadata sit at the top of the safe zone.
- Reality Score block is centered horizontally, vertically positioned at 35% from the top of the safe zone. Hero number at 280pt monospace.
- Scenario block fills the middle of the safe zone, larger and more legible than in Format A: 36pt monospace.
- Prediction ID strip and footer at the bottom of the safe zone.

### 4.4 Format C — 1600x900 (X/Twitter card, optional)

Same rules as Format A, scaled to 16:9. Reality Score block left-aligned with the scenario block stacked to the right in two columns.

### 4.5 Generation Notes for the Engineering Hand-off

These cards will be generated server-side at submission time using `@vercel/og` or an equivalent (final tool to be selected by the engineering agent). The design agent should deliver:

- Static reference designs of all three formats in Figma.
- A tokenized export of all type sizes, weights, opacities, and color values used in the cards.
- A list of dynamic fields with their max-character constraints (e.g. team-code: 3 chars, prediction ID: 12 chars, Reality Score: 6 chars including `%`).

---

## 5. State-Machine UI

After submission, every prediction lives in one of three states. The state machine appears in two places: the user's dashboard (web) and the user's email (transactional + state-change).

### 5.1 The Three States

| State | Meaning | Visual treatment |
|-------|---------|------------------|
| `ALIVE` | No constraint of the user's scenario has been violated by realized results. | Default: bone-white text, no special treatment. The state label sits next to the Reality Score: `STATUS: ALIVE`. |
| `DEAD` | A constraint is mathematically impossible given current bracket state. | The entire prediction record is rendered at 40% opacity. The Reality Score is overprinted with a single 1px diagonal strikethrough rule (top-left to bottom-right). State label: `STATUS: DEAD`, in a muted desaturated red. The constraint that killed the scenario is highlighted in a subline: `Killed by: BRA eliminated in R16`. |
| `PROMOTED` | The current conditional Reality Score is materially higher than at submission (default threshold: 2x). | The current Reality Score is shown alongside the original, with a small `+` indicator and the multiplier: `0.42% → 1.10% (2.6x)`. State label: `STATUS: PROMOTED`, in the existing accent color. No fanfare, no animation, no celebratory micro-copy. |

### 5.2 Dashboard View

The user's dashboard is a single page listing all of their submitted predictions, most recent first. Each row is a 1px-bordered horizontal strip with:

- Left column: prediction ID, mode, submission timestamp.
- Center column: scenario block in compressed monospace.
- Right column: state label, Reality Score (current, with original in 60% opacity if PROMOTED), and a `[ VIEW TICKET ]` action that renders the Digital Trade Ticket inline.

The dashboard header shows aggregate counts: `ALIVE: 2  DEAD: 1  PROMOTED: 1`. No leaderboard. No ranking. No social comparison features. The user is comparing themselves to the model, not to other users.

### 5.3 State-Change Email Templates

Three email templates are required. All emails must follow the project's tonal posture: terminal-formal, data-forward, no exclamation marks, no emoji, no celebratory language.

**Template 1 — Submission confirmation.**
Subject: `45analytics — Prediction #45A-2026-KZ8X recorded`
Body: a plain-text-feeling HTML email rendered in the project's monospace stack. Includes the Reality Score, the scenario block, the prediction ID, and the Digital Trade Ticket attached as a downloadable image. A single CTA: `[ VIEW DASHBOARD ]`.

**Template 2 — State change to DEAD.**
Subject: `45analytics — Prediction #45A-2026-KZ8X is no longer possible`
Body: the prediction record at 40% opacity with the strikethrough Reality Score, followed by a single sentence in serif: "Brazil's elimination in the Round of 16 made this scenario mathematically impossible." A small CTA: `[ BUILD A NEW SCENARIO ]`. Do not use the word "lost." Do not use the word "eliminated" about the user.

**Template 3 — State change to PROMOTED.**
Subject: `45analytics — Prediction #45A-2026-KZ8X is now 2.6x more likely`
Body: the prediction record with the original and current Reality Scores side by side, the multiplier rendered in monospace, and a single sentence in serif: "Argentina's quarterfinal advancement raised the probability of your scenario." CTA: `[ VIEW DASHBOARD ]`.

All three templates must be designed in both light and dark modes (some email clients force light), and all must use web-safe monospace fallbacks (the project's primary monospace, then SF Mono, then Menlo, then Consolas, then `monospace`).

---

## 6. Email Capture Flow

Email is captured at the moment of submission, not at entry. The user must be allowed to build the entire scenario without any account friction. The email gate appears only when they want to save and track.

### 6.1 The Gate Pattern

After the user clicks `[ COMPUTE REALITY SCORE ]`, the Reality Score is shown immediately on screen. They get the dopamine hit before any ask. The Digital Trade Ticket is rendered immediately below, viewable and screenshot-able with no email required.

The gate appears only as a secondary modal layer with the headline:

> Save and track this prediction.
>
> The tournament starts in 32 days. We'll email you only when something changes: when your scenario is no longer possible, or when the model says it has become more likely. No marketing. No daily digest.

Below: a single email input, a single `[ TRACK THIS PREDICTION ]` button, and a small line of secondary type: `By submitting your email, you agree to receive state-change notifications about this prediction. You can unsubscribe at any time. We will not share your email.`

### 6.2 Visual Treatment

- The modal is a 1px-bordered rectangle, 480px wide at desktop, 90% width at mobile.
- The email input is a sharp-cornered text field with a 1px bottom rule only (no full border on the input itself). Placeholder text in 60% opacity monospace: `your.email@domain`.
- The `[ TRACK THIS PREDICTION ]` button is a sharp-cornered, 1px-bordered hit area in the existing accent color. Inverted on hover (solid accent fill, black text).
- The modal background is a near-opaque (95%) overlay over the underlying Reality Score view. The Reality Score remains visible behind the modal so the user keeps the context of what they are saving.

### 6.3 Skip Path

A single small `[ SKIP — JUST DOWNLOAD THE TICKET ]` link in the bottom-right of the modal lets the user dismiss the email gate. They can still download or share the Digital Trade Ticket. They simply do not get state-change tracking. This is by design: forced email capture damages trust and degrades the quality of the submitted prediction data (people enter junk emails). A clean opt-out yields a better dataset.

### 6.4 Double Opt-In

The first email captured from a user triggers a confirmation email. The prediction is recorded immediately, but state-change emails are gated on confirmation. The confirmation email follows the same terminal-formal style as the templates above.

---

## 7. Forbidden Patterns

These patterns are explicitly out of scope. The design agent must not introduce them, even if they are common in adjacent product categories.

### 7.1 Language to Avoid

Never use, in copy, button labels, or marketing surfaces:

- "Bet," "wager," "stake," "place," "lock in," "lock it in," "send it"
- "Pick to win," "your picks," "make your picks"
- "Odds," "lines," "moneyline," "spread"
- "Streak," "hot streak," "cold streak"
- "Beat the house," "beat the book," "beat the model"
- Exclamation marks in any system copy
- Emoji in any system copy or share artifact
- Gendered or culturally specific cheering language ("let's go," "let's roll," etc.)

The vocabulary the project uses instead: *prediction, scenario, build, compute, track, simulate, model, probability, simulation, posterior.*

### 7.2 Visual Tropes to Avoid

- No team logos. Three-letter codes only, with full names in supporting type. (Logos signal fan culture; codes signal data culture.)
- No flag emoji or flag illustrations.
- No mascot characters.
- No trophy iconography.
- No "vs." treatments with team logos facing each other on either side of a colored gradient.
- No "lights / fire / electricity" effects implying excitement.
- No win probability bars rendered as horizontal "battle" gradients.
- No leaderboards. No global ranking of users. No social comparison surfaces. (We are explicitly not building a fantasy-game.)
- No countdown timers larger than 11pt mono. A countdown is acceptable as quiet metadata ("Tournament begins in 32 days, 04:12:33"); it is not acceptable as a dominant UI element.
- No celebratory animations. No confetti. No haptic-style screen flashes.

### 7.3 Patterns to Avoid in the Trade Ticket Specifically

- No "share to" buttons baked into the image itself.
- No QR code as a hero element. (A QR code may live in the prediction-ID strip at small size if it adds value, but it must not visually compete with the Reality Score.)
- No "brand seal" or central logo dominating the card. The watermark is small and corner-pinned.
- No embedded testimonial or quote.
- No embedded ad or partner logo.

### 7.4 The One-Sentence Test

Every visual decision should pass this test:

> If a Bloomberg user saw this on a colleague's monitor, would they assume it was a research output or a betting app?

If the answer is anything other than "research output," redesign.

---

## 8. Deliverables Expected from the Design Agent

The design agent should return:

1. **Figma file** with three primary frames per mode (default, mid-construction, post-submission), the email-gate modal, and all three state variants of the dashboard row.
2. **Three Digital Trade Ticket templates** (1080x1080, 1080x1920, 1600x900) as parametric Figma components with named dynamic fields.
3. **Three email templates** (submission, DEAD, PROMOTED) in HTML-ready Figma frames at 600px width, with light and dark mode variants.
4. **Tokenized style sheet** documenting all type sizes, weights, line-heights, opacities, colors, and spacing values introduced for this feature, namespaced under `--scenario-*`, `--reality-*`, and `--state-*`.
5. **Iconography sheet** of any new geometric glyphs introduced (1px stroke, square viewBox, named).
6. **Annotated specs** for any non-obvious interaction (the Champion's Path stage filtering, the Full Bracket auto-population from group winners, the Reality Score resolution-floor caveat).
7. **A "forbidden patterns" gallery** showing five examples of what this product must not become, drawn from real fantasy-sports and betting apps, annotated with what specifically is rejected.

---

## 9. Closing Note for the Design Agent

This product earns trust through restraint. The Reality Score is the only number on the page that shouts. Everything else whispers. If a design decision pushes the Reality Score, the denominator, or the prediction ID toward the foreground, it is correct. If a design decision pushes ornament, animation, color, or social-comparison cues toward the foreground, it is wrong.

When in doubt: ship less. Use 1px more often. Use the accent color one fewer time. Strip one more illustration. The aesthetic is reached by subtraction.
