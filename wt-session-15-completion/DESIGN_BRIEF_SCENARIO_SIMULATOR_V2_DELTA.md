# Design Brief v2 (Delta) — Tournament Scenario Simulator

**Project:** 45analytics / The 45% Problem
**Feature:** Tournament Scenario Simulator
**Audience for this brief:** UI/UX Design Agent
**Reading order:** Read v1 first. This is a delta. Where v1 and v2 conflict, **v2 wins.**

---

## 0. Mission Shift

The rest of 45analytics is built for a mathematically trained audience: researchers, quant-curious analysts, market-efficiency nerds. That posture is correct for those surfaces and will not change.

The Tournament Scenario Simulator is different. It is the **populist front door** to a research-grade product. It must work for someone who loves football, has never heard the word "posterior," and is opening this from an Instagram link in a coffee shop.

The math does not go away. The wrapper around it changes. We translate, we do not dilute.

The v1 brief over-indexed on quant austerity. v2 fixes that without losing the integrity guardrails. The aesthetic reference shifts from **Bloomberg Terminal** to **the Financial Times data desk and The Pudding's editorial work**: still rigorous, still typographically restrained, but with voice, narrative, and human language.

---

## 1. The Two-Register System (Core Concept)

The product now operates in two registers. The design agent's job is to curate which one shows up where.

**Editorial register.** Used at entry, exit, and emotional moments. Serif headlines with voice. Full team names. Plain-English explanations of probability. Larger flag presence (when integrated in the live app). One quiet warm accent color allowed. Surfaces: landing hero, mode-selection screen, post-submit confirmation, Champion's Path narrative output, Trade Ticket hero zone, PROMOTED state, email subject lines.

**Technical register.** Used where data lives. Monospace, three-letter codes, hairline rules, no color. Surfaces: bracket cells in build mode, dashboard data rows, footer metadata (model SHA, snapshot timestamp), the technical subhead under every editorial headline.

A casual user who lands on the simulator stays in editorial register for the first 30 seconds. They only encounter technical register when they choose to look closer (the dashboard, the footer of the share card, the hover states). A trained user who scrolls past the hero finds the rigor immediately.

---

## 2. Language Swaps (Apply Everywhere)

The single highest-leverage change. Most of v1's copy is API documentation written for engineers. Replace it.

| v1 (technical) | v2 (editorial) |
|----------------|----------------|
| "select your scenario to compute" | "Pick what you think will happen." |
| "[ COMPUTE REALITY SCORE ]" | "[ SEE HOW THE MODEL REACTS ]" |
| "Build the full bracket." | "Call the whole tournament." |
| "Pick the four semifinalists." | "Who makes the final four?" |
| "Trace your team's path." | "Tell us your team's story." |
| "Reality Score" | **(keep, this name is good)** |
| "Below the resolution of this simulation." | "Fewer than 30 of 10,000. Almost no one sees this coming." |
| "Build a new scenario." | "Try another prediction." |
| "Prediction is no longer possible." | "Your prediction is out." |
| "Model SHA / snapshot SHA" | **(keep in footer, technical register)** |
| "Conditional re-simulation" | **(never user-facing)** |
| "Posterior probability" | **(never user-facing)** |
| "10,000 Monte Carlo simulations" | "10,000 simulated tournaments" (in body); "Monte Carlo" allowed only in the technical subhead and footer |

**Rule of thumb.** If a term requires a stats class, it does not appear above the fold. It can appear in technical register surfaces (footer, dashboard, methods page) where the trained reader expects it.

---

## 3. The Reality Score Gets a Human Translator

The hero number is too abstract on its own. "1.84%" means very little to a casual user. We surround it with three new layers, all immediately below the number:

### 3.1 Rarity Band (new component)

A single word in serif, large, that translates the percentage to a feeling. Five bands:

| Reality Score | Band | Tone |
|---------------|------|------|
| ≥ 25% | **Common** | The model often sees this. |
| 5% to 25% | **Plausible** | The model gives this real weight. |
| 1% to 5% | **Uncommon** | A bold call. |
| 0.1% to 1% | **Rare** | The model rarely runs this tournament. |
| < 0.1% | **Vanishingly rare** | Almost no one sees this coming. |

The band sits directly under the percentage in a serif weight, 32pt at desktop, with the one-line tone caption in 14pt sans below. Color is neutral by default; the band styling does not change with the value (no green/red coding). The band is a label, not a verdict.

### 3.2 The "1 in N" Restatement

Below the band, a single line in 16pt monospace: `1 in 54 simulations matched your prediction.`

This is the most important translation in the whole product. "1 in 54" is a frame any human can hold. "1.84%" is a frame only some humans can hold. Both numbers are present (the percentage stays as the hero); the 1-in-N is the bridge.

Compute: `round(10000 / matched_count)`. Floor at 1; cap display at "1 in 10,000+" for zero matches.

### 3.3 Optional: Comparative Anchor

A quiet line in 13pt sans, 60% opacity, below the 1-in-N: `For reference: rolling double sixes is 1 in 36.`

Anchors are drawn from a small curated list (rolling double sixes, drawing a specific card from a deck, the underdog's win in a famous match). The anchor is the one closest to the user's Reality Score. This is optional and should be A/B testable; we ship without it if the curation feels forced.

---

## 4. Onboarding Moment (New)

The current build drops the user into a bracket with no orientation. A first-time visitor needs to know what they're doing in three sentences.

Add a small **"How this works"** strip directly below the hero, before the mode selector. Three numbered cells, horizontal:

```
01  You make a prediction.
02  Our model has simulated the tournament 10,000 times.
03  We tell you how many of those 10,000 match your call.
```

Cells are 1px-bordered, sharp-cornered, 16pt serif headline, 12pt sans body. No icons. The whole strip is dismissable (the user gets a small `[ HIDE ]` link in the corner) and remembers the dismissal in localStorage so returning users don't see it again.

The strip is not modal. It does not block. It sits above the mode selector and educates inline.

---

## 5. Surface-by-Surface Revisions

### 5.1 Landing Hero (revised)

v1 said: "select your scenario to compute" in mono.

v2 says: a serif headline that earns the click, with the technical posture as a quiet subhead.

```
Headline (serif, 56pt desktop / 36pt mobile):
"Call the World Cup. See if the model agrees."

Subhead (mono, 14pt, 70% opacity):
"WC 2026 · 10,000 simulated tournaments · M★ model"

CTA (mono, sharp-cornered button):
"[ START YOUR PREDICTION ]"
```

The serif speaks to the casual user. The mono subhead reassures the technical user. Both audiences are addressed in the first 200 milliseconds.

### 5.2 Mode Selector (revised)

v1 said: three equal-weight options with mono labels.

v2 keeps the three options but reframes them in fan language and adds a one-line plain-English explanation under each:

```
[ FINAL FOUR ]
Who makes the semifinals?
30 seconds.

[ CHAMPION'S PATH ]
Tell us your team's story to the final.
About a minute.

[ FULL BRACKET ]
Call the whole tournament.
A few minutes. For the obsessives.
```

Headlines in mono uppercase (existing token). Sub-explanations in 14pt serif. Time estimate in 12pt sans, 60% opacity. Each option is a 1px-bordered cell with hover state (subtle warm tint, the one accent color). One CTA per cell, but the whole cell is the hit area.

### 5.3 Final Four Mode (small revisions)

Headline: "Who makes the final four?" (serif).

Slot row stays as designed. The inline Reality Score above the team grid only appears once all four are picked; it is preceded by an animated **typing-style** appearance of the rarity band sentence in serif: *"That's an uncommon call."* The typing effect is the only motion in the entire product, lasts 400ms, and only fires the first time per session. After that, the rarity band appears without animation.

### 5.4 Champion's Path Mode (substantial revision)

This is the most viral mode. v2 leans further into narrative.

The build experience stays linear (R16, QF, SF, F). What changes is the **narrative line** at the bottom of the viewport. As the user makes selections, a serif sentence assembles itself in the lower third of the screen:

```
After team pick:
"You are betting on Mexico..."

After R16 selection:
"You are betting on Mexico to beat the United States in the Round of 16..."

After QF:
"...beat Germany in the Quarterfinal..."

After SF (W):
"...defeat Brazil in the Semifinal..."

After F (W):
"...and win the World Cup."
```

Sentence renders in 28pt serif, with the user's team name in slightly heavier weight. The sentence is the share artifact's text component. The sentence is also the Trade Ticket's hero copy.

The branching: if the user picks `L` at any stage, the sentence ends there. ("You are betting on Mexico to beat the United States in the Round of 16, then fall to Germany in the Quarterfinal.") The Reality Score is computed for the truncated path.

### 5.5 Full Bracket Mode (kept as v1)

This mode is for the obsessives. Editorial-register only at the entry headline ("Call the whole tournament. Match by match."); the bracket itself stays in technical register. Power users want density here, not warmth.

The Partial Reality Score box gets the rarity band and 1-in-N treatment from §3, but compressed to a single line: `Partial Reality Score: 98.00% · Common · 1 in 1.02 · 7 of 15 matches set`.

### 5.6 Reality Score Reveal (new sequence)

When the user submits, the screen sequence is:

1. The mode-build screen fades to 60% opacity over 200ms.
2. The Reality Score number renders into position (no animation, instant).
3. The rarity band appears 100ms after, in serif.
4. The 1-in-N line appears 200ms after that, in mono.
5. The Trade Ticket renders below the score 400ms after that.
6. The email gate appears as a soft prompt 1 second later, **non-blocking**.

The rhythm matters. The user gets the emotional hit (the band) before the granular math (the percentage's significant digits, the model SHA). They feel something, then they see the rigor.

### 5.7 Trade Ticket (revised hierarchy)

The v1 spec made the Reality Score the visual hero and surrounded it with sparse data. v2 keeps that but **adds a one-line story** as the primary sharable text element.

New anatomy, top to bottom:

1. Top rule and metadata (unchanged from v1).
2. **Story line.** A single serif sentence summarizing the prediction in plain English. Mode-dependent:
   - Final Four: "Argentina, Brazil, France, and England in the semifinals."
   - Champion's Path: "Mexico beats the United States, beats Germany, and falls to Brazil in the semifinal."
   - Full Bracket: "Brazil wins the World Cup, beating France in the final."
3. **Reality Score block.** Hero number + rarity band + 1-in-N restatement. The band is now part of the share artifact.
4. **Scenario block.** Compact ticker-style listing in mono, as v1 specified. Now demoted from primary visual to supporting data.
5. **Prediction ID strip.** Unchanged.
6. **Footer.** Unchanged.

The visual hierarchy is now: **story** → **rarity band** → **percentage** → **1-in-N** → data. A casual scroller on Instagram reads the first two and stops; that is enough for the share to land. A technical user reads to the bottom; they get everything they need.

The flag treatment will be added at integration time using the existing app's flag assets. The design agent should leave a 240px flag slot to the left of the story line at desktop, 120px above it at mobile. For Champion's Path, one flag (the team being traced); for Final Four, four flags in a row above the story; for Full Bracket, one flag (the predicted champion).

### 5.8 PROMOTED State (warmer)

v1 was austere here and was wrong. v2 allows a subtle warm shift:

- The current Reality Score number renders in the project's accent color (the one quiet warm accent introduced in v2; not gold, not amber; a desaturated terracotta or a similar restrained warm tone that the design agent proposes as a token).
- A small upward chevron in monospace (`▲`) precedes the number.
- The rarity band updates to reflect the new value (e.g., "Was: Rare. Now: Uncommon.").
- The serif explanatory sentence stays factual: "Argentina's quarterfinal advancement raised the probability of your prediction." No exclamation, no celebratory verbs.

DEAD state stays as v1: 40% opacity, strikethrough, muted desaturated red on the state label only.

ALIVE state stays neutral.

### 5.9 Email Gate (softer)

v1 spec is correct on structure (opt-out, post-submit, double opt-in). v2 changes the copy:

```
Headline (serif, 28pt):
"Want to see if it actually happens?"

Body (sans, 16pt):
"The tournament starts in 32 days. We'll only email you if your
prediction becomes impossible, or if the model says it became more
likely. No marketing. No daily noise."

Input placeholder (mono, 14pt, 60% opacity):
"your.email@domain"

CTA (mono, sharp-cornered):
"[ TRACK MY PREDICTION ]"

Skip link (sans, 13pt, 50% opacity, bottom right):
"No thanks, just give me the image."
```

The skip link is more conversational than v1. Casual users respond to "just give me the image." Technical users don't care; they sign up.

---

## 6. Forbidden Patterns (Additions to v1)

v1's forbidden patterns still apply in full. Add these:

**Do not translate to dumb.** "Let's go!" / "Send it!" / "Fire!" copy is not allowed even in editorial register. Editorial register means warm and plain, not casual-energetic.

**Do not add jargon back.** The technical register exists for a reason: to be terse. Do not re-introduce "posterior," "marginal," "conditional probability," "Bayesian update" in any user-facing copy. These terms live on the methods page only.

**Do not turn the rarity band into a verdict.** "Common / Plausible / Uncommon / Rare / Vanishingly rare" are descriptive. They are not "Easy / Hard" or "Smart / Risky." Do not stylize them with thumbs up / down, traffic-light colors, or evaluative iconography.

**Do not let the warm accent become a brand color.** The one warm accent appears in three places only: the CTA hover, the PROMOTED state, the matched-flag border on the Trade Ticket. If it appears anywhere else, the design has lost discipline.

**Do not use the typing-style animation more than once per session.** It is a welcome moment, not a pattern. Outside the first Final Four reveal, all numbers snap to value.

---

## 7. What Stays Exactly as v1

Do not redesign these:

- Sharp corners everywhere (`border-radius: 0`).
- Monospace with tabular figures for all numerical values.
- The Reality Score is always shown with its denominator.
- The dashboard data rows (technical register, unchanged).
- The footer metadata strip on the Trade Ticket (model SHA, snapshot timestamp, N=10,000).
- All three Trade Ticket formats (1080x1080, 1080x1920, 1600x900).
- Email double opt-in flow.
- No betting language anywhere ("bet," "wager," "stake," "lock in," "moneyline," "spread," "odds," etc.).
- No leaderboards. No global ranking. No social comparison surfaces.
- No mascots, no illustrations, no celebratory animations, no confetti.
- The integrity rule: every visual decision passes the question *"would a Bloomberg user assume this is a research output or a betting app?"* The answer must still be research output.

---

## 8. Updated Deliverables Expected from the Design Agent

Replaces v1 §8.

1. **Figma file** updated with the editorial-register surfaces: revised landing hero, revised mode selector, the three numbered "How this works" cells, the new Reality Score reveal sequence (with rarity band and 1-in-N), the revised PROMOTED state, the softer email gate.
2. **Champion's Path narrative builder** as a fully spec'd interactive: every state of the assembling sentence, every branching condition, all copy variants.
3. **Trade Ticket templates v2** (three formats) with the new anatomy: story line, rarity band, percentage, 1-in-N, demoted scenario block. Flag slots reserved per §5.7.
4. **Rarity Band component** as a standalone Figma component with all five states and their tone captions.
5. **Tokenized style sheet** introducing the one warm accent color (proposed as a single new token: `--accent-warm`), used in only three places per §6.
6. **Updated copy sheet** reflecting all language swaps in §2.
7. **Annotated motion spec** for the single allowed animation (typing-style rarity band reveal on first Final Four submission), with timing curves and dismissal rules.

---

## 9. Closing Note

The Scenario Simulator is the on-ramp. Everything else on the site is the highway, and the highway is for trained drivers. The on-ramp has to be wide enough that someone can merge onto it with a phone in one hand and a coffee in the other.

The math is unchanged. The Reality Score is unchanged. The 10,000 simulations are unchanged. What changes is whether the first thirty seconds feel like a research instrument that decided to talk to you, or a research instrument that didn't notice you arrived.

We want the first one. Build for that.
