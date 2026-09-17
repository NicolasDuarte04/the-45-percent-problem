# Checkpoint cp-10.2 — Minimal CI gate (prevents the next silent regression)

Before reading this prompt, read these in order:

1. `WORKFLOW.md` at the repo root. The operating model.
2. `PLAN.md` at the repo root. Particularly the "Cross-project constraints" section (about how cp-10.2 must scope around El Voto 21J's paths) and decision log Q9 and Q10.
3. `docs/audit/architecture-diagnostic-2026-06-03.md` §3.3 ("No CI gate runs tests, lint, or typecheck"). That finding is what this checkpoint exists to address.
4. `BRIEF_FOR_EL_VOTO_ARCHITECT_2026-06-05.md` and `REPLY_TO_EL_VOTO_ARCHITECT_2026-06-05.md`. The cross-project coordination that constrains cp-10.2's scope.

cp-10.1 has just shipped (PR #84, merged 2026-06-05). The nightly cron is unblocked, production is producing fresh snapshots again. The gap cp-10.2 closes: there is no CI workflow that runs `pytest`, `ruff`, `mypy`, `tsc`, or `pnpm test` on PRs or pushes. cp-09 shipped a regression (read of a gitignored file in CI) and no automated check caught it before merge. cp-10.2 prevents the next cp-09-class regression.

## Goal

Add a CI gate that runs on every PR and every push to `main`. The gate executes the existing test, lint, and typecheck suites scoped to The 45% Problem's paths (per Q9: explicitly excluding `the-21j-problem/`), plus one end-to-end smoke test that runs `regenerate_snapshot_from_batch.py` against the checked-out tree. That smoke test is the specific check that would have caught cp-09's regression — its presence is what differentiates "we have CI" from "we have CI that protects us."

After this checkpoint ships:

- Every PR runs `pytest -q`, `ruff check`, `tsc --noEmit`, `pnpm test`, and the regenerate smoke test before merge is possible.
- The lint/typecheck/test surface is scoped to WC paths only. El Voto's `the-21j-problem/` directory is explicitly excluded from `ruff`. El Voto's tests are not picked up because `[tool.pytest.ini_options] testpaths` already scopes to `tests/`.
- A deliberately-injected cp-09-class regression (gitignore an input parquet) causes the CI to fail. Verified once as part of this checkpoint.
- The draft CI yaml is shared with El Voto's architect for a one-hour spot-check before the PR is marked ready-for-review.

## Why this matters

cp-09 introduced a read of `data/raw/wc2026_fixtures.parquet` in `_count_total_matches()`. The file was gitignored. The tests mocked the count and never invoked the real script against a clean tree. The PR passed local checks, landed on main, and broke the nightly cron from the next scheduled run. The bug shipped silently and stayed silent for three nights (2026-06-03, 06-04, 06-05) until the 2026-06-03 diagnostic found it.

With cp-10.2's smoke test running on every PR, the same regression would have been caught at PR time: a fresh CI checkout, no `data/raw/*.parquet` available (until cp-10.1 force-tracked them), `regenerate_snapshot_from_batch.py` invoked → `FileNotFoundError` → CI red → PR blocked. The smoke test costs ~30 seconds of CI runtime and catches the most expensive class of bug we have.

cp-11, cp-12, cp-13 all touch the same pipeline cp-09 touched. Without cp-10.2, the next regression will land the same way. With cp-10.2, the regression is caught at PR time.

## Branch

`cp-10.2-ci-gate`

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes cp-10.1's merge (commit `38eed9e`) and the post-cp-10.1 nightly snapshot (`9e07a86`). Working tree clean. Branch off main.

If your primary working tree is on a `session-*` branch with uncommitted El Voto work (likely, given recent activity), use a dedicated worktree as cp-10.1's agent did:

```bash
git worktree add ../wt-cp-10.2-ci-gate origin/main
cd ../wt-cp-10.2-ci-gate
git checkout -b cp-10.2-ci-gate
```

The cross-project discipline established in cp-10.1 is "don't touch the primary worktree if it has uncommitted El Voto work." Continue that pattern.

## Stage 1 — Inspection and CI yaml design

Read-only investigation. Write inspection notes to `docs/onboarding/cp-10.2-inspection-notes.md`.

### Step 1: Inventory existing workflows and tooling.

```bash
ls -la .github/workflows/
cat .github/workflows/nightly_pipeline.yml | head -50
cat .github/workflows/ingest_match_outcomes.yml | head -30
cat .github/workflows/snapshot-deploy.yml | head -50
```

Capture the existing workflow patterns. Specifically:
- What Python version is used? (`actions/setup-python@v5` with `python-version: '3.9'` per cp-05's pattern?)
- What pnpm / Node versions?
- What's the install step (`pip install -e ".[dev]"` likely)?
- Are there reusable steps or composite actions?

cp-10.2's CI yaml should follow the existing patterns where they exist. Don't reinvent.

### Step 2: Inventory Python tooling configuration.

```bash
cat pyproject.toml | head -80
grep -n 'ruff\|pytest\|mypy' pyproject.toml
```

Capture:
- `[tool.pytest.ini_options]`: does it already have `testpaths`? cp-09's check found it does (`testpaths = ["tests"]`). Confirm that scoping still excludes `the-21j-problem/`.
- `[tool.ruff]`: per Q9, this needs an `exclude` block listing `the-21j-problem/`. Check current state. If `[tool.ruff]` exists but has no `exclude`, you'll add one. If `[tool.ruff]` doesn't exist, you'll add the whole block.
- `[tool.mypy]` if any: does mypy run today, and where is it scoped?

### Step 3: Inventory website tooling configuration.

```bash
cat website/package.json | head -40
ls -la website/tsconfig.json website/vitest.config.ts website/playwright.config.ts 2>/dev/null
cat website/eslint.config.mjs 2>/dev/null | head -30
```

Capture:
- `pnpm test` script — what does it actually run? (Vitest? Jest? Playwright?)
- `tsc --noEmit` script or invocation.
- ESLint scope: does it run on the whole `website/` tree or specific paths?
- Any El Voto-specific paths in `website/` to confirm exclusion (`website/src/app/voto21junio/`, `website/src/components/voto/`).

### Step 4: Identify the lint baseline.

Run lint locally to see what the current baseline is (read-only, just to capture the number):

```bash
ruff check simulation/ scripts/ ingestion/ models/ utils/ evaluation/ tests/ 2>&1 | tail -20
cd website && pnpm lint 2>&1 | tail -10 && cd ..
```

Capture the current error/warning count. cp-07's audit established a baseline of 8 errors / 8 warnings on the website. The Python side may have its own. cp-10.2 should accept the current baseline (the gate fails on increases, not on the existing tech debt) and document the baseline in the PR description.

### Step 5: Design the CI yaml.

Based on the inventory, draft the structure of `.github/workflows/ci.yml`. The structure should be:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  python:
    runs-on: ubuntu-latest
    steps:
      - actions/checkout
      - actions/setup-python (3.9)
      - pip install -e ".[dev]"
      - ruff check <WC paths explicitly> --output-format github
      - pytest -q
      - (mypy if applicable, scoped)

  python-smoke:
    runs-on: ubuntu-latest
    steps:
      - actions/checkout
      - actions/setup-python (3.9)
      - pip install -e ".[dev]"
      - python scripts/regenerate_snapshot_from_batch.py
      # (verify exit 0, optionally inspect output)

  website:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: website
    steps:
      - actions/checkout
      - pnpm/action-setup
      - actions/setup-node (20)
      - pnpm install --frozen-lockfile
      - pnpm tsc --noEmit
      - pnpm test
      - (eslint if part of the gate)
```

Three specific design decisions to surface in the inspection notes:

1. **Three jobs or one?** Splitting `python` (lint + tests), `python-smoke` (regenerate script), and `website` (TS + tests) into three jobs lets them run in parallel and surfaces failures more clearly. One job is simpler but slower. Recommend three jobs.

2. **Where does the `[tool.ruff] exclude` for `the-21j-problem/` live?** Two places it can be enforced: (a) in `pyproject.toml`'s `[tool.ruff]` block; (b) in the workflow's `ruff check <paths>` invocation by listing WC paths only. Recommend BOTH (belt-and-braces): the `pyproject.toml` exclude protects against accidental `ruff check .` in any context (locally, in another workflow, in editor tooling); the explicit-paths invocation in the workflow makes the scope visible to anyone reading the yaml.

3. **Smoke test format: pytest or workflow step?** Two options: (a) write a new `tests/scripts/test_snapshot_regen_smoke.py` that calls the script as a subprocess and asserts exit 0; (b) put the smoke as a direct `python scripts/regenerate_snapshot_from_batch.py` step in the workflow. Option (a) keeps the test in the pytest suite (local devs can run it too), option (b) is simpler. Recommend (a) — locally-runnable tests are higher leverage than CI-only checks.

### Step 6: Plan the El Voto handoff.

Per the cross-project agreement, before this PR is marked ready-for-review, the draft yaml is shared with El Voto's architect for a one-hour spot-check on path scoping. Plan:

- Draft yaml goes in the PR description (so El Voto can read it without checking out the branch).
- Nicolás copies the yaml content and pastes it to El Voto's Claude advisor session.
- El Voto responds within an hour with either "no issues" or specific path-scoping concerns.
- If concerns, adjust yaml; if no concerns, mark PR ready-for-review.

### Step 7: Stop and report.

Write inspection notes capturing:
- Existing workflow patterns to follow.
- Python tooling config inventory.
- Website tooling config inventory.
- Current lint baseline (errors + warnings).
- Proposed CI yaml structure (the three-jobs sketch above, expanded with concrete commands).
- The three design decisions (three jobs vs one; pyproject.toml-vs-workflow exclude; pytest-vs-workflow smoke).
- The El Voto handoff plan.
- Explicit STOP gate: "Awaiting Nicolás's review of the design before Stage 2 begins."

## Stage 2 — Implementation (after Nicolás approves)

After Nicolás confirms the design, implement.

### Step 1: Create `.github/workflows/ci.yml`.

Implement the three-job structure with explicit path scoping. Critically:

- `ruff check` is invoked with explicit WC paths, NOT `ruff check .`.
- `pytest -q` runs from repo root (already path-scoped by `testpaths`).
- The smoke job runs the regenerate script against the checked-out tree (data should be there because cp-10.1 force-tracked the parquets — this is what we're protecting).
- The website job runs from `website/` (`defaults.run.working-directory: website`).

Include reasonable `actions/cache` for pip and pnpm to keep CI under ~3 minutes per run.

### Step 2: Update `pyproject.toml` with `[tool.ruff] exclude`.

Add an `exclude` array to `[tool.ruff]` that lists `the-21j-problem/`. If `[tool.ruff]` doesn't exist, add the whole block. Preserve any existing `target-version`, `line-length`, etc.

```toml
[tool.ruff]
# Existing config preserved
exclude = [
    "the-21j-problem/",
    # Other standard ruff defaults are inherited
]
```

### Step 3: Create the smoke test.

`tests/scripts/test_snapshot_regen_smoke.py`. Single test:

```python
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

def test_regenerate_snapshot_from_batch_runs_end_to_end():
    """cp-10.2 smoke test: catch the cp-09-class regression.

    If a future PR re-introduces a read of a gitignored file (cp-09's failure
    mode), this test fails because the regenerate script will raise
    FileNotFoundError on a fresh checkout. Verified by running against the
    current main as part of cp-10.2.
    """
    result = subprocess.run(
        [sys.executable, "scripts/regenerate_snapshot_from_batch.py"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=300,
    )
    assert result.returncode == 0, (
        f"regenerate_snapshot_from_batch.py exited {result.returncode}.\n"
        f"stdout tail:\n{result.stdout[-2000:]}\n"
        f"stderr tail:\n{result.stderr[-2000:]}"
    )
```

This is the test that would have caught cp-09. Keep it simple; the assertion is "exit 0 on a fresh checkout." If a future PR breaks that, the diff shows up at PR time.

### Step 4: Verify the CI gate catches a deliberately-injected regression.

This is the proof-of-protection step. Temporarily revert cp-10.1's gitignore exception in a throwaway commit on this branch, push, observe CI fail at the smoke job, then revert the throwaway. This proves the gate works.

```bash
# Inject a deliberate regression
git revert HEAD~N  # whatever commit added cp-10.1's gitignore exception
# Push, observe CI fail
git push
# Watch CI; smoke job should fail
gh run watch
# Restore
git revert HEAD  # revert the revert
git push
```

Capture the failed CI run URL in the PR description. This is the empirical proof that cp-10.2 protects against the class of bug it was designed for.

### Step 5: Open draft PR.

Two commits: (a) the CI yaml + `pyproject.toml` `[tool.ruff] exclude` + the smoke test, (b) inspection notes (if not already separately).

PR description must include:
- The draft yaml content (or a link to it) for El Voto's spot-check.
- The lint baseline (current errors/warnings count).
- The proof-of-protection run URL where the gate caught the injected regression.
- An explicit "Do not merge until El Voto architect has spot-checked" note.

### Step 6: Hand the draft yaml to Nicolás for El Voto handoff.

Tell Nicolás: "The draft yaml is in the PR description (or paste it here). Please copy and share with the El Voto Claude advisor for a one-hour spot-check on path scoping. Their reply will land here or in their session; if they flag concerns, adjust. If no concerns, mark PR ready-for-review."

Stop. Wait for El Voto's spot-check before marking ready-for-review.

## Verification

Before marking ready (post El Voto spot-check):

- [ ] Inspection notes complete at `docs/onboarding/cp-10.2-inspection-notes.md`. Nicolás approved the design.
- [ ] `.github/workflows/ci.yml` exists with three jobs.
- [ ] `ruff check` is invoked with explicit WC paths (visible in the yaml).
- [ ] `pyproject.toml` has `[tool.ruff] exclude` listing `the-21j-problem/`.
- [ ] `tests/scripts/test_snapshot_regen_smoke.py` exists and runs locally.
- [ ] Local run of all gate steps (ruff, pytest, tsc, pnpm test, smoke) passes against the current `main`.
- [ ] CI on this PR runs all three jobs and they go green against the cp-10.2 branch.
- [ ] Proof-of-protection: a deliberately-injected regression caused CI to fail; the failed run URL is captured in the PR description.
- [ ] El Voto architect spot-checked the yaml; either "no issues" or concerns addressed.
- [ ] Lint baseline documented in PR description.
- [ ] cp-10.1's data availability still intact (no inadvertent gitignore edits).

## Merge-readiness checklist

```
Y/N — Inspection notes complete; Nicolás approved the design.
Y/N — .github/workflows/ci.yml uses three jobs (python, python-smoke, website).
Y/N — ruff check invoked with explicit WC paths, not repo-wide.
Y/N — pyproject.toml has [tool.ruff] exclude listing the-21j-problem/.
Y/N — Smoke test at tests/scripts/test_snapshot_regen_smoke.py runs end-to-end.
Y/N — CI on this PR went green.
Y/N — Proof-of-protection: deliberate regression caught by CI; run URL in PR description.
Y/N — El Voto architect spot-checked yaml; no outstanding concerns.
Y/N — cp-10.1 gitignore exception preserved; data/raw/*.parquet tracking intact.
Y/N — cp-04, cp-06, cp-07, cp-08, cp-09, cp-10 fixes preserved.
Y/N — No code in simulation/, scripts/, website/ modified (this PR adds CI infra only).
Y/N — Branch is cp-10.2-ci-gate, off latest main, ready to merge.
```

If every item is `Y`, merge. After merge, the CI gate is live on every future PR. cp-11 follows immediately.

## Out of scope

- **Cleaning up the lint baseline.** That's tech debt, separate work. cp-10.2 accepts the baseline; future cleanups can lower it.
- **Adding mypy** if it isn't currently configured. cp-10.2 protects against the cp-09 regression class; mypy is a separate quality concern that can land later.
- **Pre-commit hooks** or any local tooling. CI gate only.
- **El Voto's CI.** They will set up their own gate post-2026-06-11 per Q10.
- **cp-11, cp-12, cp-13.** Subsequent checkpoints.
- **Repo architecture conversation.** Deferred per Q10.

## Decision tree if things don't match

- **The lint baseline turns out to be much higher than expected** (e.g., 50+ ruff errors). Don't try to clean it up. Document the baseline, set `--max-warnings` and `--max-errors` flags accordingly, and proceed. Cleanup is its own checkpoint.
- **Pytest discovers tests from `the-21j-problem/`** (despite the `testpaths = ["tests"]` scoping). Either El Voto has their tests under a path that matches our config, or the config drifted. Verify with `pytest --collect-only`; if El Voto tests are picked up, propose a tighter `testpaths` and surface to Nicolás before changing.
- **The smoke test takes longer than 60 seconds.** The regenerate script is fast (the cp-10.1 cron run was a few minutes including the re-batch; the no-delta path is much faster). If the smoke test runs slow, profile to understand why; likely it's CI cold-start overhead.
- **El Voto's spot-check surfaces a concern about a path you didn't expect to scope.** Adjust the yaml per their concern. Their reciprocal commitment is to flag root-level changes back to us; this is the symmetric case.
- **The proof-of-protection step doesn't actually fail CI.** That would mean the smoke test isn't catching the cp-09 class of bug, which is the entire point of cp-10.2. Stop and investigate. Likely the test needs to assert something more specific than `exit 0` (e.g., checking that `snapshot_meta.json` was written).

## A note on judgement

This checkpoint's value is asymmetric. It costs ~30 minutes of CI time per PR-week. It saves us from a class of bug that has already shipped once (cp-09) and would silently ship again on cp-11, cp-12, or cp-13. The CI gate is the single highest-leverage piece of infrastructure we ship in the live-readiness sequence.

The proof-of-protection step is non-negotiable. A CI gate that nobody has verified catches the bug it was designed for is a placebo. cp-10.2 verifies it works against the actual class of regression it exists to prevent.

After cp-10.2 ships and the El Voto spot-check is complete, cp-11 (Fix 3: M0/M2 reconciliation per Q4) is the next checkpoint. The pattern from cp-10.1 / cp-10.2 establishes the rhythm: small, scoped, verified, cross-project-coordinated changes.
