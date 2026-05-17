# UX/UI Polish Plan. Tournament Scenario Simulator (Phase D)

**Project:** 45analytics / The 45% Problem
**Branch base:** `main` (Phase C merged)
**Audience:** Engineering agents (Opus / Sonnet) executing modular polish PRs
**Scope:** UX/UI polish only. No new model logic, no new API routes, no schema changes. Aesthetic and interaction layer.
**Goal:** Close the gap between the simulator's quant-correct functionality and a mainstream user's first 30 seconds. Pass the Grandma Test without losing the brutalist aesthetic.

**Revision (this version):** Workstream 3.1 vocabulary decision is now **resolved**. Option C (Ultra-Minimalist Hybrid) is the chosen path. See §4.1 and §9.

---

## 0. Diagnosis (What's Actually There Today)

A codebase scan confirmed the following starting points. The polish plan builds on them rather than rewriting them.

**Already in place:**
- `Flag` primitive at `src/components/primitives/Flag.tsx` (renders `<img src={`/assets/flags/${code.toLowerCase()}.svg`} />`, accepts `size`, `className`, `style`).
- 48 SVG flag assets in `public/assets/flags/`, one per FIFA code.
- `TeamPickerGrid` already renders Flag at size 24 alongside code + name during build modes.
- Live `liveScore` memo in `ModeFinalFour.tsx` (line 137) recomputes Reality Score on `filled` state change, using static client-side `TEAM_PROBS` from `src/lib/sim/snapshotProbs.ts`. Sub-millisecond compute; no network.
- dnd-kit wired in `ModeFinalFour` only with `PointerSensor` (8px), `TouchSensor` (150ms), `KeyboardSensor`. State update happens on `onDragEnd`, not on pointer move.
- Per-team probabilities exposed client-side: `pG`, `pR`, `pQ`, `pS`, `pF`, `pC` (group qual through champion).
- Rarity band logic in `src/lib/sim/getRarityBand.ts` with five thresholds (Common, Plausible, Uncommon, Rare, Vanishingly rare).

**The gaps the polish targets:**
1. **Static `TeamGrid` on the landing** (`src/components/simulator/TeamGrid.tsx`) shows code + name only, no flag. Inconsistent with `TeamPickerGrid` inside the modes.
2. **Empty droppable slots** render `{code ?? "-"}` (line 95 of `ModeFinalFour.tsx`). The en dash gives no affordance; nothing visually says "drop here."
3. **Live score is a percentage only.** Per Patch v2.1 §3, the rarity band and 1-in-N are correctly suppressed during build to avoid "Common · 1 in 1" nonsense on partial scenarios. But the percentage alone has zero emotional pull.
4. **Mode selector cards** have no iconography. Three nearly identical bordered rectangles with text only.
5. **`DragOverlay`** shows just the team code mid-drag. The flag is in the source cell but disappears the moment you grab it.

---

## 1. Three Phases, Five Workstreams

Workstreams 1, 2, and 4 are independent and can ship in parallel. Workstream 3 (Live Agreement Gauge) depends on a one-time decision (vocabulary); now resolved as Option C below. Workstream 5 (QA pass) runs last.

| # | Workstream | Files touched | Estimated PRs |
|---|------------|---------------|----------------|
| 1 | Universal flag system | TeamGrid, FFSlot, stage slots, bracket cells, DragOverlay | 1 (4 sub-tasks) |
| 2 | Tactile empty slot affordances | New `EmptySlot` component + replacements across 3 modes | 1 (3 sub-tasks) |
| 3 | Live Model Agreement gauge | New `LiveAgreementGauge` + wiring in 3 modes | 2 |
| 4 | Mode card iconography | `ModeSelectorCards.tsx` + 3 new SVG glyphs | 1 |
| 5 | Polish & QA | Visual regression, perf, a11y, vocab grep | 1 |

---

## 2. Workstream 1 · Universal Flag System

### 2.1 Update static `TeamGrid` (landing page)

**File:** `src/components/simulator/TeamGrid.tsx`

Today, lines 47-59 render each cell with code + name only. Update the per-cell render to mirror the pattern already used in `TeamPickerGrid`: Flag (size 24) on the left, code + name on the right, in a small inline-row. Keep the existing 6-column grid structure and the hairline border treatment. The cell becomes:

```
[ Flag 24px ] [ ALG (mono 18px) / Algeria (sans 10px quiet) ]
```

The cell padding may need a small bump (`p-3` to `p-4` or similar) to accommodate the flag without crowding. Match the visual density of `TeamPickerGrid` cells.

**Acceptance:**
- All 48 cells on `scenario/page.tsx` render with a flag.
- Cell heights are uniform.
- Mobile (375px viewport) renders at 3 columns or 2 columns without flag overlapping text.

### 2.2 Add flag to filled slots in `FFSlot`

**File:** `src/components/simulator/modes/ModeFinalFour.tsx` (FFSlot sub-component, around line 95)

When the slot is filled (`code` is not null), render Flag (size 32) above the code. When empty, defer to the new `EmptySlot` from Workstream 2. The filled state becomes:

```
[ SF1 (small mono label) ]
[ Flag 32px ]
[ ARG (mono 32px) ]
[ Argentina (sans 11px quiet) ]
[ × close button (existing) ]
```

Slot height stays `h-24` or grows by 8-12px to accommodate the flag. Keep the existing focus ring and accessibility props.

### 2.3 Apply same treatment to Champion's Path stage slots and Full Bracket match cells

**Files:** `src/components/simulator/modes/ModeChampionsPath.tsx`, `src/components/simulator/modes/ModeFullBracket.tsx`

Each filled team display in these modes gets a Flag (size 24) inline before the code. Empty positions defer to the new `EmptySlot` component. The "your team" anchor at the top of Champion's Path gets a larger Flag (size 48) for emphasis.

### 2.4 Update `DragOverlay`

**File:** `src/components/simulator/modes/ModeFinalFour.tsx` (DragOverlay block)

Currently the overlay renders just `{activeCode}` in mono. Update to render Flag (size 24) + code in the same horizontal layout. Keep the elevation styling (z-50, drop shadow) so the dragging chip reads as detached from the page.

### 2.5 Audit `TradeTicket` and `ScenarioBlock`

**Files:** `src/components/simulator/TradeTicket.tsx`, `src/components/simulator/ScenarioBlock.tsx`

Flags are already used in `TradeTicket` (size 24/32 depending on mode) but `ScenarioBlock` renders text-only ticker rows. Decide per surface:

- `TradeTicket` hero: already correct, verify only.
- `ScenarioBlock` Final Four row (`SF: ARG BRA FRA ENG`): keep mono ticker for the share artifact density. The share image (`@vercel/og`) stays text-only since OG image generation has limited asset support.

**Acceptance for Workstream 1:**
- Every place a team is shown to a user is accompanied by its national flag, except (a) the share image's compact ticker block, and (b) the empty slot states (handled in Workstream 2).
- No new colors introduced. Flags use their native palette.
- Visual regression snapshots updated for 4 surfaces: landing TeamGrid, ModeFinalFour mid-build, Champion's Path mid-build, Full Bracket mid-build.

---

## 3. Workstream 2 · Tactile Empty Slot Affordances

### 3.1 Create the `EmptySlot` component

**New file:** `src/components/simulator/EmptySlot.tsx`

| State | Trigger | Visual |
|-------|---------|--------|
| Idle | No drag in progress, slot empty | Dashed 1px border, small `+` glyph centered (1px stroke SVG, ~16px), label `DROP A TEAM` in mono 9pt at 50% opacity below the glyph |
| Hover-over | dnd-kit `isOver=true` | Border switches to solid 1px in `--accent-warm`, glyph opacity 100%, label opacity 80%, faint `--accent-warm` 8% fill |
| Keyboard-focused | `:focus-visible` | 1px solid `--accent-focus` outline, glyph opacity 100% |
| Mobile-tap-source | Set when user has tapped a team to select | Same as hover-over but pulses opacity 60% to 100% over 1.2s, infinite, low amplitude |

**Props surface:**
```ts
interface EmptySlotProps {
  label?: string;
  isOver?: boolean;
  isActive?: boolean;
  size?: "sm" | "md" | "lg";
  ariaLabel: string;
}
```

**Rules:**
- Sharp corners always (`border-radius: 0`). The dashed border is the only departure from solid 1px lines elsewhere.
- The `+` glyph is a custom inline SVG, 1px stroke, never imported from lucide-react or any icon library.
- The pulse animation honors `prefers-reduced-motion: reduce`.
- No background fill in idle state.

### 3.2 Replace dash patterns across modes

- `src/components/simulator/modes/ModeFinalFour.tsx`; replace `{code ?? "-"}` on line 95 with `<EmptySlot label="SF1" size="md" ariaLabel="Drop a team into Semifinal slot 1" />` (same for slots 2, 3, 4).
- `src/components/simulator/modes/ModeChampionsPath.tsx`; replace empty stage cells with `<EmptySlot size="md" label="OPPONENT" ariaLabel={`Choose opponent for ${stage}`} />`.
- `src/components/simulator/modes/ModeFullBracket.tsx`; replace empty match cells with `<EmptySlot size="sm" label="WINNER" ariaLabel={`Choose winner of ${matchId}`} />`.

### 3.3 Click-to-fill complement

For mobile and keyboard users, add a tap-to-fill flow:
1. User taps an empty slot. Slot enters "active source" state (pulse).
2. User taps a team in the grid. Team is placed in that slot. Active state clears.
3. Tapping the active slot again cancels.

dnd-kit's KeyboardSensor and the existing click handler can both feed the same `handleDropToSlot` function.

**Acceptance for Workstream 2:**
- Zero `{code ?? "-"}` patterns remain in the simulator.
- Empty slots in all three modes use `EmptySlot` with the appropriate `size` and `label`.
- Dragging a team over a slot visibly lights up the target.
- Tapping an empty slot then tapping a team places the team correctly on touch devices.
- `prefers-reduced-motion: reduce` suppresses the pulse.

---

## 4. Workstream 3 · Live Agreement Gauge

The vocabulary decision is now settled; build accordingly.

### 4.1 Vocabulary decision. RESOLVED: Option C (Ultra-Minimalist Hybrid)

**Three options were considered.**

**Option A:** Reuse the rarity band vocabulary in a "preview" treatment. Rejected: muddies the post-submit reveal.

**Option B:** Introduce a new 5-state vocabulary for the live gauge. Rejected: two full vocabularies to internalise.

**Option C · CHOSEN: Ultra-Minimalist Hybrid.**
- **Live build (the live gauge): zero scientific rarity terminology.** Render only three things: a punchy viral hook label, the segmented bar, and the percentage. The viral hook is a 3-state vocabulary keyed off the percentage. No words like "Common," "Plausible," "Uncommon," "Rare," or "Vanishingly rare" appear anywhere in the live gauge; not as captions, not as tooltips, not as `aria-label` text.
- **Post-submit (Trade Ticket / `RealityScorePanel`): unchanged.** The strict 5-band scientific rarity vocabulary remains exactly as it is today.
- **Why this wins.** During play, the user gets a clean emotional read with no reading homework. On submit, the scientific rarity band lands as a verdict with weight. The two surfaces speak two different registers; playful during interaction, rigorous on reveal.

**Live-gauge viral hook · 3 states only:**

| Hook label | Threshold (model probability of the predicted scenario) |
|------------|----------------------------------------------------------|
| `REALISTIC`  | ≥ 5%   |
| `BOLD CALL`  | 1%. 5% |
| `LONG SHOT`  | < 1%   |

Rules:
- Labels are mono, uppercase, tracked. No serif here: serif is reserved for the post-submit rarity band on the reveal panel.
- Below 0.1% the label stays `LONG SHOT`. There is no fourth tier.
- The `LONG SHOT` token must be added to the simulator-allowed vocabulary list explicitly so the forbidden-vocabulary grep does not fail.
- The mapping from percentage → hook label lives in a single helper, e.g. `src/lib/sim/getLiveHook.ts`. The post-submit panel does **not** import this helper. The two vocabularies do not cross-pollute.

### 4.2 Build `LiveAgreementGauge` component

**New file:** `src/components/simulator/reality/LiveAgreementGauge.tsx`

Anatomy (live build state, post-resolution of Option C):

```
[ HOW THE MODEL READS YOUR CALL ]                   (mono 9pt, 60% opacity)
█████░░░░░░░░░░░░░░░░░░░░░░░                       (segmented bar, 5 segments)
[ BOLD CALL ]                                       (mono uppercase, viral hook only)
                                            1.84%   (mono tabular, current percentage)
```

**What is intentionally absent:** no scientific rarity word, no 1-in-N line, no caption, no celebratory motion.

**The segmented bar:**
- Horizontal, 5 segments, separated by 1px gaps.
- Each segment represents one rarity threshold zone from `getRarityBand.ts`. The geometry still tracks the 5 underlying thresholds; preserves visual real estate so layout matches the post-submit panel.
- Active segment fills with `--text-primary`; inactive segments are 1px outline only.
- Width: ~280px desktop, full-width mobile. Height: 8px.
- No tick labels, no inline annotations.

**Direction:** "most common" on the left, "vanishingly rare" on the right.

**Props surface:**
```ts
interface LiveAgreementGaugeProps {
  count: number;
  total: 10000;
  isComplete: boolean;
  variant?: "compact" | "full";
}
```

**Rendering rules:**
- When `isComplete=false`: ghost state (all segments outlined, no active segment), no hook label, no percentage.
- When `isComplete=true` and `variant="compact"`: full bar, active segment, **viral hook label only** (`REALISTIC` / `BOLD CALL` / `LONG SHOT`), percentage in mono tabular. **No scientific rarity word anywhere.** No 1-in-N.
- The `variant="full"` case is reserved and currently unused; the post-submit hero is `RealityScorePanel`, which this component must never replace.

**Per-mode "show-threshold" definition:**

| Mode | `isComplete` triggers when |
|------|----------------------------|
| Final Four | All 4 SF slots filled |
| Champion's Path | All 4 stage opponents picked AND all 4 W/L set |
| Full Bracket | At least the champion is picked |

### 4.3 Wire into modes

In `ModeFinalFour.tsx`, replace the current percentage-only block (lines 284-296) with `<LiveAgreementGauge count={liveScore.count} total={liveScore.total} isComplete={filled.every(Boolean)} variant="compact" />`.

In `ModeChampionsPath.tsx`, after the path rendering, insert the gauge with `isComplete` derived from path completeness.

In `ModeFullBracket.tsx`, insert the gauge near the bracket header with `isComplete={Boolean(champion)}`.

The post-submit `RealityScorePanel` stays untouched. Do not import `LiveAgreementGauge` into `RealityScorePanel`, `TradeTicket`, or any share-image route.

### 4.4 State management and performance

**Why this is already not a performance problem:**
1. `TEAM_PROBS` is static, imported, in-memory.
2. `computeRealityScore` is O(few teams) arithmetic.
3. dnd-kit fires `onDragEnd` once per drop, not on every pointer move.
4. The gauge component is wrapped in `React.memo` comparing `(count, total, isComplete)`.

**Discipline rules:**
- The gauge receives primitive props, not the whole scenario object.
- The segmented-bar fill uses CSS `transition: opacity 200ms ease-out, background-color 200ms ease-out`. No JS animation loop, no Framer Motion.
- Do **not** subscribe to dnd-kit's drag-over event for live updates. Score updates only on drop.

### 4.5 Acceptance for Workstream 3

- The gauge appears in all three modes.
- During a partial scenario, the gauge renders in ghost state with no hook label and no number.
- When the scenario reaches its mode's show-threshold, the gauge animates to its active state in <250ms, showing the viral hook plus the percentage.
- **Negative check:** The strings `Common`, `Plausible`, `Uncommon`, `Rare`, `Vanishingly` do **not** appear anywhere in the rendered output of `LiveAgreementGauge`. The post-submit `RealityScorePanel` continues to render those strings.
- Drag-and-drop a team across modes: no visible frame drops, gauge updates exactly once per drop.
- React DevTools Profiler shows the gauge component re-rendering at most once per drop.
- `prefers-reduced-motion: reduce` removes the segment fill transition.
- Mobile (375px) renders the gauge full-width without truncation.

---

## 5. Workstream 4 · Mode Card Iconography

### 5.1 Design 3 geometric glyphs

**New file:** `src/components/simulator/icons/ModeGlyphs.tsx`

Three inline SVG components, each ~24px square, 1px stroke, `currentColor` fill:

- **`FinalFourGlyph`**: 4 small filled squares arranged in a 2x2, with subtle 1px line connecting the 4 to a single point.
- **`ChampionsPathGlyph`**: 4 dots connected left-to-right by a single 1px line, with a small filled circle at the rightmost dot.
- **`FullBracketGlyph`**: a minimalist tournament-tree fragment: 4 short horizontal lines on the left, converging through 2, into 1.

All three should look like research paper diagrams. 1px stroke, geometric, no fill except where indicated, no rounded line caps.

### 5.2 Update `ModeSelectorCards.tsx`

**File:** `src/components/simulator/ModeSelectorCards.tsx` (around lines 47-83)

Add the glyph to the upper-right corner of each card. Position absolute, top: 16px, right: 16px, color: `var(--text-tertiary)`. On card hover, glyph color shifts to `var(--accent-warm)`.

Keep all existing copy. Keep the bracket notation in headings (`[ FINAL FOUR ]`).

**Acceptance for Workstream 4:**
- Three glyphs render in the upper-right of their respective cards.
- On hover, glyph color tracks the warm accent.
- No icon library imported.
- A11y: glyphs marked `aria-hidden="true"`.
- Mobile: glyphs visible and not crowding the heading text.

---

## 6. Workstream 5 · Polish & QA

### 6.1 Visual regression
Run `pnpm test:visual` after each workstream lands. Update baselines for: Landing TeamGrid, ModeFinalFour mid-build, Champion's Path mid-build, Full Bracket mid-build, Mode selector cards, Trade Ticket.

### 6.2 Performance check
- React DevTools Profiler: confirm LiveAgreementGauge re-renders only on drop.
- Chrome Performance tab: total scripting time during a single drop event <16ms.
- Lighthouse pass on `/scenario/final-four` for LCP regression check.

### 6.3 Accessibility pass
- Tab order through scenario page is sensible.
- Screen reader: empty slots announce `ariaLabel`. Filled slots announce team name. Gauge announces using only the live-gauge vocabulary, e.g. "Live Reality Score: Bold Call, 1.8 percent." It does **not** read out scientific rarity words.
- All transitions honor `prefers-reduced-motion: reduce`.
- Color contrast `--text-primary` on `--bg-root` exceeds 7:1.

### 6.4 Mobile responsive check
- 375px viewport: all three modes render without horizontal scroll except Full Bracket.
- Touch targets ≥44px in smallest dimension.
- Tap-to-fill flow works on touch.

### 6.5 Forbidden-vocabulary grep
Re-run `pnpm prebuild`. Specific notes for Phase D under Option C:
- `REALISTIC`, `BOLD CALL`, `LONG SHOT` must be added to the simulator-allowed vocabulary list explicitly.
- `LONG SHOT` is acceptable per Blueprint §5.4. The global ban on gambling phrase patterns is unchanged. If the global grep treats `long shot` as flagged, narrow the rule so the simulator surface whitelists it while the rest of the site rejects it.
- **New test:** assert that `Common`, `Plausible`, `Uncommon`, `Rare`, and `Vanishingly` do **not** appear in any rendered output of `LiveAgreementGauge`. This is the structural enforcement of Option C.

### 6.6 PR description content
Each PR should include before/after screenshots (desktop and mobile), confirmation that visual regression baselines updated, confirmation that perf / a11y / forbidden-vocab gates pass, and a link to this plan document.

---

## 7. Out of Scope (Hard Boundaries)

- The M0 predictive engine and all probability data.
- The `predictions` table schema and any API route signature.
- The email subsystem integration.
- The Trade Ticket layout and the `@vercel/og` rendering pipeline.
- The post-submit `RealityScorePanel` design. Under Option C: do not unify it with the live gauge, do not import the live-gauge hook helper into `RealityScorePanel`, do not let scientific rarity words leak into `LiveAgreementGauge`.
- The dnd-kit sensor configuration.
- The dark slate color palette. No new colors. No new tokens.
- The brutalist aesthetic. Sharp corners, no drop shadows, no gradients, no glow effects.

---

## 8. Sequencing Recommendation

1. **Day 1 morning:** Workstream 1 (Universal flag system).
2. **Day 1 afternoon:** Workstream 4 (Mode card glyphs). Parallel to Workstream 1's review.
3. **Day 2:** Workstream 2 (Tactile empty slots).
4. **Day 2 end / Day 3:** Workstream 3 (Live Agreement Gauge). Vocabulary is Option C: proceed directly to component build.
5. **Day 3 end:** Workstream 5 (Polish & QA).

Total wall-clock: ~3 days. No remaining blocking decisions.

---

## 9. The One Decision Required Before Coding Starts. RESOLVED

**Option C (Ultra-Minimalist Hybrid) is the chosen vocabulary path for Workstream 3.1.**

- Live gauge: 3-state viral hook only (`REALISTIC` / `BOLD CALL` / `LONG SHOT`) + segmented bar + percentage. No scientific rarity words.
- Post-submit panel: unchanged. Strict 5-band rarity vocabulary (Common, Plausible, Uncommon, Rare, Vanishingly rare) stays.
- Enforcement: forbidden-vocab grep gets a new assertion that scientific rarity words do not appear in `LiveAgreementGauge` output. The two vocabularies do not share a helper.

Workstreams 1 and 4 can dispatch in parallel; Workstream 2 follows; Workstream 3 follows the EmptySlot work; Workstream 5 closes.
