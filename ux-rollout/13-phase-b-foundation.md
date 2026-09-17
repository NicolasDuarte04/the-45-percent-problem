# Checkpoint 13: Phase B Foundation (match outcomes, state evaluator, audit log)

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). Two attached evaluation documents motivate this work:

- `EMAIL_INFRASTRUCTURE_EVALUATION_2026-05-17.md`: confirms the email scaffolding (Resend, suppression, unsubscribe) is mature; the gap is the recurring sending pipeline.
- `PHASE_B_DATA_PIPELINE_EVALUATION_2026-05-17.md`: confirms the data pipeline that feeds calibration emails does not exist. No match outcome ingestion, no `countCurrent` recomputation, no automated state transitions, no audit log.

This checkpoint builds the foundation layer. Match outcomes can be entered, predictions can be evaluated against them, state transitions are recorded. **No emails are sent in this checkpoint.** The email layer is the next checkpoint (14), built on top of this one.

This is the largest checkpoint in the rollout so far. Plan for 600 to 900 lines plus two database migrations. Read both evaluation documents in full before starting.

## Why this matters

The simulator collects predictions and the website renders them, but the loop never closes. A user who submits a prediction in May and watches Spain play in June has no way to learn whether their scenario is still alive, dead, or promoted. Without match-settlement evaluation, the simulator is one-shot for everyone.

The data layer must exist before any email layer can. Building emails on a non-existent data path was the duplication risk the user warned about; this checkpoint addresses that risk directly by building the foundation correctly.

The project's pre-registered Phase B design (referenced at `IMPL_PROMPT_SCENARIO_SIMULATOR_PHASE_A.md §19`) explicitly anticipates this work: a `/api/cron/eval-predictions` route, a `prediction_state_log` table, automated transitions. The design exists; this checkpoint is the implementation.

## What to build

Five pieces, all coupled. They should land in one PR.

### 1. Database migrations

Add two new tables to `website/src/lib/db/schema.ts`.

**`match_outcomes` table**. Each row is one settled World Cup 2026 match.

```ts
match_outcomes (
  match_id text primary key,              // e.g., "M01" for group-stage match 1, or "R32_M1"
  competition text not null,              // "WC2026"
  stage text not null,                    // "group" | "r32" | "r16" | "qf" | "sf" | "final"
  home_team text not null,                // FIFA 3-letter code
  away_team text not null,                // FIFA 3-letter code
  home_goals integer not null,            // regulation + extra time
  away_goals integer not null,            // regulation + extra time
  shootout_winner text,                   // nullable; FIFA code of shootout winner if penalties decided
  settled_at timestamptz not null,        // when the match was settled
  entered_at timestamptz not null default now(),
  entered_by text not null,               // admin identifier ("brief-dispatch" for now)
  meta jsonb default '{}'::jsonb          // extra fields (extra-time goals, red cards, etc.)
)
```

Plus indices on `stage` and `settled_at`.

**`prediction_state_log` table**. Append-only audit trail of every state transition.

```ts
prediction_state_log (
  id uuid primary key default gen_random_uuid(),
  prediction_id text not null references predictions(id) on delete cascade,
  previous_state text not null,            // "alive" | "dead" | "promoted"
  new_state text not null,                 // same enum
  previous_count_current integer not null,
  new_count_current integer not null,
  triggered_by_match_id text references match_outcomes(match_id),  // nullable for daily reconciliation runs
  reason text not null,                    // e.g., "Spain eliminated in R32" or "Champion's path R16 confirmed"
  evaluated_at timestamptz not null default now(),
  evaluator_version text not null          // e.g., "v1" - so we can re-run evaluations later if logic changes
)
```

Index on `prediction_id`, `evaluated_at`.

This is the source-of-truth for calibration emails (checkpoint 14 will query this table grouped by subscriber).

### 2. Admin match-outcomes route

`website/src/app/api/admin/match-outcomes/route.ts`. POST endpoint.

- **Auth**: same Bearer-token pattern as the existing `/api/admin/predictions/[id]/state/route.ts`. Use `BRIEF_DISPATCH_TOKEN` with timing-safe equality.
- **Body**: a single match outcome `{matchId, stage, homeTeam, awayTeam, homeGoals, awayGoals, shootoutWinner?, settledAt}`. Zod-validated.
- **Effect**: insert into `match_outcomes`. On conflict (matchId exists), update with the new values (admin can correct a wrong entry). Trigger a synchronous call to the evaluator for all predictions affected by this match.
- **Response**: `{ok: true, transitionsCount: N}` where N is the number of `prediction_state_log` rows just written.

The triggered evaluator call is what makes outcome entry "live"; the admin enters a match and predictions are re-evaluated immediately.

### 3. Prediction evaluator module

`website/src/lib/sim/predictionEvaluator.ts`. Server-only module.

Exports:

```ts
export interface EvaluatorInput {
  prediction: Prediction;          // a row from the predictions table
  settledMatches: MatchOutcome[];  // all settled matches at evaluation time
}

export interface EvaluatorOutput {
  newState: "alive" | "dead" | "promoted";
  newCountCurrent: number;
  reason: string;                  // human-readable reason for the transition (used in prediction_state_log.reason)
  evaluatorVersion: string;        // "v1"
}

export function evaluatePrediction(input: EvaluatorInput): EvaluatorOutput;
```

This is where the conditional probability math lives. The logic per mode:

**Final Four mode**. The user picked 4 teams to reach the semifinals. For each settled match:

- If the match's stage is `group`, no direct effect (group settlement determines R32 entries but does not by itself eliminate any team from the SF).
- If the match's stage is `r32`, `r16`, or `qf`, and the loser is one of the user's 4 picks, the scenario is **dead** (that team will not reach the SF).
- If all four of the user's picks have advanced past their QF match (so all four are in the SF), the scenario is **promoted** (the user's call has been fully confirmed). `newCountCurrent` collapses to `total` (10,000) because the joint probability is now 1.0.
- Otherwise, recompute `newCountCurrent` as `total * (joint product of pSF over picks still alive) / (the same joint at submission time)` to reflect the updated probability given settled matches. The simpler approach: re-run the marginal joint product over the picks still alive, using the current snapshot's `pSF` marginal updated to be conditional on the team having reached its current stage.

For Phase B simplicity, use the simpler approach: `newCountCurrent = total * (joint of remaining alive picks' marginal pSF)` even if it slightly overestimates rarity in some cases. The accuracy refinement is a future polish.

**Champion's Path mode**. The user picked one team, plus four stage opponents and W/L outcomes. For each settled match:

- If the user's team played the match and lost, but the user predicted a win: **dead**.
- If the user's team played and won, and the user predicted a win: progress confirmed; continue to next stage.
- If the user's team played someone other than the predicted opponent at the relevant stage: this is a "weak match" (the user got the opponent wrong but the outcome direction was right or wrong). Decision: for Phase B, score on outcome direction only (W or L), not opponent identity. So if the user picked W and the team won, that stage is confirmed regardless of who the opponent was.
- `promoted` fires when the user's team has been confirmed through to the deepest stage in their picks. E.g., the user picked R16 W, QF W, SF L; if the team reaches the QF stage and loses, the user's `SF L` prediction has been confirmed and the scenario is promoted.
- `newCountCurrent` recomputes against the stage-boundary marginal for the deepest unsettled stage.

**Full Bracket mode**. The user picked groups + (optionally) R32 + R16 + QF + SF + champion. The submission's stage is determined by the length of `koAdvancers` (per checkpoint 9). Evaluation walks each stage:

- For each stage the user committed to: if a settled match contradicts a pick at that stage, **dead**.
- If all settled matches at all picked stages are consistent: still **alive**.
- If the user's deepest stage has been fully settled and matches all picks: **promoted**.
- `newCountCurrent` recomputes per checkpoint 9's stage-aware scoring, using only the picks at unsettled stages for the marginal joint.

**Reason strings**. Each transition needs a human-readable reason. Examples:

- `"GER eliminated in R32 vs ITA (0-2)"` - dead transition for a Final Four scenario picking GER.
- `"ARG R16 W vs MEX (3-1) confirms scenario"` - confirmation step for a Champion's Path.
- `"ESP champion confirmed; full bracket promoted"` - promotion when the predicted champion lifts the trophy.

The reason string is what calibration emails will surface to users. Write them descriptively, not evaluatively. No "Better luck next time" copy. No "Great call!".

**Evaluator version**. Stamp every output with `evaluatorVersion: "v1"`. When the math is refined later, increment to `v2` and the audit log preserves which version evaluated each transition.

### 4. Eval-predictions cron route

`website/src/app/api/cron/eval-predictions/route.ts`. POST endpoint.

- **Auth**: Vercel Cron header check (`Authorization: Bearer ${CRON_SECRET}`) or fallback to `BRIEF_DISPATCH_TOKEN` for manual trigger during development.
- **Effect**: walks every prediction in `state: 'alive'` (and also `state: 'promoted'` for safety; a promoted scenario could go dead if a later match contradicts it). For each, calls `evaluatePrediction` with all settled matches. If the result differs from the current state, writes a `prediction_state_log` row and updates the `predictions` table.
- **Idempotency**: re-running the cron on the same data should produce zero new log rows (state already matches the evaluator's output).
- **Response**: `{ok: true, evaluatedCount, transitionsCount}`.

This route is the daily reconciliation safety net. The admin route's triggered call is the per-match path; this cron is the catch-all.

### 5. Vercel cron config

Add or update `vercel.json` (or `next.config.ts` cron section if that pattern is preferred) with a daily cron at `06:00 UTC`:

```json
{
  "crons": [
    {
      "path": "/api/cron/eval-predictions",
      "schedule": "0 6 * * *"
    }
  ]
}
```

If the calibration digest cron lands in checkpoint 14 at the same time, both should fire from 06:00 UTC with the eval-predictions cron running first (eval at 06:00, digest at 06:05) so the audit log is up to date before emails query it.

## Decisions resolved (from the Phase B evaluation)

Three decisions were called out in `PHASE_B_DATA_PIPELINE_EVALUATION_2026-05-17.md`. Resolved:

1. **Where match outcomes live**: Postgres (`match_outcomes` table). Website-side ownership.
2. **`promoted` semantics**: a prediction is promoted when its deepest-stage pick is confirmed by a settled match outcome. Specifically: Final Four = all 4 teams in the SF; Champion's Path = the team has been confirmed to the deepest predicted stage; Full Bracket = the deepest picked stage is fully consistent with settled matches.
3. **Cron frequency**: triggered after each outcome entry (the admin route's synchronous call), plus a daily safety-net reconciliation at 06:00 UTC.

These are locked. The agent should not re-litigate; if there is a strong reason to deviate, flag it in the report.

## Acceptance criteria

- Two new tables (`match_outcomes`, `prediction_state_log`) added to the schema with migrations.
- New admin route at `/api/admin/match-outcomes` POST that accepts settled outcomes and triggers re-evaluation.
- New `predictionEvaluator.ts` module with the three-mode logic specified above.
- New cron route at `/api/cron/eval-predictions` POST that runs the evaluator across all alive and promoted predictions.
- Vercel cron config wired to fire daily at 06:00 UTC.
- All state transitions are recorded in `prediction_state_log` with a descriptive reason string and an evaluator version stamp.
- The existing manual admin state-change endpoint (`/api/admin/predictions/[id]/state/route.ts`) continues to work; it now also writes to `prediction_state_log` so manual changes are auditable too.
- TypeScript build clean.
- All 199 existing tests pass.
- New unit tests for the evaluator: at least one test per mode covering an alive case, a dead case, and a promoted case (9 tests minimum). Use fixture match outcomes and assert the evaluator output. Snapshot tests are acceptable.
- The route handlers have basic integration tests (mock the database, verify the auth check rejects unauthorized requests).
- No emails are sent. The cron and admin routes write to the audit log only. Email dispatch is checkpoint 14.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language anywhere.
- The reason strings written to `prediction_state_log` are descriptive, not evaluative. No "Tough loss", no "Better luck next time", no "Nice call!". Use neutral operator vocabulary: "GER eliminated", "Scenario contradicted", "Bracket consistent", "Stage confirmed".
- The admin route's response copy and the cron route's response copy are JSON only; no user-facing strings to worry about.
- Do not introduce a new email template in this checkpoint. The audit log is the surface; emails come next.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-13-phase-b-foundation`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.
- Verify end-to-end on the dev server:
  - POST a settled match outcome to the admin route.
  - Verify it lands in `match_outcomes`.
  - Verify that any alive predictions affected by it transition correctly in `predictions` and `prediction_state_log`.
  - Run the cron route manually; verify it is idempotent (no new log rows on second run).

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 13 Report: Phase B Foundation

### Branch
ux/checkpoint-13-phase-b-foundation

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Migrations applied
- migration filename: what it adds
- ...

### What landed
- Schema design notes for match_outcomes and prediction_state_log
- Evaluator per-mode logic summary (one paragraph per mode)
- How the admin route's triggered evaluator call is wired
- Idempotency check for the cron route
- Any deviations from the locked decisions in the prompt, with justification

### Evaluator test coverage
- Final Four: alive/dead/promoted cases (file:line of each test)
- Champion's Path: alive/dead/promoted cases
- Full Bracket: alive/dead/promoted cases
- Edge cases tested (e.g., shootout-decided matches, mid-stage Full Bracket)

### Manual verification
- [ ] POST a match outcome via the admin route; row lands in match_outcomes
- [ ] An affected prediction transitions to dead with the correct reason
- [ ] An affected prediction transitions to promoted with the correct reason
- [ ] The audit log row matches the prediction's new state
- [ ] Running the cron route a second time produces zero new log rows
- [ ] The existing manual /api/admin/predictions/[id]/state route still works and now also writes to prediction_state_log
- [ ] TypeScript build clean
- [ ] All 199 existing tests pass
- [ ] New evaluator and route tests pass

### Vocabulary self-check
Paste a grep of `prediction_state_log` reason strings written by the evaluator (run the test suite, collect the reasons). Confirm none contain "luck", "tough", "nice", "great", "missed", or other sentiment words.

### Follow-ups / open questions
- The countCurrent recomputation uses the simpler "joint of remaining picks' marginals" approximation. Refinement to true conditional probability is a future polish.
- Live outcome scraping (Python script) is deferred to checkpoint 15.
- Anything else you flagged.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
