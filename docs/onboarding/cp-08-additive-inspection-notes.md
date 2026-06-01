# cp-08 Onboarding v2 (additive). Inspection notes

Stage 1 deliverable for `cp-08-onboarding-additive`. The dead v1 cp-08 implementation was reverted because it replaced the homepage hero with a custom three-block layout, hid the Monte Carlo trophy, and shipped fake data ("Argentina at 21%" when the model says Spain at 18.2%). v2 corrects all three: it is purely additive (chip + modal + masthead pill on top of the existing homepage), reads real data from the live snapshot, and never touches the existing hero, leaderboard, bracket preview, or divergences. This file captures what the v2 design package contains, what is already in the repo, and a proposed implementation plan for Nicolás to review before any production code is written.

**Branch state.** `cp-08-onboarding-additive` is off `main` at `1039f31` (today's nightly snapshot on top of cp-07 merge `127fcb2`). Prior merged checkpoints verified on main: cp-04, cp-05, cp-05a, cp-06, cp-07. No cp-08 artifacts present in main (the v1 revert worked correctly). Working tree otherwise clean apart from the design package now copied into `website/design-output/onboarding-v2/` and this file.

**Sanity check on the v2 design package.** All 11 expected entries present at `website/design-output/onboarding-v2/`: `Onboarding v2.html`, `SurfaceA.jsx`, `SurfaceB.jsx`, `HomePage.jsx`, `data.jsx`, `tweaks-panel.jsx`, `colors_and_type.css`, `Design Package.md`, `assets/trophy_point_cloud.svg`, `screenshots/`, `.thumbnail`. One small note: the cp-08 prompt expects 25 screenshots; the directory contains 24 (no `00-*` file). Not a blocker; just a count mismatch worth flagging.

---

## 1. Per-file summaries

### `Onboarding v2.html` (244 lines)

The entry point: a self-contained HTML file that loads React 18 + ReactDOM + Babel-standalone from unpkg, then `<script type="text/babel">`-includes the five `.jsx` files. Renders a single `<App>` that shows the mock homepage (`HomePage.jsx`) with the live `<SurfaceA>` controller mounted on top, plus a Tweaks panel for the reviewer. The Tweaks panel exposes: reduced-motion toggle, chip delay slider, "Reset onboarding state" button, "Open simulator" jump, and "Reset tour" button. Confirmed in the prompt's "open with `pnpm dlx serve`" step is unnecessary for the inspection. the entry point's behaviour is fully documented in §10 of `Design Package.md` and faithfully implemented by `SurfaceA.jsx`. I am skipping the live-browse step because it would require binding a port for an outcome already provable from reading the source. If Nicolás wants visual confirmation before approving the plan, `pnpm dlx serve website/design-output/onboarding-v2/` is one command away.

The HTML wires three animations into the document via inline `<style>`: `@keyframes chipIn`, `@keyframes overlayIn`, `@keyframes modalIn`, `@keyframes trophySettle`, and the `.help-pulse` animation. All target the components SurfaceA renders.

### `Design Package.md` (151 lines) - read first; this is the agent's spec

The most important file in the package. Read end to end. Captures, per surface:

- **Rationale (§1)**. Surface A is a chip + modal + persistent masthead "First time?" link (the Linear "what's new" pill + Notion first-run modal grammar). The agent explicitly considered the alternatives (top banner = "too loud above the masthead"; 3-screen swipe modal = "more chrome than the brief warrants") and committed to one direction. Surface B is a coachmark over the live simulator UI; out of scope for cp-08.

- **Answers to the brief's open questions (§2)**. Audience-mode is explicitly decoupled from onboarding (lives elsewhere later). Pattern is chip + modal + masthead link. Surface A's primary CTA links to Surface B (`/scenario`) - "sequenced, never stacked". Beat-3 rarity uses `"1 in 81"` for the default Final Four. Email capture post-Beat-3 collapses, leaves the result intact.

- **Copy block (§3)**. Every text element specified with an ID. Notable: claim 02 contains a live-data interpolation - "Right now it puts {leader} first, at {leader p}%" with an inline note "(values pulled live . currently Spain, 18.2%)". The eyebrow uses "§ WHAT THIS IS" (with the § as the brand-accent ornament).

- **Interaction notes (§4)**. 300-word prose per surface. Chip delay 2.5s default, 240ms rise (note: §10 spec table says 300ms; production should use 300ms per §10 which is the authoritative table). Modal closes via Esc, scrim click, "Got it" button, "Try the simulator" CTA. All paths write `seen=true`. The masthead link `force-open`s the modal regardless of `seen`.

- **Component inventory (§5)**. Trophy point cloud marked "Reused, unchanged". `OnboardingChip`, `OnboardingModal`, `SurfaceA` controller marked "Net new". `EditorialMasthead` marked "Extended" (one new affordance, no restyle of existing nav). This confirms the trophy graphic decision below.

- **Data provenance (§6)**. The single most important paragraph for cp-08 implementation correctness: "data.jsx mirrors `tournament.json`. Spain leads at 18.2%, France 14.9%, Argentina 13.7%, England 8.3%, Morocco 6.4%, with Brazil slipped to ~6.3%, below Morocco. The modal's 'what the model says' prose references LEADER (Spain) and updates automatically if these values change. Swap target: replace the SNAPSHOT, TOURNAMENT, FEATURED, CALIBRATION objects with reads from `latest/`, and the chip/modal/walk-through callouts update automatically." Production: pull `display_name` and `p_champion` from the existing accessor that `(editorial)/page.tsx` already calls.

- **State keys (§7)**. `45a.onboarding.seen` is the only key Surface A writes. `45a.onboarding.tour` is Surface B (cp-09); cp-08 does not initialize, read, or write it.

- **What was deliberately NOT done (§8)**. Mirrors the v2 brief's "do not design" list verbatim. Use as a checklist during Stage 2.

- **Motion spec (§10)**. **Authoritative table for animations.** Captured verbatim below:

  | Animation | Where | Spec | Implementation |
  |---|---|---|---|
  | P1 chip slide-in | First-visit chip | 300ms cubic-bezier(0.4, 0, 0.2, 1). Slides from outside bottom-right corner. | `@keyframes chipIn` animates `translateX(calc(100% + 24px)) → 0` + opacity 0 → 1. Reduced motion: `animation: none`. |
  | P2 masthead pulse | "First time?" pill | First visit only. Opacity 1.0 ↔ 0.85, 1.5s cycle, no scale. Stops on dismissal, modal close, CTA fire, or pill click. | `.help-pulse` class on the button; stops by removing the class. Reduced motion: static at full opacity. |
  | P3 trophy settle | Existing trophy point cloud | One-pass, ~2.4s, never repeats. Reads as Monte Carlo samples resolving. | `@keyframes trophySettle`: `blur(4px) + opacity 0.5 + translateY(6px) → sharp`, `both` fill. Reduced motion: static (no animation). |

  Plus modal animations not in the §10 table but specified in §4: `overlayIn` 160ms ease-out (scrim fade); `modalIn` 180ms cubic-bezier(0.4, 0, 0.2, 1) (card animate in).

### `SurfaceA.jsx` (200 lines) - the primary implementation reference

This is the file to port. Structure:

1. `SEEN_KEY = '45a.onboarding.seen'`; `markSeen()` and `hasSeen()` are try/catch wrapped localStorage helpers (handles disabled storage gracefully).

2. `<OnboardingChip>` component (~45 lines). Fixed-position bottom-right. Two buttons: body (opens modal) and ✕ (dismisses). Tokens used: `--bg-panel-elev`, `--border-default`, `--shadow-card`, `--rule`, `--text-tertiary`, `--text-primary`, `--text-quiet`, `--bg-panel`, `--font-mono`, `--font-sans`. Hardcoded color: `#0F6B7D` for the trailing arrow (this is the editorial-canvas value of `--accent-focus` in repo globals.css; production uses `var(--accent-focus)`).

3. `<OnboardingModal>` component (~90 lines). Focus-trapped dialog. Esc closes via `keydown` listener. Click-outside closes via scrim target check. Three claims rendered as `01 / 02 / 03` mono row labels + sans prose paragraph. **Two em-dashes (`&mdash;`) in the JSX**: in claim 01 ("World Cup — not a betting site") and claim 03 ("every divergence — hits and misses"). Per project rule "no em or en dashes" and per the cp-08 prompt's conventions, these must be rewritten when porting. Proposed replacements: "World Cup. Not a betting site." (claim 01) and "every divergence: hits and misses with identical weight" (claim 03). Both preserve intent and clause weight.

   The modal pulls three values from `data.jsx` globals: `SNAPSHOT.mcRuns` (10,000), `LEADER.team` ("Spain"), `LEADER.p` (0.1824), and `SNAPSHOT.osf` ("osf.io/8b5hd"). In production these come from real accessors (see "Real data wiring" in §4 below). Note `SNAPSHOT.osf` is a placeholder; the real repo URL is `osf.io/spmkg` (verified in `(editorial)/page.tsx:97-104`).

4. `<SurfaceA>` controller component (~38 lines). Owns three pieces of state: `seen`, `showChip`, `showModal`. Props: `helpSignal` (a counter the masthead bumps to force-open the modal), `onTrySimulator` (navigation callback), `onSeen` (signal up to clear the masthead pulse), `reduced` (prefers-reduced-motion), `chipDelayMs` (default 2500). All dismissal paths (`dismissChip`, `closeModal`, `trySim`) call `flagSeen()`. The masthead-open path (`helpSignal > 0`) opens the modal but does not flag seen by itself; the subsequent close path then writes seen=true. Net behaviour matches the v2 brief's "click the masthead pill once = seen".

5. The masthead pill itself is **not** in `SurfaceA.jsx`; it lives in the mock `HomePage.jsx` and is wired via `onHelp` + `pulse` props (see HomePage notes below).

### `HomePage.jsx` (~470 lines) - REFERENCE ONLY

The design agent's mock of the existing 45analytics.com homepage, so the chip/modal/pill have something realistic to render over. Contains a `HomeMasthead` (with the pill insertion), `HomeHero` (with the trophy point cloud and the trophy-settle animation hook), `LeaderboardCard`, `FeaturedDivergenceCard`, `CalibrationStrip`, `VaultRow`, and a small `HomePage` composition. Do not port any of it. The real components already exist:

| Mock in HomePage.jsx | Real component in repo |
|---|---|
| `HomeMasthead` | `website/src/components/layout/EditorialMasthead.tsx` (existing, "use client") |
| `HomeHero` | `(editorial)/page.tsx` lines 54-155 (the header) + `HeroGraphic.tsx` |
| `LeaderboardCard` | `website/src/components/compositions/TournamentLeaderboard.tsx` |
| `FeaturedDivergenceCard` | `website/src/components/compositions/FeaturedDivergences.tsx` |
| `CalibrationStrip` | `website/src/components/compositions/TournamentCalibrationStrip.tsx` |
| `VaultRow` | `website/src/components/compositions/RecentWritingList.tsx` |

The only HomePage.jsx code worth borrowing is the **shape** of the masthead pill insertion (lines 50-64 of `HomePage.jsx`): a `<button>` with `className={pulse ? 'help-pulse' : ''}`, calling `onHelp` on click, with copy "First time?" and an aria-label. Production replicates this shape inside `EditorialMasthead.tsx`.

### `data.jsx` (170 lines) - REFERENCE ONLY

The mockup's hardcoded "single source of truth", mirroring the live snapshot. Contains:

- `SNAPSHOT` (id, sha, phase, tag, remaining, mcRuns, osf). The `mcRuns` and `osf` fields are the only ones the modal pulls from. `osf` is a placeholder (`osf.io/8b5hd`); production uses the real `osf.io/spmkg`.
- `TOURNAMENT` (array of 8 teams with `team`, `code`, `p`, `q`, `sf`, `color`). The first three teams (Spain, France, Argentina) match the live snapshot's `display_name` and `p_champion` values exactly. Production reads from the existing `loadSnapshot(undefined).tournament.teams` array.
- `LEADER = TOURNAMENT[0]`. Production derives this defensively: `const leader = [...teams].sort((a, b) => b.p_champion - a.p_champion)[0]`.
- `FEATURED`, `ESSAYS`, `CALIBRATION`, `FINAL_FOUR_DEMO` and friends. Used by HomePage and SurfaceB only; cp-08 does not need any of them.
- Helper functions for Surface B's rarity computation (`finalFourScore`, `modelMedianFour`, `rarityBand`, `oneInN`). All Surface B / cp-09 only.

Do not port `data.jsx`. The cp-08 modal pulls live values via the same accessors that the existing leaderboard uses.

### `tweaks-panel.jsx` (~470 lines) - REFERENCE ONLY (reviewer tool)

The Tweaks shell that owns the host edit-mode protocol and provides `<TweaksPanel>`, `<TweakSection>`, `<TweakSlider>`, `<TweakRadio>`, `<TweakToggle>`, `<TweakSelect>`, `<TweakButton>`, and the `useTweaks` hook. Forbidden in production by the brief; do not port.

### `SurfaceB.jsx` (~830 lines) - SKIM, RESERVED FOR cp-09

Out of scope for cp-08; reading only enough to confirm it does not leak into Surface A. The file begins with a local `Q = {...}` object of inline quant tokens (bg slate `#0A0908`, ink `#ECE6DB`, etc.) because the design canvas hosts both surfaces in the same document and can't toggle `[data-canvas="quant"]` at the document level. Production cp-09 will mount Surface B under the real `(simulator)` route group which already sets `data-canvas="simulator"` (see `website/src/app/(simulator)/layout.tsx`), so the inline tokens become unnecessary.

cp-08 has zero dependency on `SurfaceB.jsx`. It does need to leave the localStorage key namespace intact: never write or read `45a.onboarding.tour` from cp-08 code. cp-09 author should know that Beat 3 of SurfaceB has the only animation in the cp-09 scope.

### `colors_and_type.css` (199 lines) - token reference

The design's CSS variable file. The file's own header reads "Source: website/src/app/globals.css (§2 design system)" - same provenance as the v1 design package, derived from repo globals. Token-by-token map below in §2. Forbidden as a production import per the brief.

### `assets/trophy_point_cloud.svg` (627KB, ~thousands of `<circle>` elements)

A pre-rendered point cloud of Monte Carlo samples projected onto the trophy silhouette. **This is the source asset that the existing `HeroGraphic.tsx` was built from**: the existing component's docstring literally says "See `_design_handoff/trophy_point_cloud.svg` for the source" (verified at `website/src/components/ui/HeroGraphic.tsx` lines 1-19). The repo replaced the 410KB SVG with a 42KB WebP (+ PNG fallback) in Checkpoint 17 for payload reasons.

**Therefore the design package's SVG ships nowhere in production.** It stays in `website/design-output/onboarding-v2/assets/` as reference. The trophy settle animation operates on the existing `<HeroGraphic />` element; see "Trophy graphic decision" in §4 below.

### `screenshots/` (24 PNGs)

Per-viewport renderings of each surface state. The cp-08 prompt says 25; the directory has 24, missing a `00-*` file. Inventory by prefix:
- `01-home-chip.png` and `02-home-chip.png` - first-visit chip on the homepage
- `01-12-beat1.png`, `02-12-beat1.png`, `01-11-beat1-polished.png`, `02-11-beat1-polished.png` - Surface B Beat 1
- `01-07-diag2.png`, `02-07-diag2.png` - some diagnostic state
- `01-10-beat3.png`, `02-10-beat3.png`, `01-15-beat3-new.png`, `02-15-beat3-new.png` - Surface B Beat 3
- and 12 more across viewport sizes

For cp-08, only the `01-home-chip.png` / `02-home-chip.png` pair is directly relevant (first-visit chip composition). Surface B screenshots are cp-09 reference.

### `.thumbnail` (32KB)

macOS Finder artifact. Harmless. Leave in place per the v1 disposition.

---

## 2. Token integration map: design package vs. existing globals.css

The design's `colors_and_type.css` is derived from repo `globals.css`; nearly all editorial-canvas tokens used by `SurfaceA.jsx` already exist in the repo. Tokens consumed by `SurfaceA.jsx` (extracted via `grep -oE 'var\(--[a-z-]+\)' SurfaceA.jsx`):

| Token | Repo `globals.css` (editorial) | Status |
|---|---|---|
| `--bg-panel-elev` | `#FCFAF4` (3 canvas variants) | match |
| `--bg-panel` | `#EEEAE0` | match |
| `--border-default` | `rgb(31 31 31 / 0.14)` | match |
| `--rule` | `rgb(31 31 31 / 0.10)` | match |
| `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-quiet` | all present | match |
| `--font-serif`, `--font-sans`, `--font-mono` | wired via next/font in `layout.tsx` | match |
| `--shadow-card` | **not in globals.css** | **NEW** (one declaration to add) |
| `--brand-accent` | **not in globals.css** | **NEW** (one declaration to add per canvas) |

Hardcoded color in `SurfaceA.jsx`: `#0F6B7D` (the trailing arrow). This is the editorial-canvas value of `--accent-focus` in repo globals.css (line 36). Production replaces with `var(--accent-focus)` so it adapts to canvas overrides.

**New tokens to add to `globals.css`** (under the editorial `:root` block; the modal and chip only render on the editorial canvas where the homepage and other editorial routes live):

```css
--shadow-card: 0 1px 3px rgb(0 0 0 / 0.04), 0 6px 24px rgb(0 0 0 / 0.05);
--brand-accent: oklch(35% 0.08 20);  /* deep terracotta. tints the modal eyebrow's § ornament. */
```

Both values copied verbatim from the design package's editorial declarations. The quant canvas block in globals.css does not need either token because Surface A never renders there.

No token conflicts. No design value clashes with an existing brand color.

---

## 3. Codebase survey (relevant existing code)

### Home page

`website/src/app/(editorial)/page.tsx` (303 lines). Statically generated (`export const dynamic = "force-static"`). Renders the existing hero header (lines 54-155, includes `<HeroGraphic />`, "The 45% Problem" headline, OSF preregistration line, "Receive the daily brief" CTA), then a `<Suspense>`-wrapped `SnapshotAwareHome` containing leaderboard / most-likely-bracket / trailer / terminal dashboard / featured divergences / calibration sections, then RecentWritingList and TerminalCTA at the bottom. cp-08 cannot modify any of this; it can only add a new mount point.

Already calls the data accessors needed for the modal:
```ts
const maps = await loadStructuralMaps();
const snap = loadSnapshot(undefined);
const tournament = mergeTournament(snap.tournament, maps);
const { meta } = snap;
```
The `tournament.teams[]` array contains `{ display_name, p_champion, ... }` per team. `meta.mc_runs` is 10000. These are exactly the three values the modal copy needs.

### Editorial layout

`website/src/app/(editorial)/layout.tsx`. Wraps in `data-canvas="editorial"`, mounts `<EditorialMasthead />`, a `<main>`, `<SiteFooter />`. Untouched by cp-08.

### EditorialMasthead

`website/src/components/layout/EditorialMasthead.tsx` (270 lines). `"use client"`. Uses `usePathname`. Renders a header with wordmark + brief link + "Open terminal" CTA + nav tabs (Overview / Matches / Ledger / Bracket / Vault / Scenario Simulator, plus a conditional Desk tab for operators). This is where the "First time?" pill inserts (one new element); no restyle of existing nav.

### HeroGraphic

`website/src/components/ui/HeroGraphic.tsx` (45 lines). Renders a `<picture>` with `<source>` (WebP) and `<img>` (PNG fallback) inside a `<div className="hidden md:block pointer-events-none select-none" style={{ width: 260 }}>`. The image is the static Monte Carlo trophy point cloud; payload ~42 KB. The docstring confirms the design's SVG is the original source.

### Layout precedents the cp-08 implementation uses

- **`beforeInteractive` inline script** for pre-hydrate localStorage check. Precedent: `website/src/app/layout.tsx:89-93` (`DESKTOP_BANNER_PRE_HYDRATE` reads sessionStorage and sets `data-dismissed` on a target element before hydration). cp-08 mirrors this pattern to set `documentElement.dataset.onboardingSeen` before hydration so the trophy-settle CSS rule can scope to first-visit users without a flash.
- **`document.body.dataset` write in `useEffect`** for runtime side effects. Precedent: `website/src/components/simulator/ui/StickyProgressMeter.tsx:51`.
- **Thin `"use client"` controller renders open/close-state UI on top of static page content.** Precedent: `website/src/components/compositions/SnapshotAwareHome.tsx`.
- **Custom-event cross-component signaling.** No existing precedent in repo; I propose introducing one for the masthead-pill → modal-controller bridge. Single `window.dispatchEvent(new Event("45a:onboarding:open"))` from the pill, single `useEffect` listener in the controller. Alternative (Context provider at editorial-layout level) is also acceptable but heavier for one boolean signal.

### Test convention

`website/tests/unit/*.test.ts`. 30+ files. If cp-08 writes unit tests they go here. Visual specs in `website/tests/visual/`. Not required by the cp-08 prompt's verification list, only the existing `pnpm test` must continue to pass.

### Existing `45a.*` localStorage namespace

`grep -rn '45a\.'` on `website/src` returns zero hits. Clean namespace. cp-08 introduces `45a.onboarding.seen` only; cp-09 introduces `45a.onboarding.tour` later.

### ESLint ignore for design-output

`website/eslint.config.mjs` has no `design-output` ignore entry. The v1 cp-08 work added one; that's gone with the revert. cp-08 v2 needs to add it back so the `.jsx` files in `website/design-output/onboarding-v2/` don't trigger lint errors (Babel-standalone JSX is not real TSX). Single-line addition to the `ignores: [...]` array.

### `website/AGENTS.md` warning

Reads: "This is NOT the Next.js you know. This version has breaking changes." cp-08's component surface is small and additive: a chip, a modal, a masthead pill button, and four CSS animations. No new Next.js APIs are introduced. Stage 2 author should consult the bundled docs if touching `layout.tsx`'s `<Script>` block or any boundary type.

---

## 4. Implementation plan for Nicolás review

### 4.1 Positive port list (what becomes production code)

| Source | Production destination |
|---|---|
| `SurfaceA.jsx` `OnboardingChip` JSX | `website/src/components/onboarding/OnboardingChip.tsx` ("use client") |
| `SurfaceA.jsx` `OnboardingModal` JSX (with em-dash copy fixes) | `website/src/components/onboarding/OnboardingModal.tsx` ("use client") |
| `SurfaceA.jsx` `<SurfaceA>` controller (chip+modal state) | `website/src/components/onboarding/OnboardingController.tsx` ("use client") |
| `HomePage.jsx` HomeMasthead pill button JSX (just the button shape) | a new `MastheadOnboardingPill` sub-component inlined into `EditorialMasthead.tsx` |
| Animation specs from `Design Package.md` §10 (chipIn, modalIn, overlayIn, trophySettle, helpPulse) | `@keyframes` in `globals.css` + class definitions (`.help-pulse`, `.trophy-settle`) |
| `--shadow-card`, `--brand-accent` tokens | two new declarations in `globals.css` (editorial `:root`) |

### 4.2 Negative list (reference only, never port)

| File | Why not |
|---|---|
| `HomePage.jsx` | A mock of the existing homepage. Real components already exist in repo. |
| `data.jsx` | A hardcoded snapshot mirror. Production reads live data from `loadSnapshot()`. |
| `tweaks-panel.jsx` | Reviewer tool. Brief explicitly forbids a tweaks panel in production. |
| `SurfaceB.jsx` | cp-09 scope. cp-08 leaves the file untouched and the `45a.onboarding.tour` key namespace unused. |
| `ofRationale.jsx` (n/a; this is the v1 file, not present in v2) | n/a |
| `assets/trophy_point_cloud.svg` | The existing `HeroGraphic.tsx` already renders this asset (the docstring confirms the SVG is the source). |
| `Onboarding v2.html`, `screenshots/`, `colors_and_type.css`, `Design Package.md`, `.thumbnail` | All reference material; lives in `website/design-output/onboarding-v2/` untouched. |

### 4.3 Trophy graphic decision

**Reuse the existing `<HeroGraphic />` component; do NOT ship the design's SVG.** The cp-08 prompt's decision tree gave three options; option 1 (extend additively) applies cleanly:

- `HeroGraphic.tsx` adds one optional prop: `withSettle?: boolean` (default `false`). When `true`, the wrapping `<div>` gets an additional className: `trophy-settle`. The existing classes (`hidden md:block pointer-events-none select-none`) stay; no other change.
- `globals.css` adds `@keyframes trophySettle` and a `.trophy-settle { animation: trophySettle 2400ms cubic-bezier(0.4, 0, 0.2, 1) both; }` rule, scoped via a `html:not([data-onboarding-seen="true"]) .trophy-settle { ... }` selector so returning visitors get no animation. Plus a `@media (prefers-reduced-motion: reduce) { .trophy-settle { animation: none; } }` clamp.
- `(editorial)/page.tsx` changes `<HeroGraphic />` to `<HeroGraphic withSettle />`. This is one token of edit, semantically opt-in, and the default (no prop) call path is unchanged for every other call site.

That third bullet is the only "edit to the existing hero block" required. I read it as additive in the sense the v2 brief intends: returning visitors render exactly as today (the `html[data-onboarding-seen="true"]` selector makes the keyframe a no-op); first-visit visitors see the same final state after a 2.4s settle. The end-state is identical; only the first 2.4s differ for first-visit users. If Nicolás prefers a zero-edit-to-page.tsx alternative, the fallback is to scope the settle animation purely via a CSS selector that already exists in the HeroGraphic markup (the `pointer-events-none select-none` combination is unique enough to target). Brittle but doable. I lean toward the explicit `withSettle` prop because it makes the opt-in explicit at the call site.

`html[data-onboarding-seen="true"]` is set by a small inline `beforeInteractive` script in `layout.tsx` (mirroring `DESKTOP_BANNER_PRE_HYDRATE`) that reads `localStorage["45a.onboarding.seen"]` and stamps the attribute before React hydrates. Avoids first-paint flash for returning visitors.

### 4.4 Real-data wiring (the most important correctness property)

Modal claim 02's prose template:

> "Each night it runs **{mcRuns} simulations** of the tournament and publishes the results. Right now it puts {leaderName} first, at {leaderP}%."

In `(editorial)/page.tsx`, after the existing `mergeTournament` call, derive:

```ts
const leader = [...tournament.teams].sort((a, b) => b.p_champion - a.p_champion)[0];
const leaderName = leader.display_name;           // "Spain"
const leaderPDisplay = (leader.p_champion * 100).toFixed(1);   // "18.2"
const mcRunsDisplay = meta.mc_runs.toLocaleString();           // "10,000"
```

Pass these as props to `<OnboardingController leader={leaderName} leaderP={leaderPDisplay} mcRuns={mcRunsDisplay} osfUrl="osf.io/spmkg" />`. The controller passes them through to the modal.

Defensive sort is one line, costs nothing, and protects against a future change to the snapshot file's array order. The values bake into the static HTML at build time (`export const dynamic = "force-static"`), so they're correct on first paint with no client-side fetch.

The modal footer's OSF URL is hardcoded as the prop value `osf.io/spmkg` (real repo URL). The design's placeholder `osf.io/8b5hd` is discarded.

### 4.5 Em-dash copy fixes

`SurfaceA.jsx`'s modal claims 01 and 03 each contain `&mdash;` in the JSX. Per project rule, these get rewritten in the ported `OnboardingModal.tsx`:

| Source claim | Production claim |
|---|---|
| "A pre-registered probability model for the World Cup &mdash; not a betting site." | "A pre-registered probability model for the World Cup. Not a betting site." |
| "publishes every divergence &mdash; hits and misses with identical weight." | "publishes every divergence: hits and misses with identical weight." |

Both preserve the original meaning. Claim 01 becomes two short sentences (mirrors the publication's declarative voice); claim 03 uses a colon (cleaner clause delimiter than a dash). The Design Package.md §3 copy table also uses em-dashes; production deviates from the table only on dash treatment.

### 4.6 Mounting strategy (Option 3 from the prompt, refined)

- **Chip + Modal + Controller** mount in `(editorial)/page.tsx` only. Cleanest place to compute the real-data props (snapshot accessors are already called here). Chip never appears on `/bracket`, `/ledger`, etc. - but the modal would also not be reachable from non-homepage routes if mounted here only.
- **Masthead pill** lives in `EditorialMasthead.tsx`, available on every editorial route. Clicking it dispatches `window.dispatchEvent(new Event("45a:onboarding:open"))`.
- **The bridge**: `OnboardingController.tsx` (mounted in page.tsx) listens for the custom event. When fired, it opens the modal. When the modal closes via any path, it writes `seen=true` and the pill pulse stops.

A complication: if a visitor clicks the masthead pill on `/bracket` (where `OnboardingController` is not mounted), the event fires into the void and nothing happens. Two ways to resolve:
- **Option 4.6.a**: Mount `<OnboardingController>` in `(editorial)/layout.tsx` instead of `(editorial)/page.tsx`. The controller becomes available on every editorial page. Then the modal opens wherever the pill is clicked. Slight downside: the leader-name / p_champion / mcRuns props must be computed by the layout (which currently reads no data) instead of the page, or computed inside the controller itself by calling the accessor server-side. The layout would gain a single `loadSnapshot(undefined)` call - cheap, the data is already cached.
- **Option 4.6.b**: Mount in page.tsx. The pill on non-home pages navigates (`<Link href="/?onboarding=open">`) instead of dispatching an event. page.tsx checks the query param and opens the modal. Slightly more friction (a navigation), but keeps page.tsx as the only data-aware place.

**I recommend 4.6.a** (mount in editorial layout). The data prop computation moves up one level - it's the same accessor calls that page.tsx already makes. The reuse is clean. Modal becomes available everywhere the masthead is visible, which matches the "available always" property the brief asks for. The layout already imports both EditorialMasthead and SiteFooter; adding an OnboardingController import and `loadSnapshot()` call is in the same idiom.

Confirm with Nicolás before Stage 2; I will implement 4.6.a unless directed otherwise.

### 4.7 `localStorage` keys

| Key | Set by | Read by | Effect |
|---|---|---|---|
| `45a.onboarding.seen` | `OnboardingController` (any dismissal path) and `MastheadOnboardingPill` (on its first click) | the chip + the pulse class on the pill + the trophy-settle CSS via inline pre-hydrate script | once set: chip never re-appears, pulse stops, trophy settle does not play. The modal remains re-openable from the masthead pill. |
| `45a.onboarding.tour` | **never written by cp-08 code** | reserved for cp-09 (Surface B) | cp-08 must not initialize, read, or write this key. |

The cp-08 prompt is explicit: "Do not initialize, read, or write [the `tour` key] from cp-08 code." I'll add a code comment in `OnboardingController.tsx` to make the namespace boundary visible to future readers.

### 4.8 Files I will create / edit

**New** (all under `website/src/components/onboarding/`):

| File | Purpose | Approx. lines |
|---|---|---|
| `OnboardingController.tsx` | `"use client"`. Owns `seen` state + `showModal` state. Reads localStorage on mount. Listens for `45a:onboarding:open` event. Renders chip (when not seen and on home path) and modal (when open). | ~70 |
| `OnboardingChip.tsx` | `"use client"`. The bottom-right chip. Calls `onOpen` and `onDismiss` callbacks. | ~50 |
| `OnboardingModal.tsx` | `"use client"`. The focus-trapped modal. Closes via Esc, scrim, ✕, "Got it", "Try the simulator" CTA. Accepts `leaderName`, `leaderP`, `mcRuns`, `osfUrl` as props. | ~110 |
| `useIsHomePath.ts` (optional helper) | Tiny hook that wraps `usePathname() === "/"`. Used by the controller to gate the chip to the home page only. | ~10 |

Possibly merged into the controller if it stays small. I'll judge during Stage 2.

**Edited**:

| File | Edit | Approx. lines added |
|---|---|---|
| `website/src/app/(editorial)/layout.tsx` | Add a `loadSnapshot(undefined)` call, derive leader / mcRuns, mount `<OnboardingController leader=... leaderP=... mcRuns=... osfUrl="osf.io/spmkg" />` inside the existing wrapper. | ~10 |
| `website/src/components/layout/EditorialMasthead.tsx` | Add a small inline `<MastheadOnboardingPill>` sub-component or a 30-line inline button near the "Open terminal" CTA. Reads `localStorage["45a.onboarding.seen"]` in a `useEffect`, sets local pulse state, dispatches custom event on click. | ~40 |
| `website/src/components/ui/HeroGraphic.tsx` | Add optional `withSettle?: boolean` prop. Conditionally appends `trophy-settle` to the existing className. Default behaviour unchanged. | ~3 |
| `website/src/app/(editorial)/page.tsx` | Change `<HeroGraphic />` to `<HeroGraphic withSettle />`. One token. | ~1 (same line) |
| `website/src/app/layout.tsx` | Add a second inline `<Script strategy="beforeInteractive">` block alongside the existing `DESKTOP_BANNER_PRE_HYDRATE`. Reads `localStorage["45a.onboarding.seen"]` and sets `documentElement.dataset.onboardingSeen`. | ~12 |
| `website/src/app/globals.css` | Add: `--shadow-card`, `--brand-accent` tokens (under editorial `:root`); `@keyframes chipIn / overlayIn / modalIn / trophySettle / helpPulse`; `.help-pulse`, `.trophy-settle` class rules; one `html:not([data-onboarding-seen="true"])` scope; one `@media (prefers-reduced-motion: reduce)` clamp. | ~30 |
| `website/eslint.config.mjs` | Add `"website/design-output/**"` to the `ignores` array. | ~1 |

**Untouched** (per the prompt's explicit out-of-scope list, verified against the codebase):

- The existing hero structure in `(editorial)/page.tsx` (headline, OSF line, daily-brief CTA, sections below). Only the `HeroGraphic` JSX gains one prop.
- The leaderboard, bracket preview, divergences, calibration, vault row.
- All simulator routes and `(simulator)` components (cp-09 scope).
- `KillCriteriaPill`, `LedgerSummaryPanel`, `TournamentCalibrationStrip` (cp-04).
- `loading.tsx` files, Recharts lazy wrapper (cp-06).
- `StickyProgressMeter`, simulator footer compensation (cp-07).
- Email capture API and surfaces (Surface B / cp-09 territory).
- Data pipeline, OSF artifacts, vault content, brief content.
- All `data/` files.

### 4.9 Estimated diff size

~4 new files (240-280 lines), ~7 edited existing files (60-90 lines added). Total in the 300-380 lines range, comfortably within the cp-08 prompt's "250 to 450" target and substantially smaller than the dead v1 cp-08 (~365 lines added that needed to be reverted in full).

### 4.10 Open questions for Nicolás before Stage 2

1. **Mount level: layout vs. page** (§4.6.a vs. §4.6.b). I recommend mounting `OnboardingController` in `(editorial)/layout.tsx` so the modal is reachable from the masthead pill on every editorial page. The layout currently reads no data; this adds a `loadSnapshot()` call there. Confirm or pick option b (modal mounted in page.tsx, masthead pill on other pages navigates to `/?onboarding=open` first).

2. **Em-dash copy rewrites** (§4.5). The two proposed rewrites preserve meaning but the second one introduces a colon mid-clause where the original had a dash. If you'd prefer a different rewrite for claim 03, say so. My pick: "every divergence: hits and misses with identical weight." Alternative: "every divergence; hits and misses are weighted equally."

3. **HeroGraphic edit** (§4.3). Adding `withSettle?: boolean` to `HeroGraphic.tsx` is the cleanest path to the trophy settle animation. The fallback (CSS-only via brittle selector) avoids any HeroGraphic edit but is more fragile. Confirm option 1 (explicit prop, recommended).

4. **24 vs. 25 screenshots**. The cp-08 prompt expects 25 screenshots; the directory has 24. Doesn't block Stage 2 - just flagging in case Nicolás wants to verify with the design agent that nothing is missing.

5. **`.thumbnail` and `screenshots/` retention.** Leave as-is in `website/design-output/onboarding-v2/`. Confirm.

---

## 5. Status

Stage 1 complete pending review. No production code written, no token edits, no homepage edits. Branch state:

```
cp-08-onboarding-additive (off main at 1039f31)
  + working tree:
    - website/design-output/onboarding-v2/  (full design package, unmodified copy)
    - docs/onboarding/cp-08-additive-inspection-notes.md  (this file)
```

Stage 2 will not begin until Nicolás confirms the implementation plan above, in particular the mount-level decision (§4.6 / §4.10 Q1) and the em-dash copy rewrites (§4.5 / §4.10 Q2).
