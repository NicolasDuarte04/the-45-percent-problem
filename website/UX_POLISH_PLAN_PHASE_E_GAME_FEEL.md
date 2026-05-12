# UX/UI Polish Plan — Tournament Scenario Simulator (Phase E: Game Feel)

**Project:** 45analytics / The 45% Problem
**Branch base:** `main` (Phase D merged and deployed)
**Audience:** Engineering agents (Opus / Sonnet) executing modular polish PRs
**Scope:** UX/UI motion, structure, and copy. No new model logic, no new API routes, no schema changes.
**Goal:** Move the simulator from "quant-correct form" to "game with restraint." Pass the Grandma Test in the first 30 seconds and earn the share in the last 5.

---

## 0. The Problem in One Paragraph

Phase D shipped the foundation: flags everywhere, tactile empty slots, a punchy 3-state live gauge. Phase D was correct. It is also *quiet to the point of being inert*. Nothing moves. The picker grid sits below the slots forever, even after you've filled every slot. The Full Bracket is a column of stacked match cells with no tree geometry, no bracket lines, no sense that the tournament is converging toward a champion. The stage labels (`STEP 1 — GROUP STAGE`, `ROUND OF 32`) read like section headings in a research paper. And the submit flow currently surfaces "Something went wrong on our side" without a recovery affordance, which is where the entire dopamine arc dies. The simulator is structurally sound. It needs *life*, applied with discipline.

---

## 1. What Phase D Got Right (And Why We're Not Tearing It Up)

Before we change anything, hold the line on these:

- The Option C live gauge — `REALISTIC` / `BOLD CALL` / `LONG SHOT` plus the segmented bar plus the percentage. Punchy, clean, no scientific words leaking in. This is the right register for live play.
- The post-submit `RealityScorePanel` reserving the 5-band rarity vocabulary (Common, Plausible, Uncommon, Rare, Vanishingly rare). This is the right register for the shareable artifact.
- The brand language on the landing: *"Call the World Cup. See if the model agrees."* This is the simulator's thesis statement. Don't touch it.
- The tactile `EmptySlot` component with its dashed border and `+` glyph. This is the single best affordance in the whole product right now.
- The flag system. Every team has its national flag. The Argentina cell looks like Argentina, not like "ARG."

Phase E builds *on top of* these. Anything in this plan that contradicts the above is a mistake; treat it as a typo and escalate.

---

## 2. Diagnosis — Where the Tax-Form Feeling Comes From

Six concrete failure modes are visible in the current product. Each has a specific fix.

### 2.1 The picker grid never gets out of the way

In Final Four, after you fill all 4 SF slots, the 48-team picker grid still occupies the entire viewport below. Same in Champion's Path — you've made all your stage picks, the picker grid is still there, full size, dominating the page. The user has to scroll past their own work to find the live gauge and submit button. **The kitchen never gets cleared after the meal is plated.**

### 2.2 The Full Bracket is not a bracket

What ships today is three vertically stacked sections: a group-stage table, an auto-qualifiers band, and a knockout column. The knockout rounds are rendered as columns of match cells with no connecting lines, no convergence geometry, nothing that visually says "this winner advances to here." A real bracket — the universally legible bracket-tree shape — is missing. Without it, the user doesn't *feel* the tournament narrowing. They feel like they're filling out a form.

### 2.3 The "Start Your Prediction" button is dead weight

The landing has three mode cards (Final Four, Champion's Path, Full Bracket) that are clearly clickable, plus a separate `[ START YOUR PREDICTION ]` button above them. What does the button do? It's redundant with the cards. It adds a click without adding meaning. Cut it.

### 2.4 The stage copy reads like a document outline

`STEP 1 — GROUP STAGE`, `STEP 2 — AUTO QUALIFIERS`, `STEP 3 — KNOCKOUT BRACKET`, `ROUND OF 32`, `QUARTERFINALS`. These are honest labels. They are also bone-dry. They tell the user *what section they're in*, not *what to do or feel*. The Champion's Path mode already has the right voice (*"Tell us your team's story to the final."*) — that voice never makes it into Full Bracket.

### 2.5 No motion = no feedback = no game

When you drop a team into a slot, nothing animates. The chip just appears. When the gauge transitions from ghost to active, it just snaps. When you complete the scenario, the submit button just becomes available. There is zero kinaesthetic feedback that the system *registered your action*. Phase D's no-JS-animation rule was the right call for the foundation phase — get the structure right, then polish the motion. The structure is right. Time to polish.

### 2.6 The submit flow has a broken state with no recovery

The screenshot shows `Something went wrong on our side. Try again in a moment.` directly under a *Submit* button that the user has just clicked. There is no Retry button. The user has built a complete scenario, watched the gauge fill, hit submit, and hit a wall. This is the highest-stakes moment in the whole product and it currently fails open. **This is a Phase E P0 prerequisite.** No amount of motion polish matters if the climax is broken.

---

## 3. Design Philosophy Update — The JS-Animation Ban Is Lifted, with New Rules

Phase D §7 forbade JavaScript animation libraries. That was correct *for Phase D* because the structure wasn't settled and motion would have hidden structural mistakes. Phase E formally repeals that ban and adopts Framer Motion as the single approved motion library, **subject to the following non-negotiable rules.**

**Rule 1 — Tasteful is a hard ceiling, not a vibe.** Concrete bounds:

- **Durations:** 150-300ms for micro-interactions (hover, drop, fade). 300-500ms for layout transitions (collapse, expand, stage advance). Never above 600ms for any single transition. The gauge fill on completion is the longest animation in the product at 450ms.
- **Easings:** `ease-out` for entries (things appearing or arriving). `ease-in` for exits (things leaving). Spring physics only on object drops and slot fills, with `stiffness: 300, damping: 28` as the default — that's a single mild settle, not a bounce.
- **Amplitude:** No motion exceeds ~6px of secondary movement (overshoots, bounces, wiggles). If you can describe it as "perky" or "playful," it's too much.

**Rule 2 — Motion serves feedback, not decoration.** Every animation in the product must answer one of three questions: *Did the system register my action?* *Where did this thing come from / go to?* *What just changed?* If an animation doesn't answer one of these, it's noise. Kill it.

**Rule 3 — `prefers-reduced-motion: reduce` is honored everywhere, no exceptions.** Every Framer Motion `motion.*` element wraps its transitions in a media-query-aware variant. The fallback for reduced motion is the *current Phase D static state* — instant snap, no transition. This is non-negotiable for accessibility and for users on low-spec mobile.

**Rule 4 — Performance budget.** No animation may cause a layout thrash over 16ms. Framer Motion's `layout` prop is permitted but only on elements with stable identities (use `layoutId` for shared-element transitions). Drag-and-drop interactions still update the gauge only on `onDragEnd`, not on drag-move (Phase D §4.4 still applies).

**Rule 5 — The post-submit `RealityScorePanel` stays still.** Phase D's separation of registers — playful during build, rigorous on reveal — survives Phase E intact. The reveal panel can have a single dignified entrance animation (fade-up over 400ms) but the rarity band itself does not bounce, pulse, or jiggle. The 5-band scientific vocabulary stays text-only and motion-free, exactly as today.

If a Workstream below proposes an animation that violates any of Rules 1-5, the animation is rejected, not the rule.

---

## 4. The Five Workstreams

| # | Workstream | Theme | PRs | Day |
|---|-----------|-------|-----|-----|
| A | Motion system | Install Framer Motion, ship the motion vocabulary file, instrument the existing components | 1 | Day 1 |
| B | Progressive disclosure | Auto-collapsing picker, stage focus, completed-step dimming | 2 | Day 2 |
| C | Real bracket geometry | The Full Bracket actually looks like a bracket tree | 1 | Day 3 |
| D | Copy & color pass | Humanize stage labels, deepen accent usage, kill the dead button | 1 | Day 3 |
| E | Submit recovery | Fix the broken-state bug, add retry, polish the reveal entrance | 1 | Day 4 |

Workstreams A and D are independent and can ship in parallel. B depends on A (for the layout transitions). C depends on A (for the bracket-line draw-in animation). E depends on nothing structural and can run in parallel with C.

---

## 5. Workstream A — Motion System

### A.1 Install Framer Motion

```bash
pnpm add framer-motion@^11
```

Pin to a specific minor version to avoid unannounced bundle-size regressions. Framer Motion v11 is tree-shakeable; if the bundle increases by more than 25KB gzipped, switch to importing from `framer-motion/m` (the lazy entry point) or rebuild the specific motion components from the `motion-primitive` subset.

### A.2 Create the motion vocabulary

**New file:** `src/lib/motion/vocabulary.ts`

This file exports the *only* motion presets the rest of the codebase is allowed to use. Authors must not pass arbitrary `transition` objects inline; if they need a new motion preset, it gets added here, named, and reviewed.

```ts
import type { Transition } from "framer-motion";

export const motion = {
  // Micro-interactions — hover, focus, small visual responses
  micro: {
    duration: 0.18,
    ease: [0.22, 1, 0.36, 1], // standard ease-out
  } satisfies Transition,

  // Item drops, slot fills — the satisfying "clack" of a piece landing
  drop: {
    type: "spring",
    stiffness: 320,
    damping: 28,
    mass: 0.8,
  } satisfies Transition,

  // Layout transitions — collapse, expand, stage advance
  layout: {
    duration: 0.32,
    ease: [0.32, 0.72, 0, 1], // smooth ease for layout
  } satisfies Transition,

  // Entry — components appearing for the first time
  entry: {
    duration: 0.4,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,

  // Exit — components leaving permanently
  exit: {
    duration: 0.22,
    ease: [0.7, 0, 0.84, 0],
  } satisfies Transition,

  // The gauge fill — the single longest animation we permit
  gaugeFill: {
    duration: 0.45,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,
} as const;
```

### A.3 Reduced-motion wrapper

**New file:** `src/lib/motion/useReducedMotionAware.ts`

A small hook that returns the appropriate transition based on `useReducedMotion()` from Framer Motion. If the user has reduced motion enabled, it returns `{ duration: 0 }`, which makes the transition effectively instant.

```ts
import { useReducedMotion } from "framer-motion";
import { motion as motionVocab } from "./vocabulary";

export function useReducedMotionAware<K extends keyof typeof motionVocab>(
  preset: K,
): typeof motionVocab[K] | { duration: 0 } {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return { duration: 0 };
  return motionVocab[preset];
}
```

Every `motion.*` component in the simulator passes its transition through this hook. There are no exceptions.

### A.4 Instrument the existing Phase D components with motion

Three components get motion now, before any new structural work:

**`EmptySlot`** — when `isOver=true`, the border color and fill animate via Framer Motion's `animate` prop using the `micro` preset. When the user drops into the slot and it transitions to filled, the `+` glyph fades and the team chip drops in via the `drop` preset (spring). When the user clears a filled slot, the chip exits via the `exit` preset and the `+` returns via `entry`.

**`LiveAgreementGauge`** — when `isComplete` flips from false to true, the active segment fills using `gaugeFill` (450ms). The viral hook label (`REALISTIC` / `BOLD CALL` / `LONG SHOT`) crossfades on change using `micro`. Reduced-motion: instant snap, no fill animation.

**`FFSlot` / stage cells / bracket cells** — when a team chip lands, it animates from its source position in the picker grid to the slot using `motion.div` with a shared `layoutId={`team-${code}`}`. This is the single most important micro-interaction in the product: the team chip flies to its slot. Framer Motion handles the FLIP automatically.

### A.5 Acceptance for Workstream A

- `pnpm add framer-motion@^11` lands. Bundle size delta documented in PR description.
- `src/lib/motion/vocabulary.ts` exists with the 6 named presets.
- Every existing `transition: ...` inline declaration in the simulator is removed and replaced with a call into the vocabulary.
- The team-chip-flies-to-slot animation works in all three modes.
- React DevTools Profiler shows zero re-renders of unrelated components during a single drop.
- `prefers-reduced-motion: reduce` flips every animation to instant. Verified manually in DevTools.
- Lighthouse Performance score on `/scenario` does not regress more than 2 points. CLS stays at 0.

---

## 6. Workstream B — Progressive Disclosure

This is the workstream that pays back the most "feel" per line of code. The principle: **after the user demonstrates readiness, the kitchen disappears and the plate moves to their thumbs.**

### B.1 Auto-collapsing picker — Final Four

**File:** `src/components/simulator/modes/ModeFinalFour.tsx`

When `filled.every(Boolean) === true` (all 4 SF slots filled), the 48-team picker grid collapses to a thin "Edit picks" bar. The bar is ~48px tall, mono uppercase, says `[ EDIT YOUR PICKS ]`, and on click expands the grid back to full size with the layout preset.

Implementation: wrap the existing `<TeamPickerGrid />` in `<motion.div>` with `animate={{ height: isComplete ? 48 : "auto" }}` and `<AnimatePresence>` for the inner grid contents. When collapsed, render the "Edit your picks" affordance instead.

The collapse takes ~320ms (`layout` preset). During the collapse, the live gauge and the submit button slide up to occupy the freed vertical space. This is the moment the user sees "their work" become the focus of the screen. Done well, it's a small revelation. Done badly, it's nauseating. Use the `layout` preset, no spring, no overshoot.

### B.2 Stage focus — Champion's Path

**File:** `src/components/simulator/modes/ModeChampionsPath.tsx`

Today: all 4 stage cards (R16, QF, SF, F) are visible at once with their picker grid below. The user has to mentally track which stage they're on.

After: only the *currently active* stage's picker is visible below the row of stage cards. The active stage card has `--accent-warm` border treatment. Completed stages dim to ~60% opacity. Tapping a completed stage card re-activates that stage and reveals its picker (and the previously active stage dims).

This is the "stage focus" pattern from card games like Hearthstone's deckbuilder — only one decision is presented at a time, but the user can always go back.

When all 4 stages have an opponent picked AND all 4 W/L states set, the picker collapses fully (same affordance as B.1) and the live gauge surfaces.

### B.3 Group dimming — Full Bracket Step 1

**File:** `src/components/simulator/modes/ModeFullBracket.tsx`

Today: 12 group cards, all rendered at full intensity, no progression cue. The user can fill them in any order but there's no signal where they are.

After: groups the user has fully ranked (1st and 2nd assigned) dim to ~50% opacity with a small `[ DONE ]` label in the top-right corner. The currently focused group (the next one in alphabetical order without a complete ranking) gets a subtle `--accent-warm` border. Groups beyond the focused one stay at default opacity.

Dimming is instant — no animation on initial state — but the dim transition fires when a user completes a group (700ms after the second-place pick lands, to give them a moment to see their work before it dims).

The user can re-activate any completed group by tapping it. The dim lifts, the accent border moves to that group, the previously-active group reverts to default.

**Don't dim everything completed at once.** If the user races through groups A-F, those six dim in sequence as they complete, not in a wave. Each group dims when *that group* hits the `[1] + [2]` complete state.

### B.4 Auto-qualifiers band — restructured

**File:** same as B.3.

Today: a 4-row table where the bottom 2 rows are highlighted as the actual qualifiers. Visually confusing because the top 2 rows look like data the user needs to absorb but they're just leftover groups.

After: a single horizontal row of 12 group-3rd chips with 8 of them highlighted (using `--accent-warm` low-fill) as the auto-qualifying picks. The user *taps which 8 advance*, with a counter "Pick 8 of 12" that decrements as they go. When 8 are selected, a small checkmark replaces the counter and the band dims (per B.3 logic).

This converts a confusing read-only-looking display into an active 8-of-12 selection task, which is what it actually is.

### B.5 Acceptance for Workstream B

- Final Four: filling all 4 slots collapses the picker to a thin bar within 320ms. Tapping the bar expands it back. Works on touch and pointer.
- Champion's Path: only the active stage's picker is visible. Tapping stage cards switches focus. Completed stages dim. All 4 stages picked → full collapse.
- Full Bracket Step 1: the active group gets the accent border. Completed groups dim. The dim is per-group, not global.
- Full Bracket Step 2 (auto-qualifiers): redesigned as a 12-chip row with a "Pick 8 of 12" counter.
- All collapse/expand transitions honor reduced motion.
- Mobile (375px): collapse moves the gauge above the fold without horizontal scroll.

---

## 7. Workstream C — Real Bracket Geometry

This is the single most game-feel-y change in Phase E. Today the Full Bracket knockout looks like a column of stacked match cards. After this workstream, it looks like a **tournament bracket tree** — the universal visual language of every World Cup poster ever printed.

### C.1 The geometry

Round of 32 has 16 matches stacked vertically. Round of 16 has 8, with each match positioned at the *vertical midpoint* between its two feeder R32 matches. QF has 4, positioned at the midpoint of two R16s. SF has 2, F has 1. The horizontal spacing is uniform (one column per round), and the vertical spacing doubles each round so the bracket reads as a converging tree.

This is geometry, not styling. Each match cell is positioned absolutely within an SVG-overlaid container.

### C.2 The connecting lines

**New file:** `src/components/simulator/bracket/BracketConnectors.tsx`

A single SVG that overlays the bracket grid and renders 1px stroke connector lines between match outputs and the next round's match inputs. Each line:

- Starts at the right edge of a match cell.
- Goes horizontally for half the column gutter.
- Goes vertically to the midpoint between its sibling line.
- Continues horizontally to the left edge of the next-round match cell.

Classic right-angle bracket-tree geometry. Stroke color: `var(--text-tertiary)` at default, `var(--accent-warm)` for the path of teams the user has picked as winners (the "your champion's path" highlight).

Lines render with a `pathLength` animation — when the bracket first loads, the lines draw in from left to right over 600ms, staggered per round (R32 lines first, then R16, then QF, etc.). This is the only place we exceed the 500ms layout cap, and it's an entry-only animation that fires once per page load. Add it to the motion vocabulary as `motion.bracketDraw`.

### C.3 The match cells get a subtle redesign

**File:** `src/components/simulator/modes/ModeFullBracket.tsx` and any sub-components.

Match cells stay at their current dimensions but gain a clear "winner is the top row" affordance: the row the user clicks to mark as winner gets an inset background fill (~6% accent-warm), a small `▶` mark on the left edge, and the loser row fades to ~70% opacity.

When a match is decided, the connector line emanating from that match's right edge highlights to `--accent-warm` and the winner team chip is propagated to the next round's match cell with a `layout` transition (the chip flies one column right). This is the same FLIP pattern from Workstream A.5.

### C.4 Mobile

The bracket scrolls horizontally on screens narrower than 768px, with the current round visible and adjacent rounds fading toward the edges. Each round-column is ~140px wide on mobile. The connector lines render at the same scale; they're SVG, so they don't pixelate.

Add a small "Round of 32 → → Final" breadcrumb above the bracket on mobile that scrolls the bracket to the named round when tapped. This gives the user a quick way to navigate without endless horizontal swiping.

### C.5 Acceptance for Workstream C

- The Full Bracket knockout section visually reads as a bracket tree (right-angle connectors, doubling vertical spacing).
- Connector lines draw in on first load over ~600ms, staggered by round, then settle.
- Picking a winner highlights the connector path forward in `--accent-warm`.
- The winner chip animates from its match cell to the next round's slot.
- Mobile horizontal scroll works without jank. Round breadcrumb scrolls to position.
- The bracket renders correctly in screenshot regression tests at 1440px, 1024px, and 375px viewports.

---

## 8. Workstream D — Copy & Color Pass

### D.1 Stage labels

Replace the `STEP N — X` headers with conversational micro-copy in serif. Each one fits in a single line, sits at the start of its section with the same hairline divider treatment as today.

| Today | After |
|-------|-------|
| `STEP 1 — GROUP STAGE` | *First, rank the groups.* |
| `STEP 2 — AUTO QUALIFIERS` | *Pick the eight 3rd-place teams that move on.* |
| `STEP 3 — KNOCKOUT BRACKET` | *Now play the knockouts.* |
| `ROUND OF 32` | (keep as-is, but smaller, set inline at the top of its bracket column rather than as a section header) |
| `ROUND OF 16`, `QUARTERFINALS`, `SEMIFINALS`, `FINAL` | (same — keep, set inline as bracket column labels) |

The serif voice matches the landing page (*"Call the World Cup. See if the model agrees."*) and the existing Champion's Path subhead (*"Tell us your team's story to the final."*). It's already there — Phase E just extends it consistently.

### D.2 Mode card cleanup

**File:** `src/components/simulator/ModeSelectorCards.tsx` and `src/app/scenario/page.tsx`.

Remove the `[ START YOUR PREDICTION ]` button on the landing. The mode cards themselves are the call to action. Each card on click routes directly to that mode. The card receives the existing `--accent-warm` border treatment on hover and on the route transition.

The serif sub-copy on each card stays:
- Final Four — *"Who makes the semifinals?"* / `30 seconds.`
- Champion's Path — *"Tell us your team's story to the final."* / `About a minute.`
- Full Bracket — *"Call the whole tournament."* / `A few minutes. For the obsessives.`

These are already good. The duration line in mono at the bottom is great — it sets expectations and respects the user's time. Keep all of this.

### D.3 Color: deepen accent usage

The existing palette is locked (Phase D §7 hard boundary). No new colors. But `--accent-warm` is currently used in only ~3 places (active mode card border, hover states, gauge active segment). Phase E uses it more deliberately as a **"you are here" beacon**:

- The currently focused step / group / stage / match: 1px solid `--accent-warm` border.
- Successful state changes: a 250ms warm-tint pulse (~8% accent fill that fades to 0 over the duration). One pulse per drop, one pulse per group completion, one pulse per stage advance. Never repeated, never multiplied.
- The connector line from a chosen winner forward: `--accent-warm` (per Workstream C).
- The gauge active segment: `--accent-warm` instead of the current `--text-primary` fill. This reads warmer and ties the gauge to the rest of the focus system.

Completed states (used in B.3 group dimming and B.2 stage cards): no color change, just opacity reduction to ~50-60%. The brand stays cream-on-slate; warmth comes through restraint, not saturation.

### D.4 Microcopy on the live gauge header

The current header `HOW THE MODEL READS YOUR CALL` is good but a touch literal. Soften to `HOW THE MODEL READS THIS` or `THE MODEL'S READ`. Either reads more conversational without changing meaning. Pick one in PR review.

The `[ SEE HOW THE MODEL REACTS ]` submit button copy is fine. Don't change it. It's the most important button in the product and "see how the model reacts" is exactly the right verb — passive voice on the user's part, active on the model's, which is the intended dynamic.

### D.5 Acceptance for Workstream D

- The 3 stage labels are replaced with the serif conversational copy in all 3 modes.
- The redundant Start button is removed from the landing.
- Mode cards route on click.
- `--accent-warm` is used as the focus beacon throughout, with the 250ms pulse on state-change events.
- Forbidden-vocab grep still passes.
- Live gauge header copy chosen and applied consistently.

---

## 9. Workstream E — Submit Recovery & Reveal Polish

### E.1 Fix the broken-state bug

**Files:** wherever the submit handler lives (likely `src/app/scenario/[mode]/page.tsx` or a server action route).

The current rendered state shows: *"Something went wrong on our side. Try again in a moment."* under the submit button. There is no retry. There is no diagnostic information for the user. There is no indication of *why* — was it network? Was it the API route? Was it a validation error? The user is stuck.

Fix:
- Replace the inline error string with an error component that includes:
  - A short, human message: *"We couldn't reach the model. This is on us, not you."*
  - A `[ TRY AGAIN ]` button that re-fires the submit with the same scenario payload. No client state is lost.
  - A `[ COPY DIAGNOSTIC ]` link that copies a short error code + timestamp + scenario hash to the clipboard, for users to send if it persists.
- The retry button respects exponential backoff (1s, 2s, 4s, then surface a heavier "still failing" state).
- Server-side: instrument the submit route with structured logging so we can find out why it failed at all.

This must ship before any of the reveal polish in E.2. A broken submit makes the rest of the product irrelevant.

### E.2 Reveal entrance animation

When the submit succeeds and the post-submit `RealityScorePanel` renders, animate it in:

- The panel fades up from `y: 24` to `y: 0` and opacity 0 to 1 over 400ms (`motion.entry` preset).
- The 5-band rarity bar fills from 0 to its active state over 450ms (`motion.gaugeFill`), with a 100ms delay after the panel's entrance starts. This staggering creates a brief "and the verdict is..." moment.
- The 1-in-N number counts up from 1 to its final value over 700ms with a `cubic-out` easing. This is a one-time celebration moment and is the only place in the product where a number animates a count. Limit it to integers; don't animate the fractional percentage.
- The "Share" affordance, if present, slides up 200ms after the rarity number lands.

After the reveal lands, **no further motion**. The reveal panel is static once revealed. No idle animations, no shimmer, no pulse. This is the dignified verdict; let it sit.

### E.3 The reveal does NOT use the live-gauge vocabulary

Phase D Option C separation holds: the post-submit panel renders the scientific rarity word (Common, Plausible, Uncommon, Rare, Vanishingly rare). The live-gauge viral hook (`REALISTIC` / `BOLD CALL` / `LONG SHOT`) does not appear in the reveal panel. The forbidden-vocab grep from Phase D §6.5 already enforces the live → post boundary; Phase E adds the symmetric assertion: `REALISTIC`, `BOLD CALL`, and `LONG SHOT` must NOT appear in `RealityScorePanel` rendered output. This is added to the test in Phase E.

### E.4 Acceptance for Workstream E

- The submit error state has retry + copy-diagnostic affordances.
- Submit retries respect exponential backoff and do not lose client state.
- The reveal panel animates in via `motion.entry` + `motion.gaugeFill` + the count-up.
- The reveal panel is motion-free after its entrance.
- Both forbidden-vocab assertions pass: no scientific words in `LiveAgreementGauge`, and no viral-hook words in `RealityScorePanel`.

---

## 10. Sequencing & Dependencies

Day 1 — **Workstream A** (motion system) ships solo. Single PR. The Phase D static UI continues to work; A only adds the motion layer on top.

Day 2 — **Workstream B** (progressive disclosure) and **Workstream D** (copy/color) ship in parallel. They touch different concerns. Two PRs.

Day 3 — **Workstream C** (real bracket geometry) ships. This is the largest single PR; allow time for review.

Day 4 — **Workstream E** (submit recovery + reveal). Ships last because the reveal animation depends on Workstream A's motion vocabulary, and the submit fix should land *anchored* to the polish work that makes the rest of the flow worth submitting to.

Day 5 — Final QA pass: visual regression, performance, a11y, vocab grep, mobile manual test.

Total wall-clock: ~5 days for a focused agent. Work can compress with parallel agents on Days 2-3.

---

## 11. Out of Scope (Hard Boundaries)

The following do not change in Phase E. If an agent feels tempted to touch them, escalate.

- The M0 predictive engine and all probability data.
- The `predictions` table schema and any API route signature.
- The post-submit `RealityScorePanel` *content* — the scientific rarity vocabulary, the 1-in-N display, the share artifact. Phase E adds *entrance motion only*. The vocabulary and structure are locked from Phase D.
- The `LiveAgreementGauge` Option C vocabulary. `REALISTIC` / `BOLD CALL` / `LONG SHOT` only. No scientific rarity words leak in.
- The dark slate color palette. No new colors. Use `--accent-warm` more deliberately, but introduce nothing new.
- The brutalist aesthetic posture. Sharp corners, no drop shadows, no gradients, no glow. Motion is allowed, decoration is not.
- The dnd-kit sensor configuration.
- The flag system.
- The serif voice on the landing page.

---

## 12. Definition of Done — Phase E

Phase E is shippable when:

1. A first-time user lands on `/scenario`, picks Final Four, drops 4 teams into the SF slots, and watches the picker grid collapse out of the way without being asked. The gauge surfaces and the submit button is reachable without scrolling.
2. The Full Bracket renders as a visual bracket tree. The user can trace their champion's path from R32 to F in `--accent-warm`.
3. Every interaction has a sub-300ms feedback response. Drops settle with the spring preset. State changes pulse warm. The gauge fills smoothly on completion.
4. Submit succeeds. Submit failures recover with a Retry button. The reveal panel enters with dignity and then sits still.
5. `prefers-reduced-motion: reduce` flips every animation to instant without breaking layout.
6. Lighthouse Performance on `/scenario/full-bracket` stays within 2 points of the Phase D baseline.
7. Both forbidden-vocab assertions pass.
8. Visual regression baselines updated and reviewed on desktop (1440px) and mobile (375px) for: landing, Final Four mid-build, Final Four post-collapse, Champion's Path stage focus, Full Bracket group stage with dimming, Full Bracket bracket tree, reveal panel.

---

## 13. Open Questions — RESOLVED

All four resolved by Nicolás on approval. Implementation must follow exactly:

**Q1 — Picker auto-expand on slot clear: YES.**
When the user clicks the `×` on a filled slot in Final Four (or any equivalent clear action in Champion's Path / Full Bracket), the collapsed picker grid must auto-expand immediately using the same 320ms `motion.layout` preset. The picker stays expanded until the user has refilled the cleared slot AND all other slots remain filled — at which point the auto-collapse rule from §6 (B.1) re-applies. The user must never have to tap "Edit your picks" themselves after a clear.

**Q2 — Bracket connector draw-in animation: FIRST LOAD ONLY (sessionStorage-gated).**
The 600ms staggered line-draw animation in §7 (C.2) fires only on the first navigation to `/scenario/full-bracket` within a browser session. Implementation: set a `sessionStorage` key (e.g. `bracket-connectors-seen`) on first render. On subsequent renders within the same session, the connector lines render in their final state without animation. The session boundary is intentional — a fresh tab earns a fresh reveal. Reduced-motion users skip the animation regardless.

**Q3 — Count-up animation on reveal: INTEGER 1-in-N ONLY.**
The 700ms cubic-out count-up in §9 (E.2) animates the integer 1-in-N number only. The fractional percentage (e.g. `1.84%`) renders at its final value immediately, no animation. Counting up a percentage with two decimal places looks fussy and undercuts the quant credibility the reveal exists to deliver. The 1-in-N is the shareable, narrative number; that's the one that earns the count-up moment.

**Q4 — Auto-qualifiers re-picking: FULLY RE-PICKABLE.**
The 8-of-12 selection in §6 (B.4) is freely toggleable. The user can deselect any chosen 3rd-place team and pick another at any point before advancing to the knockout stage. The "Pick 8 of 12" counter updates live as picks toggle. There is no commit moment — the picks lock only when the user advances out of Step 2 by interacting with Step 3. This matches the freedom model used by every other slot in the simulator.

**All four answers are locked. Workstream A may dispatch.**
