# Checkpoint cp-06 — Nav-perf fix (loading.tsx + Recharts dynamic)

Before reading this prompt, open `docs/perf/nav-perf-2026-05-27.md` on the `probe/nav-perf-investigation` branch and read it end to end. That document is the spec for this checkpoint. This prompt picks up the top two ranked fixes from that report; the rest of the report's findings (Fix 3, 4, 5) are explicitly deferred.

Also read `GO_TO_LAUNCH.md` at the repo root for the broader project context if you're new to this codebase. The prior shipped checkpoints are cp-04 (frontend narrative hotfix), cp-05 (nightly pipeline rewire), and cp-05a (drop the PAT dependency). The nightly pipeline runs healthy on `GITHUB_TOKEN`; the live snapshot updates daily; the live site at `45analytics.com` is in a good state. What this checkpoint addresses is the perceived-feel problem on navigation, not a correctness problem.

## Goal

Ship two surgical fixes that together collapse the "click does nothing for 2 to 4 seconds" feel on the seven nav routes of `45analytics.com`:

1. Add a `loading.tsx` to each of the three route groups: `(quant)`, `(editorial)`, `(simulator)`.
2. Convert the `ReliabilityDiagram` import on `/ledger` from a static import to `next/dynamic({ ssr: false, loading: ... })` so the 357 KB Recharts chunk stops blocking `/ledger`'s first paint.

Both fixes use patterns that already exist in the codebase (the `dynamic(..., { ssr: false })` pattern is on `SnapshotAwareHome.tsx` and `SnapshotAwareBracket.tsx` today). Neither fix touches business logic, data files, the simulation engine, the OSF artifacts, or any vault content.

## Why this matters

T-15 days to WC kickoff. Incoming traffic from journalists, prediction-markets people, and academic referrals will land cold on the nav routes. The site IS fast (six of seven nav routes are `force-static`); what's missing is the visual feedback that tells the user the click registered. Fix 1 supplies that feedback in a single animation frame instead of after the new route fully renders. Fix 2 ensures `/ledger`, which currently ships Recharts in its critical path, joins the rest of the routes in the "feels instant" band after Fix 1 lands.

## Branch

`cp-06-nav-perf-fix`

Before any work: `git fetch && git checkout main && git pull`. Confirm HEAD includes cp-05a's merge (commit `8b1188b` per the investigation report; verify with `git log --oneline -5`). Confirm the working tree is clean. Branch off `main`, not off `probe/nav-perf-investigation` — that branch is documentation-only and is not in the cp-06 ancestry. The investigation report is on the probe branch, which is what you've already read; you don't need that branch checked out to do this work, because the only reason to read it is for the spec, and the spec is in your head now.

## Fix 1 — Route-group `loading.tsx`

### Scope

Create three new files. No edits to existing files. The route groups in question already have `layout.tsx` files that wrap the page chrome; those layouts continue to render during navigation. The new `loading.tsx` files render IN PLACE OF `page.tsx` during the brief period between click and route-render. Layout components (the masthead, the footer, the snapshot strip) stay mounted across the transition, so the user sees the chrome unchanged with a skeleton in the content area.

### Files to create

1. `website/src/app/(quant)/loading.tsx`
2. `website/src/app/(editorial)/loading.tsx`
3. `website/src/app/(simulator)/loading.tsx`

### Skeleton design

Quiet, restrained, terminal-aesthetic. Match the existing visual vocabulary. The investigation report calls out specific primitives that can be reused: `SectionHead`, `NumericCell` (which supports a `loading` prop), and the `mono` dotted-line treatment used in the snapshot strip. Inspect `src/components/primitives/SnapshotTimestamp.tsx`, `src/components/primitives/MonoNumber.tsx`, and `src/components/primitives/NumericCell.tsx` before designing the skeleton. The skeleton should feel like the same site, just before the data lands.

A reasonable baseline shape for each group:

- A title-bar row with a `mono` placeholder string and a graphite hairline below.
- A two- or three-column block of `NumericCell` instances rendered in their loading state (the dotted-line treatment).
- Total height matches roughly what a typical page in that group looks like (1 to 2 viewports of content), so the layout doesn't jump when the real content arrives.

Three separate files give us three separate skeletons. Each can be slightly different (the quant routes are dense and tabular, the editorial routes are prose-heavy, the simulator route is a single hero-ish block). Don't over-engineer; one screenful per file is enough.

### What NOT to do for Fix 1

- Do not add per-route `loading.tsx` files (e.g. `(quant)/ledger/loading.tsx`). The investigation report explicitly names group-level files as the minimum-surface fix; per-route refinements are a follow-up. Per-route skeletons would also force this checkpoint to think about every page's layout individually, which would balloon scope.
- Do not introduce a new design primitive. Reuse what exists.
- Do not animate the skeleton beyond the existing `mono` dotted-line treatment. No shimmer, no fade-in. The dotted line itself is the indicator.
- Do not modify `layout.tsx` in any group. The layout shell is correct as it stands.

## Fix 2 — Dynamic Recharts on `/ledger`

### Scope

Convert the static import of `ReliabilityDiagram` in `LedgerSummaryPanel.tsx` to a dynamic import with `ssr: false` and a loading skeleton. This is the same pattern already used on the home and bracket pages for `HistoricalHomeBlock` and `HistoricalBracketBlock`.

### File to edit

`website/src/components/compositions/LedgerSummaryPanel.tsx` line 5.

### Change

Before:

```tsx
import { ReliabilityDiagram } from "./ReliabilityDiagram";
```

After (sketch; refine the import expression to match the actual export shape of `ReliabilityDiagram`):

```tsx
import dynamic from "next/dynamic";

const ReliabilityDiagram = dynamic(
  () => import("./ReliabilityDiagram").then((m) => m.ReliabilityDiagram),
  {
    ssr: false,
    loading: () => <ReliabilityDiagramSkeleton />,
  }
);
```

### Skeleton

A new tiny component `ReliabilityDiagramSkeleton` either alongside the diagram (in `src/components/compositions/ReliabilityDiagramSkeleton.tsx`) or inline in `LedgerSummaryPanel.tsx`. Pick whichever matches the rest of the codebase's conventions (check `SnapshotAwareHome.tsx` and `SnapshotAwareBracket.tsx` to see how they handle their dynamic-component skeletons).

The skeleton holds the bounding box of the real chart so the layout doesn't jump when Recharts hydrates. Per the investigation report the diagram is roughly 360x240 px; verify the actual dimensions from the rendered chart before designing the skeleton. Use the same `mono` dotted-line vocabulary as the route-group `loading.tsx` files — a thin border, a small label like "RELIABILITY DIAGRAM" in mono and graphite, and an axis-line placeholder.

### What NOT to do for Fix 2

- Do not change `ReliabilityDiagram.tsx` itself. It is already a `"use client"` component; the change is in how it's imported by `LedgerSummaryPanel`, not in the component.
- Do not introduce a new charting library. Recharts stays. We're only changing when it's loaded.
- Do not extend the dynamic-import pattern to other Recharts usages in this checkpoint. The investigation report notes Recharts is also used in `ProgressionConeChart` and the vault MDX figures, but those are already deferred (vault uses `dynamic` in MDX islands) or are on routes where the same chunk is amortized after `/ledger` is fixed.
- Do not delete the existing `import { ReliabilityDiagram } from "./ReliabilityDiagram"` line if the file currently uses both a named export and other named exports from the same module. Check what `LedgerSummaryPanel.tsx` actually imports from `./ReliabilityDiagram` before changing the line. If other names are imported from the same module, keep those as static imports and only make `ReliabilityDiagram` itself dynamic.

## Out of scope (explicitly deferred)

These come from the investigation report and are intentionally NOT in this checkpoint:

- **Fix 3** (`/scenario` `force-static` + client island for `?card=`). Touches `generateMetadata` and the Open Graph promo unfurl surface, which is a marketing-critical path. Deserves its own PR with explicit unfurl testing.
- **Fix 4** (`/brief` `revalidate = 600` → `force-static` + manual `revalidatePath`). Depends on a brief-dispatch hook that the investigation report itself notes "isn't yet implemented" (comment at `brief/page.tsx:7-9`). Shipping `force-static` without the hook would make `/brief` go stale forever.
- **Fix 5** (Masthead `/api/me/session-status` caching). Real but minor; doesn't move the perceived-feel needle.
- **Per-route loading skeletons.** This checkpoint ships the route-group minimum. Refinements come later.
- **Suspense around `LiveDataBlock`** on `/brief` and `/methodology`. Out of scope.
- **`@next/bundle-analyzer` as a dev dep.** Out of scope; the investigation already produced the analysis we needed without it.
- **Recharts → lighter alternative.** Out of scope; structural conversation for later.
- **Cold-start mitigations on Vercel.** Out of code scope.

## Conventions to respect

- No em dashes or en dashes in any new code or copy. Use periods, semicolons, colons, parentheses. (Project-wide rule.)
- Match the existing import style of the file you're editing (relative vs `@/`, named vs default).
- Tests live in `tests/**/*.test.ts`. Verify this before writing any test; the cp-04 checkpoint discovered that an earlier prompt's claim about colocated `.test.tsx` was wrong.
- Use existing primitives. Don't introduce new ones. If you find yourself wanting a "Skeleton" primitive, check if the codebase already has one before writing it (grep for `Skeleton` in `src/components/primitives/`).

## Verification

Before you mark this checkpoint ready:

1. **Dev navigation feels different.**
   - Run `pnpm dev` in `website/`.
   - Navigate between `/`, `/terminal`, `/ledger`, `/bracket`, `/vault`, `/scenario`, `/brief`, `/match/<any-id>`.
   - For each transition, confirm a skeleton renders within one animation frame of the click. The previous-page-stays-then-jumps behavior should be gone.
   - Pay specific attention to `/ledger`: when you navigate there from any other route, the skeleton renders immediately, the reliability diagram appears slightly later with its own skeleton, then the chart hydrates. Three visual states; none of them is "the previous page stayed on screen for 2 seconds."

2. **Production-like build is healthy.**
   - `pnpm build` in `website/`. Confirm no new build warnings; confirm no errors.
   - Inspect `.next/static/chunks/` and confirm a Recharts-shaped chunk is still present (we didn't delete Recharts; we deferred its load).
   - Use the Network tab on a hard-reload of `/ledger` after `pnpm start` (production build) to confirm the Recharts chunk loads AFTER the page's first contentful paint, not during. If it loads during, the `ssr: false` flag isn't taking effect.

3. **No regressions on the actual ledger functionality.**
   - On `/ledger`, scroll to the reliability diagram. Confirm it renders correctly with the right data after the skeleton flash.
   - The cp-04 fix is preserved: the kill-criteria pill still reads "AWAITING TOURNAMENT KICKOFF."
   - The cp-04 fix lives in `LedgerSummaryPanel.tsx` itself, which you're editing. Re-read the file before committing to make sure your dynamic-import change didn't disturb the pill rendering logic.

4. **Tests pass.**
   - `pnpm test` in `website/`. All tests pass.
   - Lint clean on the files you touched (other pre-existing lint errors on `main` are not your problem; check with `git diff --stat origin/main..HEAD` before running lint on the full repo).
   - `pnpm tsc --noEmit` clean.

5. **Diff is bounded.**
   - `git diff --stat origin/main..HEAD` shows: 3 new files (the three `loading.tsx`), 1 edited file (`LedgerSummaryPanel.tsx`), and 1 new tiny file (`ReliabilityDiagramSkeleton.tsx`) IF you chose to put the skeleton in its own file. Total: 4 to 5 files, on the order of 50 to 150 lines added.

## Merge-readiness checklist

Answer each with `Y` or `N`. Do not push without all `Y`s (or `N*` with substantive rationale as cp-04 and the perf investigation modeled).

```
Y/N — Three route-group loading.tsx files exist: (quant), (editorial), (simulator).
Y/N — Each loading.tsx uses existing primitives only (SectionHead, NumericCell loading state, mono dotted-line). No new primitives introduced.
Y/N — Each loading.tsx renders quickly enough that dev navigation shows a skeleton within one animation frame.
Y/N — Recharts ReliabilityDiagram is dynamically imported with ssr: false in LedgerSummaryPanel.tsx.
Y/N — A ReliabilityDiagramSkeleton placeholder exists and holds the chart's bounding box.
Y/N — Production build (pnpm build, then pnpm start) confirms the Recharts chunk loads AFTER /ledger first paint, not during.
Y/N — /ledger still renders the reliability diagram correctly after the skeleton flash.
Y/N — cp-04 kill-criteria pill on /ledger still reads "AWAITING TOURNAMENT KICKOFF" after the change.
Y/N — pnpm test, pnpm lint (touched files), pnpm tsc --noEmit all clean.
Y/N — No em or en dashes in any new code or copy.
Y/N — git diff --stat shows 4 to 5 files touched, on the order of 50 to 150 lines.
Y/N — Branch is cp-06-nav-perf-fix, off latest main, clean commit history, ready to PR.
```

If every line is `Y`, push and open the PR as draft with a description that includes: a one-paragraph summary, the list of files touched, a before/after screenshot of dev navigation if reasonable (otherwise a description of the felt difference), and a link to the investigation report at `docs/perf/nav-perf-2026-05-27.md` (note that the report is on the `probe/nav-perf-investigation` branch and PR #71, not yet on main).

If any line is `N`, explain the blocker and stop.

## Decision tree if things don't match

- **`pnpm build` warns about a new chunk size or the Recharts chunk is unexpectedly larger.** Check whether the dynamic-import expression accidentally pulled in additional code. The dynamic factory should be `() => import("./ReliabilityDiagram").then((m) => m.ReliabilityDiagram)` and nothing else. If you imported a barrel file by accident, that's the cause.
- **`/ledger` shows the skeleton but the Recharts chart never appears.** The dynamic import's promise is rejecting silently. Open the browser console for the error. Likely cause: `ReliabilityDiagram` is exported as default rather than named, or vice versa; the dynamic factory needs to match the actual export shape.
- **The loading.tsx skeleton flashes too briefly to see in production.** This is expected and fine. The fix is for cold and slow connections; on warm fast connections the skeleton may only show for a few frames. Dev mode is where you verify it shows at all.
- **`/scenario` or `/brief` still feels slow.** This is also expected. Fix 1 only converts "page frozen" to "page responding." The structural slowness of `/scenario` and `/brief` is what Fix 3 and Fix 4 address; they are deferred to follow-up checkpoints. Note the current state in the PR description so reviewers know this is intentional.
- **You realize Fix 3 or Fix 4 is needed to make this checkpoint feel done.** Resist. Note it in the PR description as a follow-up. The cost of bundling more fixes into this PR is review complexity, risk of touching the marketing-critical Open Graph surface, and risk of shipping `force-static` on `/brief` without the revalidation hook. The investigation report explicitly ranks Fix 1 and Fix 2 as the highest-impact-lowest-risk pair; trust the ranking.

## A note on judgement

This is a feel checkpoint, not a correctness checkpoint. The verification step that matters most is point 1 (dev navigation feels different). If you ship the code and the user-visible behavior hasn't changed, the checkpoint failed even if every other item is `Y`. Spend the time to actually click around in `pnpm dev` for a few minutes and confirm the navigation feels less broken before opening the PR. Capture a short screen recording if you can; attach it to the PR. The PR reviewer (Nicolás) will trust the readiness checklist more if it's paired with a visible artifact of the change.
