# Clarification: cp-25b R16 kill-criterion checkpoint forecast set

**Type:** Clarification of the pre-registered evaluation procedure (not an
amendment to the pre-registered model, fixtures, or hypotheses).
**Pre-registration:** osf.io/spmkg.
**Champion model:** M2_fifa (M_STAR), locked. This clarification does NOT unlock,
retrain, or modify the champion model, the simulation engine, the frozen batch
`batch_20260512_013228Z`, or any locked fixture or pre-registered parameter. It
does not change the 2.0 SE threshold (sealed in
`pre_reg_constants.yaml::kill_criterion.threshold_standard_errors`).
**Date filed:** 2026-07-02.
**Builds on:** `deviation_cp-14_live_data.md` (the settled-row scoring pipeline)
and the vault kill-criteria essay (the two-checkpoint structure).

---

## 1. Summary

The pre-registration commits to re-evaluating the 2.0 SE kill criterion once the
Round of 16 settles (the vault kill-criteria essay, section "The two
checkpoints"). This note clarifies two operational points that the
pre-registration text left implicit, and records the code that implements them
(cp-25b, `evaluation/r16_checkpoint.py`).

Two things are clarified:

  (i) the exact forecast set the live checkpoint is computed over; and
  (ii) a correction to the vault prose direction so it matches the locked yaml
       and the kill-criterion design.

Neither point changes the criterion, the threshold, the champion, or any locked
artifact. The graded ledger remains byte-identical (exactly 72 group-stage rows,
pinned to `batch_20260512_013228Z`); the checkpoint is a read-only re-scoring of
those same frozen forecasts and writes only a new sibling artifact.

## 2. Clarification (i): the forecast set

The R16 live checkpoint is computed over the **72 pre-registered group-stage
per-match forecasts** from the frozen champion batch, re-scored against their
realized group results, and published at the Round of 16 settlement moment (once
all eight R16 matches have settled).

No knockout per-match forecasts enter the statistic. This is the honest
interpretation, and the only defensible one, because **no frozen per-match
knockout forecasts exist**: knockout slots in the Monte Carlo batch carry
different teams on every run (they depend on who advances), so they cannot be
statically mapped to a specific fixture the way the 72 group slots can. The
pre-registered, outcome-blind, frozen per-match forecasts that predate every
kickoff are exactly the 72 group forecasts. The live checkpoint therefore scores
those 72 frozen forecasts against the results that have settled, using the same
bijection-validated mapping and the same `accuracy_metrics.log_loss` scoring path
as the graded ledger. Both models (M_STAR = M2 and the M0 null baseline) are
reconstructed from their committed frozen batch parquets
(`match_runs_M2.parquet` and `match_runs_M0.parquet`) and pushed through one
identical scoring path, aligned by `match_id`.

The statistic is a **paired per-match standard error** over the settled group
results:

    d_i = ll_mstar_i - ll_m0_i
    se  = d.std(ddof=1) / sqrt(n)

and the criterion fires when M_STAR is worse than M0 by at least 2.0 SE
(`d_bar > 2.0 * se`), computed by the same
`evaluation/accuracy_metrics.check_kill_criterion` used everywhere else.

## 3. Clarification (ii): correction of the vault prose direction

An earlier draft of the vault kill-criteria essay described the R16 checkpoint as
running on "cumulative match-level log-losses from the start of the tournament
through the end of R16." That phrasing implied that settled knockout results
would enter the statistic. They do not, and cannot, for the reason in section 2
(no frozen per-match knockout forecasts exist). The prose is corrected so the
described procedure matches the locked
`pre_reg_constants.yaml::kill_criterion` and the kill-criterion design: the
checkpoint is a paired per-match SE over the 72 frozen group-stage forecasts
scored against realized group results, published once when R16 settles.

The correction is a direction/scoping fix to the description only. The criterion,
the 2.0 SE threshold, the champion identity, and the "kill fires when M_STAR is
worse than M0 by 2 or more SE" direction are all unchanged.

## 4. Presentation: a separate event

The live gap is its own event with its own construction. It is a paired per-match
SE over settled group results. It is **never** displayed as a continuation of, or
numerically compared to, the Phase 8 pre-tournament cross-validation readings
(the 1.75 SE paired-difference reading in `evaluation/cv_battery_result.json` or
the 6.22 SE marginal reading in `data/calibration/champion_model.json`). The
published artifact (`r16_checkpoint.json`) carries an explicit `construction`
note stating this, and the vault page renders the live block as a distinct event
below, and clearly separated from, the Phase 8 gate block.

## 5. What is NOT changed

  - The frozen batch `batch_20260512_013228Z`, `evaluation/frozen_batch.py`,
    `evaluation/pre_reg_constants.yaml`, and every sealed parameter are untouched.
  - The graded ledger (`website/public/data/latest/ledger.jsonl`) is
    byte-identical: exactly 72 group-stage rows, all `model_id == "M_STAR"`. The
    checkpoint never adds, removes, or rewrites a row.
  - The `kill_criteria_check` block on `evaluation_metrics.json` (the Phase 8
    gate) is preserved byte-identical. The live result lives beside it in a new
    `r16_checkpoint` sibling field and a new `r16_checkpoint.json` artifact, never
    inside it.
  - The 2.0 SE threshold and the criterion direction are read from the locked
    yaml, unchanged.
  - The cp-17 live knockout cards (`matches_live/`) are never read by this
    checkpoint.

## 6. Trigger and idempotence

The checkpoint is computed inside the nightly pipeline. It publishes exactly once,
when the count of settled Round-of-16 rows reaches 8 and no checkpoint artifact
exists yet; thereafter every run carries the frozen result forward byte-identical
and never recomputes. A manual `workflow_dispatch` override
(`force_r16_checkpoint`) exists for the operator to publish the checkpoint
without waiting on the settled-count gate. This matches the pre-registered
commitment that the check "fires once, after all eight R16 matches are settled;
it is not re-run weekly thereafter."

Nicolas files this note on OSF manually.
