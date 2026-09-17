# Checkpoint cp-11 — M0/M2 reconciliation (Fix 3, closes split-brain)

Before reading this prompt, read these in order:

1. `WORKFLOW.md` at the repo root. The operating model.
2. `PLAN.md` at the repo root. Particularly the "Cross-project constraints" section, decision log entry Q4, and acceptance criterion #5 ("one model variant served on probability surfaces").
3. `docs/audit/architecture-diagnostic-2026-06-03.md` §3.5 (M0/M2 split-brain) and §5 Fix 3.
4. `BRIEF_FOR_EL_VOTO_ARCHITECT_2026-06-05.md` and the reply. The cross-project constraints still apply (no touching `the-21j-problem/`, share any pyproject.toml or workflow changes with El Voto).

Prior shipped checkpoints on main: cp-04 through cp-10.2. CI gate is active per cp-10.2 — your PR will run pytest + smoke + tsc + vitest, with ruff in advisory mode. Production is unfrozen and nightly snapshots are landing daily.

The split-brain this checkpoint closes: `website/src/lib/sim/snapshotProbs.ts:1` currently reads `// Auto-generated from M0 snapshot 2026-05-04T00:00Z`. The bracket page renders M2 probabilities; the predictions evaluator grades user predictions against M0. Two model regimes are simultaneously live in production. cp-11 closes that gap by regenerating `snapshotProbs.ts` from the active M2 batch on every nightly.

## Goal

After this checkpoint ships:

- A new Python generator script reads the active M2 batch and produces `website/src/lib/sim/snapshotProbs.ts` with M2-derived probabilities.
- The nightly pipeline runs this generator as a step (between snapshot regeneration and the existing git-commit step).
- `snapshotProbs.ts`'s top-of-file provenance comment names the source batch and the generation timestamp.
- `git diff` on `snapshotProbs.ts` after a nightly run shows updated probabilities consistent with the current M2 batch.
- A `grep "Auto-generated from M0" website/src/lib/sim/` in production returns zero matches.
- The evaluator's call site shape in `runEvaluator.ts` is unchanged (per Q4: keep the static-table call site to avoid refactor risk).

Acceptance criterion #5 from PLAN.md is closed by this checkpoint.

## Why this matters

A research publication cannot honestly describe "the model" if two model regimes are simultaneously live on probability surfaces. The bracket page shows users "Spain has 18.2% to win" while the user's predictions (when graded via the Reality Score feature) are evaluated against an M0 baseline that has different numbers. The 2026-06-01 diagnostic flagged this as a P1 academic-integrity issue; we deferred it through the live-readiness sequence because cp-09 / cp-10 / cp-10.1 / cp-10.2 had higher operational urgency. With those shipped, cp-11 is the next highest-impact fix.

Per Q4 from the 2026-06-02 architectural decisions: option (a) was selected — keep `snapshotProbs.ts` as a static table to avoid refactoring `runEvaluator.ts`; regenerate the table contents from M2 every nightly. The maintenance burden is "the generator script must produce a file matching the existing TypeScript shape exactly." That burden is small and one-time; the refactor risk of option (b) would have been larger.

## Branch

`cp-11-m0-m2-reconciliation`

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes cp-10.2's merge. Working tree clean. Branch off main.

If your primary worktree is on a `session-*` branch with uncommitted El Voto work (likely, given the parallel session cadence), use a dedicated worktree as cp-10.1 and cp-10.2 did:

```bash
git worktree add ../wt-cp-11-m0-m2 origin/main
cd ../wt-cp-11-m0-m2
git checkout -b cp-11-m0-m2-reconciliation
```

## Stage 1 — Inspection

Read-only investigation. Write inspection notes to `docs/onboarding/cp-11-inspection-notes.md`.

### Step 1: Read the current `snapshotProbs.ts` end to end.

```bash
cat website/src/lib/sim/snapshotProbs.ts | head -50
wc -l website/src/lib/sim/snapshotProbs.ts
```

Capture:
- The provenance comment at the top (currently names M0 + 2026-05-04 snapshot).
- The exported types (`TeamProbs` interface; whether other interfaces exist).
- The exported data structure (probably a `Record<string, TeamProbs>` mapping FIFA code → probabilities).
- The fields per team (`pG`, `pR`, `pQ`, `pS`, `pF`, `pC` — group qualification, R32, QF, SF, Final, Champion).
- The total number of teams (should be 48 for WC 2026).

### Step 2: Identify every consumer of `snapshotProbs.ts`.

```bash
grep -rn "snapshotProbs" website/src/ --include="*.ts" --include="*.tsx"
```

Specifically check:
- `website/src/lib/sim/runEvaluator.ts` — the primary consumer per the diagnostic.
- Any other file that imports `TeamProbs`, `snapshotProbs`, or the default export.

Capture which fields each consumer reads. The generator script must produce all of them.

### Step 3: Read the active M2 batch's team-level outputs.

```bash
ls outputs/phase5/batches/
cat data/calibration/active_batch.json | jq .
ls outputs/phase5/batches/<active_batch_id>/
```

Find the active batch's `team_runs_M2.parquet` (or whichever file aggregates per-team probabilities). Inspect its schema:

```python
# Run in a python shell:
import pandas as pd
df = pd.read_parquet('outputs/phase5/batches/<active_batch_id>/team_runs_M2.parquet')
print(df.columns.tolist())
print(df.head())
print(f"Teams: {df['team_id'].nunique() if 'team_id' in df.columns else 'unknown'}")
```

Map M2's column names to `snapshotProbs.ts`'s field names. The mapping is the bridge cp-11 builds:
- M2's `p_group_qualification` (or similar) → `pG`
- M2's `p_r16` → `pR`
- M2's `p_quarterfinal` → `pQ`
- M2's `p_semifinal` → `pS`
- M2's `p_final` → `pF`
- M2's `p_champion` → `pC`

If the M2 batch uses different names, capture the actual names and the mapping needed.

### Step 4: Find where the nightly pipeline runs JavaScript-generating steps.

```bash
cat .github/workflows/nightly_pipeline.yml
```

Identify where `cp-11`'s generator step fits in the sequence:
- After `regenerate_snapshot_from_batch.py` (so the regen has happened first).
- Before the git-stage / commit step (so the regenerated `snapshotProbs.ts` is included in the nightly commit).

Inspect whether `regenerate_snapshot_from_batch.py` already writes any TypeScript files, or whether cp-11's generator will be the first.

### Step 5: Decide the generator script's location and language.

Options:
- **Python script in `scripts/`**: matches the existing snapshot regen pattern. Reads parquet, formats TypeScript output, writes file. Single-language tooling (no Node in the cron's Python steps).
- **Python that runs as part of `regenerate_snapshot_from_batch.py`**: would conflate two concerns into one script. Not recommended.
- **TypeScript / Node script**: would require Node setup in the cron job. Out of scope for cp-11.

Default recommendation: a new `scripts/generate_snapshot_probs_ts.py`. Reads the active batch's team aggregations, formats them into the exact `snapshotProbs.ts` shape, writes the file. Run as a separate step after `regenerate_snapshot_from_batch.py` in the nightly workflow.

### Step 6: Stop and report.

Write inspection notes capturing:
- The current `snapshotProbs.ts` shape (interface, data structure, fields).
- The list of consumers and the fields they read.
- The M2 batch's parquet schema and the field-name mapping (M2 → TypeScript field names).
- The proposed location of the new generator script.
- The proposed location of the new workflow step.
- The proposed provenance-comment format for the generated file.
- Anything that surprises you (e.g., a consumer reading a field not in the current table; a field-name mismatch that can't be cleanly mapped).
- Explicit STOP gate: "Awaiting Nicolás's review of the design before Stage 2 begins."

## Stage 2 — Implementation (after Nicolás approves)

### Step 1: Create `scripts/generate_snapshot_probs_ts.py`.

The script:
1. Reads `data/calibration/active_batch.json` to find the active batch path.
2. Reads `team_runs_M2.parquet` (or the appropriate aggregation file) from that batch.
3. Computes per-team probabilities matching `snapshotProbs.ts`'s shape (pG, pR, pQ, pS, pF, pC).
4. Maps team identifiers from the batch's internal format to FIFA codes (cp-09 / cp-10 established this mapping; reuse the helpers).
5. Formats the output as valid TypeScript matching the current file's shape (interface declaration + exported record).
6. Includes a top-of-file provenance comment:
   ```typescript
   // Auto-generated from M2 batch <batch_id> on <generated_at_utc>.
   // Source: scripts/generate_snapshot_probs_ts.py
   // Do not edit manually. cp-11 ships this regeneration on every nightly.
   ```
7. Writes to `website/src/lib/sim/snapshotProbs.ts`, overwriting.

Critically: the TypeScript output must be valid. The CI gate runs `tsc --noEmit`; if the generated file is malformed, every PR breaks. Validate by running `pnpm tsc --noEmit` locally after running the script.

### Step 2: Wire the generator into the nightly workflow.

In `.github/workflows/nightly_pipeline.yml`, add a step after `python scripts/regenerate_snapshot_from_batch.py` and before the git-add / commit step:

```yaml
- name: Regenerate snapshotProbs.ts from M2 batch
  run: python scripts/generate_snapshot_probs_ts.py
```

The git-stage step should now pick up changes to `website/src/lib/sim/snapshotProbs.ts` automatically (since `git add` covers `website/` per the existing pattern).

### Step 3: Test locally end to end.

```bash
# Run the generator
python scripts/generate_snapshot_probs_ts.py

# Verify the output is valid TypeScript
cd website && pnpm tsc --noEmit
cd ..

# Verify the evaluator still works
cd website && pnpm test
```

Then verify the file looks right:
```bash
head -20 website/src/lib/sim/snapshotProbs.ts
grep "Auto-generated from M0" website/src/lib/sim/snapshotProbs.ts || echo "M0 reference gone"
grep "Auto-generated from M2" website/src/lib/sim/snapshotProbs.ts
```

### Step 4: Verify the smoke test still passes.

The cp-10.2 smoke test runs `regenerate_snapshot_from_batch.py` end to end. cp-11 adds a second script that runs after it. The smoke test does NOT need to run cp-11's generator (that's a separate concern); but it should still pass exit 0 against the same checkout state. Run the smoke test locally:

```bash
pytest tests/scripts/test_snapshot_regen_smoke.py -v
```

If this fails because cp-11 introduced a regression in the regen path (unlikely; you shouldn't be touching it), fix before commit.

### Step 5: Commit.

```bash
git add scripts/generate_snapshot_probs_ts.py
git add .github/workflows/nightly_pipeline.yml
git add website/src/lib/sim/snapshotProbs.ts  # the regenerated content
git status  # confirm nothing else staged
git commit -m "cp-11: regenerate snapshotProbs.ts from M2 batch on every nightly"
```

The commit body should explain: the script's purpose, the workflow integration point, and the fact that the regenerated file is now M2-derived instead of M0-derived.

### Step 6: Open draft PR.

CI will run on the PR. Expected results:
- `python` job: ruff advisory (no new findings hopefully), pytest passes.
- `python-smoke` job: smoke test passes.
- `website` job: tsc passes against the regenerated file; vitest passes.

If `tsc --noEmit` fails on the generated file, that's the highest-impact bug; investigate the formatter.

If `pnpm test` fails, the evaluator's tests may be asserting against specific M0 values. Update the test expectations (the new M2 values are the correct ground truth per Q4).

## Verification

Before marking ready:

- [ ] Inspection notes complete; Nicolás approved the design.
- [ ] `scripts/generate_snapshot_probs_ts.py` exists and reads the active M2 batch correctly.
- [ ] `website/src/lib/sim/snapshotProbs.ts` regenerated; provenance comment names M2 + batch_id + timestamp.
- [ ] No `"Auto-generated from M0"` reference anywhere in `website/src/lib/sim/`.
- [ ] `pnpm tsc --noEmit` passes against the regenerated file.
- [ ] `pnpm test` passes (evaluator tests may have needed updates; document if so).
- [ ] `regenerate_snapshot_from_batch.py` smoke test still passes locally.
- [ ] Nightly workflow file has the new step in the correct position.
- [ ] CI on this PR went green (all three jobs).
- [ ] cp-04 through cp-10.2 fixes preserved.
- [ ] Cross-project: `the-21j-problem/` untouched; root `pyproject.toml` untouched (unless absolutely necessary); shared workflows touched only at the new step.

## Merge-readiness checklist

```
Y/N — Inspection notes complete; Nicolás approved design.
Y/N — scripts/generate_snapshot_probs_ts.py created and tested.
Y/N — website/src/lib/sim/snapshotProbs.ts regenerated from M2; provenance comment in place.
Y/N — Zero "Auto-generated from M0" references in website/src/lib/sim/.
Y/N — pnpm tsc --noEmit clean against regenerated file.
Y/N — pnpm test passes (evaluator tests updated if needed; documented in PR).
Y/N — Smoke test still passes locally.
Y/N — Nightly workflow has new step between regen and git-add.
Y/N — CI on this PR went green (python, python-smoke, website all success).
Y/N — cp-10.1 / cp-10.2 / cp-10 / cp-09 fixes preserved.
Y/N — No code in the-21j-problem/ touched.
Y/N — No shared-config changes beyond the new workflow step.
Y/N — Branch is cp-11-m0-m2-reconciliation, off latest main, ready to PR.
```

If every item is `Y`, push and open draft PR. After CI goes green, mark ready-for-review and merge.

Per the cross-project agreement: if you touched root `pyproject.toml` for any reason (e.g., a new declared dep the generator needs like `numpy`), share the diff with the El Voto architect before marking ready-for-review. If you only touched `scripts/`, `.github/workflows/nightly_pipeline.yml`, and `website/src/lib/sim/`, no El Voto handoff is needed (none of those overlap with their paths).

## Out of scope

- **Refactoring `runEvaluator.ts`** to read live M2 probabilities at evaluation time. Per Q4, that was rejected in favor of the static-table-regenerated-nightly approach.
- **Adding new fields to `TeamProbs`**. cp-11 changes the contents of existing fields, not the shape.
- **Removing M0 from `data/calibration/`**. The M0 model stays as a reference artifact for the paper's ablation table; only the production tree gets cleaned up.
- **Changes to the evaluator's call sites in components**. Out of scope.
- **cp-12, cp-13.** Subsequent checkpoints.
- **El Voto's `website/src/app/voto21junio/`** or any of their components. Untouched.

## Decision tree if things don't match

- **The M2 batch's parquet has different field names than the legacy M0 table expected.** Build the mapping in the generator script (e.g., `m2_field_name → ts_field_name`). Document the mapping in a comment in the generator. The TypeScript file's shape stays the same.

- **The active M2 batch is missing a field that `snapshotProbs.ts` requires.** Investigate whether the field was computed-but-not-saved or genuinely absent. If absent and load-bearing for the evaluator, surface to Nicolás; this is a scope question (can the evaluator read a different M2-derived value, or do we need to extend the batch?).

- **`pnpm tsc --noEmit` fails on the regenerated file.** The most common cause is improper escaping (team names with special characters, decimal formatting, etc.). Format probabilities to a fixed number of decimal places (e.g., `.toFixed(4)`), wrap team names in JSON.stringify-equivalent for safety, and re-run.

- **The evaluator's tests fail with the new M2 values.** Expected; the tests likely assert against specific M0 numbers. Update the test expectations to the M2 values. Document in the PR description that this was an intentional consequence of cp-11 (the test was protecting against accidental changes to M0; with M0 removed from production, the assertion target changes).

- **The generator's runtime exceeds 30 seconds.** Profile. Most likely cause: the parquet read or the team-id mapping. The generator is run once per nightly; 30 seconds is acceptable, but anything over 2 minutes is a sign of a code path doing too much.

## A note on judgement

This is the smaller of the three remaining live-readiness checkpoints. The work is well-bounded: one new Python script, one workflow step, one regenerated TypeScript file. The biggest risk is generator output that doesn't validate as TypeScript; the CI gate from cp-10.2 catches that before merge. The second-biggest risk is the evaluator's test suite asserting against M0 values; those tests need updating but the update is mechanical.

After cp-11 ships, the M0/M2 split-brain is closed and acceptance criterion #5 from PLAN.md flips to Done. cp-12 (Fix 5 structural: snapshot pipeline populates bracket.json on every run, and BracketBoard renders the slots-populated branch faithfully instead of just changing the subtitle) is the next checkpoint.
