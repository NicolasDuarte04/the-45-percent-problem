# Deviation: cp-25b R16 checkpoint forecast set (the 72 group-stage forecasts, scored at R16 settlement)

**Type:** Deviation from the pre-registered pipeline (a scope clarification for
an already pre-registered checkpoint; not an amendment to the pre-registered
model, threshold, or hypotheses).
**Pre-registration:** osf.io/spmkg.
**Champion model:** M2_fifa (M_STAR), locked, pre-registration tag
v1.0.0-mstar-lock. This deviation does NOT unlock, retrain, recalibrate, or
modify the champion model, the simulation engine, the frozen batch
`batch_20260512_013228Z`, or any pre-registered parameter, including the kill
criterion's 2.0 standard error threshold in
`evaluation/pre_reg_constants.yaml`.
**Date filed:** repository record only; Nicolas files the corresponding note on
OSF manually. This document is not itself an OSF submission.

---

## 1. Summary

The pre-registration commits to a second evaluation of the kill criterion,
live, once the Round of 16 settles (the "R16 live checkpoint"), in addition to
the pre-tournament cross-validation sanity gate that already fired in Phase 8
(see `website/src/app/(editorial)/vault/kill-criteria/page.mdx`). cp-25b
implements the grader for that checkpoint (`evaluation/r16_checkpoint.py`).
This note documents the one interpretive choice the implementation had to
make explicit: which forecasts the checkpoint statistic is computed over.

## 2. The forecast-set interpretation, stated narrowly

The R16 checkpoint statistic is a paired per-match log-loss comparison,
computed over the 72 pre-registered group-stage forecasts, rescored once real
outcomes are known, evaluated once the settled Round of 16 row count reaches
the pre-registered trigger gate (8 settled R16 rows).

No knockout forecast enters this statistic. The reason is structural, not a
scope-narrowing choice: there is no frozen, pre-tournament, per-match
knockout forecast to score. Knockout pairings are not known before the group
stage resolves (a given Round of 16 slot can be filled by different teams
depending on how the groups finish), so the champion batch committed at
`batch_20260512_013228Z` could not and did not commit to a specific per-match
knockout distribution the way it committed to the 72 group fixtures. The
live, ungraded knockout cards under `matches_live/` (cp-17 Stage 2b) are a
separate, explicitly ungraded display surface, built from the locked engine
against the concrete draw as it resolves; they were never intended to carry a
frozen pre-tournament forecast, and this checkpoint does not read them.

The "R16 settlement" trigger and the "forecast set being scored" are
therefore two different things, deliberately: the TRIGGER counts settled
Round of 16 match rows (stage `r16`) to decide when 8 have been played and the
checkpoint is due; the STATISTIC scores only the 72 group-stage forecasts
that have settled by that point. This is the reading in the R16 live
checkpoint section of the kill-criteria vault page ("the same 2-SE rule will
be re-evaluated once the Round of 16 settles, on cumulative match-level
log-losses from the start of the tournament through the end of R16"), which
already describes cumulative match-level log-losses through the group stage
as the substance being cumulated, with R16 completion as the timing gate.

## 3. Vault-prose direction check

The kill-criteria vault page prose was checked against the locked yaml and
design doc for a direction mismatch before this checkpoint was wired in (the
criterion's firing direction: M_STAR worse than M0 by 2 or more standard
errors trips it). No mismatch was found: the existing prose ("The check will
fire if M2 fails to beat M0 by at least 2 SE on cumulative match-level
log-losses through the end of R16") already states the correct direction and
required no correction. This deviation note therefore does not carry a prose
correction; it documents the forecast-set scope only.

Separately, and out of scope for this deviation: `src/lockdown/seal_constants.py`
/ `src/calibration/run_cv_battery.py` narrate a Phase 8 gate-failure
consequence in terms that read as an identity fallback ("M star = M0 for
trading purposes"), while the live vault prose describes the same Phase 8
event as a framing pivot only, with M_STAR not demoted
(`pivot_paper_framing`, per `champion_model.json::CHAMPION_LOCKED: true`).
This discrepancy predates cp-25b, is not touched by it, and this checkpoint's
new copy takes no position on it: the R16 status block's fired-state wording
uses only the `pivot_paper_framing` language already established on the
vault page, and does not restate or resolve the identity-fallback framing
found in the calibration scripts' narration.

## 4. The integrity boundary (what is NOT changing)

1. **The graded ledger is untouched.** `evaluation/r16_checkpoint.py` never
   reads or writes `website/public/data/latest/ledger.jsonl` or its snapshot
   copies. It is a read-only consumer of the same settled-outcome stream and
   the same bijection-guarded mapping (`evaluation/forecast_mapping.py`,
   `evaluation/match_score_join.py`) the graded ledger producer uses, and it
   halts on a mapping error exactly the way that producer does
   (`halt_if_mapping_error`), never publishing on a bijection failure.
2. **The pre-tournament `kill_criteria_check` block is untouched.** The new
   `r16_checkpoint` field is written as a sibling of `kill_criteria_check`
   inside `evaluation_metrics.json`, never nested inside it, and the Phase 8
   block's byte content is unaffected.
3. **The champion, engine, and every pre-registered parameter are
   unchanged.** No recalibration, no retraining, no re-fitting, no unlock.
   The kill-criterion function and its 2.0 SE threshold are read from the
   existing, unmodified `evaluation/accuracy_metrics.check_kill_criterion`
   and `evaluation/pre_reg_constants.yaml`; nothing here reimplements or
   re-parameterizes them.
4. **`matches_live/` (cp-17 live knockout cards) is never read.** The
   checkpoint's forecast set is the 72 group-stage matches only; a settled
   knockout-stage row is deferred by the same mapping logic the graded
   ledger already uses and never enters the scored frame.

## 5. Why this preserves the research claim

The pre-tournament calibration claim (the frozen champion forecast, scored
against group-stage results) is unaffected: this checkpoint is an additional,
separately-constructed statistic, gated on a different trigger (R16
settlement rather than nightly regeneration) and published to a
separate artifact (`r16_checkpoint.json` plus the sibling field), never
inside the pre-tournament block. The R16 checkpoint and the Phase 8
sanity gate are both real evaluations of the same pre-registered criterion,
at two different points in time, on two different samples; the site
presents them as two distinct events and this checkpoint's own construction
note (written into the artifact itself) states explicitly that it is not
numerically comparable to the pre-tournament cross-validation readings.

## 6. Reviewer-facing labeling

The published artifact carries a `construction_note` field stating, in
plain prose, that the checkpoint is a paired per-match standard error over
the 72 pre-registered group-stage forecasts, a different construction from
the pre-tournament cross-validation readings, and that the two must never be
presented as a continuation of one another. The vault page's new R16 status
block is introduced with the same distinction and is placed after, and
clearly separated from, the unmodified Phase 8 status block.

## 7. What did not change

* The champion model M2_fifa remains locked. No retraining, no reselection.
* The simulation engine and its strength estimation are untouched.
* No pre-registered parameter was altered, including the kill criterion's
  2.0 SE threshold.
* The graded ledger, the calibration metrics (brier, log_loss, rps,
  reliability_diagram, champion_metric_n), and the `kill_criteria_check`
  block all remain byte-identical after this checkpoint runs.
* `matches_live/` and the cp-16b live conditional bracket surfaces are
  untouched and unread by this checkpoint.

## 8. Filename namespace and isolation

The checkpoint is published under its own filename
(`r16_checkpoint.json`, in both `website/public/data/latest/` and the
timestamped snapshot directory), plus a sibling field on the existing
`evaluation_metrics.json`. No graded surface reads or depends on this new
artifact; the vault page renders it purely as an additive, conditionally-shown
block.

## 9. Trigger and idempotence

Consistent with decision 4 of the cp-25b design: the checkpoint publishes
exactly once, when the count of settled rows with stage `r16` reaches 8 and
no checkpoint artifact exists yet; every other nightly or on-demand run is a
clean no-op. A manual `workflow_dispatch` override
(`force_r16_republish`) exists on the on-demand regeneration workflow for a
deliberate, explicit re-publish; it is off by default and is never set by the
automatic settled-outcome dispatch path.

---

*Repository record only. Nicolas files the corresponding note on OSF
manually; this document does not itself constitute an OSF filing.*
