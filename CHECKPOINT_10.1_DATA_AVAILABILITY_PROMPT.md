# Checkpoint cp-10.1 — Restore data availability in CI (URGENT)

Before reading this prompt, read these in order:

1. `WORKFLOW.md` at the repo root. The operating model for this project. Read end to end.
2. `PLAN.md` at the repo root. The current execution plan. Particularly the "Current state" and "Pending checkpoints" sections.
3. `docs/audit/architecture-diagnostic-2026-06-03.md`, especially §1, §3.1, §3.2, and §7 Q1. This is the audit that surfaced the problem this checkpoint exists to fix.

This is a hotfix checkpoint, not a feature. It must ship within 24 hours of merge. The production nightly cron is broken right now, and every additional day it stays broken is a day the live site silently freezes on a stale snapshot during the WC tournament window.

## Goal

Make the production nightly pipeline succeed end to end again, and make cp-10's settled-result conditioning path actually able to run in the cron environment when the first match is settled.

After this checkpoint ships:

- `gh workflow run nightly_pipeline.yml --ref main` exits 0 against a clean checkout.
- The pipeline reads its input parquets from the git-tracked repo state, not from absent gitignored files.
- The first settled-count delta during the tournament (June 11 onward) triggers a re-batch that successfully reconstructs the `MonteCarloRunner` via `DataLoader`, without crashing on a `FileNotFoundError`.
- Production snapshot timestamp advances (the first successful nightly after this lands writes a new snapshot to `website/public/data/latest/`).

## Why this matters

The 2026-06-03 diagnostic found that the nightly cron has been failing since 2026-06-03T02:36Z with `FileNotFoundError: wc2026 fixtures parquet not found`. cp-09 introduced a code path that reads `data/raw/wc2026_fixtures.parquet`, but `.gitignore:26` (`data/raw/*.parquet`) excludes every Parquet in that directory from git. The cron checks out a clean main from origin; the file does not exist; the script crashes; the pipeline exits 1 before committing.

cp-10 made this worse without realizing. cp-10's re-batch path (triggered by a settled-count delta) reconstructs the `MonteCarloRunner` via `simulation/batch_runner.py:_build_runner`, which calls `DataLoader().get_elo()`, `get_matches()`, `get_recent_form()`, `get_fifa_rankings()`, `get_macro()` — every one of which reads a `data/raw/*.parquet` file. None of those files are git-tracked (`git ls-files 'data/raw/*.parquet'` returns zero). So the moment the first group match is settled during the tournament and the settled-count delta triggers a re-batch, `run_batch` will crash exactly the way the metadata read crashes today.

The live model is currently not live. Production is frozen on the snapshot dated 2026-06-02T16:24Z. Every nightly since then has failed identically. The model that the website claims to be running every night is not actually running. This checkpoint restores the ability to run it.

## Branch

`cp-10.1-data-availability`

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes the cp-10 merge (commit `1edd971` or later). Working tree clean. Branch off main.

## Decision tree on the architectural approach

The 2026-06-03 diagnostic §7 Q1 asks how to fix data availability and lists three options. Architectural decision is yours to make explicit in Stage 1; default recommendation is Option A.

**Option A (RECOMMENDED): Force-track the locked input parquets.**

Add a targeted exception to `.gitignore` that un-ignores the specific parquet files the pipeline reads. Commit those files into the repo. Pros: smallest change; matches how the active-batch parquets in `outputs/phase5/batches/.../*.parquet` are already git-tracked (they shipped via cp-05's batch workflow); matches the OSF preregistration intent that all input data be reproducible from the repo. The files are static (the fixture parquet is the WC 2026 fixed schedule; the Elo and FIFA rankings are the calibration snapshot used to lock M2_fifa per the pre-registration). Cons: increases repo size by however many MB the parquets weigh (`du -sh data/raw/*.parquet` will tell us).

**Option B: Regenerate the parquets in a workflow step before the regen script runs.**

Add a step to `.github/workflows/nightly_pipeline.yml` that re-runs the relevant ingestion scripts (`ingestion/fetch_elo_ratings.py`, `ingestion/fetch_fifa_rankings.py`, etc.) to produce fresh parquets before the regenerate script consumes them. Pros: forces the pipeline to always work against fresh inputs; matches how some other repos handle reproducibility. Cons: introduces network dependence into the nightly cron (every external fetch is a potential failure point); changes the meaning of "the locked calibration" (the parquets shipped to lock M2_fifa are no longer authoritative; whatever the fetch returns tonight is); contradicts the OSF preregistration's data-snapshot discipline.

**Option C: Build a parquet export shim from a different source.**

Build a workflow that exports the required parquets from somewhere else (e.g., a sibling private repo, an S3 bucket, a manually-uploaded artifact) before the cron runs. Pros: decouples the public repo from large binary blobs. Cons: adds operational complexity; introduces a second source of truth.

**Recommendation: Option A.** It is the smallest change, it is consistent with how the active-batch parquets already work, and it most faithfully matches the OSF preregistration's intent. The cost is repository size, which is a one-time problem; the alternative is operational complexity that will surface during the tournament when no one has bandwidth to debug it.

In Stage 1, the agent reports back with: which files need to be tracked, what their sizes are, what the total repo-size impact is, and confirmation of the recommendation. Nicolás approves the picked option before Stage 2.

## Stage 1 — Inspection and decision

### Step 1: Confirm the current state of `data/raw/`.

```bash
ls -la data/raw/
ls -la data/raw/*.parquet 2>/dev/null
git check-ignore -v data/raw/*.parquet 2>/dev/null | head -10
git ls-files 'data/raw/*.parquet'
du -sh data/raw/*.parquet 2>/dev/null
```

Capture in inspection notes:

- Which Parquet files exist in `data/raw/` on disk right now (Nicolás's local working tree).
- Which ones are gitignored (probably all of them via the `data/raw/*.parquet` pattern).
- Which ones are git-tracked (should be zero).
- Total size of all Parquets in `data/raw/`.

### Step 2: Trace every read of `data/raw/*.parquet` in code paths that run in the cron.

Specifically check:

- `scripts/regenerate_snapshot_from_batch.py` (the cron's main entrypoint)
- `simulation/batch_runner.py` (called by the regenerate script on settled-count delta)
- `simulation/monte_carlo_runner.py` (called by batch_runner)
- `simulation/load_settled.py` (called by batch_runner)
- `ingestion/data_loader.py` (called transitively by batch_runner)

For each file, list which `data/raw/*.parquet` files it reads and the function that does the read. This is the minimal set the pipeline needs.

Capture the inventory in inspection notes. Format:

```
| File | Read by function | Used in cron path |
|---|---|---|
| data/raw/wc2026_fixtures.parquet | regenerate_snapshot_from_batch.py:_count_total_matches | yes (every run) |
| data/raw/elo_ratings.parquet | DataLoader.get_elo (via _build_runner) | yes (re-batch path) |
| ... etc ... |
```

### Step 3: Verify there are no hidden dynamic generations.

Check whether any of the parquets in `data/raw/` are produced by an existing workflow step (e.g., does the cron already run `ingestion/fetch_elo_ratings.py` before the regenerate script?). If yes, that step is currently failing too or those parquets are sourced from elsewhere; either way, document.

```bash
grep -rln 'fetch_' .github/workflows/
grep -rln 'data/raw' .github/workflows/
```

### Step 4: Estimate repo-size impact.

If Option A is chosen, the repo grows by the total Parquet size. Run `du -sh data/raw/` to get the number. Compare against current repo size (`du -sh .git`). Document in inspection notes.

If the total is under 50 MB, Option A is uncontroversial. If it is over 200 MB, that's worth flagging — but even then Option A is probably still right (the alternative is operational debt during the tournament).

### Step 5: Stop and report.

Write inspection notes to `docs/onboarding/cp-10.1-inspection-notes.md`. Include:

- Inventory of files in `data/raw/` and their gitignored status.
- Which files are read by cron paths (the inventory table above).
- Whether any are dynamically regenerated.
- Repo-size impact for Option A.
- Recommendation (default: Option A) with reasoning.
- Explicit STOP gate: "Awaiting Nicolás's confirmation before Stage 2 begins."

## Stage 2 — Implementation (after Nicolás approves)

After Nicolás approves the picked option (default: Option A), implement.

### If Option A (force-track parquets):

1. **Update `.gitignore`** to add a targeted exception for the specific parquets the cron needs. Do NOT un-ignore the entire `data/raw/*.parquet` pattern — that would re-introduce drift between "raw input the pipeline needs" and "miscellaneous data files the team might drop in." Be explicit:

   ```gitignore
   # Existing ignore (line 26 or thereabouts):
   data/raw/*.parquet

   # cp-10.1: un-ignore the specific files the production pipeline reads.
   # These are the locked input set used to produce batch_20260512_013228Z
   # under amendment v1.1; treat them as reproducibility artifacts.
   !data/raw/wc2026_fixtures.parquet
   !data/raw/elo_ratings.parquet
   !data/raw/historical_matches.parquet
   !data/raw/recent_form.parquet
   !data/raw/fifa_rankings.parquet
   !data/raw/macro_data.parquet
   ```

   Adjust the list based on Stage 1's inventory.

2. **Add the parquets to git.** Use `git add -f` if necessary (the exception above should make `git add` work without `-f`, but `-f` is safe).

   ```bash
   git add .gitignore
   git add data/raw/wc2026_fixtures.parquet
   git add data/raw/elo_ratings.parquet
   git add data/raw/historical_matches.parquet
   git add data/raw/recent_form.parquet
   git add data/raw/fifa_rankings.parquet
   git add data/raw/macro_data.parquet
   ```

3. **Verify the additions.**

   ```bash
   git ls-files data/raw/*.parquet
   git diff --cached --stat
   ```

   Expected: every parquet from the inventory is now tracked. Diff stat shows the size impact.

4. **Commit.**

   ```bash
   git commit -m "cp-10.1: force-track locked input parquets for nightly cron"
   ```

   Commit message body should explain: which files are tracked, why (the cron crashes without them), and that they are the locked calibration set per amendment v1.1.

### If Option B or C: a different implementation path; will be detailed if Nicolás picks one of those.

### Verify the fix works.

After committing, simulate the cron's clean checkout locally to confirm the regen script succeeds:

```bash
# Simulate a fresh checkout in a temp directory.
TMPDIR=$(mktemp -d)
git clone . "$TMPDIR/clone"
cd "$TMPDIR/clone"
git checkout cp-10.1-data-availability
# Install deps (use the same install step the cron uses).
pip install -e ".[dev]"
# Run the regenerate script.
python scripts/regenerate_snapshot_from_batch.py
```

The script should succeed end to end. Capture the output for the PR description.

Then verify cp-10's re-batch path also works in the clean checkout:

```bash
cd "$TMPDIR/clone"
# Inject a fake settled outcome via the parquet fallback path.
python -c "
import pandas as pd
import os
os.makedirs('data/processed', exist_ok=True)
df = pd.DataFrame([{
    'match_id': 'M01',
    'home_team': 'MEX',
    'away_team': 'RSA',
    'home_goals': 0,
    'away_goals': 3,
    'stage': 'group',
}])
df.to_parquet('data/processed/match_outcomes.parquet')
"
# Force a re-batch by clearing the active-batch's settled_count.
python -c "
import json
p = 'data/calibration/active_batch.json'
d = json.load(open(p))
d.pop('settled_count_at_batch_time', None)
json.dump(d, open(p, 'w'), indent=2)
"
# Run the regenerate script; it should detect a delta and trigger a re-batch.
python scripts/regenerate_snapshot_from_batch.py
```

The re-batch should succeed. Capture the output. Confirm `active_batch.json` has bumped to `schema_version: "1.1"` with `settled_count_at_batch_time: 1`.

## Verification

Before marking ready:

- [ ] Inspection notes exist at `docs/onboarding/cp-10.1-inspection-notes.md`. Nicolás has confirmed Option A (or whichever option was picked).
- [ ] `.gitignore` has the targeted exception for the specific input parquets, not a blanket un-ignore.
- [ ] `git ls-files data/raw/*.parquet` shows the tracked input set.
- [ ] Total repo-size impact is documented.
- [ ] In a clean clone of the branch, `python scripts/regenerate_snapshot_from_batch.py` succeeds end to end without `FileNotFoundError`.
- [ ] In a clean clone, the cp-10 re-batch path (triggered via an injected fake settled outcome and a cleared active-batch settled count) succeeds end to end. The re-batch produces a new batch directory and updates `active_batch.json` to schema 1.1 with the new fields.
- [ ] No code outside `.gitignore` and the parquet additions is modified.
- [ ] cp-04 through cp-10 fixes are preserved (no inadvertent regressions).

## Merge-readiness checklist

```
Y/N — Inspection notes complete; Nicolás confirmed the picked option.
Y/N — .gitignore has the targeted parquet exception (not a blanket un-ignore).
Y/N — All input parquets the cron reads are now git-tracked.
Y/N — Repo-size impact is documented in the PR description.
Y/N — Clean-clone test passes: regenerate_snapshot_from_batch.py succeeds end to end.
Y/N — Clean-clone test passes: cp-10's re-batch path succeeds when triggered.
Y/N — No code outside .gitignore is modified (this is a data/config-only fix).
Y/N — cp-04, cp-06, cp-07, cp-08, cp-09, cp-10 fixes preserved; no behavior change to the website.
Y/N — Branch is cp-10.1-data-availability, off latest main, ready to PR.
```

If every item is `Y`, push and open the PR as draft. Nicolás reviews and merges. **Critically:** after merge, immediately trigger a `workflow_dispatch` of the nightly to confirm production unblocks:

```bash
gh workflow run nightly_pipeline.yml --ref main
gh run watch
```

Watch the run end to end. If it succeeds, production should produce a fresh snapshot within a few minutes of the deploy. If it fails, stop everything and report; we do not start cp-10.2 until the nightly is green.

## Out of scope

- **The CI gate (cp-10.2).** That's the next checkpoint. cp-10.1 only restores data availability; cp-10.2 prevents the next regression from slipping through.
- **Fix 3 (cp-11), Fix 5 (cp-12), Fix 6 (cp-13).** All deferred until cp-10.1 and cp-10.2 ship.
- **`BracketBoard` subtitle over-claim.** That's cp-12. Deferred.
- **Any change to the workflow YAML beyond what's needed to consume the now-tracked files.** The cron currently works against a clean checkout; the only thing that should change is `data/raw/*.parquet` becoming available in that checkout.
- **Knockout-stage conditioning.** Post-launch follow-up.

## Decision tree if things don't match

- **Parquet files are larger than expected (e.g., over 500 MB total).** This is unlikely (the active-batch parquets that already ship are not huge), but if it happens, surface the size and consider whether a `git lfs` setup is warranted. For cp-10.1's urgency, regular git tracking is probably still the right call; LFS adds complexity that hurts during a hotfix.

- **A parquet doesn't exist on Nicolás's local disk either.** That means the file is missing from the project entirely, not just from CI. STOP and report. We need to either regenerate it from an ingestion script or recover it from a backup. Do not commit a placeholder.

- **The clean-clone test produces a different snapshot than the current production snapshot.** Likely a code change or data change happened between cp-10 merging and now. Diff the output against `website/public/data/latest/snapshot_meta.json` and figure out which fields differ. This may be informative (e.g., a `code_sha` change is expected) or alarming (e.g., champion model changed).

- **The cp-10 re-batch path test passes but the result is suspicious.** For example, the re-batch produces a `tournament.json` where Mexico's `p_champion` is non-zero despite the fake 0-3 loss being injected. This would mean conditioning isn't firing in CI even with the files present. Stop and report; we have a deeper bug than the data-availability one.

## A note on judgement

This is the smallest possible checkpoint that fixes the largest possible production failure. Resist the urge to bundle in other fixes. cp-10.2's CI gate is the natural next step but does not belong in this PR; it has its own scope, its own discussion, its own readiness criteria.

Nicolás's review of this PR is likely to take less than 30 minutes because the diff is straightforward (`.gitignore` change + N parquet binaries). The clean-clone test is what gives confidence; the diff itself is a coupon.

After this ships and the post-merge `workflow_dispatch` confirms production unblocks, cp-10.2 is the next checkpoint. Prompt to follow after this lands.
