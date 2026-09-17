# cp-13 — Admin endpoint refresh (Fix 6) — Stage 1 inspection notes

**Branch:** `cp-13-admin-endpoint-refresh` (worktree off `origin/main` @ `6a1d20b`, cp-12 merged).
**Date:** 2026-06-08.
**Scope as briefed:** wire `revalidatePath('/bracket')` (+ related routes) into the admin and
ingest match-outcome endpoints after a successful upsert, via a shared helper; rely on the
cron's existing redeploy for the nightly path; close acceptance criterion #8.

> **Headline finding (read this first).** In the current architecture, calling
> `revalidatePath('/bracket')` after a `match_outcomes` upsert is **inert** — it cannot make a
> manually-entered settled outcome visible on `/bracket`. The public bracket's result/probability
> data is build-time-frozen JSON regenerated **only** by the nightly Python pipeline + redeploy;
> the only live (runtime) DB read on the page is tournament *structure* (the static draw), which an
> outcome upsert does not touch. `match_outcomes` is consumed exclusively by the **predictions-
> evaluation** subsystem, never by any public render path. Acceptance criterion #8 — "a manual admin
> entry reaches `/bracket` within 10 minutes" — is **not** satisfiable by revalidate-on-write alone
> given today's data flow. Details and options in §6. **This is a Stage 1 STOP-and-decide item.**

---

## 1. Current admin endpoint behavior

`website/src/app/api/admin/match-outcomes/route.ts`

- `runtime = "nodejs"`, `dynamic = "force-dynamic"` (line 9). It is a route handler, so
  `revalidatePath` is callable here without a build/runtime conflict.
- **Auth:** Bearer token, timing-safe compare against `BRIEF_DISPATCH_TOKEN` (`checkAdminAuth`,
  ≥16 chars required). Single-outcome body, Zod-validated with the shootout/identity superRefine.
- **Upsert:** single-row `insert(...).onConflictDoUpdate({ target: matchId, ... })` (line 126),
  `enteredBy: "brief-dispatch"`. Re-posting the same `matchId` corrects a prior entry.
- **Evaluator:** `runEvaluatorAcrossPredictions({ triggeredByMatchId })` (line 147).
- **Success-response paths:**
  - Full success → `{ ok: true, transitionsCount }` (line 162, 200).
  - Evaluator threw (upsert already committed) → `{ ok: true, transitionsCount: 0,
    evaluatorError: "deferred" }` (lines 156–157, 200).
- **No `revalidatePath` import or call today.** Confirmed: zero `revalidatePath`/`revalidateTag`
  anywhere in `website/src` (only a *comment* at `app/(editorial)/brief/page.tsx:9` referencing a
  future hook).

## 2. Current ingest endpoint behavior

`website/src/app/api/ingest/match-outcomes/route.ts`

- Same runtime/dynamic settings (line 10). **Auth:** `INGEST_TOKEN` (distinct from admin so creds
  rotate independently). Body `{ outcomes: [...] }`, `min(1).max(50)`.
- **Batched upsert:** one `insert(rows).onConflictDoUpdate(...)` using `sql\`excluded.*\`` (line 152),
  `enteredBy: "ingest"`. (cp-15 perf fix: was a per-outcome loop; now one statement for the batch.)
- **Evaluator:** a *single* `runEvaluatorAcrossPredictions({ triggeredByMatchId: outcomes[0].matchId })`
  after the whole batch (line 177) — not per outcome.
- **Success-response paths:**
  - Full success → `{ ok: true, accepted, transitionsCount }` (line 194).
  - Evaluator threw → **207 Multi-Status** `{ ok: true, accepted, transitionsCount: 0,
    evaluatorError: "deferred" }` (lines 183–190).
- Symmetry with admin per `website/CLAUDE.md`: both upsert on-conflict and fire one evaluator call;
  the documented difference is auth token, body shape, `entered_by`, and the deferred status code
  (admin 200 vs ingest 207).

## 3. Routes that *would* be revalidated (if revalidate-on-write were effective)

All public quant surfaces are `force-static` and read build-time JSON via `loadSnapshot.ts`
(`fs.readFileSync(process.cwd()/public/data/latest/*.json)`), merged only with structural *identity*:

| Route | File | Reads |
|---|---|---|
| `/bracket` | `app/(quant)/bracket/page.tsx:31` | `loadBracket` + `mergeTournament(loadTournament)` + `loadSnapshotMeta` |
| `/match/[id]` | `app/(quant)/match/[id]/page.tsx:21` | `loadMatch` + structural identity |
| `/team/[code]` | `app/(quant)/team/[code]/page.tsx:15` | `loadTeam` + `mergeTeamProgression` |
| `/ledger`, `/ledger/[id]` | `app/(quant)/ledger/*` | snapshot JSON |
| `/terminal`, `/simulator` | `app/(quant)/*` | snapshot JSON |
| `/` (editorial home) | `app/(editorial)/page.tsx` | mostly editorial; may surface headline figures |

The runtime snapshot API `app/api/snapshots/[id]/page-data/route.ts` reads the same
`loadBracket(id)` + `mergeTournament(loadTournament(id))` (lines 59, 75–76) — also JSON + identity.

**None of these read `match_outcomes`.** (Whole-tree grep: `match_outcomes`/`matchOutcomes` in
`website/src` appears only in the two write endpoints, `lib/db/schema.ts`, and the predictions-eval
modules `lib/sim/{runEvaluator,groupStandings,predictionEvaluator}.ts`.)

## 4. Cron revalidation — Option A vs B

**Option A already exists and is the recommendation.** `nightly_pipeline.yml`:
- commits `chore(data)` + `git push origin main` (Git-integration redeploy), and
- additionally POSTs `secrets.VERCEL_DEPLOY_HOOK` ("belt-and-braces", lines 104–114) with non-2xx
  warning handling.

The cron's redeploy is the path that *actually* delivers fresh data to production today (a new
build re-reads the regenerated JSON). **No cron change needed.** Skip Commit 4. Option B (a
`/api/revalidate` endpoint + curl) would add a redundant, and currently inert, call.

## 5. Existing revalidation patterns

None implemented. cp-13 introduces the first `revalidatePath` usage. Proposed shared helper:
`website/src/lib/revalidation.ts` exporting `revalidatePublicSnapshotRoutes()` with try/catch per
route, returning `{ ok, revalidated, failed }` (matches the prompt's example shape). Both endpoints
import and call it once (ingest: once after the batch, not per outcome).

---

## 6. The central finding — why revalidate-on-write is inert here

### Data flow as it actually exists

```
Settled outcome
   │  (admin single / ingest batch)
   ▼
match_outcomes table (Postgres)
   │
   ├──► runEvaluatorAcrossPredictions  ──► prediction_state_log  ──► /me, /scenario/p/[id]
   │     (runEvaluator.ts:47 `select().from(matchOutcomes)`)         (per-user, auth-gated, dynamic)
   │
   └──► (nightly only) regenerate_snapshot_from_batch.py reads settled from DB,
         re-conditions the 10k MC, writes public/data/latest/{tournament,bracket}.json
            │
            └──► cron commit + push + Vercel deploy hook ──► NEW BUILD ──► /bracket shows new data
```

The public bracket render path (`bracket/page.tsx`) reads:
1. `loadBracket/loadTournament/loadSnapshotMeta` — **build-time-frozen JSON** committed in
   `public/data/latest/`. On Vercel these live inside the immutable deployment artifact; they do not
   change between deploys, so re-rendering reads identical bytes.
2. `loadStructuralMaps()` → `getStructuralMatches/Teams` (`structuralData.ts`) — **tournament
   structure only** (48 teams, 12 groups, 104 matchups, slots, kickoffs). `mergeTournament` rewrites
   only team *identity* (display_name/confederation/group); it touches **no** scores, results, or
   probabilities. KO slot→team resolution is baked into `bracket.json` by the pipeline, not computed
   live from standings.

So `match_outcomes` is never on the bracket's render path. `revalidatePath('/bracket')` after an
upsert re-runs the server component, which re-reads the *same* frozen JSON and the *same* structural
identity → byte-identical output → **no observable change**. The only mutation that ever changes
`/bracket` is a redeploy carrying a freshly-regenerated `bracket.json`/`tournament.json` — which only
the nightly pipeline produces.

### Why the briefed chain has a missing link

The prompt's intended chain is *upsert → revalidate → fresh bracket*. The real chain requires a
**regeneration** step between upsert and revalidate (read settled → re-condition MC → rewrite JSON),
and that regeneration is a Python 10k-MC batch that cannot run inside a Next serverless function.
Without it, there is nothing new for `revalidatePath` to surface.

### What this means for acceptance criterion #8

Criterion #8 ("a manual admin entry reaches `/bracket` within 10 minutes") is **not** closed by
revalidate-on-write alone. As-is, a manual admin entry reaches `/bracket` only on the **next nightly**
regen+redeploy — i.e. up to ~24h, exactly the gap §3.6 names. revalidatePath does not shrink that gap
because the data the page reads doesn't change at upsert time.

---

## 7. Options (need Nicolás's decision before Stage 2)

**Option A — Implement revalidate-on-write as briefed, and re-scope criterion #8 honestly.**
Wire `revalidatePublicSnapshotRoutes()` into both endpoints (cheap, correct, forward-compatible — it
becomes load-bearing the day any of these routes reads a runtime-mutable settled source). Rely on the
existing cron deploy hook (Option A) for actual freshness. **But do not mark criterion #8 "Done" as an
observable guarantee** — record it as "mechanism in place; intra-day public-bracket freshness still
depends on the nightly regen+redeploy." Smallest diff, matches Q2's letter, no architecture change.
*Risk:* the PR would otherwise claim an acceptance criterion that a T-1 dry run (the next gate, which
verifies criteria on **deployed production**) would fail when it POSTs an admin outcome and sees no
`/bracket` change within 10 min.

**Option B — Genuinely close criterion #8 (out of cp-13's "small checkpoint" scope).** Make a settled
outcome change what the page reads at request time. Two sub-paths, both substantial:
  - **B1:** endpoint triggers a snapshot regeneration. Infeasible in-process (Python 10k MC); would
    mean a `repository_dispatch` to run the nightly workflow on demand, then revalidate after the
    redeploy. New workflow plumbing + auth; ~10-min latency dominated by the batch, not the CDN.
  - **B2:** move the bracket's settled-conditioned data to a runtime-readable store (DB/blob) the
    pipeline writes and the page reads per-request; then revalidate-on-write works as the prompt
    imagines. This is a real data-layer re-architecture and contradicts cp-06's static-perf work.

**Option C — Defer criterion #8 to a named follow-up.** Ship the revalidate helper + wiring now
(harmless, forward-compatible), explicitly mark criterion #8 **not** closed by cp-13, and schedule the
regeneration-trigger work (B1) as `cp-14`. Keeps launch honest; the operator's manual-entry path still
correctly drives **predictions grading** (the loop that already works), and the public bracket stays
nightly-fresh as it is today.

**Recommendation: Option A's *implementation* (wire the helper into both endpoints — it is correct,
cheap, and the right hook to have) combined with Option C's *bookkeeping* (do NOT mark criterion #8
Done; name the regeneration-trigger gap as a `cp-14` follow-up).** This avoids a launch-blocking false
claim while still landing the useful, low-risk hook the diagnostic asked for. If Nicolás wants #8
genuinely closed before 2026-06-11, that's Option B1 and is a larger checkpoint than cp-13 was scoped
to be — flag it now rather than discover it at the T-1 dry run.

This is precisely the wrong-shape risk Stage 1 exists to catch (cf. cp-10's G-A-1↔M01 finding): the
briefed implementation is mechanically valid but does not produce the outcome the acceptance criterion
asserts, because of a data-flow assumption that does not hold.

---

## 8. Proposed helper structure (if Option A implementation is approved)

`website/src/lib/revalidation.ts`:

```typescript
import { revalidatePath } from "next/cache";

const PUBLIC_SNAPSHOT_ROUTES = ["/bracket", "/match", "/team", "/ledger", "/"] as const;

export function revalidatePublicSnapshotRoutes(): {
  ok: boolean; revalidated: string[]; failed: { route: string; error: string }[];
} { /* try/catch per route; never throws */ }
```

- Called inside each handler (request-time, never module-load) after the successful upsert — on
  **both** the full-success and evaluator-`deferred` paths (the upsert committed in both, so the
  public surface should refresh regardless of evaluator state).
- Response bodies extended with a `revalidation` field; tests asserting exact admin/ingest response
  shapes (`{ok, transitionsCount}` / `{ok, accepted, transitionsCount}`) will need the field added.
- Dynamic param routes (`/match/[id]`, `/team/[code]`) revalidate by base path; confirm during impl
  whether `revalidatePath('/team', 'page')` vs `'/team/[code]', 'page'` is needed for the layout.

---

## 9. Scope guardrails confirmed

- Do **not** switch `/bracket` off `force-static` (Q2). No change to any page's `dynamic` setting.
- Path-based, not tag-based revalidation.
- No changes under `the-21j-problem/` or `website/src/app/voto21junio/` (El Voto).
- cp-04…cp-12 fixes and cp-10.1's tracked input parquets untouched.

---

## STOP — Awaiting Nicolás's review of the design before Stage 2.

**Decision required:** Option A (implement helper + wiring; re-scope criterion #8 as
"mechanism-in-place, not observably closed") + Option C bookkeeping (name `cp-14` for the
regeneration trigger) — **vs** Option B1 (close #8 genuinely now via an on-demand regen trigger,
a larger checkpoint) — **vs** something else. I will not begin Stage 2 until this is resolved,
because the choice changes both what code lands and whether criterion #8 may be marked Done.
