# Checkpoint 16 — Phase 1 Audit Findings

Date: 2026-05-18
Branch: `ux/checkpoint-16-performance-audit` (off `origin/main` at `5b5e392`)
Scope: performance audit only; no code changes in this commit.

Treat this as a hostile review. Every finding is cited at `path/file.ts:line` so the fix work in Phase 2 has a single source of truth.

## Build environment notes

- Next.js 16.2.4 with Turbopack. `next build` no longer prints the per-route Size / First Load JS column; the `app-build-manifest.json` artifact is also gone. To get clean before / after first-load JS numbers in Phase 2 we will either disable Turbopack for the measurement build or set up `@next/bundle-analyzer`.
- Build baseline (rootMain + polyfills, minified, not gzipped): **555.9 KB raw** across 7 chunks shared by every route. That is a high floor independent of any single page.
- Top chunk files by size (`.next/static/chunks/*.js`, raw / minified):
  - 348.4 KB · `0993lp06bfk48.js`
  - 348.4 KB · `0la0-x5-inv_g.js`
  - 282.4 KB · `0l~hd-o_wijfp.js` (x3 chunks around this size)
  - 221.2 KB · `0.kzbghsa-xls.js`
  - 134.3 KB · `0g~iczxeu~c-v.js`
- All routes still build green. 242 static pages generated in 1.18 s. TS clean.

## Verified-vs-claimed

Two things from the subagent reports needed cross-checking:

1. **One subagent claimed the snapshot toggle is architecturally broken** because `/` and `/bracket` have no `export const dynamic` and therefore render statically. **This is wrong.** The build table shows `ƒ /` and `ƒ /bracket` (Dynamic, server-rendered on demand). Next.js 16 auto-promotes any page that awaits `searchParams` to dynamic rendering. The toggle works correctly today; the cost is a full server re-render per click, which is precisely the optimization opportunity (see Dim 3 below).
2. The evaluator and ingest N+1 patterns were verified against the source. Both are real and severe.

## Dim 1 — Client bundle size by route

**Cannot deliver exact per-route numbers without re-instrumenting the build.** Turbopack in Next 16 dropped the Size column and the per-route manifest format. Phase 2 will switch to `next build --webpack` (or add `@next/bundle-analyzer`) before applying fixes so we can publish concrete before / after numbers.

What we can say from chunk inspection:
- 555.9 KB baseline ships on every route. That is high and is the first lever to pull.
- Two ~348 KB chunks dominate. Heaviest suspects given the import map: Framer Motion, `@dnd-kit/*`, Recharts. See Dim 7.

## Dim 2 — `"use client"` audit

73 `"use client"` directives across `src/`. None are mismarked in the trivial "should have been a server component" sense; every one of them touches a hook, an event handler, or a browser API. The real cost is what they pull into the client bundle.

**Top offenders by likely client-bundle weight:**

| File | Why it ships | Suggested action |
|---|---|---|
| `src/components/simulator/modes/ModeFullBracket.tsx:1` (~1425 LOC) | DnD state machine for 63 slots + Framer Motion | KEEP_CLIENT |
| `src/components/simulator/ForecastDesk.tsx:1` (~354 LOC) | Mostly static table; only `useEffect` + `track("desk_viewed")` are interactive | SPLIT_ISLAND — server-render the table, hydrate a tiny analytics island |
| `src/components/figures/ChampionEvolution/Chart.tsx:1` and 7 sibling charts | Recharts | LAZY_LOAD inside Suspense boundary; consider Observable Plot (already in deps) for sparkline-class charts |
| `src/components/simulator/reality/RealityScoreReveal.tsx:35` | Framer Motion for the anticipation beat | KEEP_CLIENT but consider CSS-only typewriter |
| `src/components/simulator/bracket/BracketTree.tsx:18` | Framer Motion for one-shot draw animation | KEEP_CLIENT |

**No "use client" is a clear bug.** The win comes from splitting `ForecastDesk` and lazy-loading the chart components, not from rewriting the directive itself.

## Dim 3 — Dynamic rendering audit

Verified state:
- `src/app/(editorial)/page.tsx` — no explicit `dynamic` export. Build classifies as `ƒ` (Dynamic) because the file does `const params = await searchParams` (line 32) and that single await forces dynamic rendering under Next 16 App Router.
- `src/app/(quant)/bracket/page.tsx` — same pattern, same result.

Per-request server work today on `/`:
- `await loadStructuralMaps()` — process-memoized in `src/lib/data/structuralMerge.ts:40-60`, so cost is effectively zero after the first request per worker. Good.
- `loadSnapshot(snapshotId)` — synchronous `fs.readFileSync` on JSON. Fast, but called on every request.
- `mergeTournament()`, `mergeDivergence()`, several component compositions.
- Plus whatever each section component renders.

**Optimization opportunity (P1, not P0):** the default request — no `?snapshot=` query — is the overwhelming majority of traffic and produces identical output for every visitor. Two ways to reclaim this:

a. Keep dynamic rendering but slap an HTTP cache header (`Cache-Control: s-maxage=300, stale-while-revalidate=600`) on the response. Smallest diff.
b. Move the picker to a true client island that fetches `/api/snapshots/[id]` (the route already exists at `src/app/api/snapshots/list/route.ts` — need to verify it accepts `[id]`), drop the `searchParams` await, and let the page go static again. Larger refactor.

Both preserve user behavior. (a) is the safe P1; (b) is a P2 architectural change.

## Dim 4 — Database query patterns (Phase B routes)

### Severe — evaluator N+1
File: `src/lib/sim/runEvaluator.ts:35-50` and `:65-90`.

```ts
for (const prediction of candidates) {
  const transitioned = await evaluateAndPersist(prediction, settled, opts);
  // ↑ does an await db.update(...) AND an await db.insert(...) per prediction
}
```

For 1000 alive predictions with transitions, this is **2000 sequential DB roundtrips inside a single request**. Vercel function timeout is 60 s. The admin match-outcome route calls this synchronously in the request path (`src/app/api/admin/match-outcomes/route.ts:147-149`), so the admin's response is blocked.

Fix: collect updates/log rows in memory, then issue one batched UPDATE (or a small number of CASE/WHEN batched updates) and one bulk INSERT. ~10 queries instead of ~2000. **Confirmed P0.**

### Severe — ingest N+1
File: `src/app/api/ingest/match-outcomes/route.ts:131-161`.

```ts
for (const data of outcomes) {
  await db.insert(matchOutcomes).values({...}).onConflictDoUpdate({...});
}
```

50 sequential upserts where a single `.values([...])` with `onConflictDoUpdate` would do. Followed by the evaluator above. **Confirmed P0.**

### Moderate — calibration dispatcher serialization
File: `src/lib/email/calibrationDispatcher.ts:128-197`.

- `hasAlreadyReceivedDigest` runs once per subscriber inside `for…await`. Idempotent by intent, but sequential.
- `sendCalibrationDigest` is also awaited per subscriber. For 100 subs that is 100 serial sends.

Fix: `Promise.all` the per-bundle sends with a small concurrency cap (e.g. p-limit of 5–10) to avoid hammering Resend. **P1.**

### Missing indices
Three indices worth adding (each ~15 minutes of work, all reversible):

| Table | Columns | Reason |
|---|---|---|
| `predictions` | `state` | Evaluator scans by `state IN ('alive','promoted')`; table grows quickly during the tournament. |
| `prediction_state_log` | `(prediction_id, evaluated_at DESC)` | Evaluator and digest both key on prediction_id then order by recency. |
| `send_log` | `(subscriber_id, digest_date) WHERE event_type = 'calibration_digest'` | Partial index speeds the idempotency check above. |

**P1.** Add as a single Drizzle migration.

## Dim 5 — Flag SVGs

- 48 SVGs in `public/assets/flags/`. Combined **329,849 bytes** ≈ 322 KB. Average ~6.9 KB per flag, range 225 B (`ned.svg`) → 7140 B (`bra.svg`).
- Rendering primitive: `src/components/primitives/Flag.tsx:20-32` — plain `<img loading="lazy" decoding="async">`. Best-practice for off-screen flags; on the team-picker grid most flags ARE on-screen so `loading="lazy"` does not help.
- Picker grid: `src/components/simulator/TeamPickerGrid.tsx:148` instantiates 48 `<Flag>` simultaneously on every simulator mode page.
- 48 separate HTTP requests on first paint. With HTTP/2 multiplexing the wire cost is ~100 ms on 4G but the kernel of work (decode + paint) doesn't disappear.

**Fix path:** convert `/public/assets/flags/` into a single sprite (`flags.svg` with `<symbol id="ARG">…</symbol>` per team) and change `Flag.tsx` to render `<svg><use href="/assets/flags.svg#${code}" /></svg>`. One request, ~322 KB total payload (vs. ~322 KB across 48 requests today — same bytes, far fewer round-trips), and the sprite caches across pages. **P1.**

## Dim 6 — Third-party scripts

- `https://plausible.io/js/script.tagged-events.js` loaded with `next/script` `strategy="afterInteractive"` at `src/app/layout.tsx:63`. Custom events enumerated at `src/lib/analytics/track.ts` need the `tagged-events` variant — plain `script.js` would not support `window.plausible(name, { props })` calls. Keep as is.
- `@vercel/analytics/next` `<Analytics />` rendered at `src/app/layout.tsx:67`. Tiny client weight, async. Keep.
- `@import "katex/dist/katex.min.css"` is in `src/app/globals.css:3`, ships globally even on routes that never render math. **P1** to scope to vault essays only.

No blocking third-party scripts. Nothing to remove.

## Dim 7 — Heavy libraries

### Framer Motion — biggest single contributor
~150 KB gzipped, used in 17+ files (most under `src/components/simulator/...` and `src/lib/motion/`). Critical usages:
- `RealityScoreReveal.tsx:35`
- `LiveAgreementGauge.tsx:26`
- `ModeFinalFour.tsx:29`, `ModeChampionsPath.tsx:29`, `ModeFullBracket.tsx:27`
- `BracketTree.tsx:18`, `BracketConnectors.tsx:33`
- `TeamPickerGrid.tsx:19`, `TeamGrid.tsx:26`

The anticipation typewriter and gauge fill are CSS-keyframe candidates. The bracket draw and mode-screen motion are harder to replace. Not a P0; consider for follow-up if Lighthouse points the finger.

### @dnd-kit/core + utilities — ~35 KB gzipped
Used only on simulator mode pages (`ModeFinalFour`, `ModeChampionsPath`, `ModeFullBracket`, `TeamPickerGrid`, `DroppableSlot`). Already route-scoped. No action needed for now; lazy import via `next/dynamic` is a P2 if the simulator entry pages need to shed weight.

### Recharts — ~40 KB gzipped (likely larger uncompressed)
8 chart files import Recharts. None of them are on the home page or simulator critical path; they live under `figures/` (vault, methodology, about). Two checks:
1. None of these chart components ship to `/` or `/scenario/*` — confirm with bundle analyzer in Phase 2.
2. `HistoricalChampionSparkline` and `ChampionEvolution` sparkline could use Observable Plot (already in deps) for ~half the weight.

### React Email — CRITICAL CHECK PASSED
`@react-email/components` and `@react-email/render` are imported by:
- `src/emails/*.tsx` (template components — never mounted in the React tree)
- `src/lib/email/*.ts` (server-only)
- `src/app/briefs/[date]/page.tsx:4` (server route, no `"use client"`)

**Zero client-bundle exposure.** No fix required. Confirmed by grep.

### lucide-react — ~3 KB effective
Two named imports (`XIcon`, `Info`). Tree-shaken cleanly. No action.

### Sim logic (`computeRealityScore`, `predictionEvaluator`, `groupStandings`, `snapshotProbs`)
None carry `"use client"`. They are pure utility modules. `LiveAgreementGauge` calls `computeRealityScore` on each drop event — verified ~1-5 ms work, acceptable.

## Dim 8 — Render-blocking patterns on `/`

`src/app/(editorial)/page.tsx`, ~279 lines:

- Line 32: `await searchParams` — auto-forces dynamic rendering. Unavoidable while the snapshot toggle is server-driven; see Dim 3 for the architectural option.
- Line 38: `await loadStructuralMaps()` — already process-memoized. Effectively free after the first call.
- Line 39: `loadSnapshot(snapshotId)` — synchronous file read. Fast.
- Below-fold sections (`TournamentLeaderboard`, `MostLikelyBracket`, `RecentWritingList`, `FeaturedDivergences`, terminal CTA) all render in the same server pass. None are wrapped in `<Suspense>`. They block the response until every section's data resolves.

**Two low-risk wins:**
1. Wrap `RecentWritingList` (filesystem MDX scan) in a Suspense boundary so the hero + leaderboard ship as soon as they're ready. **P1.**
2. Add `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` to `/` when the request has no `?snapshot=` parameter. Cuts effective TTFB to CDN-edge speed for >95 % of traffic. **P0.**

## Dim 9 — Image and font loading

### Hero trophy point-cloud — 419,399 bytes (~410 KB)
`public/assets/trophy_point_cloud.svg`. Rendered by `HeroGraphic.tsx:19` via `next/image` with `priority` AND `unoptimized`. The `unoptimized` flag bypasses Next's image pipeline, so the raw 410 KB SVG ships even on mobile.

For an above-the-fold decorative element this is the single largest static asset on the home page and a meaningful LCP drag. Options:
- Pre-render to WebP at 2x of display size (~60–80 KB).
- Convert to inline `<svg>` and minify aggressively (SVGO usually 50–70 %).
- Lazy-load past 768 px (it's already `hidden md:block`).

**P1.** Not P0 because changing the rendering path risks visual diff; treat as a focused follow-up.

### Fonts
`src/app/layout.tsx:8-26` loads three Google fonts via `next/font/google`:
- Inter — weight 400, subset `latin`, axes `["opsz"]`. The optical-sizing axis adds variants; verify it's actually used in CSS.
- JetBrains Mono — weight 400, subset `latin`. Fine.
- Source Serif 4 — weights `["300","400","500","600","700"]`. Grep of `globals.css` shows only 400 and 600 in use. **Three unused weights** ship today.

`public/fonts/JetBrainsMono-Regular.ttf` (264 KB) and `public/fonts/SourceSerif4-Regular.otf` (236 KB) also exist on disk. Likely dead — they duplicate the Google-loaded variants and aren't referenced from CSS that I could find. Worth confirming and deleting. **P1.**

### OG image
`src/app/api/og/scenario/[id]/route.tsx` — `revalidate = 3600` plus `Cache-Control: public, max-age=3600, s-maxage=3600, immutable`. Correct. Each unique scenario still triggers a fresh Satori render (~500-800 ms) on first hit; no action recommended unless social traffic spikes.

## Dim 10 — Database connection pool

`src/lib/db/index.ts:1-36`. Postgres.js driver (`postgres` v3.4.9), single client cached on `globalThis`, config `{ prepare: false, max: 1 }`.

`max: 1` is the headline finding. With one connection per Vercel function instance, two concurrent requests (e.g. ingest cron + admin match-outcomes) **serialize on a single TCP connection**. Combined with the evaluator's 2000-roundtrip loop and the ingest's 50-upsert loop, the system has multiple compounding bottlenecks during a matchday.

Recommendations:
- Bump `max` to 3–5 (verify against the Vercel Postgres tier connection limit).
- Re-evaluate `prepare: false` — prepared statements would shave 5–10 % off per-query latency for the read-heavy paths. Only safe to enable if the driver is confirmed compatible with Vercel's Postgres pooler.

**Bumping `max` is P0** if we can confirm the connection-limit headroom; otherwise P1.

---

# Phase 2 priority queue (what I want to fix next)

Based on the above, here is what I'd actually do in Phase 2. **Awaiting greenlight before touching code.**

### P0 — fix now, low risk, large win

1. **Batch the evaluator's UPDATE/INSERT writes.** `src/lib/sim/runEvaluator.ts`. Reduce ~2N roundtrips to ~2. Behavior-preserving; the evaluator still produces identical state-log rows. Adds one new unit test for batched-write equivalence. Effort: ~2 hours.
2. **Batch the match-outcome ingest upsert.** `src/app/api/ingest/match-outcomes/route.ts:131-161`. Single `.values([...]).onConflictDoUpdate(...)`. Effort: ~30 min.
3. **Add `Cache-Control: s-maxage=300, stale-while-revalidate=600`** on `/` and `/bracket` when no `?snapshot=` is present. Effort: ~30 min. Reversible.
4. **Bump Postgres `max` from 1 to 3** if we can confirm the Vercel plan headroom. Effort: 1 line + spot-check. (If we cannot confirm, defer to P1.)

### P1 — fix now if I have time, otherwise stage to a follow-up

5. **Add three indices** (`predictions.state`, `prediction_state_log(prediction_id, evaluated_at DESC)`, partial `send_log(subscriber_id, digest_date)`). Single Drizzle migration. Effort: ~30 min.
6. **Parallelize the calibration digest sends** with `Promise.all` + a 5-concurrency limiter. Effort: ~45 min.
7. **Sprite-ify flag SVGs.** New `public/assets/flags.svg`, update `Flag.tsx` to use `<svg><use>`. Visual diff: should be zero. Effort: ~2 hours.
8. **Drop the three unused Source Serif 4 weights**, scope KaTeX CSS to vault essays, audit `public/fonts/*` for actually-loaded files. Effort: ~1 hour.
9. **Wrap below-the-fold sections in `<Suspense>` on `/`.** Effort: ~1 hour.

### P2 — document and defer

10. **Move the snapshot toggle to a client island** so `/` and `/bracket` can drop the `searchParams` await and return to fully static. Larger refactor, touches multiple files, needs careful behaviour parity test for the deep-link case (`/?snapshot=2026-05-10`). Effort: ~1 day. Recommended as a Checkpoint 17 follow-up.
11. **`ForecastDesk` server-shell + analytics island split.** Effort: ~3 hours. Defer because the existing component works and the win is small.
12. **Replace Framer Motion typewriter / gauge with CSS keyframes.** Visual risk. Defer.
13. **Pre-render hero trophy to WebP and lazy-load past 768 px.** Visual diff risk; defer to a focused asset-optimization PR.
14. **Lazy-load Recharts chart components** in figure pages. Defer; the impact is on editorial pages, not the simulator critical path.

### Measurement plan (still required to publish before/after numbers)

For Phase 2 I will:
- Switch the Phase 2 build to `next build --webpack` (or temporarily set `experimental.turbopackBuild = false`) so the Size column comes back.
- Extend `lighthouserc.js` to cover `/scenario/final-four`, `/scenario/p/[id]`, and `/me`.
- Capture before/after first-load JS per route and Lighthouse mobile scores for `/` and `/scenario/final-four`.

---

End of Phase 1.
