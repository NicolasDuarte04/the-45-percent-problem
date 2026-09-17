# Investigation prompt: Navigation feel on 45analytics.com

This is an investigation-only checkpoint. The goal is measurement and root cause, the output is a markdown findings document, no production code changes in this branch. A follow-up checkpoint will apply the fixes based on what you learn here.

Read `GO_TO_LAUNCH.md` at the repo root first for the broader project context. The Checkpoint 1 (`cp-04`) and Checkpoint 2 (`cp-05` + `cp-05a`) work has shipped: the false KILL CRITERIA badge is gone, the nightly pipeline runs on GITHUB_TOKEN, the live snapshot updates daily. The site state is healthy; what we're investigating is a UX feel problem, not a correctness problem.

## Goal

Diagnose why clicking on the nav bar links (Overview, Matches, Ledger, Bracket, Vault, Scenario Simulator, Today's Brief) on `45analytics.com` produces several seconds of no visual feedback before the new route appears. Produce a markdown findings document with measurements, confirmed root causes, and a ranked list of fix proposals.

**Do not implement any fixes in this branch.** The deliverable is the report. A separate checkpoint will fix it surgically based on your findings.

## Why this matters

T-15 days to WC kickoff. Incoming traffic from journalists, prediction-markets people, and academic referrals will land on the site cold. A site that feels slow to navigate erodes credibility faster than any single piece of bad copy. The site IS fast (it's a static-ish Next.js App Router app); what's missing is the right *feel*, which is mostly about navigation feedback rather than raw load time.

## Branch

`probe/nav-perf-investigation`

Before any work: `git fetch && git checkout main && git pull`, confirm HEAD includes the cp-05a merge, then branch.

## What the user is observing

Click any link in the nav bar from any page. For ~2 to 4 seconds, nothing visibly happens. The cursor returns to a hover state, but the current page stays on screen unchanged. Then the new page appears, sometimes with a brief flash where the old data table disappears before the new one renders.

This is the classic symptom of two coupled problems:

1. Server components for the next route are doing nontrivial work at request time.
2. No `loading.tsx` boundaries exist, so Next.js renders nothing visible until the server components are fully ready.

Together they produce "click does nothing → page swaps abruptly," which feels broken even on a fast network.

## A finding I already have for you

I grepped for `loading.tsx` under `website/src/app/` and there are **zero matches**. Every route in the App Router relies on the parent layout staying on screen until the child segment is ready. That alone is almost certainly the dominant cause of the perceived hang. Your job is to confirm this with measurement (not assumption), and to find the second-order causes that would still leave the navigation feeling slow even after loading states ship.

## Pre-work (measurement)

Run all measurements against **production** (`https://45analytics.com`) and **local dev** (`pnpm dev` from `website/`). Comparing the two tells us whether the slowness is data-fetch latency or runtime work.

1. **Cold and warm timings per route.**
   - Start with a fresh browser (no cache, no localStorage).
   - Navigate to `/`. Open Chrome DevTools, Performance tab, Network tab with "Disable cache" checked.
   - Click each nav link in order: Overview, Matches, Ledger, Bracket, Vault, Scenario Simulator, Today's Brief.
   - For each navigation, record:
     - Time from click to first visible change.
     - Time from click to interactive (clicks register again, scroll responds).
     - Total bytes transferred for that navigation.
     - The longest-running task during the navigation.
   - Repeat with a warm cache and note the delta.

2. **Server-side timing.**
   - On dev, instrument the page render path: add a `console.time` / `console.timeEnd` around `loadEvaluationMetrics`, `resolveSnapshotPickerState`, `loadSnapshot`, and any other server-only data accessor called by the page. (Remove the instrumentation before commit; this is temporary.)
   - Note which accessor takes the most wall time per route.

3. **Use Playwright for repeatable timing if helpful.**
   - The repo has Playwright configured (`playwright.config.ts`). You can write a throwaway `.spec.ts` that loads the homepage, navigates to each route, and records `performance.timing` or `performance.getEntriesByType('navigation')`. Spec lives under `tests/perf/` temporarily and gets deleted before commit. This is optional; manual DevTools measurement is fine if it's faster.

## Inventory

Produce a table covering every route under `website/src/app/` that has a `page.tsx` or `page.mdx`. Columns:

| Route | Component type | Loading state | Server data calls | Suspense boundaries | Client bundle hot path |
|---|---|---|---|---|---|

- **Component type**: server (default) / client (`"use client"` at top) / mixed
- **Loading state**: does a sibling `loading.tsx` exist?
- **Server data calls**: which functions from `src/lib/data/` does it call at request time? (e.g. `resolveSnapshotPickerState`, `loadEvaluationMetrics`)
- **Suspense boundaries**: any `<Suspense>` wrappers in the page or layout?
- **Client bundle hot path**: which heavy modules does it pull in (recharts, mdx, mermaid, etc.)?

This inventory is the spine of the report. The rest of the document references rows of this table.

## Hypotheses to confirm or rule out

For each hypothesis, state: confirmed / ruled out / inconclusive, with the evidence.

- **H1 — Missing `loading.tsx`.** Already strongly suspected from the grep. Confirm: navigate to a route, observe whether the parent layout stays without any pending UI between click and route paint. Expected confirming behaviour: no visible change at all for the entire route-render duration.
- **H2 — Synchronous disk reads at request time.** `src/lib/data/snapshotPicker.ts` uses `readdirSync` and `readFileSync`. On Vercel serverless functions, file reads from `public/data/snapshots/` can be 50 to 200ms per call depending on cold-start state. If a single request triggers multiple reads (the picker enumerates ALL snapshots), that adds up. Confirm by instrumenting and counting per-request file ops.
- **H3 — `next/link` prefetch is off on the nav bar.** Find the nav bar component (start with `src/components/layout/EditorialMasthead.tsx`). Check whether `<Link prefetch={false}>` is set anywhere. Default is on; explicit disable would be a smoking gun.
- **H4 — Heavy client bundles loaded synchronously on route boundary.** Routes that import recharts, MDX renderers, or mermaid pay a JS parse cost even on prefetched navigations. Inventory above captures this; quantify with the Next.js build output (`pnpm build` then read `.next/analyze` or use `@next/bundle-analyzer` if available).
- **H5 — External fetches at request time.** Any route that calls an external API (the email subscribe endpoint, an analytics service, etc.) at SSR time will block until the API responds. Search for `fetch(` and `httpx` / `axios` in route files. Likely none, but worth confirming.
- **H6 — Vercel cold-start cost.** If the route is rendered by a serverless function and that function was idle, the first request after idle takes 200 to 500ms just to boot. Compare warm vs cold timings to estimate the share of total latency attributable to cold start.

## Output

A markdown document at `docs/perf/nav-perf-2026-05-27.md` (create the directory). Structure:

```
# Navigation performance investigation

## Summary
- One paragraph naming the slowest route and the top-priority fix.

## Reproduction
- Steps + screenshots / perf trace exports + Playwright spec output (if used).

## Measurements
- Table of cold and warm timings per route.
- Table of server-side accessor timings.

## Route inventory
- The table from the Inventory section above.

## Hypothesis results
- Each H1 to H6 with verdict and evidence.

## Confirmed root causes
- Ranked. Each named root cause names: (a) the file or pattern, (b) the measurement that confirms it, (c) the proposed fix, (d) expected impact in milliseconds saved or feel-improvement language.

## Ranked fix proposals
- 3 to 5 fixes, each with: scope (1 to 3 lines of code, single file, multi-file refactor), expected impact, risk, suggested order. The top item should be the highest-impact-lowest-risk fix.

## Out of scope (for the follow-up checkpoint to consider)
- Anything you uncover that's adjacent but not on the critical path.
```

Cite specific file paths and line numbers throughout. The document is the artifact a follow-up checkpoint will consume; treat it like a spec, not a write-up.

## Conventions

- Save measurements in the doc with units explicit (ms, KB, MB).
- No em or en dashes. Use periods, semicolons, parentheses.
- File paths absolute from the repo root.
- If you use Playwright, the spec gets deleted before commit. The doc is the durable artifact.
- If you instrument server code with `console.time`, the instrumentation gets reverted before commit. The doc is the durable artifact.

## Out of scope (do not do this)

- **Do not implement any fixes.** Not even "this one is a 2-line change, I'll just do it." The follow-up checkpoint will do the implementation under its own readiness checklist.
- Do not touch any data file (`public/data/**`), workflow, or pipeline script.
- Do not edit the simulation engine, the OSF artifacts, or any vault content.
- Do not add new dependencies. Performance work later may add `@next/bundle-analyzer` as a dev dep; that's the follow-up checkpoint's call.
- Do not change `next.config.js` or `tsconfig.json` in this branch.

## Verification

Before you mark this checkpoint ready:

- [ ] `docs/perf/nav-perf-2026-05-27.md` exists and contains all sections named above.
- [ ] Every hypothesis has a verdict, not just "TODO."
- [ ] Cold-vs-warm timings are recorded for at least four routes.
- [ ] The route inventory table is complete (every `page.tsx` and `page.mdx` is listed).
- [ ] The ranked fix proposals name files and lines, not just patterns.
- [ ] No production code is modified. `git diff --stat origin/main..HEAD` shows only the new markdown file (and possibly a deleted Playwright spec or temporary instrumentation that you reverted; net: one file added).
- [ ] Branch is `probe/nav-perf-investigation`, off latest main, single commit, ready to PR for review (not for merge into main; this is a documentation PR).

## Merge-readiness checklist

Answer each with `Y` or `N`:

```
Y/N — Reproduction steps documented and verified end to end.
Y/N — Cold and warm timings recorded for the seven nav routes.
Y/N — Server-side accessor timings recorded for at least the three slowest routes.
Y/N — Route inventory table is complete.
Y/N — Every hypothesis (H1 to H6) has a verdict with evidence.
Y/N — Ranked fix proposals name specific files and lines.
Y/N — No production code modified; only the new markdown file is in the diff.
Y/N — Document is at docs/perf/nav-perf-2026-05-27.md.
Y/N — Branch is probe/nav-perf-investigation, single commit, off latest main.
```

If every item is `Y`, open the PR as draft for review (not for merge). I'll read the findings and write the fix-checkpoint prompt from there.

If any item is `N`, explain what's outstanding and stop.

## A note on judgement

The temptation will be strong to fix things as you find them, especially the `loading.tsx` gap, which is a one-file-per-route addition. Resist. The measurement is more valuable than the fix because it tells us what the *second*-order causes are (the ones we'd still need to address after loading states ship). If you fix as you go, you lose the ability to attribute later improvements to specific changes. Measure first, fix second, in two separate PRs.
