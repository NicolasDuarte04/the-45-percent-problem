# Design Brief — Animated Tournament Bracket for Landing Hero

**Project:** 45analytics / The 45% Problem
**Feature:** Tournament Scenario Simulator — landing page hero (animated visual)
**Audience:** UI/UX Design Agent (new chat, self-contained)
**Deliverable:** A single animated component, React + inline styles, drop-in for the simulator landing page.

---

## 0. Context

45analytics is a probabilistic pricing framework for the FIFA World Cup 2026. The product runs 10,000 Monte Carlo simulations of the tournament and compares model probabilities against de-vigged bookmaker odds. The framework is called **The 45% Problem** (a reference to the structural-vs-residual variance split in World Cup performance).

The site is built on Next.js 16 + React 19. It already has a beautiful static page called the **Most Likely Bracket** that visualizes the M★ posterior: a full WC2026 bracket from Round of 16 to Final, with probability percentages baked into every match cell, ending in "M★ Champion: Argentina, P(champion) = 20.5%." The visual style is editorial-cream-paper with a serif/mono typography stack, sharp corners, hairline rules, and national flags rendered next to team names.

A new feature, the **Tournament Scenario Simulator**, is being built. Its landing page has a serif headline:

> Call the World Cup. See if the model agrees.

Below the headline is a CTA: `[ START YOUR PREDICTION ]`.

We need a visual hero next to (or below) this headline. An earlier design used a static point-cloud trophy. That worked but was silent. The new direction is more ambitious: **show the model running, by animating actual simulated tournaments through the bracket.**

This brief specifies that animation.

---

## 1. The Reference

The visual canon for the bracket is the existing Most Likely Bracket page on the site. Its anatomy:

- Editorial cream canvas, dark slate ink.
- Match cells: 1px-bordered rectangle, sharp corners, no fill. Two team rows per cell (top: home, bottom: away). Each row has a circular national flag icon (24px), team name in serif, and probability percentage in monospace right-aligned.
- Connecting lines: thin (1px) hairline rules in slate, drawn between a match cell and the next round's cell.
- Stage labels: small mono uppercase ("ROUND OF 16", "QUARTERFINALS", "SEMIFINAL", "FINAL"), with date labels above ("STAGE 1 · 14-18 JUN", etc.).
- Final cell at the center, with a small mono header reading "M★ CHAMPION", the champion team in larger serif, and a probability line "P(champion) = X%".
- The bracket is mirrored: 8 R16 matches on the left, 8 on the right, converging into the central Final cell.

Reproduce this aesthetic exactly. The animation is a motion variant of this static bracket. The settled end state should be visually indistinguishable from the static Most Likely Bracket page.

---

## 2. The Concept

The animation tells the metaphor of Monte Carlo by playing **three full tournament simulations in sequence**, then settling into the static M★ posterior view. The arc:

```
[T=0]    Bracket appears in initial state: R16 matches populated with team pairs,
         all later rounds empty. Subtitle reads "Simulation 1 of 10,000".

[T=0..6s] Simulation 1 plays out. R16 matches resolve in a fast wave, then QF, SF,
         F resolve one at a time with brief probability flashes. Connecting lines
         light up as winners advance. Final settles with one champion (e.g. Argentina).

[T=6s]   Subtitle ticks: "Simulation 2 of 10,000". Bracket fades out the resolved
         state in 200ms, then re-runs from R16 with a different RNG seed. A different
         set of winners emerges (e.g. Spain wins this time).

[T=12s]  Subtitle ticks: "Simulation 3 of 10,000". Third run with another seed.
         Different champion (e.g. Brazil).

[T=18s]  Subtitle ticks: "10,000 simulations · M★ posterior view". The bracket
         transitions one last time, this time settling into the STATIC posterior:
         all match cells now show the model's percentages, the M★ champion cell
         appears in the center with "P(champion) = 20.5%", and the bracket holds.

[T=20s+] Settled state. No more motion. The user can read the posterior or click the CTA.
```

This is the entire animation. It runs once per visitor. It does not loop. After the settle, the visual is identical to the existing Most Likely Bracket page.

---

## 3. Animation Sequence Detail

### 3.1 Initial state (T=0)

- All 8 R16 match cells are populated with team pairs. Each row shows the flag and team name in standard weight, but **no probability percentages and no winner highlight**.
- All QF, SF, and F cells are empty (rendered as 1px-bordered ghost cells with a faint mono "—" placeholder).
- Connecting lines between cells are rendered at 30% opacity (visible but unlit).
- The center "M★ Champion" cell is empty; just the small mono header.
- Subtitle below the bracket reads `Simulation 1 of 10,000` in mono uppercase.

### 3.2 R16 fast wave (T=0..1.5s)

All 8 R16 matches resolve in a single staggered wave. For each match, in stagger order (top-to-bottom on the left half, then top-to-bottom on the right half, with 60ms between matches):

- The winning team's row stays at full opacity.
- The losing team's row fades to 35% opacity over 200ms.
- The connecting line from this cell to the QF cell on its branch animates from 30% opacity to 100% opacity, drawing in from the match cell toward the QF cell over 250ms (use `stroke-dashoffset` if SVG, or a left-to-right reveal mask if HTML/CSS).
- The QF cell receives the winning team in the appropriate slot (top or bottom row).

The wave finishes at ~1.5 seconds. R16 is fully resolved.

### 3.3 QF, SF, F resolve sequentially (T=1.5s..6s)

After R16, the animation slows down. Each subsequent match resolves with this beat:

1. The current match cell highlights briefly: a 1px-thick warm-tone (peach `#F9B88A`) outline appears around the cell for 200ms.
2. **Probability flash:** a small mono caption appears beneath or beside the cell for 250ms reading `Argentina 57% · Spain 43%` (or whatever the model's probabilities are for this matchup). The flash uses 11pt mono uppercase, 70% opacity, fades in 100ms then out 150ms.
3. Winner is selected: loser row fades to 35% opacity over 200ms.
4. Connecting line lights up, drawing toward the next round cell over 250ms.
5. Next round cell receives the winning team.

Total per match: ~600ms. Four QF + two SF + one F = 7 matches × 600ms = 4.2s. Plus a small breath at the start = ~4.5s total for QF→F.

### 3.4 Final cell highlight (T=6s)

Once the F match resolves, the central M★ Champion cell shows the winner of this simulation in larger serif, with a small `[Argentina advances]` line in 11pt mono italic beneath. Hold for 400ms.

### 3.5 Transition between simulations (T=6s, T=12s)

- Subtitle increments: `Simulation 2 of 10,000`, then `Simulation 3 of 10,000`.
- All advancement state from the previous sim fades out over 200ms: lit connecting lines drop back to 30% opacity, faded-loser rows return to full opacity, QF/SF/F cells empty.
- New simulation begins. Use a different seed so the outcomes differ across the three sims.

### 3.6 Final settle (T=18s..20s)

After the third simulation completes:

- Subtitle updates to `10,000 simulations · M★ posterior view`.
- The bracket performs one last transition. Over 800ms:
  - All match cells repopulate with the **M★ posterior** state from the existing Most Likely Bracket page (the canonical version: every cell shows both teams with their probability percentages, no fading, no advancement-stagger).
  - The center M★ Champion cell appears with `M★ CHAMPION`, the champion team in serif, and the line `P(champion) = 20.5%` in mono.
  - All connecting lines rest at the static posterior treatment from the existing bracket page (typically 100% opacity, hairline weight).
- The bracket holds in this state. No more animation.

This final state must be **visually identical** to the static Most Likely Bracket page. The whole point of the animation is to walk the user there.

---

## 4. The Subtitle

A single mono uppercase line, 11pt, 70% opacity, positioned below the bracket. Four states:

- `SIMULATION 1 OF 10,000`
- `SIMULATION 2 OF 10,000`
- `SIMULATION 3 OF 10,000`
- `10,000 SIMULATIONS · M★ POSTERIOR VIEW`

The transitions between subtitle states are 100ms cross-fades. Use `font-variant-numeric: tabular-nums` so the digits don't shift.

The fourth state is the resting state. Once it appears, it stays.

---

## 5. Layout and Sizing

The bracket sits next to or below the headline "Call the World Cup. See if the model agrees." Two layouts are acceptable; pick the one that reads best:

**Layout A (recommended): full-width below headline.** Headline and CTA take the top of the landing. The bracket fills the width below them. This gives the bracket room to breathe at its native scale (similar to how the existing Most Likely Bracket page renders).

**Layout B: two-column at desktop.** Left column: headline + CTA. Right column: a compressed bracket. Stacks vertically on mobile. Trickier because the bracket compresses awkwardly below ~700px.

Default to Layout A unless you have a strong reason for B.

Mobile: bracket scrolls horizontally (per the existing bracket page's mobile pattern). The animation still runs on mobile, but the user may need to scroll to see all of it. Honor `prefers-reduced-motion: reduce` (see §8).

---

## 6. Visual Treatment

All visual choices defer to the existing Most Likely Bracket page. New treatments specific to the animation:

- **Initial unlit state.** Connecting lines at 30% opacity. Match cells unfilled (no percentages, no winner highlight).
- **Probability flash.** Mono uppercase, 11pt, slate ink, 70% opacity. Position: directly beneath the match cell, centered, on its own line. Use the format: `Argentina 57% · Spain 43%`.
- **Loser fade.** The losing team's row drops to 35% opacity over 200ms. Both flag and text. The row stays in the cell (do not collapse the cell height).
- **Line lighting.** SVG paths or CSS-masked elements transition `stroke-dashoffset` (SVG) or `clip-path` (CSS) from full to zero, drawing the line in. Easing: `cubic-bezier(0.22, 0.61, 0.36, 1)`.
- **Match cell highlight.** A 1px peach outline (`#F9B88A`) appears around the active cell for 200ms then fades. This is the only place the warm accent is used in the animation. (Peach is already in the project's existing prism palette.)
- **Champion cell reveal.** When the F match resolves in each sim, the central M★ cell scales up from 0.95 to 1.0 with opacity 0 → 1 over 300ms.

No other motion. No glow effects. No parallax. No team logos (national flags only, already in the codebase under `public/assets/flags/`).

---

## 7. Run-Once Behavior

The animation runs on first visit only. Use `localStorage`:

```js
const KEY = '45a:landing-bracket-animated';
const hasSeen = localStorage.getItem(KEY) === '1';
if (hasSeen) {
  // Render the M★ posterior settle state immediately. Skip the three simulations.
} else {
  // Run the full sequence. Set the flag at T=20s (after settle completes).
  localStorage.setItem(KEY, '1');
}
```

A small developer-only `window.__replayBracket()` hook is acceptable for testing, but no user-facing replay button. Returning visitors land directly on the settled posterior view.

---

## 8. Reduced Motion

Honor `prefers-reduced-motion: reduce`:

- Skip the three simulations entirely.
- Render the settled M★ posterior view on first paint.
- Subtitle reads `10,000 SIMULATIONS · M★ POSTERIOR VIEW` immediately.

No partial concession (e.g. "fewer simulations" or "faster"). When reduced motion is requested, ship the destination, not a sped-up journey to it.

---

## 9. Technical Specification

### 9.1 Data structure

The bracket is parameterized by:

- A list of 8 R16 matchups: `[{ home: 'ARG', away: 'COL', pHome: 0.69, pAway: 0.31 }, ...]`
- The bracket structure (which match feeds into which next-round match) is the canonical FIFA 2026 bracket; encode it as a static lookup table.
- A separate dataset for the M★ posterior settle state: each cell's two teams and their model probabilities, plus the M★ champion data (`{ champion: 'ARG', pChampion: 0.205 }`).

For the prototype, hardcode a representative dataset that matches the existing Most Likely Bracket page (Argentina champion at 20.5%, etc.). Real data wiring to the project's snapshot files is the engineering agent's job downstream.

### 9.2 Simulation runner

For each simulation, walk the bracket from R16 forward. At each match:

1. Look up the displayed model probabilities (`pHome`, `pAway`).
2. Sample a Bernoulli draw using a seeded RNG.
3. Advance the winner.

Use a simple xorshift32 RNG seeded by `Date.now() ^ simulationIndex` so each visit produces a different sequence of three simulations. The same visit produces the same three sims if you replay (handy for testing).

The probabilities used for sampling are the **same probabilities shown in the M★ posterior settle state**. The animation IS sampling from the model's posterior; it isn't making up numbers. This is a credibility move; be precise.

### 9.3 Component structure

A single React component, `LandingHeroBracket`, with these internal pieces:

- `BracketCanvas`: the static layout (grid of match cell positions, SVG paths for connecting lines).
- `MatchCell`: a single match cell (renders home + away rows; supports states: unlit, highlighted, resolved).
- `ConnectingLine`: an SVG path between two cells, with `stroke-dashoffset` animation.
- `Subtitle`: the animated subtitle line below the bracket.
- `useSimulationSequence`: a hook that orchestrates the timeline (runs three simulations, then settles).

Use inline styles or CSS modules. The project uses Tailwind v4 with @theme blocks; both Tailwind utility classes and CSS custom properties are acceptable.

### 9.4 Timing budget summary

| Phase | Start | Duration | Cumulative |
|-------|-------|----------|------------|
| Initial render | 0s | 0s | 0s |
| Sim 1: R16 wave | 0s | 1.5s | 1.5s |
| Sim 1: QF→F | 1.5s | 4.5s | 6s |
| Sim 2 transition | 6s | 0.2s | 6.2s |
| Sim 2: R16 wave | 6.2s | 1.5s | 7.7s |
| Sim 2: QF→F | 7.7s | 4.5s | 12.2s |
| Sim 3 transition | 12.2s | 0.2s | 12.4s |
| Sim 3: R16 wave | 12.4s | 1.5s | 13.9s |
| Sim 3: QF→F | 13.9s | 4.5s | 18.4s |
| Settle transition | 18.4s | 0.8s | 19.2s |
| **Total** | | | **~19s** |

If 19 seconds feels too long, it's fine to compress R16 waves to 1.0s and QF→F to 3.5s, bringing total to ~14s. Don't go faster than that; the metaphor needs time to land.

---

## 10. Forbidden Patterns

Do not add any of the following:

- **Looping.** The animation runs once. No infinite cycle.
- **A "play again" button** visible to users. Replay is for developers only via the console hook.
- **Sound or audio cues** of any kind.
- **Glow effects, gradients, drop shadows, parallax, or any decorative motion** outside what is specified in §3 and §6.
- **Color outside the existing token system.** Slate ink for text, slate hairlines for rules, peach for the single match-cell highlight, national flag colors via the existing flag assets. No new accents.
- **Team commercial logos.** National flags only.
- **Sportsbook visual idioms.** No live-betting aesthetics, no odds-style displays, no green/red advancement coloring (use opacity for winner/loser distinction, not color).
- **A countdown timer.** The remaining seconds in the simulation are not surfaced.
- **Any text claiming the simulations shown are predictions.** They are samples from the posterior. The subtitle "Simulation N of 10,000" is the only framing.
- **Ad-libbed copy.** Use the exact subtitle strings in §4. Do not paraphrase.
- **Cycling through more than 3 simulations.** Three is enough. More is decorative.

---

## 11. Deliverable

Produce a single self-contained React component prototype. The prototype should:

1. **Render the full animation** in a fresh browser tab, end-to-end, in ~19 seconds.
2. **Settle into the M★ posterior view** that matches the existing Most Likely Bracket page (use the same Argentina-champion-at-20.5% data as a placeholder).
3. **Honor `prefers-reduced-motion: reduce`** by rendering the settled state immediately.
4. **Honor the localStorage run-once flag.** First visit animates; subsequent visits land on settle.
5. **Expose `window.__replayBracket()`** for developer testing.
6. **Include a short README block in the file header** explaining: which 8 R16 matchups are hardcoded, how the RNG is seeded, where the M★ posterior data is stubbed, and which selectors the engineering agent should swap to wire real data downstream.

Visual fidelity to the existing Most Likely Bracket page is the dominant criterion. If you are unsure about a visual choice, defer to whatever that page does.

The prototype is consumed downstream by Claude Code, who will adapt it to the actual codebase (`src/components/simulator/LandingHeroBracket.tsx`), wire real flag assets from `public/assets/flags/`, and replace the stubbed M★ posterior data with reads from `lib/data/loadSnapshot.ts`. Do not attempt that integration here. Just produce a clean, working prototype that proves the design.

---

## 12. Closing Note

The user opens the page. The bracket is not yet drawn in. They read the headline: *Call the World Cup. See if the model agrees.* They look right (or down). A simulation begins. Argentina beats Colombia, Spain beats Ecuador, France beats Denmark, Senegal beats Uruguay, then on the right side, Mexico beats South Korea, Portugal beats Germany, Japan beats England, Brazil beats Turkey. The lines light up. The bracket fills. France emerges from the upper half. Brazil emerges from the lower. France beats Brazil in the final. Argentina is nowhere.

The subtitle ticks. *Simulation 2 of 10,000.* It runs again. Different teams emerge. The user starts to see what the model is doing.

A third time. A third champion.

Then the subtitle settles: *10,000 simulations · M★ posterior view.* And the bracket re-renders, this time with all the percentages, with Argentina at 20.5% in the center, with all the model's accumulated weight. The user has just watched, in 20 seconds, a compressed version of what the model has been doing for weeks.

That is the brief. Build it.
