# Checkpoint 16: Performance audit and optimization

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). Fifteen checkpoints have shipped over the last several weeks. Major surfaces ship: the home page Final Four inline picker (checkpoint 6), the snapshot toggle (10), the reverse rarity explorer (11), the Forecast Desk (8), the calibration email pipeline (13 + 14), live ingestion (15). The site works end to end.

The site also feels slow. Page transitions are noticeably draggy on mobile, the home page TTI is longer than it should be, and the simulator surfaces feel heavier than the brand demands. This checkpoint addresses that directly.

The work was built incrementally across 15 prompts. Each prompt was scoped tightly; the cumulative effect on the client bundle and the render path was never audited holistically. Now is the time.

## How you should approach this work

Treat this as a hostile code review. You are not validating the previous 15 checkpoints; you are finding what is wrong with them.

Specific framing:

- Assume the rollout produced code that is functional but unoptimized. Performance was not a design constraint on any of the previous prompts.
- Look for bundle bloat, unnecessary client components, redundant network requests, redundant database queries, missed caching opportunities, blocking renders, and any architectural choice that prioritizes correctness over efficiency.
- Do not soften your findings. If a component should have been a server component, say so. If a library import is too heavy for what it delivers, say so. If a `"use client"` directive was added defensively when the component could be static, say so.
- Do not protect any decision from earlier checkpoints. The brand discipline (no em-dashes, no betting language, etc.) is non-negotiable; everything else is up for review.
- The deliverable is "the site feels faster" and the measurement is concrete: bundle sizes, lighthouse scores, time to first byte, time to interactive.

## What to build

Two phases in one PR. Audit first, then fixes. Document the audit in the report so the user can see what you found before they review what you changed.

### Phase 1: Audit

Investigate every performance dimension. Produce findings; do not yet fix.

**Required scope** (you must look at all of these):

1. **Client bundle size by route**. Run `pnpm build`, parse the build output, and report:
   - Total first-load JS for `/`, `/scenario`, `/scenario/final-four`, `/scenario/champions-path`, `/scenario/full-bracket`, `/scenario/explore`, `/scenario/p/[id]`, `/me`, `/bracket`, `/terminal`.
   - For each route over 200 KB first-load JS: which library or component is the biggest contributor.
   - Any route whose first-load JS grew significantly after checkpoint 6 (inline Final Four on home).

2. **`"use client"` audit**. Walk every file with the directive. For each, determine:
   - Is it actually client-interactive (hooks, event handlers, browser APIs)?
   - Could it be a server component if you removed one or two hooks?
   - Could it be split: a server-component shell with a small client-component island for the interactive bit?
   - List the top 5 offenders by client-bundle weight.

3. **Dynamic rendering audit**. The home page (`/`) and `/bracket` were demoted from `force-static` to `force-dynamic` in checkpoint 10 to support the snapshot toggle. Are they actually re-rendering per request, or could the snapshot toggle be moved to a client-component island leaving the page static? Quantify the impact: what is the per-request server cost today?

4. **Database query patterns**. The new routes in checkpoints 13 and 14 (`/api/admin/match-outcomes`, `/api/cron/eval-predictions`, `/api/cron/calibration-digest`, the dispatcher) do joins and bulk evaluations. Audit:
   - N+1 query patterns.
   - Missing indices.
   - Bulk reads that should be paginated.
   - Sequential awaits that could be parallel.

5. **Static asset loading**. The team picker grid renders 48 flag SVGs. Each is a separate request today (verified via `Flag` primitive at `website/src/components/primitives/Flag.tsx`).
   - Is this 48 separate requests or one sprite?
   - How big is each SVG? Combined?
   - Lighthouse impact of 48 parallel requests on first paint?
   - Could the picker grid lazy-load flags below the fold?

6. **Third-party scripts**. The site loads Plausible (`script.tagged-events.js`, swapped in checkpoint 1) and possibly Vercel analytics. Audit:
   - Total weight of third-party JS.
   - Whether `tagged-events.js` is needed or whether plain `script.js` plus a server-side event posting path would suffice.
   - Load-blocking impact.

7. **Heavy libraries**. The simulator imports:
   - `@dnd-kit/core` (drag-and-drop for the slot row)
   - `framer-motion` (anticipation beat, reveal animations, gauge fill, ghost-fill button transitions, layout transitions)
   - `react-email` and component primitives for email templates (these should NOT ship to the client)
   - Per-mode logic in `predictionEvaluator.ts`, `computeRealityScore.ts`, `groupStandings.ts`, etc.
   - For each: how much does it weigh in the client bundle, is it tree-shaken correctly, is it loaded only where actually used?

8. **Render-blocking patterns**. Walk the critical render path on `/` (the most-trafficked landing):
   - Are there sequential awaits on the server that could be parallel?
   - Is `loadSnapshot()` called more than once per request?
   - Does the snapshot toggle re-trigger any heavy server work?
   - Time to first byte: what is it today?

9. **Image and font loading**. The OG image route is request-cached for 1 hour; the in-page hero trophy SVG is served as a static asset. Audit:
   - Image format choices (SVG vs PNG vs WebP).
   - Font loading strategy (`next/font`? CSS @font-face? FOUT vs FOIT?).
   - Any unused font weights still bundled.

10. **Database connection patterns**. The Drizzle client setup: is there a single shared connection pool? Are connections leaked anywhere? In serverless contexts (Vercel), is the cold-start cost of the connection pool material?

### Phase 2: Fixes

After producing the audit, fix the high-impact, low-risk items. Defer high-risk items to a follow-up checkpoint with a clear rationale.

**Priority rules**:

- **P0 (fix now)**: any change that reduces first-load JS by >10% on a major route without changing behaviour. Any database query optimization that reduces request time by >100ms with confidence. Any cache header restoration that was lost incorrectly.
- **P1 (fix now if low-risk)**: client-component-to-server-component conversions where the interactive surface is small and isolatable. Lazy-loading of below-the-fold components. Sprite-ification of flag SVGs.
- **P2 (document, defer)**: anything that would require restructuring a major surface, breaking an API, or removing a library. These get documented in the report with the proposed fix and estimated effort; do not implement.

**Behaviour constraints**:

- **Zero user-visible UI changes**. No new components, no removed components, no visual treatment changes. Performance fixes only. If a fix would change the visible UI, defer to P2 and document.
- **Zero brand-language changes**. No em-dashes introduced. No betting-language changes. No copy edits.
- **Zero test removal**. Existing tests must still pass. Add new tests for any new helpers introduced.
- **Behaviour parity for the simulator**. A user submitting a prediction before this PR and after this PR should land on the same permalink with the same data. Any divergence is a bug.

**Specific fixes that are likely in scope** (audit first, then implement only if your findings confirm the issue):

- Move the snapshot toggle to a client-component island so `/` and `/bracket` can return to static rendering for the default (current snapshot) view. Snapshot toggle navigations would then trigger a client-side fetch rather than a server re-render.
- Lazy-load `@dnd-kit/core` in the mode pickers via dynamic import; the library only runs in the simulator modes, not on the home page.
- Inline the 48 flag SVGs as a sprite or convert to a single combined SVG with `<symbol>` references.
- Convert any client-component that does not actually use client APIs back to a server component.
- Verify React Email templates are not in any client bundle.
- Restore `Cache-Control` headers on routes that lost them during the rollout.
- Add database indices for any frequent query pattern surfaced by the audit.

## Acceptance criteria

- A complete audit report (Phase 1) in the PR description, with file:line citations for every finding.
- Fixes implemented for all P0 and P1 items the audit surfaces.
- P2 items documented in the report with proposed fix and estimated effort.
- Concrete before/after numbers: first-load JS per major route, time to first byte for `/`, Lighthouse score for `/` and `/scenario/final-four` on mobile.
- TypeScript build clean.
- All 280 existing tests pass.
- No user-visible UI changes (verified by visual diff or screenshot comparison of all major surfaces).
- No brand-language changes.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments.
- No betting language anywhere.
- No copy edits. This checkpoint changes how things render, not what they say.
- No removal of telemetry events. Plausible event names and props stay stable; the rollout has been measuring with them for weeks.

## Workflow conventions

- Work on a feature branch named `ux/checkpoint-16-performance-audit`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already.
- Verify end-to-end on the dev server before opening the PR:
  - All 15 prior checkpoints' user-visible behaviour still works exactly as before.
  - The simulator submission flow at each mode still routes to the correct permalink.
  - The snapshot toggle (now possibly client-side) still updates the leaderboard and bracket data correctly.
  - The calibration email cron still dispatches.

## End-of-task report

When the work is complete, produce a report in this format:

```
## Checkpoint 16 Report: Performance audit and optimization

### Branch
ux/checkpoint-16-performance-audit

### Audit summary (Phase 1)
For each of the 10 audit dimensions, paste the findings with file:line citations. This is the most important part of the report; do not skip it.

### Before/after numbers
Paste these numerics:

  First-load JS per route (KB):
    / : N → N
    /scenario : N → N
    /scenario/final-four : N → N
    /scenario/champions-path : N → N
    /scenario/full-bracket : N → N
    /scenario/explore : N → N
    /scenario/p/[id] : N → N
    /me : N → N
    /bracket : N → N
    /terminal : N → N

  Time to first byte for / (ms):
    Before : N
    After : N

  Lighthouse mobile score for / :
    Before : Performance N, FCP Ns, TBT Nms, LCP Ns
    After : Performance N, FCP Ns, TBT Nms, LCP Ns

### Fixes applied (Phase 2)
For each fix:
  - What it was
  - Files changed
  - Mechanism (server-component conversion, lazy import, sprite, cache header, etc.)
  - Measured impact

### P2 items deferred
For each:
  - Why it is risky to do now
  - Proposed approach for a future PR
  - Estimated effort

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Visual diff verification
- [ ] Home page renders identically (paste before/after screenshots if available)
- [ ] /scenario/final-four renders identically
- [ ] /scenario/p/[id] renders identically
- [ ] /me renders identically
- [ ] /bracket renders identically

### Tests
- [ ] All 280 existing tests pass
- [ ] New tests added for any new helpers

### Follow-ups / open questions
- Anything you flagged but did not implement.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.

## What this delivers and how to test it

### What changes for the user

The user-facing behaviour stays identical. No new components, no removed components, no visual treatment changes. The site simply feels faster:

- The home page loads with less JS, paints sooner, and becomes interactive faster. On a mobile device this is the most visible improvement.
- Page transitions (home to /scenario, /scenario to a mode page, mode page to permalink) feel snappier because less work happens per navigation.
- The snapshot toggle on the home page and `/bracket` updates the table without a full page re-render (probably; depends on the audit's findings).
- The Forecast Desk at `/me` loads faster because the table no longer pulls in dependencies it does not need.
- Calibration emails fire on the same schedule with the same content.

### How to test it as the operator (Nicolás)

Pre-merge, on the staging deploy:

1. Open `/` on a mobile device (or Chrome DevTools mobile emulation, slow 4G throttling). Note the time from URL entry to "page is fully interactive." Compare to the current production site.
2. Open Chrome DevTools, Network tab. Reload `/` from a cold cache. Count: total requests, total bytes, time to DOMContentLoaded.
3. Open the simulator at `/scenario/final-four`. Click `[ Start from the model's call ]`. The slots should fill instantly.
4. Submit the prediction. The permalink should load within 2 seconds on slow 4G.
5. Open `/me` (after authenticating). The Forecast Desk table should render within 1 second.
6. Toggle the snapshot picker on the home page. The table should update without a full page reload (if the audit moved the picker to client-side); if it does full page reload, that is the deferred P2 case.

Post-merge, in production:

7. Lighthouse mobile audit on `/` should score above the pre-merge baseline. The agent's report includes the before/after numbers; production should match the "after."
8. Plausible should still receive all the existing events (`simulator_opened`, `first_pick`, `submit_success`, `share_action`, `alert_armed`, `promo_card_landed`, `desk_viewed`, `snapshot_toggle`, `explore_band_selected`, `explore_card_clicked`).
9. The hourly ingest cron and the two daily crons should still fire on schedule.

### How to test it as a simulator user

A simulator user should not be able to tell anything changed. Every flow works exactly as before. The only difference is that everything happens slightly faster.

If a user reports something looks different visually (a layout shift, a missing animation, a state that was visible before and now is not), that is a bug. The PR's commitment is zero visual change.

### If something feels wrong after merge

The PR includes before/after screenshots and Lighthouse numbers. If the production deploy diverges from the agent's reported numbers, the deployment is the issue, not the code. If a flow that used to work no longer works, file a bug citing the specific path; the agent should have caught it in visual diff verification.

### Coordination

This checkpoint touches a lot of files. The agent's report will be specific about what changed. Read the audit summary first; it tells you what was actually wrong with the rollout. Then read the fixes; they tell you what was changed and why.
