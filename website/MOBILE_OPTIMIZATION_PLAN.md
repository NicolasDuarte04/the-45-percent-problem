# Mobile Optimization Plan

**The 45% Problem · website mobile audit and remediation roadmap**

> Status: planning document. No code committed in this artifact. Intended as the brief for the execution agent.
> Scope: viewports 375px to 430px (the iPhone band) with progressive degradation up to the existing `md:` breakpoint at 768px.
> Out of scope: tablet polish (768px to 1023px). Treated as a follow-up phase if the audit surfaces issues there.

---

## 1. Executive summary

The site is canvas-aware (cream editorial, slate quant) and the editorial side (homepage, `/brief`, `/vault`) is already mobile-aware: it uses `clamp()` for fluid padding, has explicit `@media (max-width: 640px)` overrides in `globals.css`, and the masthead navigation uses `overflow-x-auto no-scrollbar` for graceful narrow-screen wrap.

The quant side (Terminal, Bracket, Ledger, Match, Team) is not. Every quant route stacks `px-6` on the outer header with `px-12` on the inner content, consuming roughly 144px of horizontal space on a 375px viewport before the first piece of data renders. The data-dense compositions (`DivergenceTable`, `BracketBoard`, `LedgerTable`, `MostLikelyBracket`, `TournamentLeaderboard`) declare hard `minWidth` values between 640px and 1100px. Some are already wrapped in `overflow-x-auto`. Some are not. None offer a sticky first column, so horizontal scrolling drops the team or matchup label that anchors the row.

The plan below proposes:

1. A small, brutalist `DesktopRecommendedBanner` to ship in Phase 1 as the immediate stopgap. Mobile users see it on the five quant routes; everything else (already mobile-tolerant) is untouched.
2. A targeted refactor of the quant route shells so the wasted padding disappears. One or two line-touches per route file.
3. Component-level fixes for the two highest-traffic dense surfaces (DivergenceTable, BracketBoard) with sticky first columns and proper touch-target sizing on filter chrome.
4. Mobile-first acceptance criteria for the unbuilt Scenario Simulator so it does not inherit the same problems.

The Daily Brief landing (the LinkedIn-traffic entry point) is mostly fine on mobile but has two specific touch-target violations in `EmailCaptureForm` that Phase 1 closes.

---

## 2. Pillar 1 · Global mobile audit (the diagnosis)

### 2.1 Repository facts that shape the plan

* **Tailwind v4.** Configuration lives in `src/app/globals.css` `@theme inline`. There is no `tailwind.config.*` file. Custom breakpoints, if needed, go in CSS.
* **Two route groups.** `(quant)` (slate canvas, `data-canvas="quant"`) and `(editorial)` (cream canvas). Both group-layouts mount `EditorialMasthead`. A banner mounted in those two layouts covers the entire site.
* **Reusable chrome patterns** for the new banner: `FreshnessBanner` (informational strip with mono labels and a sun-yellow status dot, `src/components/layout/FreshnessBanner.tsx`) and `KillCriteriaBanner` (alert-grade panel). The new banner sits between them in tone.
* **Existing utility:** `.no-scrollbar` (`globals.css` line 849). The masthead nav already uses it. Reusing it keeps the brutalist surface clean.
* **Existing mobile-aware bits to copy:** the bracket page already uses `px-4 md:px-6` and `px-0 md:px-12`. The homepage and `/brief` use `clamp(40px, 6vw, 64px) clamp(16px, 4vw, 48px)`. The vault has a full `@media (max-width: 640px)` block that drops body type from 18 / 30 to 17 / 28.

### 2.2 Surface-by-surface findings

**Divergence Terminal · `src/app/(quant)/terminal/page.tsx`**

* Lines 38, 41, 79, 110, 119, 136. The page wrapper uses `px-6` and the inner container uses `max-w-[1152px] mx-auto px-12`. On a 375px viewport this consumes 144px of horizontal space before the table starts. Inner content width drops to roughly 231px, then the table forces horizontal scroll. The waste is invisible on desktop and savage on mobile.
* The masthead title (`text-[18px]`) and the snapshot strap beneath wrap onto multiple lines on 375px because of the absorbed padding plus the right-aligned tour button.
* `DivergenceTable` itself (`src/components/compositions/DivergenceTable.tsx`):
  * The horizontal-scroll plumbing is correct. Lines 730 to 944 wrap the grid in `overflow-x-auto` with `minWidth: 920px` on the inner header and body, so column alignment is preserved. Credit to the original author.
  * Missing: a sticky first column. When a user on a 375px viewport scrolls right to inspect Edge or Gate, the matchup label scrolls off. The row becomes anonymous. Phase 2 fix below.
  * `FilterBar` (lines 114 to 218) is `flex flex-wrap` with `text-[11px] px-2 py-1` selects. On 375px it wraps to four or five rows. Each select control measures roughly 24px tall, well below the 44px touch-target minimum. This is the single most painful touch interaction on mobile.
  * The team-search `<input>` declares `minWidth: 120` (line 188) and shrinks the row further on narrow viewports.

**Bracket Board · `src/app/(quant)/bracket/page.tsx`**

* The bracket page is the only quant route already partly mobile-aware (lines 36, 39, 66 use `px-4 md:px-6` and `px-0 md:px-12`). Use this as the canonical pattern when normalising the other quant routes.
* `BracketBoard` (`src/components/compositions/BracketBoard.tsx`):
  * Native CSS Grid at line 167: `minmax(180px, 1.4fr) repeat(${ROUNDS.length}, minmax(92px, 1fr))`. Total minimum width roughly 732px. On 375px the user has to scroll horizontally to see all six rounds.
  * Horizontal scroll already works (line 174 `overflowX: "auto"`).
  * Same sticky-first-column gap as the Terminal table. The team label column at line 222 should be `position: sticky; left: 0` on each row so the team identity persists during horizontal scroll.

**Match page · `src/app/(quant)/match/[id]/page.tsx`**

* Same `px-6` + `px-12` stacked padding bug (lines 66, 69, 90).
* `MatchHeader` declares `minWidth: 200` (`src/components/compositions/MatchHeader.tsx` line 132), which is fine, but the compositions stacked beneath (`MarketBreakdownPanel`, `GoalMatrixHeatmap`, `StrengthInputsPanel`, `RelatedLedgerRecords`) inherit the squeezed inner width and have no breakpoints of their own.
* `GoalMatrixHeatmap` declares `width: 240` twice (lines 237, 246) for axis labels and legends. At a 375px viewport minus the stacked padding these will overflow. Phase 2: convert to `max-width: 240px` plus `flex-wrap: wrap`.

**Team page · `src/app/(quant)/team/[code]/page.tsx`**

* Same `px-6` + `px-12` stacked padding bug (lines 63, 66, 83).
* `ProgressionConeChart` and `HistoricalChampionSparkline` are SVG-based; they should scale fluidly already if the parent width is correct. Confirm during Phase 2 implementation.

**Daily Brief landing · `src/app/(editorial)/brief/page.tsx`**

* Page wrapper uses fluid `clamp(40px, 6vw, 64px) clamp(16px, 4vw, 48px)` (line 21). No padding bug here.
* `EmailCaptureForm` (`src/components/email/EmailCaptureForm.tsx`) is invoked at brief/page.tsx line 61 without a `layout` prop, so it defaults to `layout="desktop"` (the form already supports `layout="mobile"` for stacked rendering).
  * Form grid template is `minmax(0, 1fr) auto` (line 119): input plus button side by side at every viewport.
  * Input and submit button declare `minHeight: 40` (lines 151, 168). Both should be 44.
  * Phase 1 fix: replace the `layout="desktop"` default with a CSS-only stacking rule. Wrap the form's `gridTemplateColumns` in a media query so widths at or below 480px get `1fr`. Bump both controls to `minHeight: 44`.
* `LiveDataBlock` and `TeamChipStrip` are not audited line by line; quick visual confirmation should be added to the Phase 1 implementation checklist.

**Scenario Simulator · NOT BUILT YET**

* `grep` for `[Ss]imulator|[Ss]cenario` returns zero matches in `src/`. The surface is on the project roadmap but has no code yet.
* This is an opportunity, not a problem. Phase 3 specifies mobile-first acceptance criteria so the simulator never inherits the quant-route padding bug.

**Global masthead · `src/components/layout/EditorialMasthead.tsx`**

* The horizontal scrolling nav (line 77, `overflow-x-auto no-scrollbar`) is the right pattern for a brutalist surface and works on mobile.
* The "Open terminal" CTA at line 173 declares `height: 32`. Touch-target violation. Bump to 40 minimum (ideally 44) in Phase 3.
* The five primary nav tabs have `paddingBottom: 22` and `marginBottom: -23` (lines 116 to 117). The 22px padding is hit-testable, so the touch target is closer to 35px tall. Acceptable but tight; revisit in Phase 3.

**Homepage compositions imported by `(editorial)/page.tsx`**

* `TournamentLeaderboard` (line 47) declares `minWidth: 640`. The component does not appear to be wrapped in `overflow-x-auto`. On 375px this either overflows the viewport (causing horizontal page-level scroll) or relies on the parent's `clamp()` padding to avoid it. Phase 2 wraps it.
* `MostLikelyBracket` (line 488) declares `minWidth: 1100`. Same risk, larger blast radius. Critical Phase 1 item.
* `LedgerTable` (line 188) declares `min-w-[1100px]`. Same. The Ledger page is one of the five quant surfaces that gets the banner in Phase 1, so the user is told this is a desktop view.

### 2.3 Cross-cutting issues

* **Viewport meta.** `app/layout.tsx` has no explicit `<meta name="viewport">` declaration. Next.js injects a default `width=device-width, initial-scale=1`, which is likely fine, but the Phase 1 acceptance checklist should confirm with a real device or Chrome DevTools.
* **No service worker.** Dismissing the banner via `sessionStorage` is safe (no stale-cache flash).
* **`prefers-reduced-motion`** is already handled globally (`globals.css` line 313). The banner should respect it by using no animation at all rather than conditionally disabling one.
* **Touch-target debt.** Multiple components declare `height: 32`, `minHeight: 40`, or `text-[11px] py-1` interactive controls. A site-wide grep is queued for Phase 3.

---

## 3. Pillar 2 · The "graceful degradation" stopgap

### 3.1 Component name and intent

`DesktopRecommendedBanner` (proposed location: `src/components/layout/DesktopRecommendedBanner.tsx`).

The banner is informational, not an alert. It sits as a thin horizontal strip below the masthead on mobile viewports only. It tells the user that what they are looking at was designed for a wider screen, gives them an explicit dismiss control, and gets out of the way. It does not block content. It does not cover content. It does not auto-scroll on top of the page.

### 3.2 When it shows

* **CSS-driven visibility.** `display: none` above 768px. The banner is rendered into the DOM unconditionally so the SSR HTML is identical between mobile and desktop. Display flips on a media query.
* **Route-aware.** Mounts only on the five quant routes (`/terminal`, `/ledger`, `/bracket`, `/match/*`, `/team/*`). The editorial routes (homepage, `/brief`, `/vault`) already work on mobile and do not need the notice.
* **Mounting strategy.** Rendered once inside `(quant)/layout.tsx`, placed between `<EditorialMasthead />` and `<main>`. This puts it at the top of the page but below the nav, so it does not push the navigation off-screen.

### 3.3 Dismissal behaviour

* **Persistence.** `sessionStorage["45pct.banner.dismissed"] = "1"`.
* **Why sessionStorage over localStorage.** Most LinkedIn-traffic visits are one-shot. SessionStorage means: "dismiss is sticky for this visit; if the user comes back tomorrow, we remind them once more." More research-preview-friendly than localStorage.
* The dismiss control is a real `<button>` with `aria-label="Dismiss notice"`. It carries focus and responds to Enter and Space.
* Dismiss state lives in client-side React (`useState`), seeded by an inline blocking `<script>` in the banner's component file that sets a `data-dismissed` attribute on the wrapper before paint. This avoids a flash-of-banner-then-dismiss.

### 3.4 Accessibility

* `role="status"` (informational, not assertive).
* `aria-live="polite"`.
* Dismiss button: 44 by 44 minimum touch target. Visible focus ring (the global `:focus-visible` rule already provides a 2px outline in `var(--accent-focus)`).
* Color contrast: text `var(--text-tertiary)` on `var(--bg-panel)`. WCAG AA passes on both the cream and slate canvases (verified against the documented contrast ratios in `globals.css`).

### 3.5 Visual specification

The banner reads as chrome, not as content. It picks up the canvas via CSS variables, so it switches between cream and slate with no JS.

| Token | Editorial canvas | Quant canvas |
|---|---|---|
| Background | `var(--bg-panel)` (`#EEEAE0`) | `var(--bg-panel)` (`#151A21`) |
| Border (bottom) | `1px solid var(--border-subtle)` | `1px solid var(--border-subtle)` |
| Text | `var(--text-tertiary)` | `var(--text-tertiary)` |
| Status dot | `var(--prism-sun)` (`#F5D76E`) | `var(--prism-sun)` (`#F5D76E`) |
| Dismiss icon | `var(--text-quiet)` | `var(--text-quiet)` |

**Layout**

* Width: 100% of viewport. No `max-width`. Sits flush like `FreshnessBanner`.
* Height: 36 to 40px (single line of 12px mono text plus 12px vertical padding).
* Inner layout: `display: flex; align-items: center; gap: 12px; padding: 10px 16px;`.
* Order, left to right: status dot (4px square, `var(--prism-sun)`); copy; flex spacer; dismiss button.
* No icon. No emoji. The status dot is the only visual ornament, and it echoes the `FreshnessBanner` stale-dot vocabulary.

**Typography**

* Family: `var(--font-mono)`.
* Size: `12px` (matches `--text-data-sm`).
* Letter spacing: `0.04em`.
* Case: sentence case. The wider site reserves uppercase for status pills.

**Copy** (proposed; pick one):

1. `Optimized for desktop viewing.`
2. `This terminal is built for desktop. Mobile shows a condensed view.`
3. `Best viewed on desktop. Tap and scroll horizontally to see full data.`

Recommendation: option 1. Terse, brutalist, matches the rest of the site's voice.

Microcopy on the dismiss button: a single `✕` glyph rendered in `var(--font-mono)`, with `aria-label="Dismiss"`.

### 3.6 Component sketch (informal, for spec only, NOT for commit)

```
<aside
  role="status"
  aria-live="polite"
  data-dismissed={...}
  class="desktop-recommended-banner"
>
  <span class="banner-dot" aria-hidden />
  <span class="banner-copy">Optimized for desktop viewing.</span>
  <button class="banner-dismiss" aria-label="Dismiss">✕</button>
</aside>

<style>
  .desktop-recommended-banner { display: none; ... }
  @media (max-width: 768px) {
    .desktop-recommended-banner:not([data-dismissed="1"]) { display: flex; }
  }
</style>
```

### 3.7 What the banner deliberately does NOT do

* Does not redirect to a "mobile site". There is none.
* Does not block the page with a modal. Brutalist, not paternalistic.
* Does not animate in. The `prefers-reduced-motion` rule is in place; respect it by using no animation at all rather than conditionally disabling one.
* Does not promise a forthcoming mobile experience. Honest about what the site is.

---

## 4. Pillar 3 · Actionable implementation plan (the roadmap)

Three phases, each landable independently. Estimates assume one engineer comfortable with this codebase.

### Phase 1 · Triage. Ship the banner. Stop the bleeding.

**Goal:** a LinkedIn visitor on a 375px iPhone arrives at `/terminal`, immediately sees a quiet desktop-recommended notice, and can still scroll without horizontal page-level overflow.

**Tasks**

1. Build `src/components/layout/DesktopRecommendedBanner.tsx` per the spec in section 3. Include the `prefers-reduced-motion` no-op explicitly.
2. Mount the banner inside `src/app/(quant)/layout.tsx` between `<EditorialMasthead />` and `<main>`. Do NOT mount in `(editorial)/layout.tsx`.
3. Fix the catastrophic stacked padding on the four quant routes that have not been touched yet. For each file below, replace the outer wrapper from `px-6` to `px-4 md:px-6` and the inner container from `px-12` to `px-0 md:px-12` (the same pattern `bracket/page.tsx` already uses):
   * `src/app/(quant)/terminal/page.tsx` (lines 38, 41, 79, 110, 119, 136)
   * `src/app/(quant)/match/[id]/page.tsx` (lines 66, 69, 90)
   * `src/app/(quant)/team/[code]/page.tsx` (lines 63, 66, 83)
   * `src/app/(quant)/ledger/page.tsx` (apply the same pattern; not opened in this audit but expected to match)
4. Wrap the homepage compositions that declare hard `minWidth` in an `overflow-x-auto` parent so the page never horizontally scrolls:
   * `TournamentLeaderboard` (`minWidth: 640` at line 47)
   * `MostLikelyBracket` (`minWidth: 1100` at line 488)
5. `EmailCaptureForm` quick fix in `src/components/email/EmailCaptureForm.tsx`:
   * Bump input `minHeight: 40` to 44 (line 151).
   * Bump button `minHeight: 40` to 44 (line 168).
   * Add a CSS-only media query (or tiny CSS module) so `gridTemplateColumns` stacks at 480px and below: `1fr` instead of `minmax(0, 1fr) auto`.
6. **Acceptance checklist for Phase 1:**
   * Real iPhone (or Chrome DevTools at 375px and 430px), portrait. Open `/terminal`, `/bracket`, `/match/*`, `/team/*`, `/ledger`. Confirm no horizontal page-level scroll on any route. Banner visible. Banner dismissable. Banner respects sessionStorage (refresh shows it again next session).
   * Tap the email-capture submit button on `/brief`. Confirm 44px hit area.
   * Lighthouse mobile run on `/`, `/terminal`, `/brief`. Capture before / after numbers in the PR description.

**Estimate:** 1.5 engineering days.

### Phase 2 · Component refactors. Sticky columns. Real touch targets on filters.

**Goal:** a user on a 375px iPhone who dismisses the banner can still get useful work done on the data-dense surfaces, with sticky anchors and properly sized controls.

**Tasks**

1. `DivergenceTable` (`src/components/compositions/DivergenceTable.tsx`):
   * **First-column sticky pin.** Apply `position: sticky; left: 0; z-index: 1; background: var(--bg-panel-elev)` to the Kickoff cell (line 844) and the matching header cell. Verify the row hover and expand backgrounds also pick up the sticky cell so it does not visibly seam during scroll.
   * **FilterBar** (lines 114 to 218): bump select height to 44px (currently `text-[11px] px-2 py-1` is roughly 24px). On 640px and below, collapse the filter bar into a single horizontal scrolling strip using the same `overflow-x-auto no-scrollbar` pattern the masthead uses, so the filters are reachable without consuming five vertical rows.
   * **Team search input:** drop `minWidth: 120` on small screens (let it flex to fill the strip).
2. `BracketBoard` (`src/components/compositions/BracketBoard.tsx`):
   * **Sticky team-label column.** Add `position: sticky; left: 0; z-index: 2` to the Link element at line 223. Add `box-shadow: inset -1px 0 0 var(--border-subtle)` so the seam between sticky column and scrolling cells reads as a rule, not a shadow.
   * Reduce the first-column `minmax(180px, 1.4fr)` to `minmax(140px, 1.2fr)` at 480px and below. The team chip + flag + truncated name fits in 140px on mobile; freeing 40px of horizontal real estate makes the round columns less cramped.
3. `LedgerTable` (`src/components/compositions/LedgerTable.tsx` line 188): wrap in `overflow-x-auto`. Confirm column-header alignment with the body. Add the same sticky first-column treatment.
4. `MostLikelyBracket` (`src/components/compositions/MostLikelyBracket.tsx` line 488): the existing 1100px minimum is unfixable without a redesign. Wrap in `overflow-x-auto` (Phase 1 covers this) and in Phase 2 add a "scroll hint" pseudo-element (a 16px right-edge fade in `var(--bg-root)`) so the user sees there is more to the right.
5. `GoalMatrixHeatmap` (`src/components/compositions/GoalMatrixHeatmap.tsx` lines 237, 246): convert two `width: 240` declarations to `max-width: 240px` so they shrink gracefully on narrow viewports.
6. **Mobile typography pass on the quant chrome.** Currently every quant page uses `text-[18px]` for its h1 and `text-[12px]` for the snapshot strap. Drop the strap to `text-[11px]` only when it would otherwise wrap to a third line; otherwise leave alone.
7. **Acceptance checklist for Phase 2:**
   * On a 375px viewport, scroll the Terminal table right. Confirm the matchup label stays pinned and remains legible against the row background.
   * On a 375px viewport, open the Filter bar on Terminal. Confirm every control is 44px tall and tap-able with a thumb without missing.
   * On a 375px viewport, scroll the Bracket Board right through all six rounds. Confirm the team label column stays pinned with a visible seam.

**Estimate:** 2.5 to 3 engineering days.

### Phase 3 · Simulator and interactive touches. Finish the polish.

**Goal:** the unbuilt Scenario Simulator ships mobile-first; the masthead and remaining touch targets meet the 44px minimum site-wide.

**Tasks**

1. **Scenario Simulator acceptance criteria** (specs only; the simulator will be built later):
   * Every interactive control (`<button>`, `<select>`, `<input type="range">`, drag handles) MUST have a hit area of at least 44 by 44 px regardless of its visual size. Use a `::before` pseudo-element with negative margin to extend hit area without visually growing the control.
   * No horizontal scroll on the simulator page at 375px. If a chart needs more width than 343px (375 minus 16+16 gutter), it goes inside its own `overflow-x-auto` wrapper, not the page wrapper.
   * The output panel (probability table or sparkline) stacks vertically below the controls at 768px and below. On desktop they sit side by side.
   * Sliders use native `<input type="range">` with `accent-color: var(--accent-focus)` so the touch behaviour is the OS default. Custom slider components are deferred until the simulator works on native primitives.
2. `EditorialMasthead.tsx`:
   * "Open terminal" CTA (line 173): bump `height: 32` to `height: 40` on mobile (768px and below) via inline style and a small CSS rule.
   * Reduce nav tab `paddingBottom: 22` and `marginBottom: -23` to 18 and `-19` on mobile so the underline indicator stays visually correct while the touch target measures 36px (acceptable when paired with horizontal scroll).
3. **Site-wide touch-target audit.** Grep for `height:\s*32\b`, `height:\s*36\b`, and `min-h-\[3[06]px\]` patterns. Bump every interactive element below 44 to 44.
4. Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />` to `app/layout.tsx` if not already injected by Next.js defaults. Confirm via View Source in production.
5. **Acceptance checklist for Phase 3:**
   * Real iPhone Safari, iOS 17 or newer. Tap every nav tab, the "Open terminal" CTA, every filter control, every disclosure row, every dismiss button. None should require a second tap to register.
   * Run axe-core or Pa11y over `/terminal`, `/bracket`, `/brief`. Zero failures on touch-target rules.

**Estimate:** 1 engineering day for the masthead and audit pass; the simulator is its own project.

### Phase 4 (deferred) · Calibrated mobile experiences for the dense surfaces

If analytics show meaningful mobile time-on-site after Phase 1 ships (the banner gives us the data: dismissed-vs-not is a proxy for "did the user keep going"), the next pass would be:

* A condensed Terminal "card view": each divergence row becomes a stacked card with the same data, no horizontal scroll. Toggle in the FilterBar.
* A "champion path" mobile view of the Bracket: pick one team, see its progression cone vertically, instead of the 48-row matrix.
* A mobile-only `/brief` confirmation flow that does not require typing on Turnstile.

This phase is not committed to in this plan. Tracked here so it is not lost.

---

## 5. Out of scope and known limitations

* Tablet (768px to 1023px) is not actively tuned. The `md:` breakpoint at 768px is the only handoff point. If field reports show tablet bugs, treat them as a separate workstream.
* Print stylesheets are out of scope.
* The Ledger page was not opened during this audit (only its table component was). Phase 1 normalisation of its `px-6` and `px-12` shell assumes it follows the same pattern as the other quant routes; if it does not, the Phase 1 PR description should call that out.
* Any rendering fix that requires bundle-size additions (a virtualization library specifically for the bracket, for example) is rejected. The plan stays inside the existing dependency set.

---

## 6. Definition of done

The plan is complete (and the work succeeds) when:

1. A first-time mobile visitor on `/terminal` sees the desktop-recommended banner, can dismiss it, and then read the table without horizontal page-level scroll.
2. Sticky first columns work on `DivergenceTable` and `BracketBoard` at 375px without visual seam artifacts.
3. Every interactive control on the five quant routes and the `/brief` form measures at least 44 by 44 px.
4. Lighthouse Mobile Accessibility score on `/terminal` and `/brief` improves over the pre-Phase-1 baseline. Capture exact deltas in the PR.
5. No new dependencies. No regressions on desktop (visually diff via Percy or similar before merge).

---

## 7. File index (everything referenced above, in one place)

| File | What it is | Why it appears in this plan |
|---|---|---|
| `src/app/globals.css` | Tailwind v4 `@theme` block, all design tokens, mobile vault overrides | Source of truth for tokens used by the new banner |
| `src/app/layout.tsx` | Root layout, fonts, analytics | Phase 3 viewport-meta confirmation |
| `src/app/(quant)/layout.tsx` | Slate-canvas group layout | Phase 1: mount the banner here |
| `src/app/(editorial)/layout.tsx` | Cream-canvas group layout | Do NOT mount the banner here |
| `src/app/(quant)/terminal/page.tsx` | Divergence Terminal route | Phase 1: stacked padding fix |
| `src/app/(quant)/bracket/page.tsx` | Bracket Board route | Reference for the canonical mobile padding pattern |
| `src/app/(quant)/match/[id]/page.tsx` | Match detail route | Phase 1: stacked padding fix |
| `src/app/(quant)/team/[code]/page.tsx` | Team detail route | Phase 1: stacked padding fix |
| `src/app/(quant)/ledger/page.tsx` | Forecast ledger route | Phase 1: stacked padding fix (assumed) |
| `src/app/(editorial)/brief/page.tsx` | Daily Brief landing | Phase 1: pass `layout="mobile"` plumbing |
| `src/app/(editorial)/page.tsx` | Homepage | Phase 1: wrap `TournamentLeaderboard` and `MostLikelyBracket` |
| `src/components/layout/EditorialMasthead.tsx` | Global nav | Phase 3: CTA height bump |
| `src/components/layout/FreshnessBanner.tsx` | Existing chrome banner | Visual reference for the new banner |
| `src/components/layout/DesktopRecommendedBanner.tsx` | NEW (Phase 1) | The stopgap |
| `src/components/compositions/DivergenceTable.tsx` | Terminal table | Phase 2: sticky column, FilterBar touch targets |
| `src/components/compositions/BracketBoard.tsx` | Bracket matrix | Phase 2: sticky team column |
| `src/components/compositions/LedgerTable.tsx` | Ledger table | Phase 2: sticky column |
| `src/components/compositions/MostLikelyBracket.tsx` | Homepage bracket | Phase 1 wrap, Phase 2 scroll hint |
| `src/components/compositions/TournamentLeaderboard.tsx` | Homepage leaderboard | Phase 1 wrap |
| `src/components/compositions/MatchHeader.tsx` | Match page header | Phase 2 inspection |
| `src/components/compositions/GoalMatrixHeatmap.tsx` | Match page heatmap | Phase 2: width-to-max-width swap |
| `src/components/email/EmailCaptureForm.tsx` | `/brief` form | Phase 1: 44px controls + responsive stack |

---

End of plan. No code committed. Awaiting sign-off before Phase 1 begins.
