# Deviation: cp-16b live conditional bracket (published, explicitly ungraded view)

**Type:** Deviation from the pre-registered pipeline (not an amendment to the
pre-registered model or hypotheses).
**Pre-registration:** osf.io/spmkg.
**Champion model:** M2_fifa (M_STAR), locked, pre-registration tag
v1.0.0-mstar-lock. This deviation does NOT unlock, retrain, recalibrate, or
modify the champion model, the simulation engine, or any pre-registered
parameter.
**Date filed:** (fill in on filing).

---

## 1. Summary

cp-16b publishes a new surface on the website: a "live conditional bracket"
(`tournament_live.json` and `bracket_live.json`), rendered as a clearly
labeled, non-default view on the bracket page. It shows per-round progression
probabilities derived from the active simulation batch, intended to update as
match results land. This document records the deviation and, more importantly,
the integrity boundary that keeps the pre-registered calibration claim intact.
It follows the precedent set by the cp-14 deviation
(`osf/amendments/deviation_cp-14_live_data.md`).

## 2. The claim, stated narrowly

The calibration claim is unchanged by cp-16b. It still grades only the frozen,
pre-tournament champion forecast:

> The frozen, pre-tournament champion (M2_fifa) probability distributions are
> well calibrated against results.

The live conditional bracket is a separate, explicitly ungraded object. It is
never read by the ledger, the calibration metrics, or any scored surface. It
makes no calibration claim of its own.

## 3. The integrity boundary (what is NOT changing)

1. **The graded forecast is untouched.** The scored ledger, the calibration
   metrics (Brier, RPS, log-loss), the published bracket marginals, and
   snapshotProbs.ts all remain pinned to the frozen pre-registered batch
   batch_20260512_013228Z (pinned in cp-16a, proven independent of the active
   batch). The live conditional bracket lives in a separate filename namespace
   with a separate loader and is never read by any graded surface.
2. **The champion, engine, and every pre-registered parameter are unchanged.**
   No recalibration, no retraining, no re-fitting, no unlock.
3. **The calibration claim still grades only the frozen pre-tournament
   forecast.** The live view is explicitly labeled as not graded.

## 4. Conditioning status at time of filing

At the time this note is filed, result conditioning is not yet active: the live
view is fed by an unconditioned re-simulation of the frozen model and is
therefore statistically equivalent to the frozen forecast. A subsequent step
will activate conditioning on settled results. When it does, conditioning will
feed only this ungraded live view; the frozen graded forecast and the
calibration claim will remain pinned to batch_20260512_013228Z and will not
change.

## 5. Why this preserves the research claim

The entire calibration argument rests on grading a forecast that was fixed
before the tournament. By keeping the live conditional view as a separate,
ungraded object and keeping every graded surface pinned to the frozen batch,
the pre-registered forecast that is scored never changes, while readers still
get an honest "given results so far" view that is clearly marked as not part of
the scored claim.

## 6. Reviewer-facing labeling

The live view carries copy stating it is not graded, that only the frozen
pre-tournament forecast is scored, and the active batch id it is sourced from.
The frozen view continues to state that it is the forecast the public ledger
grades, held fixed as matches play out.

## 7. What did not change

* The champion model M2_fifa remains locked. No retraining, no reselection.
* The simulation engine and its strength estimation are untouched.
* No pre-registered parameter was altered.
* The graded ledger, the calibration metrics, the published bracket marginals,
  and snapshotProbs.ts all remain pinned to batch_20260512_013228Z.

## 8. Filename namespace and isolation

The live view is published under a dedicated namespace (`tournament_live.json`,
`bracket_live.json`) read by a separate loader. No graded surface reads these
files. This filename-level separation, combined with the cp-16a frozen-batch
pin, is what makes the isolation auditable rather than merely asserted.
