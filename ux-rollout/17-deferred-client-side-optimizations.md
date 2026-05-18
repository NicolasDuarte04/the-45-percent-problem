# Checkpoint 17: Deferred client-side optimizations (P2 from audit)

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). Checkpoint 16 (performance audit and optimization) shipped and merged. It addressed the server-side, network-side, and CDN-side wins: batched DB writes, flag sprite, cache headers, font cleanup, env-driven pool max.

What 16 deliberately deferred were the client-side items the audit flagged as higher-risk because they touch user-visible rendering paths. These are the optimizations that directly reduce client JS execution time and time-to-interactive on mobile. The user's stated pain ("the site feels slow") is most directly addressed by this checkpoint, not by 16.

The agent who completed 16 wrote an audit document at `ux-rollout/16-audit-findings.md` documenting each P2 item, the proposed approach, and the estimated effort. Read that document in full before starting any implementation. It is the source of truth for what is wrong and what is proposed; do not re-derive the analysis.

## How you should approach this work

Same framing as checkpoint 16: hostile review, no preserving feelings. The audit document told us what is wrong. This checkpoint is the treatment.

Two important differences from 16:

1. **Measurement is required this time, not optional**. The acceptance criteria include Lighthouse mobile scores for `/` and `/scenario/final-four` (before / after, slow 4G + mid-tier Android profile), plus first-load JS per route. If Turbopack does not expose the per-route data, use a different measurement path: `next-bundle-analyzer`, manual inspection of `.next/static`, or a deployed Vercel preview's Lighthouse run. Do not skip.

2. **Behavior parity is even tighter this round**. Checkpoint 16's only user-observable change was the flag sprite (visually verified pixel-identical). This checkpoint touches more user-visible surfaces (snapshot toggle behavior, Framer Motion animations, hero trophy). Every change must be verified for visual and behavioral parity. If a change produces ANY difference the user would notice, that is a regression unless the difference is explicitly approved.

## What to build

Execute the P2 items from `ux-rollout/16-audit-findings.md`. Below is my recommended priority order; if the audit document recommends a different order, follow the audit (it has more context). Either way, document the choice in the report.

### Priority A (biggest single wins)

**A1: Snapshot toggle → client island**. The audit identified this as the single biggest win because it lets `/` and `/bracket` return to static rendering for the default (current snapshot) view, restoring full CDN caching. Today they are `force-dynamic` solely because the snapshot query param drives a server-side re-render.

Approach (per audit): move the snapshot picker into a small client-component island. The default view (no query param) is fully static and CDN-cached. When the user clicks the picker, fetch the historical data via a client-side request to `/api/snapshots/list` plus a per-snapshot data endpoint (or the existing pages with the query param, but rendered client-side). The page itself stays static.

Verify: the default `/` and `/bracket` views are statically prerendered (build output shows ○ static, not ƒ dynamic). The snapshot toggle still works (clicking it updates the leaderboard/bracket data). The "Return to current" link still works.

**A2: ForecastDesk server-shell split**. The audit identified the `/me` Forecast Desk as a client component that should be split: the table chrome is static, the row data and the [Clear operator session] link are interactive. Today the whole component ships to the client.

Approach: server-render the chrome (page heading, eyebrow, column headers, empty-state copy, provenance footer). Mount a tiny client island for the interactive bits (the clear-session button; the desk_viewed Plausible event firing). The rows themselves are server-rendered data; no client hydration needed for the table body.

Verify: visual parity. The Forecast Desk renders identically. Click `[ Clear operator session ]`; it clears the cookie and reloads. The `desk_viewed` event still fires once per session.

### Priority B (medium wins, lower risk)

**B1: Framer Motion → CSS keyframes where possible**. The audit found multiple Framer Motion uses where simple CSS keyframes would deliver the same animation without the library cost. Candidates per the audit: the anticipation beat typewriter wrapper, the ghost-fill button accent pulse, possibly the live agreement gauge fill.

Approach: for each candidate, replace `motion.X` with a standard element plus a CSS class that triggers a keyframe. Reduce-motion media query handles the bypass. Test each animation pixel-by-pixel to confirm parity.

Do not touch animations that genuinely need Framer Motion's runtime logic (e.g., layout transitions, AnimatePresence-driven crossfades, scroll-triggered reveals). The audit document calls out which animations can move and which cannot; respect that distinction.

Verify: the anticipation beat still types out. The ghost-fill button still pulses. The live gauge still fills correctly. Reduce-motion users see the bypass.

**B2: Hero trophy WebP**. The home page hero loads a trophy SVG (`/assets/trophy_point_cloud.svg`). The audit found this asset is heavier than it needs to be because it is a vector with thousands of points; converting to WebP at the rendered size yields a much smaller file.

Approach: convert the SVG to a WebP at 2x the largest rendered display size (so it stays crisp on retina). Replace the `<img src="trophy.svg">` with a `<picture>` element offering WebP with PNG fallback. Verify visual parity at every display size.

Verify: hero loads correctly. The trophy is visually indistinguishable from before. The WebP is served on modern browsers, PNG fallback on older ones.

### Priority C (smaller wins, structural)

**C1: Home page Suspense**. The audit found that the home page blocks initial render on data that could be streamed. Wrap non-critical sections in `<Suspense>` boundaries with skeleton fallbacks.

Approach: identify which sections are below-the-fold and not load-blocking-critical. Wrap them. The hero, the leaderboard, and the modal bracket (above the fold) stay synchronous. The terminal dashboard, featured divergences, calibration strip, and research vault sections can stream.

Verify: above-the-fold content renders at the same speed or faster. Below-the-fold streams in without a layout shift. Loading skeletons match the visual rhythm of the final content.

**C2: KaTeX CSS scoping**. The audit found that the KaTeX stylesheet ships globally even though it is only used in vault essays. Scope its import to the vault pages.

Approach: move the KaTeX CSS import from a global layout file to a vault-specific layout. Verify equations still render in `/vault/*` pages and nothing in the simulator surfaces broke.

Verify: vault pages still render math correctly. Non-vault pages do not include KaTeX CSS in their bundle.

### Out of scope for this checkpoint

- **Recharts lazy-load**. The audit flagged this but the win is smaller and the risk of breaking chart pages is real. Defer to a future PR.
- **Any new UI changes**. This is performance work. No copy changes, no new components, no removed components.
- **Any change to behavior the user can see except where this prompt explicitly authorizes it**. The snapshot toggle moving to client-side will change its loading characteristic (data may take 100-300ms longer to update vs a full server re-render); this is acceptable and arguably better UX (no flash of empty state during navigation). All other changes must be invisible to the user.

## Acceptance criteria

- Audit document `ux-rollout/16-audit-findings.md` is read before any implementation.
- A1 (snapshot toggle → client island) shipped: `/` and `/bracket` are statically prerendered (build output confirms ○ static for default view).
- A2 (ForecastDesk server-shell split) shipped: server-rendered table chrome, client island for interactive bits.
- B1 (Framer Motion → CSS) shipped for the candidates the audit named, with pixel parity verified on each animation.
- B2 (hero trophy WebP) shipped with picture element and PNG fallback.
- C1 (home Suspense) shipped for below-the-fold sections, with skeleton fallbacks.
- C2 (KaTeX CSS scoping) shipped.
- **Lighthouse before/after numbers in the PR body**. Run against the Vercel preview deploy of this branch. Slow 4G profile, mid-tier Android. Capture FCP, TBT, LCP, Performance score for `/` and `/scenario/final-four`. Compare to the post-16 production numbers (run on production main as baseline).
- **First-load JS per route before/after** in the PR body. If Turbopack does not expose this, use any reliable measurement method and document the approach.
- TypeScript build clean.
- All 285 existing tests pass.
- Visual diff verification: screenshots of `/`, `/me`, `/scenario/final-four`, `/bracket`, `/scenario/p/[id]` before and after this PR. Pixel-identical on the surfaces that should not change; documented differences on the surfaces that the prompt explicitly allows to change (only the snapshot toggle loading behavior).
- No brand-language changes. No em-dashes. No betting language.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments.
- No betting language anywhere.
- No copy edits. This checkpoint changes how things render, not what they say.
- No removal of Plausible events. Stable event names and props.
- No new UI components. No removed UI components.

## Workflow conventions

- Work on a feature branch named `ux/checkpoint-17-deferred-client-side-optimizations`.
- Branch off latest `origin/main` (checkpoint 16 is merged).
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already.
- Verify end-to-end on the dev server before opening the PR:
  - Submit a prediction in each of the three modes; the permalink renders correctly.
  - Toggle the snapshot picker on `/` and `/bracket`; data updates correctly.
  - Open `/me` (after authenticating); the table renders, the clear-session link works.
  - Reload each of the major surfaces; visual parity on each.

## End-of-task report

```
## Checkpoint 17 Report: Deferred client-side optimizations

### Branch
ux/checkpoint-17-deferred-client-side-optimizations

### Items shipped (Phase 2 of the 16 audit)
For each of A1, A2, B1, B2, C1, C2:
  - What was the audit's diagnosis (cite ux-rollout/16-audit-findings.md line)
  - What you implemented
  - Mechanism (client island, CSS keyframes, WebP picture element, etc.)
  - Verification result (visual parity? functional parity?)

### Items deferred (and why)
For any A/B/C item not shipped:
  - Why it was risky
  - Proposed approach for a future PR

### Measurement: Lighthouse mobile
Slow 4G profile, mid-tier Android device profile, Vercel preview deploy.
  / : 
    Before (production main, post-16): Performance N, FCP Ns, TBT Nms, LCP Ns
    After (this branch preview): Performance N, FCP Ns, TBT Nms, LCP Ns
  /scenario/final-four :
    Before: Performance N, FCP Ns, TBT Nms, LCP Ns
    After: Performance N, FCP Ns, TBT Nms, LCP Ns

### Measurement: First-load JS per route
  / : N KB → N KB
  /scenario/final-four : N KB → N KB
  /me : N KB → N KB
  /bracket : N KB → N KB
  (continue for major routes)

### Measurement method
Document how you produced the numbers above (Turbopack output, manual inspection, bundle analyzer, etc.).

### Static rendering restoration
Confirm that build output shows the following as ○ static (not ƒ dynamic):
  - / (default view, no ?snapshot=)
  - /bracket (default view, no ?snapshot=)
Paste the relevant line from the build output.

### Files changed
- path/to/file (added | modified): one-line summary

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Visual diff verification
- [ ] / renders identically (screenshot before/after)
- [ ] /me renders identically
- [ ] /scenario/final-four renders identically
- [ ] /scenario/p/[id] renders identically
- [ ] /bracket renders identically (default view)
- [ ] Snapshot toggle still updates leaderboard (with documented loading-behavior change if any)
- [ ] All animations match pre-change behavior (anticipation beat, ghost-fill pulse, gauge fill)

### Tests
- [ ] All 285 existing tests pass
- [ ] New tests added for any new client island components

### Follow-ups / open questions
- Recharts lazy-load (deferred from this prompt, lower priority)
- Anything else you flagged

### Ready for review
Y / N
```

Do not push to main. Wait for review.

## What this delivers and how to test it

### What changes for the user

The site becomes faster on mobile in ways the user can actually feel:

- The home page (`/`) and the bracket page (`/bracket`) now serve from the CDN edge on the default view. Returning visitors see the page render before any JavaScript runs.
- The Forecast Desk at `/me` loads faster because the table body is server-rendered and the client bundle is much smaller.
- Animations on the simulator surfaces (anticipation beat, ghost-fill pulse, gauge fill) run via CSS keyframes instead of Framer Motion. Visually identical, much cheaper.
- The hero trophy on the home page loads instantly because it is now a small WebP rather than a heavy SVG.
- Below-the-fold content on the home page streams in rather than blocking the initial render.
- Vault essays still render math correctly; non-vault pages no longer ship KaTeX CSS they don't need.

One intentional behavior shift: the snapshot toggle now updates client-side rather than triggering a full server re-render. The user clicks the picker, sees a brief loading state on the data, and the table updates. This is slightly different from the current full-page transition but is arguably better UX (no flash of empty state, no scroll position loss).

### How to test it as the operator (Nicolás)

Before merging, on the Vercel preview deploy:

1. Open `/` on a real mobile device or Chrome DevTools mobile emulation with slow 4G throttling. Note the time from URL entry to fully interactive. Compare to the current production `/`. Should be visibly faster, especially on cold load.
2. Run Chrome DevTools Lighthouse on `/` (mobile profile). Performance score should be higher than the post-16 production baseline. The agent's report includes the exact before/after numbers.
3. Toggle the snapshot picker on `/`. The leaderboard should update without a full page reload. There should be a brief loading state (~200-500ms) on the data rows while the new snapshot fetches.
4. Open `/me` (authenticate first via an alert email if needed). The table should render almost instantly. Click `[ Clear operator session ]`; cookie clears, page reloads to unauthenticated state.
5. Open `/scenario/final-four`. Click `[ Start from the model's call ]`. The slots fill instantly. Submit. The permalink loads. The anticipation beat types out as before; the Reality Score reveals as before.
6. Open `/bracket`. The matrix renders. Toggle the snapshot picker; matrix updates client-side.
7. Open a vault essay (e.g., `/vault/methodology`). Math equations render correctly via KaTeX.

After merging to production:

8. Run Lighthouse on production `/` and `/scenario/final-four` (mobile profile). Performance scores should match or exceed the preview numbers from the agent's report.
9. Check the Vercel deployment logs. Both `/` and `/bracket` (default view) should appear as statically prerendered routes.

### How to test it as a simulator user

Same flows as before; everything should work identically. If you notice any visual difference, animation that no longer plays, layout that has shifted, or interaction that behaves differently, that is a bug. The PR's commitment is full behavioral parity with one exception: the snapshot toggle's loading characteristic (now client-side).

### If something feels wrong after merge

The PR's audit + measurement section gives you concrete numbers to verify against. If production performance does not match the agent's preview numbers, investigate the deployment first. If a visual regression appears, file it citing the specific surface and the agent will fix in a follow-up.

### What's next after this lands

The performance work concludes. Remaining items in the rollout queue:
- Staging verification of the calibration pipeline (data layer + emails + ingestion) before kickoff
- Optional polish (mode-specific anticipation copy, Champion's Path schema rename, root CLAUDE.md em-dash sweep)
- The actual tournament starts and the system runs itself
