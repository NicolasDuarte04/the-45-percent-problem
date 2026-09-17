# Phase B Data Pipeline Evaluation

Date: 2026-05-17 (kickoff 2026-06-11, 25 days remaining).
Scope: verification of the match-settlement-to-predictions data path.
Out of scope: the email-side infrastructure (covered by `EMAIL_INFRASTRUCTURE_EVALUATION_2026-05-17.md`).
Author: senior infrastructure review, on request.

## Executive summary

The website's email infrastructure is mature. The simulator's submission and rendering surfaces are complete. The piece that does not exist yet is the data path between match settlement and the website's `predictions` table. Specifically:

- **No match outcome ingestion**. No Python script fetches live scores; no admin route accepts manual outcome entries.
- **No conditional probability recomputation**. The `predictions.countCurrent` column is set at submission time and never updated.
- **No automated state transitions**. The `predictions.state` enum (`alive` / `dead` / `promoted`) only changes via a developer-only admin endpoint at `/api/admin/predictions/[id]/state/route.ts`.

P1.2 (calibration-update email cadence) is the top layer of a stack that needs three earlier layers built first. Calibration emails cannot ship until match outcomes can reach the predictions table.

The good news: Phase B was explicitly architected. `IMPL_PROMPT_SCENARIO_SIMULATOR_PHASE_A.md §19` describes the intended path (cron route `/api/cron/eval-predictions`, audit table `prediction_state_log`, state-change email templates). The design exists; the implementation does not.

The recommended next move is a Phase B Foundation checkpoint (checkpoint 13) that builds the data layer. Emails (P1.2 proper) becomes checkpoint 14, built on top.

## What exists today

### Predictions schema (production)

`website/src/lib/db/schema.ts:195-235` defines the `predictions` table:

- `id` (text, format `45A-2026-XXXX`)
- `mode` (`final_four` | `champions_path` | `full_bracket`)
- `scenario` (jsonb, the user's picks)
- `storyLine` (text)
- `countOriginal` (integer, set at submission)
- `countCurrent` (integer, set at submission, never updated)
- `total` (integer, typically 10,000)
- `state` (enum: `alive` | `dead` | `promoted`, defaults to `alive`)
- `killedBy` (text, nullable, populated by the admin endpoint)
- `modelSha`, `snapshotSha`, `submittedAt`, `updatedAt`
- `subscriberId` (uuid, fk to subscribers, nullable)
- `email` (text, nullable; manually attached via the alert flow)

The schema supports the full state machine. The data writes that would drive transitions are missing.

### Manual admin state-change endpoint (production but unwired)

`website/src/app/api/admin/predictions/[id]/state/route.ts:1-100`. POST endpoint. Bearer-token authenticated against `BRIEF_DISPATCH_TOKEN`. Accepts `{state, killedBy?}`. Writes the state update directly to Postgres.

The route's docstring explicitly names its purpose: "visual QA of the dashboard's three state variants until the Phase B/C eval cron arrives." It exists for QA, not for production state transitions.

The route does not touch `countCurrent`. It only changes `state`. Recomputing `countCurrent` is not on its path.

### Python evaluation pipeline (production but not Postgres-aware)

The five evaluation scripts at the repo root all write to local JSONL or Parquet files. None of them import a Postgres driver. Specifically:

- `evaluation/forecast_log.py`: append-only JSONL writer for probability records.
- `evaluation/clv_tracker.py`: CLV telemetry; pure Python computation.
- `evaluation/pseudo_clv.py`: hypothetical CLV for M0-M3; Parquet output.
- `evaluation/accuracy_metrics.py`: Brier, RPS, log-loss, DM, Nyberg tests; Parquet results.
- `evaluation/score_on_2022_holdout.py`: hold-out reliability data; Parquet output.

These scripts are the research-paper side. They are not connected to the website's database. By design.

## What is missing (the gap)

### Match outcome ingestion

There is no script anywhere that knows how to find out who won a 2026 World Cup match. Verified by enumerating the `ingestion/` directory (eight scripts, all for pre-tournament data: Elo, FIFA rankings, recent form, macro variables, fixtures, three odds providers). No `ingestion/fetch_match_outcomes.py`. No GitHub Action that polls a score API. No webhook handler.

This is the first thing P1.2 needs and the absence is total.

### Conditional probability recomputation

`predictions.countCurrent` is computed once at submission time via `computeRealityScore(mode, canonical, scenario)` (called in `website/src/app/api/predictions/route.ts:78`). After that, the value never changes.

For calibration emails to be meaningful, this column needs to update as matches settle. Specifically:

- If a user picked Spain to reach the semifinals, and Spain actually reaches the semifinals (a settled match outcome), the joint probability of the user's full scenario goes up (one team's pSF marginal collapses to 1.0). `countCurrent` rises.
- If Spain gets eliminated before the semifinals, the user's scenario is no longer possible. `countCurrent` collapses to zero and `state` flips to `dead`.

The math is tractable. The code path is absent.

### State transition automation

The `state` enum exists. The admin route can flip it manually. No automated process evaluates predictions against settled matches and triggers transitions.

The intended design is documented: a `/api/cron/eval-predictions` route that runs on a schedule, walks every prediction in `state: 'alive'`, checks each against the settled-match record, and transitions to `dead` (if any pick is contradicted) or `promoted` (if the scenario has crossed a confirmation threshold).

This route does not exist. No `/api/cron/` directory exists in the website codebase at all.

### Audit log

`IMPL_PROMPT_SCENARIO_SIMULATOR_PHASE_A.md §19` references a `prediction_state_log` table for state transitions. The table does not exist in `schema.ts`.

This is the table that calibration emails should read from: each row is one transition, with the prediction ID, the old state, the new state, the trigger event (which match settlement caused it), and the timestamp. Without it, calibration emails would have no source of truth for "what changed today."

## The cascade for P1.2

For a user to receive a calibration email about a prediction state change, four things have to happen in order:

1. A match settles and the outcome is known.
2. The outcome is ingested into the website's data layer (Postgres or a JSONL the website reads).
3. The user's prediction is evaluated against the new outcome; if the state changes, `predictions.state`, `predictions.countCurrent`, and `prediction_state_log` are all updated.
4. The email dispatcher picks up the state transition and sends the calibration email.

The email infrastructure evaluation showed that step 4 is well-supported by existing scaffolding (Resend client, suppression list, unsubscribe flow, design tokens, sendLog table). The P1.2 prompt would be small if steps 1-3 were already in place.

Steps 1-3 do not exist. The current `EMAIL_INFRASTRUCTURE_EVALUATION_2026-05-17.md` was right about the email layer but assumed the data layer existed. It does not.

## Recommended phasing

**Checkpoint 13: Phase B Foundation**. Build the data layer.

This checkpoint adds:

- A new admin route `/api/admin/match-outcomes` that accepts a settled match (match ID, home goals, away goals, knockout outcome if applicable) and writes to a new `match_outcomes` table. Manual entry only; no scraping. The route is bearer-authenticated and meant to be hit by an admin after each match.
- A new database table `match_outcomes` with the settled-match record.
- A new database table `prediction_state_log` (audit trail).
- A new server-side module `website/src/lib/sim/predictionEvaluator.ts` that, given a prediction and a set of settled match outcomes, returns the new `(state, countCurrent)` tuple. This is where the conditional probability math lives.
- A new cron-style route `/api/cron/eval-predictions` (bearer-authenticated, designed to be triggered by Vercel cron) that walks all `alive` predictions, evaluates each, writes transitions to `prediction_state_log`, and updates the `predictions` table.
- No email sending in this checkpoint. State transitions are written to the audit log; emails are wired in the next checkpoint.

Effort estimate: 600 to 900 lines of code plus two migrations.

**Checkpoint 14: Calibration emails (the original P1.2)**. Build the email layer on top of the data layer.

This checkpoint adds:

- A new email template `website/src/emails/CalibrationDigestEmail.tsx` following the existing design system.
- A new send function `website/src/lib/email/calibrationDigest.ts` that follows the established pattern.
- A new cron route `/api/cron/calibration-digest` that reads `prediction_state_log` since the last digest, groups by subscriber, dispatches one digest per affected user per day.
- A Vercel cron schedule.
- A schema migration adding `sendLog.eventType` per the email infrastructure evaluation's recommendation.

Effort estimate: 500 to 800 lines plus one migration. Same as the original P1.2 estimate.

**Checkpoint 15 (optional, post-launch): Live outcome ingestion**. Replace the manual admin entry with an automated scraping path.

This checkpoint would add a Python script under `ingestion/` that polls a live score API (FIFA, ESPN, Flashscore, or a free third-party) and writes settled-match outcomes to the `match_outcomes` table via a new bearer-authenticated `/api/ingest/match-outcomes` endpoint. Until this lands, an admin enters outcomes manually after each match (44 matches over 30 days; tractable).

Effort estimate: 400 to 600 lines plus the API source decision.

## Decisions checkpoint 13 needs to make before implementation

**Decision 1: where match outcomes live**. Two options.

- Option A: a new Postgres table `match_outcomes` in the website schema. Website-side ownership. Admin route writes to it; evaluator reads from it.
- Option B: a Parquet or JSONL file in `data/processed/match_outcomes.parquet`, written by the Python side (eventually) and read by the website via a small loader.

Recommendation: option A. Postgres ownership keeps the website self-contained for the calibration loop. The Python side can read the table for its own analytics if needed (the Python evaluation scripts could be extended). Option B introduces a cross-language data dependency that complicates the cron logic.

**Decision 2: `promoted` semantics**. The `state` enum has three values; `alive` and `dead` are clear. `promoted` needs an explicit rule.

Two reasonable rules:

- Rule A: a prediction is `promoted` when its `countCurrent` exceeds `countOriginal × P_threshold` (e.g., 5x). The scenario has become substantially more likely.
- Rule B: a prediction is `promoted` when at least one of its picks has been confirmed by a settled match outcome that strictly reduces the joint denominator (e.g., the user's predicted champion has reached the semifinals).

Recommendation: rule B, with a stricter formulation: `promoted` fires when the deepest stage in the user's pick chain is settled and the user's call matches. This is more "the user got further" than "the user got more likely." It is also easier to surface in copy ("Your champion has reached the semifinals").

**Decision 3: cron frequency**. The eval-predictions cron's schedule.

Three reasonable options:

- After each match: triggered by the admin outcome-entry route itself.
- Every hour: independent schedule, idempotent.
- Once per day at 06:00 UTC: aligns with the calibration digest in checkpoint 14.

Recommendation: trigger after each outcome entry, then also run a daily reconciliation at 06:00 UTC (safety net for any missed transitions). The triggered run is small (only newly-settled matches affect predictions); the daily run is a sanity check.

## What this evaluation does not cover

The actual probability math for `countCurrent` recomputation. The evaluator module needs to know how each mode's scenario decomposes into per-match conditions. Final Four is straightforward (joint of pS marginals over the four picks). Champion's Path is per-stage. Full Bracket is per-round, conditional on each prior round's settlement.

The checkpoint 13 prompt will need to spec the math more concretely. This evaluation establishes that the structure does not exist; the math is the implementation detail.

End of evaluation.
