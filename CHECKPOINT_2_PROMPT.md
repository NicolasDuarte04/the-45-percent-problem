# Checkpoint 2 — Nightly pipeline restart

Read `GO_TO_LAUNCH.md` at the repo root first for the broader plan. Checkpoint 1 (`cp-04-narrative-hotfix`) has already shipped: the false "KILL CRITERIA TRIPPED" badge is gone, `evaluation_metrics.json::kill_criteria_check` carries `marginal_gap_se: 6.22`, `status: "pre_tournament_locked"`, and `tripped: false`. The snapshot timestamp is still stuck at `2026-05-12T12:44Z`, and that is what this checkpoint fixes.

## Goal

Restart the nightly snapshot pipeline so the timestamp on `45analytics.com` advances every day. Concretely: rewire `.github/workflows/nightly_pipeline.yml` to invoke `scripts/regenerate_snapshot_from_batch.py` instead of `scripts/generate_snapshot.py`, validate locally that it produces correct M2-tagged output, dispatch the workflow manually once to prove it works in CI, then uncomment the cron.

The output the production deploy needs is M2_fifa probabilities (Spain, France, Argentina, England leading), tagged `champion_model: "M_STAR"` in the schema enum, with `kill_criteria_active: false` consistent with what Checkpoint 1 shipped in `evaluation_metrics.json`. The OSF lockfile is the source of truth here; do not relitigate.

## Why this matters

The site has been stale for two weeks. Every day it stays stale, the project looks dead during the 16-day pre-kickoff window when journalists, the OSF preregistration audience, and the prediction-markets community are most likely to find it. The fix is mostly already written; the workflow just needs to call it.

## Branch

`cp-05-pipeline-restart`

Before any edits: `git checkout main && git pull`, then branch. Confirm the working tree is clean. The cp-04 branch is merged; do not inherit its state.

## Why the cron is disabled (verified)

`.github/workflows/nightly_pipeline.yml` lines 4 to 11 spell out the reason: the previous nightly run script (`scripts/generate_snapshot.py`) computes its own M0 Monte Carlo via `SimpleEloProvider` and tags the output `champion_model: "M0"`. Once the M2 champion was locked under amendment v1.1, those nightly runs began overwriting the deployed M2 numbers with M0 numbers. The cron was disabled by hand on 2026-05-12 to stop the regression. The replacement script (`scripts/regenerate_snapshot_from_batch.py`) exists, is documented at the top of the file, and re-aggregates the user-facing JSON from the M2 batch directly. The workflow has not yet been rewired to call it.

## Pre-work (do this before changing the YAML)

1. **Fetch the workflow history.**

   ```bash
   gh run list --workflow nightly_pipeline.yml --limit 30
   ```

   Expected: a string of successful runs ending on or before 2026-05-12, then nothing scheduled after that (because the cron is commented out). If you see scheduled runs after 2026-05-12, the YAML on `main` differs from what I read; stop and report.

   Then look at the last 2 successful runs:

   ```bash
   gh run view <run-id> --log | tail -200
   ```

   Confirm the final commit each one pushed to `main` had `champion_model: "M0"` in `website/public/data/latest/snapshot_meta.json`. If it had `M2_fifa` or `M_STAR` instead, the YAML preamble's claim is wrong and there's a second bug; stop and report.

2. **Read both snapshot scripts end to end.**
   - `scripts/generate_snapshot.py` (the old one; you are *replacing* this in the workflow, not modifying it).
   - `scripts/regenerate_snapshot_from_batch.py` (the new one; you are *invoking* this from the workflow).

   The new script reads `data/calibration/active_batch.json` for the batch pointer, reads `team_runs_M2.parquet` from that batch, aggregates per-team progression probabilities, writes a new snapshot bundle to `website/public/data/snapshots/<new_id>/`, replaces `website/public/data/latest/` with a copy of that bundle, and appends a row to `website/public/data/manifest.json`. It carries forward the existing `evaluation_metrics.json` with only the `snapshot_id` field updated.

3. **Run the new script locally and inspect the diff.**

   From the repo root (Python venv active):

   ```bash
   python scripts/regenerate_snapshot_from_batch.py
   ```

   The script's headline-numbers spot-check at the end (lines 458 to 464) should print the M2 champion probabilities. The order should match the bracket page shipped today: Spain top at ~18.2%, France ~14.9%, Argentina ~13.7%, England ~8.3%. If a different team is at the top, or the probabilities are wildly off, *stop and report*; something in the batch or the carry-forward pointer has drifted.

   Then diff against the current `latest/`:

   ```bash
   git diff --stat website/public/data/latest/
   git diff website/public/data/latest/snapshot_meta.json
   git diff website/public/data/latest/evaluation_metrics.json
   ```

   Expected changes in `snapshot_meta.json`:
   - `snapshot_id` advances to today's UTC timestamp.
   - `generated_at_utc` advances to now.
   - `code_sha` reflects the current HEAD.
   - `data_sha` may change if the batch pointer hash differs.
   - `champion_model` stays `"M_STAR"`.

   Expected changes in `evaluation_metrics.json`:
   - Only `snapshot_id` changes.
   - `kill_criteria_check.tripped` stays `false`.
   - `kill_criteria_check.status` stays `"pre_tournament_locked"`.
   - `kill_criteria_check.marginal_gap_se` stays `6.22`.

   If `evaluation_metrics.json` shows more than a `snapshot_id` change, the script is overwriting the cp-04 fix; stop and report.

4. **Find the cp-04 regression risk and fix it.**

   The new script (`scripts/regenerate_snapshot_from_batch.py` line 307) hardcodes `"kill_criteria_active": True` in the snapshot meta it writes. That is the same boolean cp-04 flipped to `false`. Without an edit, the first nightly run will silently regress cp-04's data fix.

   Edit the script to set `"kill_criteria_active": False`. Add a one-line comment naming the cp-04 commit (or the issue, or this checkpoint prompt) so the reason is auditable from the source. Do **not** introduce a runtime computation in this checkpoint; a single hardcoded `False` consistent with cp-04 is enough. A more general gate (compute from `evaluation_metrics.kill_criteria_check.status`) is welcome as a follow-up, not now.

   This is the only edit to the script. Everything else in `regenerate_snapshot_from_batch.py` is correct.

5. **Confirm the deploy hook.**

   The current workflow has a `Trigger Vercel deploy hook (belt-and-braces)` step using `${{ secrets.VERCEL_DEPLOY_HOOK }}`. Confirm the secret exists in the repo with:

   ```bash
   gh secret list
   ```

   You should see `VERCEL_DEPLOY_HOOK` and `SNAPSHOT_PUSH_TOKEN`. If either is missing, stop and report; do not push without the hook.

## Scope (do this)

1. **Edit `.github/workflows/nightly_pipeline.yml`.** Replace the snapshot-generation step block with a single invocation of the new script. The shape:

   - Keep the checkout step (`token: ${{ secrets.SNAPSHOT_PUSH_TOKEN }}`).
   - Keep the Python 3.9 setup.
   - Keep `pip install -e ".[dev]"`.
   - Drop the pnpm install, the Node setup, and the canonical-draw export. The new script does not consume the canonical draw at runtime; the draw is already baked into the existing `tournament.json` and `bracket.json` that the script carries forward. (Verify this claim by reading the script's `regenerate_tournament_json` function before deleting the pnpm steps.)
   - Drop the `fetch_wc2026_fixtures.py` step. The fixtures are already on disk and the new script does not re-read them.
   - **Decision point — keep or drop the Elo fetch?** The Elo fetch (`fetch_elo_ratings.py`) is no longer consumed by the snapshot path. Two defensible options:
     - **Drop it.** Cleanest. If a future batch needs fresh Elo, a dedicated workflow can fetch it.
     - **Keep it as a side-effect.** The fetch updates `data/raw/elo_ratings.parquet`, which is useful for the next batch run. The cost is a network call and a possible commit if Elo numbers change.

     My recommendation: drop it in this checkpoint. Add a TODO comment in the YAML saying "Elo fetch is no longer in the snapshot path; consider a dedicated `fetch_elo.yml` workflow if pre-batch refresh is needed." Justify the recommendation in the PR description.

   - Replace `python scripts/generate_snapshot.py` and `python scripts/normalize_snapshot.py` with a single `python scripts/regenerate_snapshot_from_batch.py`.
   - Keep the stage / commit / push step. The "no changes detected" guard is fine; the new script always touches at least `snapshot_meta.generated_at_utc`, so it will produce a diff every run.
   - Keep the Vercel deploy hook step. Verify the hook fires by reading the previous successful run's logs for the curl exit code.
   - Keep the summary step.
   - **Uncomment the cron.** `schedule: - cron: '0 0 * * *'`. After confirming the rest works end-to-end via `workflow_dispatch`.

2. **Add a header comment block at the top of the YAML** explaining what cp-05 did and why. Format:

   ```yaml
   # Rewired 2026-05-26 (cp-05). Previously called scripts/generate_snapshot.py
   # which produced M0 numbers that overwrote the M2 deploy under amendment v1.1.
   # Now calls scripts/regenerate_snapshot_from_batch.py which re-aggregates
   # the website JSON bundle from the locked M2 batch (data/calibration/active_batch.json).
   # The Elo fetch and the canonical-draw export were removed from this path;
   # the new script consumes neither. See GO_TO_LAUNCH.md Checkpoint 2.
   ```

3. **Edit `scripts/regenerate_snapshot_from_batch.py` line 307** to set `"kill_criteria_active": False` with a one-line comment naming cp-04.

4. **Test the workflow end to end via `workflow_dispatch`.**

   - Push the branch.
   - Open the PR but do not merge yet.
   - From the PR branch, run `gh workflow run nightly_pipeline.yml --ref cp-05-pipeline-restart` (or click "Run workflow" in the GitHub UI on the PR branch).
   - Watch the run with `gh run watch <run-id>`.
   - Confirm: it succeeds, it commits a new snapshot to the branch (not `main`, because the workflow checks out main and commits to main; the dispatch on a non-main branch may need special handling — verify this by reading the workflow's `with: ref: main` line and decide whether to dispatch from main directly via `workflow_dispatch`).

   If the workflow's commit step targets `main` rigidly (it does — line 30 `ref: main`), the safer flow is:
   - Merge the PR to main first.
   - Then immediately trigger `gh workflow run nightly_pipeline.yml`.
   - Watch the resulting commit on main; verify the snapshot files updated and Vercel deployed.

   Document the path you took in the PR description.

5. **After the manual dispatch succeeds**, confirm the live site:
   - `curl -sS https://45analytics.com/data/latest/snapshot_meta.json | jq '.snapshot_id, .generated_at_utc, .champion_model, .kill_criteria_active'`
   - Expected: today's date, "M_STAR", `false`.

## Out of scope (do not do this)

- No edits to `scripts/generate_snapshot.py`. It is being replaced in the workflow, not deleted from the repo. (It still has historical value; the regenerate script's docstring references it. Leave it.)
- No edits to the simulation engine (`simulation/*.py`), the batch outputs (`outputs/phase5/batches/*`), the calibration files (`data/calibration/*`), or any Phase 7 artifact.
- No edits to OSF artifacts.
- No edits to the frontend, the email system, or any vault page.
- No new Python or Node dependencies.
- Do not delete `scripts/generate_snapshot.py`, `scripts/normalize_snapshot.py`, or `ingestion/fetch_elo_ratings.py`. Removing them from the workflow is enough.
- No edits to the `ingest_match_outcomes.yml` workflow; it is on a different cadence and unaffected.

## Conventions to respect

- No em dashes or en dashes.
- The `--dev-sandbox` flag convention exists for any append-only-log writer. The regenerate script does not write to `data/snapshots/forecast_log.jsonl` or `data/snapshots/event_log.jsonl`, so this rule does not apply directly here. (Verify by grepping the script for `forecast_log` and `event_log`.)
- Use absolute paths from the repo root in any bash blocks in the YAML; the workflow does the same.
- Verify any test or convention claim by inspection before relying on it. The Checkpoint 1 prompt incorrectly told the agent tests were colocated `.test.tsx`; in fact they live in `tests/**/*.test.ts`. Do not take this prompt's conventions on trust; grep for them.

## Verification

Before you mark this checkpoint ready:

- [ ] You have read both `generate_snapshot.py` and `regenerate_snapshot_from_batch.py` end to end.
- [ ] You ran `regenerate_snapshot_from_batch.py` locally; the spot-check printed Spain top with ~18.2%, France ~14.9%, Argentina ~13.7%.
- [ ] You diffed `website/public/data/latest/` after the local run; the diff is limited to expected fields (timestamps, snapshot_id, code_sha, data_sha) plus the `kill_criteria_active` flip you made in the script.
- [ ] The `evaluation_metrics.json` carried forward retains cp-04's `marginal_gap_se: 6.22`, `status: "pre_tournament_locked"`, `tripped: false`.
- [ ] The YAML reads cleanly; the cron is uncommented; the header comment is present.
- [ ] `gh secret list` confirms both `SNAPSHOT_PUSH_TOKEN` and `VERCEL_DEPLOY_HOOK` exist.
- [ ] A manual `workflow_dispatch` from `main` (after PR merge) succeeded, produced a new commit on `main`, and the live site at `45analytics.com/data/latest/snapshot_meta.json` shows today's date and `champion_model: "M_STAR"` and `kill_criteria_active: false`.
- [ ] No console errors on `45analytics.com/ledger` after the deploy.
- [ ] The cp-04 fix is not regressed: visit `/ledger`, confirm the pill still reads "AWAITING TOURNAMENT KICKOFF" and not "KILL CRITERIA TRIPPED".

## Merge-readiness checklist

Answer each item with `Y` or `N`. Do not mark the checkpoint ready unless every item is `Y` (or `N*` with explanation, as cp-04 did).

```
Y/N — gh run list confirms the cron was last successful on or before 2026-05-12 and stopped after.
Y/N — Local dry-run of regenerate_snapshot_from_batch.py produced the expected M2 spot-check (Spain ~18.2%).
Y/N — The script's hardcoded kill_criteria_active: True is flipped to False with a cp-04 reference.
Y/N — .github/workflows/nightly_pipeline.yml now calls the new script, with the Elo fetch and canonical-draw export removed.
Y/N — Header comment in the YAML explains the cp-05 rewire.
Y/N — The cron schedule is uncommented (`- cron: '0 0 * * *'`).
Y/N — gh secret list shows SNAPSHOT_PUSH_TOKEN and VERCEL_DEPLOY_HOOK exist.
Y/N — A manual workflow_dispatch run succeeded post-merge and produced a new commit on main with today's timestamp.
Y/N — curl on https://45analytics.com/data/latest/snapshot_meta.json returns today's snapshot_id, champion_model = M_STAR, kill_criteria_active = false.
Y/N — The cp-04 frontend fix is not regressed; the Ledger pill still reads "AWAITING TOURNAMENT KICKOFF".
Y/N — No new dependencies, no edits to out-of-scope files, no changes to the simulation engine or OSF artifacts.
Y/N — Branch is `cp-05-pipeline-restart`, off latest `main`, clean commit history, ready to PR.
```

If every line is `Y`, write a PR description: the goal sentence, the rewire summary, the local-dry-run spot-check numbers, the manual-dispatch result, and the live-site verification output. Then stop.

If any line is `N`, explain the blocker before pushing.

## Decision tree if things don't match

- **Spot-check probabilities are wildly off (e.g. ARG at the top with >20%):** The batch pointer in `data/calibration/active_batch.json` is wrong, or the batch parquet files have been overwritten. Do not push the rewire. Open a question to Nicolás.

- **`evaluation_metrics.json` diff is more than `snapshot_id`:** The regenerate script is overwriting cp-04's fields somewhere. Read the script's `evaluation_metrics.json` handling (around lines 344 to 347) and confirm it only updates `snapshot_id`. If it does and the diff is still larger, the existing `latest/evaluation_metrics.json` doesn't match what cp-04 left; investigate before changing the script.

- **The workflow_dispatch run fails with a token error:** `SNAPSHOT_PUSH_TOKEN` is expired or the bot account was removed from the branch-protection bypass list. Do not push. Open a question.

- **The workflow succeeds but Vercel does not redeploy within 5 minutes:** Check the Vercel hook curl output in the run logs. If the hook returned a 2xx but no deploy started, the hook URL has been rotated; do not push the cron uncomment. The Vercel Git integration should also pick up the commit independently; if that also fails to fire, the integration is broken and someone needs to look at the Vercel project settings.

- **The site shows the new timestamp but the bracket numbers regress:** The carry-forward logic in the script touched `tournament.json` in a way that broke the canonical-draw mapping. Inspect `regenerate_tournament_json` and the `_TEAM_ID_TO_DISPLAY_NAME` table for missing entries.

## A note on judgement

This checkpoint touches production data flow. The cost of a bad push is the site silently serving wrong probabilities to incoming WC traffic. Take the manual dispatch step seriously: do not uncomment the cron until you have personally watched a manual run succeed end to end and verified the live site shows the right numbers. Once the cron is uncommented and the next 00:00 UTC run lands, the next chance to catch a regression is the morning after.
