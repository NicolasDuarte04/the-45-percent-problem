# Checkpoint 15: Live outcome ingestion + group-standings aggregation

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). Three attached documents motivate this work:

- `APP_UX_EVALUATION_2026-05-13.md`: the original UX evaluation.
- `EMAIL_INFRASTRUCTURE_EVALUATION_2026-05-17.md`: the email-side inventory.
- `PHASE_B_DATA_PIPELINE_EVALUATION_2026-05-17.md`: the data-side inventory.

Checkpoints 13 and 14 shipped the foundation and the email layer respectively. Match outcomes can be entered manually via `/api/admin/match-outcomes`, predictions are re-evaluated against them, state transitions log to `prediction_state_log`, and daily calibration digests fire from `06:05 UTC`. The loop is closed except for two pieces:

1. **Manual operator labor**: an admin enters 44 match outcomes over 30 days. Tractable but a real cost.
2. **Groups-only Full Bracket predictions sit in an evaluator dead branch**: a user who submits at the `groups` stage (12 group winners + 12 runners-up + 8 best thirds, no knockout picks) cannot have their state evaluated because the evaluator does not aggregate group-stage match results into standings.

This checkpoint closes both. The simulator becomes self-running and the groups-only Full Bracket case becomes a first-class prediction surface.

This is the most cross-boundary checkpoint in the rollout. It touches Python (ingestion), TypeScript (ingest endpoint and group-standings logic), and GitHub Actions (scheduled run). Expect 1000 to 1500 lines plus configuration files.

## Why this matters

For the operator side: 44 manual entries over the tournament is a non-trivial labor commitment, and any missed entry delays calibration emails. A self-running ingestion path makes the operator a safety net rather than a single point of failure.

For the groups-only Full Bracket case: the evaluator gap means a user's groups-only prediction stays alive through the entire tournament regardless of actual results. Calibration emails never fire for these users. This is the single largest hole in the post-13/14 system; closing it makes the calibration loop genuinely universal.

The two pieces share the "aggregate match results" problem space, which is why they ship together.

## What to build

Six pieces, all coupled. They should land in one PR.

### 1. Python ingestion script

Add `ingestion/fetch_match_outcomes.py` following the existing ingestion pattern (see `ingestion/fetch_historical_matches.py` for the canonical shape per the root `CLAUDE.md`).

Structure:

```python
from __future__ import annotations

# Standard ingestion file skeleton per CLAUDE.md:
#   1. fetch_raw()
#   2. clean_and_enrich()
#   3. build_output()
#   4. run(force=False) -> Path
#   5. if __name__ == "__main__": with argparse
```

**Data source decision**: investigate first. Acceptable sources for free / low-cost World Cup 2026 live data:

- Football-Data.org (free tier with API key; covers FIFA competitions).
- API-FOOTBALL (free tier; broad coverage).
- ESPN public scoreboard (no auth; HTML scraping).
- FIFA's own data feeds if discoverable.

Pick one. Document the choice in the report. The selection criteria are: free or low-cost, FIFA WC 2026 coverage confirmed, structured JSON output preferred over HTML scraping.

**Cadence**: hourly during the tournament window. The GitHub Actions workflow (see piece 5) runs every hour from June 11 to July 19, 2026, plus a few days buffer.

**Output**: the script POSTs each newly-settled match outcome to a new bearer-authenticated website endpoint (`/api/ingest/match-outcomes`, see piece 2). Local state tracking via `data/snapshots/ingested_match_outcomes.jsonl` (append-only) so re-runs do not re-POST already-ingested matches.

**Team name normalization**: the script must map source-side team names to the canonical 3-letter codes used by the website (e.g., "Spain" / "ESP", "United States" / "USA"). Use the existing `TEAM_NAME_MAP` from `ingestion/fetch_historical_matches.py`. Do not maintain a separate map.

**Error handling**: if the source is unreachable, retry with backoff (existing `tenacity` dependency). After 3 failed attempts, log to `logs/pipeline.log` and exit non-zero so the GitHub Action surfaces a failure notification. Do not silently fail.

### 2. Website ingest endpoint

`website/src/app/api/ingest/match-outcomes/route.ts`. POST endpoint.

This is the public-facing entry point the Python script POSTs to. Different from `/api/admin/match-outcomes`:

- **Auth**: bearer token `INGEST_TOKEN` (separate from `BRIEF_DISPATCH_TOKEN`). Lets us rotate ingestion credentials independently of admin credentials.
- **Body**: batch of match outcomes (not single). `{ outcomes: MatchOutcomeInput[] }`. Validates each with the same Zod schema the admin route uses. Maximum 50 outcomes per request (a hard cap).
- **Effect**: for each outcome, upserts to `match_outcomes` (same on-conflict-update behaviour as the admin route). After all upserts, triggers a single `runEvaluatorAcrossPredictions` call (not one per outcome; one for the whole batch).
- **Response**: `{ ok: true, accepted: N, transitionsCount: M }`.

If the evaluator throws, return 207 (Multi-Status) with `{ ok: true, accepted: N, evaluatorError: "deferred" }`. The daily reconciliation cron from checkpoint 13 picks up the gap. This mirrors the admin route's graceful-degradation pattern.

### 3. Group-standings helper

`website/src/lib/sim/groupStandings.ts`. New server-side module.

Exports:

```ts
export interface GroupStandings {
  group: string;                       // "A" through "L"
  teams: Array<{
    code: TeamCode;
    played: number;
    won: number;
    drawn: number;
    lost: number;                      // operator vocabulary: factual match result count
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    position: number;                  // 1, 2, 3, 4 (after tiebreakers)
  }>;
}

export interface TournamentGroupStandings {
  groups: GroupStandings[];            // 12 groups, in order A through L
  bestThirds: Array<{                  // top 8 of the 12 third-place finishers
    code: TeamCode;
    fromGroup: string;
    points: number;
    goalDifference: number;
    goalsFor: number;
  }>;
}

export function computeGroupStandings(
  matches: readonly MatchOutcome[],     // all settled matches; the function filters to group-stage
  groupAssignments: GroupAssignment[],  // which teams are in which group (from the fixture data)
): TournamentGroupStandings;
```

The function computes standings using the WC 2026 tiebreaker order (from the root `CLAUDE.md` Simulation Engine section):

```
points → GD → GS → H2H → H2H GD → Fair Play → lots
```

For Phase B simplicity, implement points → GD → GS → H2H → H2H GD as deterministic tiebreakers. Fair Play data is not in `match_outcomes` (no card counts ingested); if a tie reaches that level, fall back to alphabetical FIFA code (lots equivalent). Document this simplification in the module's docstring.

The 8 best thirds: take the third-place finisher from each of the 12 groups, rank them by (points, GD, GS), take the top 8.

The function is pure (no DB, no clock). It can be unit-tested with fixture match arrays.

### 4. Evaluator extension for groups stage

Update `website/src/lib/sim/predictionEvaluator.ts` to handle the `groups` stage case for `full_bracket` mode.

When `detectFullBracketStage(prediction.scenario)` returns `'groups'` (the user submitted with `koAdvancers.length === 0`):

1. Compute group standings from settled `match_outcomes` via the new helper.
2. If any group's actual W or RU does not match the user's pick, transition to `dead` with a reason like `"Group A: actual RU is USA, predicted MEX. Scenario contradicted."`.
3. If a group is fully settled (all 6 group-stage matches complete) and the user's W and RU and 3rd place all match: that group is confirmed for the user.
4. If all 12 groups are confirmed and the user's 8 best thirds match the actual 8 best thirds: transition to `promoted` with a reason like `"All 12 groups confirmed. Scenario promoted."`.
5. Otherwise: stays alive, count refreshed against the joint of remaining unsettled group predictions.

The existing other-stage Full Bracket logic stays unchanged.

Add at least four new unit tests covering:
- Groups-only alive (some groups settled and consistent, others not yet played)
- Groups-only dead (one group's actual RU differs from prediction)
- Groups-only promoted (all 12 groups + best thirds confirmed)
- Mid-tournament groups (some groups fully settled and matching, others not started)

### 5. GitHub Actions workflow

Add `.github/workflows/ingest_match_outcomes.yml`. Hourly cron during the tournament window.

```yaml
name: Ingest live match outcomes

on:
  schedule:
    - cron: "0 * * * *"     # every hour
  workflow_dispatch: {}     # manual trigger for testing

jobs:
  ingest:
    runs-on: ubuntu-latest
    if: github.repository == 'NicolasDuarte04/the-45-percent-problem'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -e .
      - name: Fetch and ingest match outcomes
        env:
          INGEST_TOKEN: ${{ secrets.INGEST_TOKEN }}
          FOOTBALL_DATA_API_KEY: ${{ secrets.FOOTBALL_DATA_API_KEY }}  # adjust per source
          SITE_URL: https://45analytics.com
        run: python ingestion/fetch_match_outcomes.py
```

Tournament window gating: the workflow runs hourly all year, but the script itself should short-circuit (and exit 0 with a "no tournament window" log line) outside the June 11 to July 19, 2026 window. This keeps the cron simple while preventing wasted API calls.

### 6. Documentation

Add a short note to `website/CLAUDE.md` (or create one if it does not exist) documenting the ingestion path:

- Where the Python script lives
- What the GitHub Action runs
- How `/api/ingest/match-outcomes` differs from `/api/admin/match-outcomes`
- The fallback path if ingestion fails (admin manual entry remains available)

Keep this under 300 words. The detail is in the code; the doc is a pointer.

## Decisions to make and document

The agent has latitude on three decisions. Document each in the report.

1. **Data source**: which API or scraping target. Investigation precedes commitment.
2. **Best-thirds tiebreaker fallback**: alphabetical FIFA code is the proposed default for ties that reach "lots"; if the agent finds a more defensible deterministic rule, use it and document.
3. **GitHub Actions secrets layout**: which secrets need to exist, what their expected format is. Document in the workflow YAML comments AND in the doc note from piece 6.

## Acceptance criteria

- New Python script `ingestion/fetch_match_outcomes.py` follows the project's ingestion file skeleton. Standalone executable. Logs structured events via the existing `utils/logger.py`.
- New website endpoint `/api/ingest/match-outcomes` accepts batched outcomes, upserts to `match_outcomes`, triggers re-evaluation. Bearer-authenticated against `INGEST_TOKEN`.
- New `groupStandings.ts` helper computes WC 2026 group standings deterministically from match outcomes plus group assignments.
- Evaluator handles the `full_bracket` `groups` stage case: alive / dead / promoted transitions work correctly, with descriptive reason strings.
- New GitHub Actions workflow runs hourly with proper tournament-window short-circuit.
- Documentation note added to `website/CLAUDE.md`.
- TypeScript build clean.
- All existing tests pass (260 baseline after checkpoint 14).
- New tests added:
  - At least 6 unit tests for `groupStandings.ts` (clean group ordering, tiebreakers at each level, best-thirds selection edge cases).
  - At least 4 evaluator tests for the new groups stage case.
  - At least 3 integration tests for the new ingest endpoint (auth, batch validation, evaluator trigger).
  - Python script: include a `--dry-run` flag that fetches and prints but does not POST; document in a one-line block at the top of the script.
- The existing admin manual entry path (`/api/admin/match-outcomes`) still works unchanged. The script and the admin route are complementary, not exclusive.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language anywhere.
- The reason strings written to `prediction_state_log` from the new groups-stage evaluator path are descriptive, not evaluative. Same vocabulary as checkpoint 13: "Group A: actual RU is USA, predicted MEX. Scenario contradicted." No "Tough break", no "Better luck next time".
- Python script logging uses the project's structured-logging pattern (`log.stage(...)`, `log.info(...)`, `log.warning(...)`, `log.success(...)`). No `print()`.
- The script writes to the snapshot registry via the existing `DataSnapshotHasher` + `SnapshotRegistry` pattern from `utils/hasher.py`. Each batch of ingested matches is a new snapshot.

## Workflow conventions

This checkpoint touches both the Python research side (under the root `CLAUDE.md` rules) and the website side (under `website/CLAUDE.md` rules).

**Python side** (per root `CLAUDE.md`):
- Python 3.9+ with `from __future__ import annotations`.
- `engine="pyarrow"`, `index=False` on any Parquet writes.
- Snapshot hashing and registry on every output.
- Append-only logs (the `data/snapshots/ingested_match_outcomes.jsonl` file is append-only).
- The `--dev-sandbox` flag (per root `CLAUDE.md` "Local invocation guard"): any script that writes to `data/snapshots/` must accept this flag, redirecting writes to `tmp/snapshots/` for local runs. CI omits the flag.

**Website side**:
- Work on a feature branch named `ux/checkpoint-15-live-ingestion-and-group-standings`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already.

**PR scope discipline**: this is a cross-boundary checkpoint. Resist the urge to refactor Python code that is not in scope. If you discover unrelated em-dashes in Python files, leave them; the brand sweep was scoped to `website/` (and the root `CLAUDE.md` has its own pending pass).

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 15 Report: Live ingestion and group standings

### Branch
ux/checkpoint-15-live-ingestion-and-group-standings

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K
Python lines: A
TypeScript lines: B
GitHub Actions YAML lines: C
Documentation lines: D

### Data source choice
- Selected API or scraping target.
- Why this one over the alternatives investigated.
- The signup or auth path (API key required? where to get it?).
- Coverage confirmation: does the source actually have WC 2026 match data scheduled?

### Group standings algorithm
- Tiebreaker order implemented.
- Fallback choice for "lots" tier.
- Best-thirds selection logic summary.

### What landed
- Python script architecture (fetch / clean / build / run)
- Ingest endpoint differences from admin route
- Evaluator groups-stage logic summary
- GitHub Actions workflow tournament-window gating

### Test coverage
- Group standings unit tests (file:line of each)
- Evaluator groups-stage tests (file:line of each)
- Ingest endpoint integration tests (file:line of each)
- Python script: dry-run output captured? Yes / No

### Manual verification
- [ ] Python script runs in dry-run mode and prints expected output
- [ ] Ingest endpoint accepts a fake batch with valid bearer token
- [ ] Ingest endpoint rejects a batch with invalid bearer token
- [ ] Group standings function produces correct W/RU/3rd for a fixture match set
- [ ] Best-thirds selection works for a tied scenario
- [ ] Groups-only Full Bracket prediction transitions correctly when all 12 groups settle
- [ ] Existing admin /api/admin/match-outcomes still works
- [ ] TypeScript build clean
- [ ] All existing tests pass
- [ ] New tests pass

### Follow-ups / open questions
- Anything you flagged but did not implement.
- Source-API rate limits (if known) that could affect hourly cadence.
- Coverage gaps in the data source (matches it does not surface, fields it omits).

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
