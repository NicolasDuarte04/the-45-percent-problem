@AGENTS.md

## Live match-outcome ingestion (Checkpoint 15)

During the WC 2026 window, settled match outcomes flow into the
`match_outcomes` table by two complementary paths:

1. **Live ingestion (hourly).**
   - Python script: `ingestion/fetch_match_outcomes.py`.
   - GitHub Action: `.github/workflows/ingest_match_outcomes.yml` runs
     hourly all year; the script short-circuits outside June 11 to
     July 19, 2026 (plus a 3-day buffer on each side).
   - Source: Football-Data.org v4 (free tier with API key).
   - Posts batched outcomes (max 50 per request) to
     `/api/ingest/match-outcomes`.
   - Required secrets: `INGEST_TOKEN`, `FOOTBALL_DATA_API_KEY`.
2. **Manual admin entry (fallback).**
   - Endpoint: `/api/admin/match-outcomes` (single outcome per call,
     bearer-authenticated via `BRIEF_DISPATCH_TOKEN`).
   - Use this when the source feed lags behind a live result or when
     an outcome must be corrected.

How `/api/ingest/match-outcomes` differs from `/api/admin/match-outcomes`:

| Concern | `/admin/match-outcomes` | `/ingest/match-outcomes` |
|---|---|---|
| Auth token | `BRIEF_DISPATCH_TOKEN` | `INGEST_TOKEN` |
| Body shape | single outcome | `{ outcomes: [...] }` (max 50) |
| `entered_by` value | `"brief-dispatch"` | `"ingest"` |
| Failure mode (evaluator throws) | 200 with `evaluatorError: "deferred"` | 207 Multi-Status with the same payload |

Both paths upsert (on-conflict-update on `match_id`) and trigger a
single `runEvaluatorAcrossPredictions` call. Idempotency is preserved
on both sides: a repeat call with identical data produces zero
`prediction_state_log` rows.

If ingestion fails entirely (Football-Data.org outage, API key revoked,
schema drift), the daily `eval-predictions` cron continues to reconcile
state from whatever outcomes the admin has manually entered. The
operator is the safety net, not the single point of failure.

## Public-bracket refresh on settled outcomes (cp-13 / Fix 6)

A settled outcome only changes the public `/bracket` after the snapshot
pipeline re-conditions the Monte Carlo ensemble and rewrites
`public/data/latest/{tournament,bracket}.json`. A `match_outcomes` upsert
alone does not — the quant pages are `force-static` and read build-frozen
JSON plus structural *identity* from the fixtures DB, neither of which the
upsert touches. (Why `revalidatePath` alone is insufficient:
`docs/onboarding/cp-13-inspection-notes.md` §6.)

So after a successful upsert, both endpoints:

1. Call `revalidatePublicSnapshotRoutes()` (`src/lib/revalidation.ts`) to
   purge the static caches for `/bracket`, `/`, `/ledger`, `/match/[id]`,
   `/team/[code]`. Forward-compatible cache hook; harmless today.
2. Call `triggerOnDemandRegen()` (`src/lib/regenDispatch.ts`), which fires a
   GitHub `repository_dispatch` (`regen-snapshot`) → `on_demand_regen.yml`
   (a `repository_dispatch` twin of the nightly, sharing the
   `nightly-pipeline` concurrency group). That run regenerates the JSON,
   pushes to main, and POSTs the Vercel deploy hook → `/bracket` refreshes
   within minutes. A 60s module-level debounce collapses the hourly ingest's
   burst into one regeneration.

Both effects are reported in the response body as `{ revalidation,
regenDispatch }` and neither can fail the upsert response. The dispatch needs
the `GITHUB_REGEN_PAT` secret (fine-grained, `actions: write`); without it
`regenDispatch.reason` is `"not_configured"` and the nightly cron remains the
safety-net refresh.
