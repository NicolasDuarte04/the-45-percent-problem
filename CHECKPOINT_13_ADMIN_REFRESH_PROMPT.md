# Checkpoint cp-13 — Admin endpoint refresh (Fix 6, closes acceptance criterion #8)

Before reading this prompt, read these in order:

1. `WORKFLOW.md` at the repo root. The operating model.
2. `PLAN.md` at the repo root. Particularly the "Pending checkpoints" cp-13 entry, decision log Q2 (revalidate-on-write), and acceptance criterion #8.
3. `docs/audit/architecture-diagnostic-2026-06-03.md` §3.6 (admin endpoint doesn't refresh the public snapshot) and §5 Fix 6.
4. The cross-project briefs (`BRIEF_FOR_EL_VOTO_ARCHITECT_2026-06-05.md` + reply). The constraints still apply.

Prior shipped checkpoints on main: cp-04 through cp-12. CI gate is active per cp-10.2 — your PR will run pytest + smoke + tsc + vitest + `snapshot-deploy.yml`'s Validate/build/audit (since you touch `website/**`).

This is the last live-readiness checkpoint. After cp-13 ships and the T-1 dry run passes, the site is launch-ready.

## Goal

After this checkpoint ships:

- The admin endpoint at `website/src/app/api/admin/match-outcomes/route.ts` calls `revalidatePath('/bracket')` (and any related routes) after a successful match outcome upsert.
- The same revalidation also fires from the live-ingestion endpoint at `website/src/app/api/ingest/match-outcomes/route.ts` so the Football-Data.org hourly path triggers the refresh too.
- The nightly cron's final step (in `.github/workflows/nightly_pipeline.yml`) triggers the same `revalidatePath` call (likely via a `curl` to a tiny revalidation endpoint, or via the Vercel deploy hook that already fires).
- The bracket page stays `dynamic = "force-static"` per Q2 — we are NOT switching to `force-dynamic`. Revalidate-on-write preserves cp-06's performance work while giving us intra-day freshness.
- A manually-entered settled outcome via `/api/admin/match-outcomes` produces a visible change on `/bracket` within ~10 minutes (the revalidation is sub-second; the 10-minute slack covers Vercel CDN edge propagation worst-case).

Acceptance criterion #8 from PLAN.md is closed by this checkpoint.

## Why this matters

Right now (per the 2026-06-03 diagnostic §3.6), the admin endpoint upserts match outcomes into the database and calls `runEvaluatorAcrossPredictions`, but it does NOT trigger any refresh of the public snapshot files OR a revalidation of the bracket page. So a settled outcome entered via `/api/admin/match-outcomes` goes into the predictions evaluator (closing the loop for user predictions) but stays invisible on the public bracket page until the next nightly cron run.

During the tournament window — and particularly after the opening match on 2026-06-11 — settled outcomes will land via two paths:

1. **Live ingestion (hourly)** at `/api/ingest/match-outcomes`, fed by the GitHub Actions cron that polls Football-Data.org.
2. **Manual admin entry** at `/api/admin/match-outcomes`, the operator's fallback when Football-Data.org lags.

Both need to trigger a public-surface refresh. Without cp-13, the operator-as-safety-net pattern described in `website/CLAUDE.md:38-40` is broken: settled outcomes correctly drive predictions evaluation but the public bracket lies for up to 24 hours until the next nightly.

cp-13 closes the loop: settled outcomes → upsert → revalidate → fresh bracket within minutes.

## Branch

`cp-13-admin-endpoint-refresh`

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes cp-12's merge. Working tree clean. Branch off main.

If your primary worktree is on a `session-*` branch with uncommitted El Voto work (likely given recent cadence), use a dedicated worktree as every recent cp-* did:

```bash
git worktree add ../wt-cp-13-admin-refresh origin/main
cd ../wt-cp-13-admin-refresh
git checkout -b cp-13-admin-endpoint-refresh
```

## Stage 1 — Inspection

Read-only investigation. Write inspection notes to `docs/onboarding/cp-13-inspection-notes.md`.

### Step 1: Read the admin endpoint and its current behavior.

```bash
cat website/src/app/api/admin/match-outcomes/route.ts
```

Capture:
- The current upsert logic.
- Where `runEvaluatorAcrossPredictions` is called.
- The success-response path.
- Any existing imports of `revalidatePath` (probably none).
- The authentication mechanism (the diagnostic notes it uses `BRIEF_DISPATCH_TOKEN`).

### Step 2: Read the live-ingestion endpoint.

```bash
cat website/src/app/api/ingest/match-outcomes/route.ts
```

Capture:
- The batch upsert logic (it processes multiple outcomes per call).
- The 207 Multi-Status handling for evaluator failures.
- The auth mechanism (`INGEST_TOKEN`).
- Symmetry vs the admin endpoint (per `website/CLAUDE.md`, both paths should behave the same on success).

### Step 3: Identify all the paths that need revalidation.

The bracket page is the obvious one (`/bracket`). But settled outcomes affect multiple surfaces:
- `/bracket` — per-round probabilities depend on settled results
- `/match/[matchId]` if such pages exist — individual match pages
- `/teams/[fifa_code]` — team pages may show settled vs. remaining games
- `/` (homepage) — may surface settled outcomes
- Any divergence / edge surface that references `tournament.json`

Grep for static routes:

```bash
grep -rn "export const dynamic" website/src/app/
grep -rn "revalidatePath\|revalidateTag" website/src/
```

Capture the list of routes that should be revalidated. The recommendation is to call `revalidatePath` once per route that's affected. If many routes are affected, consider whether `revalidateTag` with a shared tag would be cleaner.

### Step 4: Find the cron's revalidation touch point.

`.github/workflows/nightly_pipeline.yml` currently produces a `chore(data)` commit and pushes to main. The push triggers Vercel's git integration, which redeploys and naturally invalidates the cache. So in some sense the cron already triggers a refresh — but only because main got a new commit.

If we want the cron to ALSO trigger revalidation directly (belt-and-braces), there are two approaches:

**Option A (recommended): Rely on the git-integration redeploy.** The cron's push triggers Vercel's git integration, which produces a fresh deployment. The deployment is a clean cache (no stale revalidate). Nothing else needs to fire.

**Option B: Add an explicit revalidation call.** A small endpoint at `/api/revalidate` (auth'd via an `INGEST_TOKEN`-like secret) that calls `revalidatePath` on a list of routes. The cron `curl`s this endpoint after the snapshot push.

Option A is simpler and is probably already working as designed. Option B adds operational complexity for a redundant call. Recommend Option A unless inspection finds the git-integration redeploy is unreliable.

Capture the decision in inspection notes.

### Step 5: Find the existing Vercel revalidation pattern in the codebase.

```bash
grep -rn "revalidatePath\|revalidateTag\|VERCEL_DEPLOY_HOOK" website/src/ .github/
```

Capture: any existing patterns for revalidation that cp-13 should follow.

### Step 6: Decide the revalidation strategy per endpoint.

Two endpoints (`admin/match-outcomes` and `ingest/match-outcomes`), one outcome (revalidate the affected public routes). Design decisions:

- **Inside the route handler vs in a helper?** Recommend a shared helper at `website/src/lib/revalidation.ts` (or similar) that takes a list of routes and revalidates them. Both endpoints import and call it. Avoids drift if the route list changes.
- **Synchronous vs fire-and-forget?** `revalidatePath` is synchronous and fast (milliseconds). Call synchronously, log any error, but don't fail the upsert response if revalidation fails (we'd rather lose freshness on one update than fail an upsert that already committed to the database).
- **List of routes:** From Step 3.

### Step 7: Stop and report.

Inspection notes include:
- Current admin endpoint behavior.
- Current ingest endpoint behavior.
- List of routes that need revalidation.
- Option A vs Option B for the cron (recommend A).
- Existing revalidation patterns in the codebase.
- Proposed shared helper structure.
- Explicit STOP gate: "Awaiting Nicolás's review of the design before Stage 2."

## Stage 2 — Implementation (after Nicolás approves)

After approval, implement in this order. Each is a separate commit so reviewers can read them independently.

### Commit 1: Shared revalidation helper.

`website/src/lib/revalidation.ts`. Exports `revalidatePublicSnapshotRoutes()` that calls `revalidatePath` on each of the affected routes (from Stage 1 Step 3). Includes try/catch per route so one failing revalidation doesn't prevent the others. Logs any failures.

Example shape (adjust to match the inspection's actual route list):

```typescript
import { revalidatePath } from "next/cache";

const PUBLIC_SNAPSHOT_ROUTES = [
  "/bracket",
  "/",
  // ... per Step 3 inspection findings
] as const;

export function revalidatePublicSnapshotRoutes(): {
  ok: boolean;
  revalidated: string[];
  failed: { route: string; error: string }[];
} {
  const revalidated: string[] = [];
  const failed: { route: string; error: string }[] = [];
  for (const route of PUBLIC_SNAPSHOT_ROUTES) {
    try {
      revalidatePath(route);
      revalidated.push(route);
    } catch (err) {
      failed.push({ route, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { ok: failed.length === 0, revalidated, failed };
}
```

### Commit 2: Wire into the admin endpoint.

`website/src/app/api/admin/match-outcomes/route.ts`. After the successful upsert and the evaluator call, call `revalidatePublicSnapshotRoutes()`. Include the revalidation result in the response body so the operator can see what was refreshed:

```typescript
// After the existing successful upsert + evaluator call:
const revalidation = revalidatePublicSnapshotRoutes();
return NextResponse.json({
  ok: true,
  transitionsCount,
  revalidation,  // { ok, revalidated: [...], failed: [...] }
});
```

If revalidation fails, do NOT fail the response. The upsert already succeeded in the database and the evaluator already ran. Logging the failure and continuing is the right behavior.

### Commit 3: Wire into the ingest endpoint.

`website/src/app/api/ingest/match-outcomes/route.ts`. Same change: after the batch upsert and evaluator call, call `revalidatePublicSnapshotRoutes()` once. Include the result in the response body.

Note: the ingest endpoint processes batches (up to 50 outcomes). Call `revalidatePublicSnapshotRoutes()` once after the entire batch, not once per outcome. Revalidation is idempotent; one call after the batch is sufficient.

### Commit 4 (optional, per Stage 1 decision): Cron revalidation.

If Stage 1 chose Option A (rely on git-integration redeploy): no change to the cron. Skip this commit.

If Stage 1 chose Option B (explicit revalidation): add a `/api/revalidate` endpoint that calls `revalidatePublicSnapshotRoutes()` after auth, and add a `curl` step in the nightly workflow that hits this endpoint after the snapshot push.

Defaulting to Option A unless Stage 1 surfaced a reason to do Option B.

### Commit 5: Update PLAN.md.

Mark acceptance criterion #8 as Done in the live-readiness scorecard. Note that revalidation now fires from both admin and ingest endpoints, and (if Option B) from the cron explicitly.

### Final: open the draft PR.

CI will run on the PR. Expected results:
- `python`: ruff (advisory), pytest — green.
- `python-smoke`: regen smoke runs — green (no Python changes; should pass trivially).
- `website`: tsc clean on revalidation helper, vitest passes.
- `snapshot-deploy.yml`: triggered by `website/**` change; contract suite + full vitest + build all green.

If any test asserts against specific response shapes from the admin or ingest endpoints, update the assertions to include the new `revalidation` field.

## Verification

Before marking ready:

- [ ] Inspection notes complete; Nicolás approved the design.
- [ ] `revalidatePublicSnapshotRoutes()` helper exists at `website/src/lib/revalidation.ts` (or chosen path).
- [ ] Admin endpoint calls the helper after successful upsert; response body includes revalidation result.
- [ ] Ingest endpoint calls the helper after the batch; response body includes revalidation result.
- [ ] (If Option B) `/api/revalidate` endpoint exists with auth; cron has a `curl` step.
- [ ] PLAN.md marks acceptance criterion #8 as Done.
- [ ] Local: `pnpm tsc --noEmit` clean.
- [ ] Local: `pnpm test` passes (vitest unit + any contract tests that exercise the endpoints).
- [ ] Local manual test: POST a fake outcome to `/api/admin/match-outcomes` against a local dev server; confirm the response includes the revalidation field with at least `/bracket` in `revalidated`.
- [ ] CI green: python, python-smoke, website, snapshot-deploy Validate/build/audit.
- [ ] cp-04 through cp-12 fixes preserved.
- [ ] cp-10.1's gitignore + six tracked parquets preserved.
- [ ] No code in `the-21j-problem/` touched.

## Merge-readiness checklist

```
Y/N — Inspection notes complete; Nicolás approved.
Y/N — Commit 1: revalidation helper exists with try/catch per route.
Y/N — Commit 2: admin endpoint calls helper after successful upsert; response includes revalidation.
Y/N — Commit 3: ingest endpoint calls helper after the batch; response includes revalidation.
Y/N — Commit 4: cron revalidation (if Option B) OR skipped per Option A.
Y/N — Commit 5: PLAN.md updated; acceptance criterion #8 marked Done.
Y/N — Local pnpm tsc --noEmit clean; pnpm test passes.
Y/N — Local manual test: admin POST returns revalidation result with /bracket in revalidated.
Y/N — CI green (python, python-smoke, website, snapshot-deploy "Validate/build/audit").
Y/N — cp-04 through cp-12 fixes preserved.
Y/N — No code in the-21j-problem/ touched; no shared config changes beyond what's necessary.
Y/N — Branch is cp-13-admin-endpoint-refresh, off latest main, ready to PR.
```

If every item is `Y`, mark ready-for-review.

## Out of scope

- **Switching `/bracket` to `force-dynamic`.** Q2 explicitly chose revalidate-on-write. Don't change the page's `dynamic` setting.
- **Tag-based revalidation.** Path-based is simpler and matches the public route shape. If a future checkpoint wants tags, that's its scope.
- **The cron's evaluator step.** That's been working since cp-09 / cp-10.
- **Refactoring the admin or ingest endpoints' upsert logic.** cp-13 adds a step after the existing logic; it doesn't restructure.
- **El Voto's routes** at `website/src/app/voto21junio/` or any of their files.
- **Surface B onboarding.** Deferred until post-launch.

## Decision tree if things don't match

- **`revalidatePath` is already imported and called somewhere.** Reuse the existing pattern; consolidate if it's diverging across files. The shared helper is the consolidation target.
- **The admin endpoint's auth check happens via middleware, not inline.** That's fine; the revalidation goes inside the handler after the auth has succeeded.
- **A test asserts the admin endpoint's response is exactly `{ok: true, transitionsCount}`.** Update the assertion to allow the new `revalidation` field. The shape is now `{ok, transitionsCount, revalidation}`.
- **The `pnpm build` step fails because `revalidatePath` is being called at module-load time instead of request-time.** Move the call inside the handler function. `revalidatePath` is a server-only API and must be called from a server action or route handler.
- **The Vercel preview deploy doesn't update after a local manual test against the dev server.** Expected — local `pnpm dev` doesn't invalidate Vercel's CDN. The verification is the response body's `revalidation` field showing the routes were called; the actual cache invalidation only happens in production.

## A note on judgement

This is a small checkpoint compared to cp-11 or cp-12. The work is well-bounded: one helper, two endpoint wirings, possibly one workflow tweak. The CI gate from cp-10.2 and the snapshot-deploy.yml suite from cp-09/cp-12 protect against regressions.

After cp-13 ships, 8 of 8 acceptance criteria are Done. The T-1 dry run is the final gate before launch — a read-only verification that all eight criteria hold simultaneously on the deployed production environment. I'll write that prompt after cp-13 merges.

The remaining timeline: cp-13 today (~1 day of agent work), T-1 dry run tomorrow (a few hours), launch on 2026-06-11.
