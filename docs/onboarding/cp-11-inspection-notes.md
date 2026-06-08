# cp-11 — M0/M2 reconciliation (Fix 3): Stage 1 inspection notes

**Branch:** `cp-11-m0-m2-reconciliation` (worktree `wt-cp-11-m0-m2`, off `origin/main` @ `a0b14ab`, which includes cp-10.2 `#86`).
**Date:** 2026-06-08.
**Scope:** Close the M0/M2 split-brain — regenerate `website/src/lib/sim/snapshotProbs.ts` from the active M2 batch on every nightly. Per decision-log **Q4**: keep the static table, regenerate its contents; do not refactor the evaluator call site. Closes PLAN.md acceptance criterion **#5**.

This is read-only Stage 1. No code written. **Hard stop at the end — awaiting Nicolás's review before Stage 2.**

---

## 1. Current `snapshotProbs.ts` shape

`website/src/lib/sim/snapshotProbs.ts` — 63 lines.

- **Provenance comment (lines 1–3)** — the thing cp-11 must remove:
  ```
  // Auto-generated from M0 snapshot 2026-05-04T00:00Z. Do not edit manually.
  // Source: public/data/snapshots/2026-05-04T00:00Z/teams/*.json
  // Fields: pG=group_qual pR=reach_r16 pQ=reach_qf pS=reach_sf pF=reach_final pC=champion
  ```
  This is the **only** `"Auto-generated from M0"` occurrence in `website/src/lib/sim/` (verified by grep). The goal's "zero matches" check is satisfied once this header is replaced.

- **Exported type** — one interface, unchanged by cp-11:
  ```ts
  export interface TeamProbs {
    pG: number; pR: number; pQ: number; pS: number; pF: number; pC: number;
  }
  ```
  These are **cumulative "reach round X" marginals**, monotonically decreasing per team (pG ≥ pR ≥ pQ ≥ pS ≥ pF ≥ pC).

- **Exported data** — `export const TEAM_PROBS: Record<string, TeamProbs>` keyed by FIFA 3-letter code, **48 teams**, sorted alphabetically by code (ALG … UZB).

- **Fields per team:** `pG, pR, pQ, pS, pF, pC`. cp-11 changes the **contents** of these six fields only; the shape (interface + record) stays.

## 2. Consumers of `snapshotProbs.ts` and the fields they read

`grep -rn "snapshotProbs|TEAM_PROBS|TeamProbs" website/src`:

| File | Reads | Notes |
|---|---|---|
| `components/simulator/TeamPickerGrid.tsx:65-66` | `.pC` | sorts team picker by champion prob (`?? 0` fallback) |
| `lib/sim/rarityExplorer.ts:88-97` | `.pS` | rarity scoring over reach-SF probs |
| `lib/sim/computeRealityScore.ts` | all 6 via `reachField()` (`:181`) | `groups→pG, r32→pR, r16→pQ, qf→pS, sf→pF, final→pC` |
| `lib/sim/predictionEvaluator.ts` | all 6 via `reachField()` (`:564`) | same mapping; the primary "evaluator" surface |
| `lib/sim/confederations.ts:21` | comment only | asserts its 48 codes match `TEAM_PROBS` keys |

**Conclusion:** the generator must emit **all six fields** for **all 48 codes** (the union is exercised; a missing team or field would break prediction grading — `predictionEvaluator.ts:207` does `TEAM_PROBS[team]` and an undefined entry grades that pick at 0).

**`runEvaluator.ts` (the file the prompt names): does NOT import `TEAM_PROBS`.** It imports `evaluatePrediction` from `predictionEvaluator` (`runEvaluator.ts:24`). So the "static-table call site stays unchanged" requirement (Q4) is satisfied automatically — cp-11 never touches `runEvaluator.ts`. The static-import call site that actually consumes the table is `predictionEvaluator.ts` / `computeRealityScore.ts`, and those keep importing `TEAM_PROBS` exactly as today.

## 3. The M2 batch and the field-name mapping

- **Active batch:** `data/calibration/active_batch.json` → `batch_20260512_013228Z` (schema_version `1.0`, amendment v1.1, matrix `f732c0e7…`). Pre-tournament, so no settled-delta re-batch has fired.
- **Source file:** `outputs/phase5/batches/batch_20260512_013228Z/team_runs_M2.parquet` — 480,000 rows = 10,000 runs × 48 teams. Per-(run × team).
- **Raw columns:** `run_idx, model_id(M2), team_id (full name, NOT code), group_*, qualified_r32 (bool), exit_round (categorical), reached_final (bool), champion (bool), …`
- **`exit_round` value set:** `Group, R32, R16, QF, 3rd, Champion, Runner-up` (note: SF-losers are labelled **`3rd`**, not `SF`).

### The canonical aggregation already exists

`scripts/regenerate_snapshot_from_batch.py::aggregate_team_progression()` (`:440`) already computes exactly these reach probabilities from `team_runs_M2.parquet`, and the nightly already writes them into the website bundle. cp-11 should **reuse that logic, not re-implement it.** The mapping it uses:

| `snapshotProbs.ts` | `team_runs_M2.parquet` derivation | `tournament.json` field | `teams/<code>.json` `progression` field |
|---|---|---|---|
| `pG` | `qualified_r32 == True` mean | `p_group_qualification` | `p_group_qualification` |
| `pR` | `exit_round ∈ {Champion,Runner-up,SF,3rd,QF,R16}` | `p_r16` | `p_r16` |
| `pQ` | `exit_round ∈ {…,QF}` | `p_quarterfinal` | `p_qf` |
| `pS` | `exit_round ∈ {…,3rd}` (SF reached) | `p_semifinal` | `p_sf` |
| `pF` | `reached_final == True` | `p_final` | `p_final` |
| `pC` | `champion == True` | `p_champion` | `p_champion` |

Verified directly against the parquet: monotonic for all 48 teams; Σ pC = 1.0; Σ pF = 2.0. Sample (M2 vs the M0 numbers currently shipped):

| code | M0 pC (live now) | M2 pC (batch) |
|---|---|---|
| ESP | 0.3091 | **0.1824** |
| ARG | 0.1408 | **0.1374** |
| BRA | 0.0697 | **0.0635** |

The M2 table is materially less Spain-concentrated — i.e. the split-brain is real and user-visible.

## 4. Proposed generator location

`scripts/generate_snapshot_probs_ts.py` (matches the prompt's default and the existing `scripts/` Python-tooling pattern). Reads project artifacts, formats TypeScript, writes `website/src/lib/sim/snapshotProbs.ts`. **No new dependency** — it uses `pandas`/`pyarrow` (already deps) and/or stdlib `json`. Therefore **no `pyproject.toml` change → no El Voto handoff required** (cross-project agreement: handoff only if root `pyproject.toml` / shared workflows beyond the new step are touched).

## 5. Proposed workflow step — and a correction to the prompt's assumption

`.github/workflows/nightly_pipeline.yml`. Insert a new step **after** "Regenerate snapshot bundle from locked M2 batch" (`:66`) and **before** "Stage updated website data files" (`:68`):

```yaml
- name: Regenerate snapshotProbs.ts from M2 batch
  run: python scripts/generate_snapshot_probs_ts.py
```

**⚠️ Correction to the prompt.** The prompt says the existing git-stage step "covers `website/`". It does **not** — the stage step runs `git add website/public/data/` (`:71`), and `snapshotProbs.ts` lives at `website/src/lib/sim/`, **outside** `public/data/`. As written, the regenerated file would never be committed by the nightly. So Stage 2 must **also** amend the stage step to add the source path, e.g.:

```yaml
git add website/public/data/ website/src/lib/sim/snapshotProbs.ts
```

The existing `git diff --staged --quiet` gate then naturally treats a snapshotProbs-only change as `has_changes=true` and commits it. This is a one-line edit, still within the "shared workflows touched only at the new step + minimal stage tweak" envelope.

## 6. Proposed provenance comment (generated file header)

```ts
// Auto-generated from M2 batch batch_20260512_013228Z on 2026-06-08T02:31:00Z.
// Source: scripts/generate_snapshot_probs_ts.py
// Do not edit manually. cp-11 ships this regeneration on every nightly.
```

`batch_id` from `active_batch.json`; timestamp from the snapshot's `generated_at_utc` (or generation time). Interface + field-legend comment preserved below the header.

## 7. Source-of-truth decision (the one real design choice)

Three candidate inputs the generator could read. **This is the decision I most want confirmed.**

- **Option A — read `website/public/data/latest/tournament.json`.** Tightest "agrees with the bracket" coupling. **Rejected:** `tournament.json`'s `teams` array is **corrupted** — see §8. It has 48 rows but only 47 unique codes (`COD`/"Congo DR" duplicated) and **TUN (Tunisia) is missing entirely**. Generating from it would silently **drop Tunisia** from `snapshotProbs.ts`, regressing evaluator coverage (a Tunisia pick would grade at 0).

- **Option B — read `website/public/data/latest/teams/*.json`.** 48 clean files, keyed by FIFA code, each carrying the M2 `progression` block (incl. a correct `TUN.json`). Agrees with the per-team pages by construction. **Caveat:** these files are written by the same regen script, whose `teams/` rewrite is itself partially victim to the §8 bug (TUN's progression is *carried-through-frozen*, not rewritten, because the code→team_id map is built from the broken `tournament.json`). Today TUN.json happens to hold the correct batch values, but during the tournament a re-batch would freeze TUN while other teams update.

- **Option C (RECOMMENDED) — read `team_runs_M2.parquet` directly + reuse the canonical aggregation.** Import `aggregate_team_progression` and `_TEAM_ID_TO_DISPLAY_NAME` from `regenerate_snapshot_from_batch.py` (no logic drift), and build the `team_id → fifa_code` map from the **clean** `teams/*.json` roster (48 unique codes, includes TUN). This is **immune to the `tournament.json` roster bug**, always reflects the current batch (no freeze), covers all 48 codes, and reuses one source of aggregation truth. It agrees with the bracket today and will continue to agree once §8 is fixed.

**Recommendation: Option C.** It is the only option that produces a correct, complete, drift-free 48-team table regardless of the §8 corruption.

The 48-code set is consistent across the M0 table, the `teams/*.json` roster, and the batch (all 48; the only set difference is the `tournament.json` corruption). So Option C reproduces exactly the same 48 keys the current table has.

## 8. Surprises / things to flag

1. **`tournament.json` roster corruption (pre-existing, NOT cp-11's doing).** `website/public/data/latest/tournament.json` lists `COD`/"Congo DR" **twice** and omits **`TUN`/Tunisia**, despite the batch simulating both "DR Congo" and "Tunisia" and despite a correct `teams/TUN.json` existing. Root cause: the metadata roster carried forward through regen got a duplicated row at some point. **Consequence for cp-11:** the generator must not trust `tournament.json`'s roster (→ Option C). **Consequence beyond cp-11:** the public bracket's tournament-level team list is itself wrong today (shows Congo DR twice, no Tunisia), and `regenerate_snapshot_from_batch.py`'s `teams/` rewrite freezes TUN's progression during tournament re-batches. This looks like **cp-12 territory** (it owns `tournament.json`/`bracket.json` correctness) or a dedicated hotfix — I recommend filing it, but it is **out of cp-11 scope**. Flagging per WORKFLOW.md's "name the structural follow-up" rule.

2. **The M2 bracket qualifies 28 teams to the knockout, not 32.** `qualified_r32` is exactly 28 every run (per-run exit counts: Group 20 / R32 12 / R16 8 / QF 4 / 3rd 2 / Final 2 / Champion 1). The "R32" round runs 28→16 (a 12-match + 4-bye structure), not the real WC's 32→16. This is the **locked simulation engine's existing behavior** and the M2 batch is the source of truth per Q4 — cp-11 derives faithfully and does not touch it. Noting it because `pG` ("group qualification") will reflect a 28-team knockout, and the field's legend comment says "enter R32".

3. **Prompt's git-add assumption is wrong** — see §5. Requires a one-line stage-step edit beyond just adding the new step.

4. **No venv in the worktree.** `.venv` lives only in the primary tree; I used `…/the-45-percent-problem/.venv/bin/python` for read-only parquet inspection. Stage 2 local runs (`python scripts/…`, `pnpm tsc`, `pnpm test`, smoke test) will need a venv/deps in the worktree (`pip install -e ".[dev]"`) or to run from the primary tree's interpreter. Non-blocking; just an environment note.

5. **Number formatting (decide in Stage 2).** `teams/*.json` / `tournament.json` values are `round(x, 6)` (e.g. `0.2843`, `0.781`). To match the bracket exactly and keep `git diff` clean, the generator should emit the same rounded values via a float-noise-safe formatter (avoid `0.30000000000000004`). Leaning toward formatting each prob with up to 4–6 significant decimals, trailing-zero-trimmed, matching the existing table's granularity.

## 9. Test-suite risk (low)

CI `website` job runs `tsc --noEmit` + `vitest run tests/unit`. The evaluator unit tests (`predictionEvaluator.test.ts`, `runEvaluator.test.ts`) assert **state transitions** (`alive`/`dead`/`promoted`) and counts driven by W/L match scenarios — **not** specific TEAM_PROBS numbers. `runEvaluator.test.ts` mocks `predictionEvaluator` entirely. `snapshotProvenance.test.ts:35` uses a mock `p_champion: 0.18` unrelated to the table. So the M0→M2 value swap is **unlikely** to break tests. Will confirm by running `pnpm test` in Stage 2 and, if anything asserts an M0 value, update the expectation to the M2 ground truth and document it in the PR (per the prompt's decision tree).

---

## STOP GATE

**Awaiting Nicolás's review of the design before Stage 2 begins.**

Specific confirmations requested:
1. **Source of truth = Option C** (re-derive from `team_runs_M2.parquet` via the imported canonical aggregation; map codes via the clean `teams/*.json` roster)? Or do you prefer Option B (read `teams/*.json` directly)?
2. **OK to amend the nightly stage step** to `git add … website/src/lib/sim/snapshotProbs.ts` (the prompt's "git add covers website/" is inaccurate)?
3. **The `tournament.json` COD-dup / missing-TUN corruption (§8.1)** — file as a separate follow-up (cp-12 or hotfix), out of cp-11 scope? Confirm you don't want cp-11 to widen into fixing it.
