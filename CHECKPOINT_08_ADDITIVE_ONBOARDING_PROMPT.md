# Checkpoint cp-08 — Onboarding Surface A (additive, v2 design)

Before reading this prompt, read these files in this order:

1. `ONBOARDING_DESIGN_BRIEF_V2.md` at the repo root. This is the corrected brief that the design package was built from. Read it end to end. Particularly read the "Hard constraints" and "Things you must NOT design" sections, because the corresponding "Things you must NOT IMPLEMENT" list in this prompt is a direct continuation.
2. `CHECKPOINT_08_REVERT_PROMPT.md` for context on what was reverted and why. The TL;DR is in the "Goal" section below; the file has the longer story.
3. `docs/audit/prelaunch-audit-2026-05-28.md` for the audit confirming the live site's foundation is healthy.

Also confirm the prior shipped checkpoints are merged on main: cp-04, cp-05, cp-05a, cp-06, cp-07. The dead cp-08 implementation has been reverted (branch deleted; never pushed, never deployed).

## Goal

Implement Surface A from the v2 design package as a purely additive overlay on the existing homepage. The chip, the modal, and the masthead "First time?" pill render on top of (or alongside) the current homepage; they do not replace, restyle, or restructure any existing element.

**The dead cp-08 attempt did the opposite — it replaced the homepage hero with a custom three-block layout and shipped mocked data.** That implementation has been reverted. This implementation is fundamentally different in shape. If at any point during inspection or implementation you find yourself about to modify `(editorial)/page.tsx`'s existing hero block, the leaderboard, the bracket preview, the divergences, or the trophy graphic, stop. The prompt has been wrong; report it.

Surface B (the simulator overlay with the Beat 3 animation) is explicitly out of scope. It ships as cp-09 after Surface A.

## Why this matters

The v1 implementation shipped fake data on the landing page (Argentina at 21% when the real model says Spain at 18.2%), hid the Monte Carlo trophy graphic on first visit, and replaced the dashboard with a wizard-y three-block layout. All three were credibility failures for a research publication. The v2 design corrects all three by treating onboarding as additive overlay rather than hero replacement. This implementation has to preserve that correction; the brief and the design are clean, the only remaining risk is the engineer drifting back into "replace the page" thinking during port.

## Branch

`cp-08-onboarding-additive`

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes the cp-07 merge and that no cp-08 artifacts are in main (`ls website/src/components/onboarding/` should fail). Branch off main.

## Stage 1 — Locate the design package, move it into the repo, and inspect

The design agent published `Onboarding Flow v2` and Nicolás placed it on the Desktop. The package contains the live HTML mockup, five `.jsx` mockup files, a CSS reference, the agent's documentation, a `screenshots/` folder with 25 PNGs, and an `assets/trophy_point_cloud.svg`.

### Step 1: Locate the package.

```bash
ls -la ~/Desktop/ | grep -i "onboarding"
ls -la "/Users/nicolasduarte/Desktop/Onboarding Flow v2/" 2>/dev/null
```

If the package is somewhere else, ask Nicolás for the path. Do not improvise.

### Step 2: Move into the repo.

```bash
mkdir -p website/design-output/onboarding-v2
cp -R "/Users/nicolasduarte/Desktop/Onboarding Flow v2/." website/design-output/onboarding-v2/
ls -la website/design-output/onboarding-v2/
```

Confirm the directory contains: `Onboarding v2.html`, `SurfaceA.jsx`, `SurfaceB.jsx`, `HomePage.jsx`, `data.jsx`, `tweaks-panel.jsx`, `colors_and_type.css`, `Design Package.md`, `assets/`, `screenshots/`. The `.thumbnail` file (macOS Finder artifact) can come along; it's harmless.

### Step 3: Inspect each file end to end.

Read every file in the package. Write your inspection notes to `docs/onboarding/cp-08-additive-inspection-notes.md` (create the directory). For each file, capture in the notes:

- **`Onboarding v2.html`**: what does it render? Open it via `pnpm dlx serve website/design-output/onboarding-v2/` and observe the live HTML in a browser. Note specifically: the chip's entry animation, the modal contents, the masthead pill pulse behavior, the trophy graphic settle animation. Confirm all three animations work end to end.
- **`SurfaceA.jsx`**: this is the PRIMARY SPEC. What does it render? What props does it accept? What's the JSX structure? How does it manage state (chip-open, modal-open, dismissal)? How does it write to `localStorage`?
- **`SurfaceB.jsx`**: reference for cp-09. Skim it; don't deep-read. Note its structure for cp-09's benefit.
- **`HomePage.jsx`**: REFERENCE ONLY. This is the design agent's representation of the existing homepage so the chip and modal have something to render over. Note what it shows; understand it as a placeholder; do NOT plan to port any of it.
- **`data.jsx`**: REFERENCE ONLY. This is the design agent's hardcoded data source for the live mockup. The real implementation reads from `website/public/data/latest/` via the existing accessors (`resolveSnapshotPickerState`, `loadSnapshot`, etc.). Note what data shape the design uses; do NOT plan to port this file.
- **`tweaks-panel.jsx`**: REFERENCE ONLY. Reviewer tool for the mockup. Do not port.
- **`colors_and_type.css`**: token reference. Map every token used by `SurfaceA.jsx` against `website/src/app/globals.css`. If the design's tokens duplicate existing globals tokens, use the existing names. If any are genuinely new (the dead cp-08 found only `--shadow-card` was new; this version probably has the same plus maybe one or two for animations), list them.
- **`assets/trophy_point_cloud.svg`**: inspect this. The site already has a Monte Carlo trophy graphic rendered via `HeroGraphic.tsx`. This SVG is likely a different rendering of the same concept (or possibly the source asset the existing HeroGraphic was built from). Determine whether the design's trophy-settle animation needs this asset, or whether it works against the existing `HeroGraphic` component. The answer determines whether the SVG ships into production or stays as design-output-only reference.
- **`Design Package.md`**: the design agent's own documentation. Read it carefully. It should document the three animations (chip slide, pill pulse, trophy settle) with timing and easing specs. Capture those specs verbatim in your inspection notes for use during Stage 2.

### Step 4: Stop and report.

Write a section in the inspection notes titled "Implementation plan for Nicolás review" that proposes:

- **What to port from the design (positive list).** Probably: `SurfaceA.jsx` logic (chip, modal, masthead pill), the three animation specs from `Design Package.md`, and any token additions to `globals.css`.
- **What to leave as reference only (negative list).** Confirm explicitly: `HomePage.jsx`, `data.jsx`, `tweaks-panel.jsx`. State your understanding of why each one is not implementable.
- **Trophy graphic decision.** Whether the trophy-settle animation reuses the existing `HeroGraphic` component (preferred; preserves the existing rendering) or needs the design's `trophy_point_cloud.svg` as a new asset. Defend your choice.
- **Token integration.** List which `colors_and_type.css` tokens are reused (already in `globals.css`) and which are net-new (need adding). Same approach as the dead cp-08, which found `--shadow-card` was the only new one; v2 may have one or two more for animation states.
- **Mounting strategy.** Where in the existing app does `SurfaceA` mount? Three reasonable options to evaluate:
  1. Mount in `layout.tsx` so it appears across all editorial routes. Probably overkill for first-visit-only chrome.
  2. Mount in `(editorial)/page.tsx` (the homepage only). Cleanest for the chip + modal; the masthead pill needs to live elsewhere.
  3. Two mount points: the chip + modal in `(editorial)/page.tsx`, the masthead pill in `EditorialMasthead.tsx`.

  Option 3 is probably correct because the masthead pill should appear on every page (so a visitor on `/bracket` can still re-open the onboarding modal), but the chip should only fire on the homepage. State your reasoning.
- **localStorage keys.** Confirm the v2 brief's `45a.onboarding.seen` key as the persistence mechanism. Note any other keys the design uses (probably `45a.onboarding.tour` for Surface B's completion, which we don't touch in cp-08 but should know about).
- **Files you'll create and existing files you'll edit.** Conservative scope: a small `components/onboarding/` directory, a single small edit to `(editorial)/page.tsx` to mount the chip/modal, and a small edit to `EditorialMasthead.tsx` to add the pill (this is the one existing-file edit that's necessary; v2 brief explicitly allows it because the masthead pill is part of the design).

**Stop after writing the inspection notes. Do not start Stage 2 implementation until Nicolás reviews and confirms the plan.** The cp-07 audit, the cp-08 revert, and the v2 brief have all gotten us to a clean foundation; the inspection step protects against the same kind of drift that killed v1 cp-08.

## Stage 2 — Implementation (after Nicolás confirms the plan)

After Nicolás reviews your inspection notes and gives you the green light, implement Surface A per your plan. Generic guidance below.

### Scope expectations

- **One new directory**: `website/src/components/onboarding/`
- **Probably 4 to 6 new files** in that directory: `OnboardingChip.tsx`, `OnboardingModal.tsx`, `MastheadOnboardingPill.tsx`, possibly one or two shared primitives or hooks (`useOnboardingState.ts` for the `localStorage` logic).
- **Edits to two existing files**: `(editorial)/page.tsx` (mount the chip and modal) and `EditorialMasthead.tsx` (add the pill). Both edits should be minimal additions, NOT modifications of existing structure.
- **Possibly one edit to `globals.css`** to add the genuinely new tokens (likely 1 to 3 tokens).
- **Possibly one edit to `layout.tsx`** if the `localStorage` initialization needs a pre-hydrate script (the dead cp-08 used `beforeInteractive` for the audience-mode default; v2 may or may not need similar). If it does, mirror the existing `DESKTOP_BANNER_PRE_HYDRATE` pattern.

Total diff target: 250 to 450 lines added. Substantially smaller than the dead cp-08 (which was 365 lines added and structurally wrong) because we're adding overlay components rather than restructuring the homepage.

### Hard implementation constraints

1. **Do not modify the existing hero block in `(editorial)/page.tsx`**. The `HeroGraphic`, the headline, the OSF preregistration line, the daily-brief CTA — these all render exactly as they do today. Your mount points for the chip and modal are sibling elements OR portals; they are not edits to the hero.
2. **Do not delete or restyle any existing component**. The leaderboard, bracket preview, divergences, everything below the hero — untouched.
3. **Do not render mocked data anywhere**. Every probability, every team name, every flag in the modal must come from the existing data accessors. If the modal needs Spain at 18.2%, it pulls from the rendered leaderboard data, not from a hardcoded string. The design agent's note that "every figure traces to `data.jsx`" is the right discipline; in the real implementation, every figure traces to the existing accessors.
4. **Do not import `data.jsx`, `HomePage.jsx`, or `tweaks-panel.jsx` from the design package**. These files are reference-only. The implementation reads from `website/src/lib/data/` accessors.
5. **Do not import `colors_and_type.css` as a production stylesheet**. Token integration is by name mapping into `globals.css`, not by import.
6. **Do not add a `/welcome` or `/onboarding` route**. Surface A is overlay-only.

### Token integration rules

Same approach as the dead cp-08 (which got this right): reuse `globals.css` tokens where the design's tokens map onto existing ones; add genuinely new tokens to `globals.css` with names consistent with the existing convention. Don't import `colors_and_type.css`. Document which tokens you added and why in the PR description.

### Animation specs

The Design Package documents three animations: chip slide-in, masthead pill pulse, trophy settle. Implement them with these constraints:

- All easings are `cubic-bezier(0.4, 0, 0.2, 1)` or simpler (linear, ease-out). No spring, no bounce.
- Each animation's total duration is under 1.5 seconds.
- Each animation has a `prefers-reduced-motion: reduce` path that renders the same final state with no transition.
- The trophy settle animation is a one-shot per page load. It does not loop. It does not retrigger on scroll or interaction.
- The masthead pill pulse loops gently but stops once the visitor dismisses (clicks the pill, or sets `45a.onboarding.seen`).
- The chip slide-in is one-shot on first visit; the chip slides out on dismissal.

Use the exact timing and easing values from `Design Package.md` if it specifies them; if it doesn't, use 300ms for the chip slide, 1500ms for the pill pulse cycle, and the design's spec for the trophy settle. Document the choices in the PR description.

### Real data integration

The modal's prose references the current snapshot's leader (Spain at 18.2%) and other probabilities. Wire these from the same accessors that the homepage leaderboard uses, not from a constant. If the snapshot leader changes (e.g. Spain falls behind France), the modal copy adapts automatically. This is the single most important data-integrity property of cp-08; the dead cp-08 broke this and that's what made it ship-killing.

Specifically:

- Read `resolveSnapshotPickerState(undefined)` → `current` for the current snapshot.
- Read `loadSnapshot(undefined)` → `tournament` for the per-team probabilities.
- Identify the top team and use it in the modal's copy. Use the team's `display_name` (Spain, France, etc.) and `p_champion` (18.2%, 14.9%, etc.).
- The modal copy template might be: "Right now, our model says [TEAM_NAME] is the most likely champion at [P_CHAMPION]%, but only modestly so. Twelve other teams are within a 5-point band. This is the kind of pricing the project exists to publish."
- Render the modal as a server component if possible (the homepage is `force-static`, so this data is available at build time). Open/close state is client-side via the `useOnboardingState` hook.

### State management

- `localStorage.45a.onboarding.seen = "true"` is set when the visitor: dismisses the chip, closes the modal (via X or Esc or click-outside), clicks the modal's primary CTA, OR clicks the masthead pill once.
- Once set, the chip never re-appears, the pill stops pulsing.
- The masthead pill itself remains visible always (per the v2 brief, "available for the visitor who wants to revisit the explainer"). It just stops drawing attention.
- The `45a.onboarding.tour` key (for Surface B's completion) is NOT touched in cp-08. It belongs to cp-09. Do not initialize, read, or write it from cp-08 code.

### Conventions

- No em dashes or en dashes in any code or copy. Use periods, semicolons, colons, parentheses.
- Match the existing codebase's import conventions (`@/` aliases, named exports).
- Tests live in `tests/**/*.test.ts`. If you write tests for the new components, follow that convention.
- ESLint ignore for `website/design-output/**` already exists (added by the dead cp-08 work and useful here too); confirm it's present and add it back if it isn't.

### What NOT to touch

- The simulator routes (`/scenario/*`). Surface B is cp-09.
- The kill-criteria pill or any cp-04-shipped logic.
- The `loading.tsx` files or the Recharts lazy wrapper from cp-06.
- The `StickyProgressMeter` or the simulator footer (cp-07's work).
- The data pipeline, the simulation engine, the OSF artifacts, the vault content.
- Any vault page, brief page, or methodology page.
- The data files at `website/public/data/`.

### Out of scope (do not implement)

- The audience-mode toggle in the site header for switching modes. The v2 brief explicitly decoupled this from onboarding; if it ships at all, it's a separate checkpoint.
- A separate `/onboarding` route.
- The Surface B simulator overlay (cp-09).
- Audience-mode-aware rendering on `/bracket`, `/ledger`, etc.
- Email capture in Surface A or the modal. The v2 brief routes email capture through Surface B's post-Beat-3 prompt and the existing daily-brief CTAs only.

## Verification

Before marking ready:

- [ ] Inspection notes exist at `docs/onboarding/cp-08-additive-inspection-notes.md` and Nicolás has confirmed the plan.
- [ ] Open `pnpm dev` and visit `/` in an incognito window with empty localStorage. Confirm: (a) the existing trophy graphic, headline, leaderboard, and divergences all render exactly as they did before, (b) the onboarding chip slides in after a brief delay in the bottom-right (or wherever the design placed it), (c) the masthead pill pulses gently, (d) the trophy settle animation fires once.
- [ ] Click the chip. Modal opens. Read the prose. Confirm it references real data (specifically, the modal mentions Spain at 18.2% or whatever the current snapshot says, not a hardcoded value).
- [ ] Close the modal via X. Reload the page. Confirm: chip no longer appears, pill no longer pulses, but the masthead pill is still clickable.
- [ ] Click the masthead pill. Modal re-opens. Close it. State persists.
- [ ] Clear localStorage. Reload. Confirm the first-visit experience replays.
- [ ] Mobile viewports (768 and 375): test in Chrome dev tools. The chip stays in a reachable corner; the modal scales to fit; the masthead pill collapses or hides if there's no room for it.
- [ ] Reduced motion: set `prefers-reduced-motion: reduce` in dev tools. Confirm the three animations render their final states with no transition (chip in place, pill static, trophy static).
- [ ] cp-04 preservation: `/ledger` still reads `AWAITING TOURNAMENT KICKOFF`.
- [ ] cp-06 preservation: navigation between routes still shows `loading.tsx` skeletons.
- [ ] cp-07 preservation: `/scenario/final-four` still has `[ See how the model reacts ]` sticky meter, no footer overlap.
- [ ] Production build: `pnpm build` clean. Static prerender of `/` still works (`┌ ○ /` in build output).
- [ ] Tests and lint: `pnpm test` passes; `pnpm lint` clean on touched files; `pnpm tsc --noEmit` clean.
- [ ] Diff stat is bounded: probably 4 to 6 new files + 2 edited existing files, on the order of 250 to 450 lines added.

## Merge-readiness checklist

Answer each with `Y` or `N`. No pushing without all `Y`s (or `N*` with substantive rationale).

```
Y/N — Design package is in the repo at website/design-output/onboarding-v2/.
Y/N — Inspection notes complete; Nicolás confirmed the plan before Stage 2 began.
Y/N — Existing homepage hero, leaderboard, bracket preview, divergences block all render unchanged.
Y/N — Monte Carlo trophy graphic is visible on first visit (with the settle animation playing once).
Y/N — Token integration uses existing globals.css tokens; only genuinely new tokens added.
Y/N — colors_and_type.css is NOT imported in production; reference only.
Y/N — HomePage.jsx, data.jsx, tweaks-panel.jsx are NOT ported; reference only.
Y/N — Chip + modal + masthead pill render and behave per the design.
Y/N — Three animations implemented with the design's timing and easing; reduced-motion paths in place.
Y/N — Modal prose references REAL data from snapshot accessors, not hardcoded values.
Y/N — localStorage.45a.onboarding.seen is set on all dismissal paths; chip/pulse stop after dismissal.
Y/N — Masthead pill remains clickable always; modal re-openable from there.
Y/N — Mobile viewports (768, 375) verified.
Y/N — cp-04, cp-06, cp-07 fixes preserved.
Y/N — pnpm test / pnpm lint / pnpm tsc --noEmit clean.
Y/N — No em or en dashes anywhere.
Y/N — Out of scope items (Surface B, audience-mode, email captures, /bracket variants) all untouched.
Y/N — Static prerender of `/` preserved in production build (cp-06 not regressed).
Y/N — Branch is cp-08-onboarding-additive, off latest main, ready to PR.
```

If every item is `Y`, push and open the PR as draft with:

- A one-paragraph summary of what Surface A does and who sees it.
- The list of files added/edited.
- A description of the three animations and the timing/easing values used.
- A note explaining what was NOT ported from the design package (HomePage.jsx, data.jsx, tweaks-panel.jsx) and why.
- A "test this manually" section with the verification steps above.
- Before/after screenshots of the homepage (fresh visitor with chip/pill visible, returning visitor with original homepage and masthead pill still present).
- Link to the inspection notes at `docs/onboarding/cp-08-additive-inspection-notes.md`.
- Link to `website/design-output/onboarding-v2/Onboarding v2.html` for reviewers to compare against.
- A "cp-09 prep" line: any notes the agent encountered about Surface B that the cp-09 author should know.

If any item is `N`, explain the blocker and stop.

## Decision tree if things don't match

- **Inspection reveals the design package is incomplete or significantly different from what the v2 brief described.** Stop. Report. Do not improvise.
- **`colors_and_type.css` defines a token that conflicts with an existing brand color in `globals.css`.** Stop. Report the conflict with token names and values. Nicolás picks.
- **`SurfaceA.jsx` uses some interaction the v2 brief didn't specify (e.g. an unexpected swipe gesture, a sound, an animation longer than 1.5s).** Implement what the design shows; the design agent had latitude. Document any surprising additions in the PR description.
- **The trophy-settle animation requires a different rendering approach than the existing `HeroGraphic` component supports.** First, see if `HeroGraphic` can be extended additively (without changing its current rendering for static cases). If not, evaluate whether the design's `trophy_point_cloud.svg` can ship as a one-shot overlay layer on top of `HeroGraphic` (preserving the existing static rendering AND adding the settle animation as an additional element). Whatever you do, do NOT replace `HeroGraphic`. If neither approach works, stop and report.
- **The modal copy template needs a snapshot field that the accessors don't currently expose (e.g. "five teams within a 5-point band").** Check whether the accessor can be extended cheaply or whether the modal copy should be simplified to use only fields that exist. Lean toward simplifying the copy; the data-correctness property is more important than the copy's exact phrasing.
- **The mast head pill placement conflicts with an existing masthead element.** Report. The v2 brief permits a small edit to `EditorialMasthead.tsx`, but if the visual layout doesn't accommodate cleanly, surface options.

## A note on judgement

The dead cp-08 failed because the implementation faithfully followed a brief that asked for the wrong thing. The v2 brief and the v2 design package both correct that; the only remaining failure mode is the engineer drifting back into "let me port the design directly" thinking. Resist. The design package contains five `.jsx` files; only one of them (`SurfaceA.jsx`) is implementable production work. The other four are reference. If you find yourself porting from `HomePage.jsx`, you've drifted; back up.

The single most important property of this implementation is "the existing homepage is unchanged for everyone." Verify that property aggressively at every step. If clearing localStorage and reloading the homepage shows ANY difference between the no-onboarding state and the chip-dismissed state, the implementation has a bug. If clearing localStorage and reloading shows the existing trophy, leaderboard, etc. all rendered exactly as they were before cp-08 with just a chip floating in the corner, the implementation is doing exactly what it should.

After cp-08 ships, cp-09 (Surface B simulator overlay) is next. It reuses the `localStorage.45a.*` key namespace (`45a.onboarding.tour`) but does not depend on cp-08 code; the two checkpoints are independent in implementation, sequential in shipping order.
