# CP-03: Sticky progress meter across all three modes

**Working directory:** `/Users/nicolasduarte/Documents/Claude/Projects/The 45 Percent Problem/the-45-percent-problem/website`

Branch off `main` as `cp-03-sticky-progress-meter`. Open the PR against `main`. The architecture document is `UI_IMPROVEMENT_ARCHITECTURE_V3.md` in that folder; `CLAUDE.md` is at the same level. Read both before you start, then come back to this prompt.

---

## 0. Why this checkpoint exists

Right now each simulator mode (`/scenario/final-four`, `/scenario/champions-path`, `/scenario/full-bracket`) carries its own pick counter and its own submit affordance, in different places, at different sizes, with inconsistent copy. Anyone scrolling past the first viewport loses the count and has to scroll back to find the submit CTA. Drop-off happens in that scroll.

CP-03 puts one shared sticky element at the bottom of the viewport on all three mode pages. It does two jobs and only two jobs:

1. While picks are in progress: show `[ STEP n OF N : MODE_LABEL ]` so the user always knows where they are.
2. When the scenario is complete (`current === total`): swap to `[ READY : ARM ALERT ]` so the user can submit without scrolling.

Post-submit (after the alert is armed and the result chrome takes over), the meter hides.

This is the first CP that touches all three mode pages at once. Treat it as a refactor that converges on a shared primitive, not as three parallel additions.

---

## 1. Locked guardrails (carry forward from CP-00 / CP-01 / CP-02)

These are not up for debate. If your implementation would violate any of them, stop and surface the conflict in your self-report instead of working around it.

- **No em dashes or en dashes anywhere.** Period, semicolon, colon, or parentheses. Project rule. Pre-push grep catches markers but not dashes; you check yourself.
- **Voice is brutalist mono.** `[ STEP 3 OF 4 : FINAL FOUR ]`, `[ READY : ARM ALERT ]`, `[ ARMED ]`. No "Continue", no "Next", no "Submit your picks!", no exclamation marks, no friendly tone, no "newsletter"/"subscribe"/"spam" anywhere.
- **Palette is locked.** Existing tokens only: `--bg-panel-elev`, `--text-primary`, `--text-tertiary`, `--accent-warm`, `--ui-success`, `--ui-danger`. Do not introduce new tokens in this CP. If you find yourself wanting a new token, stop and flag it instead.
- **CSS custom property resolution rule.** `var(...)` substitutions resolve at the **declaring** element, not the consumer. You should not need to redefine anything in this CP because you are only consuming existing tokens; if that changes during implementation, the cascade probe becomes mandatory (see §4 below).
- **Motion bounds.** 150 to 300ms micro, 300 to 500ms layout, never above 600ms. Use the motion vocabulary from CP-00 (`bandReveal`, `tickRoll`). Respect `prefers-reduced-motion`: number snaps to target, no slide on mount.
- **Testing posture.** Vitest for pure TS logic with the default `*.test.ts` glob. Playwright for anything that needs a DOM, file convention `tests/visual/*.spec.ts`. React Testing Library is not installed and we are not adding it. If your component has no pure-TS logic worth unit-testing, skip the unit test, do not invent one.
- **Touch target floor.** The ARM ALERT CTA when in "ready" state must be at least 44px tall on mobile. Pinpoint hits on a sticky element are a guaranteed dark pattern.

---

## 2. What you are building

### 2.1 New shared component

`src/components/simulator/ui/StickyProgressMeter.tsx`

Contract:

```tsx
type StickyProgressMeterProps = {
  current: number;             // picks made so far
  total: number;               // picks required for this mode
  modeLabel: string;            // "FINAL FOUR" | "CHAMPION'S PATH" | "FULL BRACKET"
  isReady: boolean;             // current === total AND the mode considers itself submittable
  isSubmitted: boolean;         // true after submit succeeds; meter unmounts
  onSubmit: () => void;         // wired to whatever each mode currently uses to arm the alert
};
```

Behaviour:

- Renders as a fixed-position bar at the **bottom** of the viewport, full width, with `--bg-panel-elev` background and a 1px top border using `color-mix(in srgb, var(--text-tertiary) 18%, transparent)`.
- Z-index above scrolling content, below any modal/toast layer. Match whatever the existing toast primitive (CP-00) sits at, then subtract 1.
- Left column: mono text `[ STEP {current} OF {total} : {modeLabel} ]`. When `isReady === false`.
- Left column when `isReady === true`: mono text `[ READY ]` in `--ui-success`.
- Right column: CTA. When `isReady === false`, the CTA is disabled and shows `[ ARM ALERT ]` in `--text-tertiary` (visibly inactive). When `isReady === true`, the CTA becomes active, `--accent-warm` text on transparent background, with the brutalist bracket wrap.
- Animate count changes (left column) with the existing `tickRoll` preset from CP-00.
- Animate the `isReady` transition (left and right columns swap state) with `bandReveal`.
- `isSubmitted === true` returns `null`. The component is fully unmounted; no animation needed on the way out, the result chrome takes over.
- Respect `useReducedMotionAware` (existing hook). Under reduced motion: number snaps, no slide.
- `role="status"` on the left column with `aria-live="polite"` so screen readers announce step transitions.
- The CTA button has an explicit `aria-disabled` mirroring the disabled state, and `aria-label="Arm alert for this scenario"` when active.

### 2.2 Integration into the three modes

You will modify exactly these three files:

- `src/components/simulator/modes/ModeFinalFour.tsx`
- `src/components/simulator/modes/ModeChampionsPath.tsx`
- `src/components/simulator/modes/ModeFullBracket.tsx`

For each:

1. Read the file end to end before changing anything. Find where the current pick-count is held (state or selector) and where the current submit handler lives.
2. Mount `<StickyProgressMeter />` once, at the bottom of the mode's JSX tree (sibling of the main content, not inside a scrolling container).
3. Wire `current`, `total`, `modeLabel`, `isReady`, `isSubmitted`, `onSubmit` to the existing state. Do not duplicate state. If the source of truth lives in a Zustand store / reducer / context, read from there.
4. Audit any existing inline submit button or floating CTA that the meter would duplicate. If there is one, **hide it on viewports where the sticky meter is visible** (all of them, in practice). Document the deletion / hide decision in the PR description. Do not leave two submit affordances visible at the same time.
5. The body content needs `padding-bottom` (or equivalent) equal to the sticky meter height plus some breathing room so the last row is not occluded. Use a CSS variable or a fixed pixel value, your call, but make it consistent across the three modes.

`modeLabel` values to use exactly:

- ModeFinalFour: `"FINAL FOUR"`
- ModeChampionsPath: `"CHAMPION'S PATH"`
- ModeFullBracket: `"FULL BRACKET"`

`total` for each mode is whatever the current code already considers complete. Do not redefine completeness; read it from the existing state shape. If you cannot find a clean "isReady" signal in one of the modes, derive it as `current === total` and note that in the PR.

### 2.3 Tests

`tests/visual/sticky-progress-meter.spec.ts` (new Playwright spec):

Five assertions, one per scenario. Use `/scenario/final-four` as the smoke surface; rely on visiting each mode's URL for the cross-mode assertions.

1. On `/scenario/final-four` with zero picks, the meter is visible, shows `[ STEP 0 OF 4 : FINAL FOUR ]`, the CTA reads `[ ARM ALERT ]` and is `aria-disabled="true"`.
2. After making one valid pick, the meter updates to `[ STEP 1 OF 4 : FINAL FOUR ]`. (Use the same picker-interaction selectors you used in CP-02; if those changed, find the new ones and document.)
3. After 4 valid picks, the left column reads `[ READY ]` with text colour resolving to the `--ui-success` token, and the CTA becomes `aria-disabled="false"`.
4. On `/scenario/champions-path` with zero picks, the meter reads `[ STEP 0 OF N : CHAMPION'S PATH ]` where N matches the mode's required pick count. (Read the value from the page, do not hardcode it across modes.)
5. On `/scenario/full-bracket`, the meter is visible and the `modeLabel` reads `FULL BRACKET`. Step count is not asserted here; mode topology is the only assertion.

If any mode requires non-trivial interaction to reach a meaningful state for the assertion, skip the interaction and assert only on initial render plus structural presence. Visual robustness over interaction completeness.

No unit test unless you find pure-TS logic worth covering. The component is presentational + thin wiring; almost certainly no test is warranted.

---

## 3. BLOCKING gate: Y/N self-report

**This is the first thing the reviewer reads. A missing or "TBD" Y/N is grounds for the reviewer to send the PR back unread.**

Before you open the PR, fill in the following checklist and paste it at the **top** of the PR description, above the "What landed" summary. Every line gets `Y`, `N`, or `N/A` with one short sentence of evidence.

```
SELF-REPORT (CP-03)
[ ] Meter renders on all three mode pages: Y / N
[ ] Meter updates as picks are added or cleared: Y / N
[ ] CTA swap on isReady transition: Y / N
[ ] CTA hits 44px touch floor on mobile breakpoint: Y / N
[ ] aria-live polite on left column, aria-disabled on CTA: Y / N
[ ] Reduced motion: number snaps, no slide-in: Y / N
[ ] Existing duplicate submit buttons reconciled (hidden or removed): Y / N
[ ] No new CSS custom properties introduced: Y / N
[ ] No em dashes / en dashes anywhere in diff: Y / N
[ ] No conflict markers anywhere in diff: Y / N
[ ] tsc --noEmit clean: Y / N
[ ] pnpm lint: net delta vs main is 0 errors / 0 warnings: Y / N
[ ] pnpm test: green (give count): Y / N
[ ] pnpm test:visual: 5/5 new + baseline green (give count): Y / N
[ ] pnpm test:a11y: no NEW failures vs main: Y / N
[ ] pnpm build succeeds, prebuild clean, public/healthz reset: Y / N
[ ] Bundle delta gzipped: ___ bytes (target: under 2048): Y / N
[ ] Self-report verdict: Y, I would merge. / N, hold for review.
```

End with one explicit sentence: `Self-report: Y, I would merge.` or `Self-report: N, hold for review because <reason>.`

---

## 4. Verification probes you must run

### 4.1 Cascade probe (conditional)

Only required if you introduce or redefine any CSS custom property. You should not need to in this CP. If you do, follow the CP-02 probe pattern: mount the component in a Playwright page against the `simulator` canvas, read the resolved `getComputedStyle().backgroundColor` (or `color`) for each token-driven surface, and assert the resolved value matches `color-mix(...)` arithmetic against `--bg-panel-elev`. If you do not introduce new tokens, write `N/A, no new tokens` in the PR.

### 4.2 Reduced motion probe

In one of the Playwright assertions, emulate `prefers-reduced-motion: reduce` (Playwright supports this natively with `page.emulateMedia({ reducedMotion: 'reduce' })`). Confirm the rolling number does not animate (the displayed text equals `target` immediately, no intermediate frame). One line in the test is fine.

### 4.3 Bundle delta

Before commit, run `pnpm build` on `main` and on your branch, record the gzipped delta of the simulator route chunk. The CP-00 convention (Turbopack chunk-hashing noise of ±60KB) still applies; under 2KB gzipped is the gate. Report the number in the self-report.

---

## 5. PR protocol

- Title: `CP-03: Sticky progress meter across all three modes`
- Body sections in this order:
  1. SELF-REPORT (from §3, at the top)
  2. What landed (files changed, lines added / removed, scope summary)
  3. Gates passed (mirror the self-report checklist with the actual command output for each)
  4. Out-of-scope deviations (anything you had to do that the prompt did not authorise, including any judgement calls like which duplicate submit button was hidden, how `padding-bottom` was reserved, etc.)
  5. Open questions (anything you want the reviewer to weigh in on)
  6. Screenshots of the meter in both `[ STEP n OF N : MODE_LABEL ]` and `[ READY : ARM ALERT ]` states, plus a mobile-viewport screenshot

- Stop after opening the PR. Do not start CP-04 work. Wait for the human reviewer.

---

## 6. Operational notes carried forward

- **Worktree / preview mismatch (from CP-00).** If you stash unstaged work to rebase, run `git status` immediately after `git stash pop`. Unstaged conflict markers escape the pre-push hook.
- **Vitest glob (from CP-00).** Default `*.test.ts` only. Do not edit `vitest.config.ts` to widen the include glob. Visual tests are `.spec.ts` under `tests/visual/`.
- **Lint baseline (from CP-02).** The repo has 8 lint errors / 8 lint warnings on `main` today. You need 0 net delta. Net negative (you fix some) is welcome but not required.
- **`public/healthz` (from CP-02).** The `prebuild` step regenerates it. If your build run leaves it touched in the diff, reset it before staging.
- **A11y suite (from CP-02).** 5 tests fail on `main` today. Confirm your changes do not introduce a 6th. If your assertions land in a previously-failing test, document that the failure is pre-existing.

---

## 7. What this CP intentionally does not do

- It does not add new tokens. Tier styling stays as CP-00/02 left it.
- It does not change submit semantics. Whatever the mode does now when its existing submit fires, the meter's CTA does the same thing. No new POST routes, no new client state, no new toasts beyond what `onSubmit` already triggers.
- It does not change pick-card UX inside any of the three modes.
- It does not touch `/scenario/champions-path`'s pick chain logic or `/scenario/full-bracket`'s group-stage state. Only mounts the meter and wires the prop contract.
- It does not change the LiveAgreementGauge layout (CP-02).

If you find yourself touching anything in that list, stop and flag it.
