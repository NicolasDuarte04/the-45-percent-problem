# Deviation: cp-14 live-data pipeline (forecast scoring, calibration metrics, provenance correction)

**Type:** Deviation from the pre-registered pipeline (not an amendment to the
pre-registered model or hypotheses).
**Pre-registration:** osf.io/spmkg.
**Champion model:** M2_fifa (M_STAR), locked. This deviation does NOT unlock,
retrain, or modify the champion model, the simulation engine, or any
pre-registered parameter.
**Date filed:** 2026-06-16.

---

## 1. Summary

Before cp-14 the public application displayed a partially frozen snapshot: played
matches rendered as unplayed, the forecast ledger held two synthetic placeholder
rows, every calibration metric was null, and the divergence column published
synthetic Elo-derived numbers with every row stamped `source_book: "PINNACLE"`,
which was false provenance. cp-14 makes the published artifacts real. This
document records the methodology and the deviations from the pre-registered
pipeline that the change entails.

Four things changed in the published pipeline:

1. Settled match scores are joined into the per-match pages.
2. The forecast ledger is populated by scoring the frozen pre-tournament
   champion forecast against settled results.
3. The calibration metrics (Brier, RPS, log-loss) are computed from those
   (forecast, outcome) pairs.
4. The divergence column is gated: real de-vigged lines when odds are ingested,
   an honest pending state otherwise, with the false PINNACLE provenance removed.

## 2. The claim, stated narrowly

The calibration evidence produced by cp-14 supports one narrow claim:

> The frozen, pre-tournament champion (M2_fifa) probability distributions are
> well calibrated against group-stage results.

It is explicitly NOT a market-timing claim, NOT a closing-line-value (CLV)
claim, and NOT a market-efficiency claim. CLV, the Nyberg market-efficiency
test, and the Diebold-Mariano test versus the market remain null and pending,
because there are no committed market lines to score against. Only the
proper-scoring metrics (Brier, RPS, log-loss) are populated, and only for the
champion. The M0, M1, M3 ablation arms remain null in the published metrics:
scoring them would require their own committed batches, which is out of scope
here.

## 3. Forecast methodology: reconstruction, framed correctly

This is the methodologically load-bearing part of the deviation.

The pre-registered design envisioned per-match forecasts emitted live at the
Pinnacle opening-line time. Real odds ingestion is not yet active, so that live
emission path has not run. Rather than start the calibration record from an
almost-empty sample mid-tournament, cp-14 scores a forecast that already existed
before the tournament began.

The champion model produced a full pre-tournament forecast for all 72 group
matches as part of the locked Monte Carlo batch `batch_20260512_013228Z`,
activated 2026-05-12T01:33:11Z. This batch is committed to version control, was
generated before the first kickoff (2026-06-11T19:00:00Z), and has not changed
since. cp-14 aggregates the committed regulation-goal samples from that batch
into a per-match 1X2 distribution and scores that single frozen opening forecast
against each result as the match settles.

Three properties make this a legitimate, maximally defensible out-of-sample
calibration rather than a backfill:

1. **No look-ahead.** The forecast is a pure aggregation of Monte Carlo samples
   that were committed before any match was played. The model is never re-run on
   present-day inputs. Re-running the model to recreate a past forecast would be
   look-ahead contamination and was treated as a hard stop; it was not done.
2. **Provable pre-dating.** The batch activation timestamp (2026-05-12) predates
   the earliest kickoff. A test asserts this ordering. Every scored forecast
   therefore provably predates its outcome.
3. **Auditable provenance.** Every ledger row is tagged with the source batch
   id, the batch activation timestamp, and the code SHA, so any forecast can be
   traced back to the frozen artifact it was reconstructed from.

This is best described not as "backfilling forecasts" but as scoring a frozen,
committed, pre-tournament forecast against results as they arrive.

## 4. Identity-mapping integrity (the single highest-risk step)

A mis-mapped forecast scored against the wrong match would corrupt the published
Brier invisibly. Three id spaces must be reconciled: the batch slot
(`G-A-1`), the published match (`M01`), and the settled outcome
(`FD{source_id}` from Football-Data.org, or an admin `M{NN}` entry). They are
reconciled only through team identity and the fixtures.

cp-14 builds this mapping as a validated bijection and treats any failure as a
hard stop:

* The model-side map (published `M{NN}` to batch slot) is an exact 72-to-72
  bijection over team identity with consistent home/away orientation, built from
  committed, outcome-blind artifacts.
* The settled-side join maps each settled outcome to a fixture by FIFA-code team
  identity. It halts (and the pipeline falls back to forward-only logging for the
  entire ledger) on any unknown pair, swapped orientation, duplicate collision
  (the classic phantom or double-counted row), or a canonical id that disagrees
  with its own team pair.

The full mapping table is emitted as a reviewable artifact and was inspected
before any metric was computed.

## 5. Metrics computation start point

The calibration metrics begin accumulating from the first settled group match.
The published `evaluation_metrics.json` records the champion Brier, RPS, and
log-loss together with `champion_metric_n`, the explicit count of settled
matches scored. The user interface shows this sample size verbatim and frames a
small sample as suggestive, not as a settled track record. The kill-criteria
block is carried through unchanged; it is locked pre-registration state.

## 6. Provenance correction

The divergence column previously published synthetic, Elo-derived `q_market`
values with every row stamped `source_book: "PINNACLE"`. That attribution was
false: the numbers were not Pinnacle lines. cp-14 removes the false provenance.
When real odds are ingested (via either a Pinnacle commercial key or The Odds
API key), the divergence rows are de-vigged from the real closing lines by the
pre-registered power method and stamped PINNACLE honestly. When no real odds are
present, the column renders an honest pending state with zero rows and no
bookmaker attribution anywhere. Synthetic numbers are no longer published behind
a disclosure banner.

## 7. What did not change

* The champion model M2_fifa remains locked. No retraining, no reselection.
* The simulation engine and its strength estimation are untouched.
* No pre-registered parameter was altered.
* The data corpus was not edited. cp-14 only wires existing committed outputs
  into the published pipeline.

## 8. Reproducibility

The forecast distributions are a deterministic aggregation of the committed
batch, so regenerating the ledger is idempotent for already-settled matches and
only appends rows as new matches settle. The reconstruction, the bijection, the
metrics aggregation, and both divergence paths (pending and live de-vig) are
covered by tests; the live odds API is never called in tests.
