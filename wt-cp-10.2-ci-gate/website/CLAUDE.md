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
