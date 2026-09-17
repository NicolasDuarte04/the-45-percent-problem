# Checkpoint 19: Node.js 20 deprecation bump (Sonnet is fine)

## Context

After checkpoint 18 (tournament secrets setup) merged, the `Ingest live match outcomes` workflow ran successfully but logged a deprecation warning:

```
Node.js 20 actions are deprecated. The following actions are running on
Node.js 20 and may not work as expected: actions/checkout@v4, actions/...
```

The workflow still works. This is a future-deprecation notice from GitHub: the runner that uses Node.js 20 is being phased out in favor of Node.js 24. Bumping the action versions to the Node.js 24-based releases clears the warning and protects the workflow from breaking when GitHub eventually removes the Node.js 20 runner.

This task is mechanical: bump version pins on two actions, re-run the workflow, confirm the warning is gone. Sonnet is plenty.

## What to do

Three steps.

### 1. Investigate the actual deprecation timeline

Click the "Show more" on the workflow annotation at https://github.com/NicolasDuarte04/the-45-percent-problem/actions/workflows/ingest_match_outcomes.yml/runs (most recent run, `Annotations` section). Read the full warning text. Note which actions are flagged and any deprecation date GitHub announced.

If the deprecation date is more than 6 months away AND no action has a stable Node.js 24 release yet: stop, document the timeline in the report, and leave the workflow unchanged. We can revisit closer to the date.

If at least one action has a stable Node.js 24 release: proceed to step 2.

### 2. Bump the action versions

Read `.github/workflows/ingest_match_outcomes.yml`. List every `uses:` line. The current ones (from the workflow run logs) are:

- `actions/checkout@v4` (Node.js 20)
- `actions/setup-python@v5` (Node.js 20)

For each, check the action's GitHub Marketplace page or releases for a stable version that uses Node.js 24:

- `actions/checkout` → check for `@v5` (released October 2024, uses Node.js 24).
- `actions/setup-python` → check for `@v6` (check releases page).

If a stable release exists, bump the pin in the workflow YAML. If a release exists but is marked beta/preview, leave the pin and document why in the report. We do not ship pre-release dependencies in a workflow that runs hourly during the tournament.

### 3. Verify

Push the change to the branch and open the PR. Then:

1. Run the workflow manually via `workflow_dispatch` against the branch (not main; against the PR's branch).
2. Wait for it to complete.
3. Confirm the deprecation warning is gone from the annotations section.
4. Confirm the workflow succeeded (green check, "no tournament window" log line, exit 0).
5. Paste the run URL in the PR description.

If the bump introduces any new warning or error, do not merge. Revert the bump and document the failure mode in the report.

## Acceptance criteria

- Action version pins bumped only if stable Node.js 24 releases exist for each.
- Workflow run on the PR branch succeeds with zero deprecation warnings.
- PR description includes the run URL and a one-line summary of what changed.
- TypeScript build clean (no code changes; should pass trivially).
- No code changes outside `.github/workflows/ingest_match_outcomes.yml`.

## Brand-discipline guardrails

- No em-dashes or en-dashes anywhere.
- This is a maintenance task; no user-facing copy, no UI changes.

## Workflow

- Work on a feature branch named `ops/node-20-deprecation-bump`.
- Open a pull request when complete.
- The PR diff should be small: at most a few lines in the workflow YAML.

## End-of-task report

```
## Checkpoint 19 Report: Node.js 20 deprecation bump

### Deprecation timeline (from GitHub's warning)
- Date GitHub announced for removal: <DATE or "not specified">
- Actions flagged in the warning: <list>

### Versions bumped
- actions/checkout: v4 → v5 (Node.js 24)
- actions/setup-python: v5 → v6 (Node.js 24)
- (or: not bumped, with reason)

### Verification run
- URL: <workflow run URL>
- Result: success, 0 warnings, "no tournament window" log line confirmed
- Total duration: Ns

### Files changed
- .github/workflows/ingest_match_outcomes.yml

### Diff size
Lines added: N
Lines removed: M

### Ready for review
Y / N
```

Do not push to main. Open the PR and wait for review.

## What this delivers and how to test it

### What changes

Zero user-visible behavior change. The workflow runs the same way, hits the same endpoints, produces the same logs. The only difference is the deprecation warning disappears from the workflow run's annotations.

### How to test it as the operator (Nicolás)

After the agent reports back and you merge the PR:

1. Go to https://github.com/NicolasDuarte04/the-45-percent-problem/actions/workflows/ingest_match_outcomes.yml
2. Find the most recent run (after merge).
3. Click into it.
4. Confirm the "Annotations" section shows 0 warnings (it previously showed 1).
5. Confirm the run succeeded (green check, ~30 seconds, "no tournament window" message).

If both are true, the deprecation is resolved and the workflow is future-proofed.

### What this protects against

GitHub eventually removes the Node.js 20 runner. When that happens, any workflow still pinned to Node.js 20-based actions will fail. By bumping now, the ingest workflow keeps running through that transition. Doing this in May 2026 (well before any expected deprecation date) gives plenty of buffer.

### If something breaks

The bump should be safe (these are stable releases). If the verification run fails or introduces a new warning, the agent reverts the bump and documents the failure mode. We then wait for a different stable release before trying again.

### One thing not in scope

If the workflow has additional unrelated improvements available (caching pip installs, etc.), the agent should NOT pull them in. This is a single-purpose maintenance task. Anything else is a separate ticket.
