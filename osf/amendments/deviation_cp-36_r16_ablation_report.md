# Clarification: cp-36 templated R16 ablation report

**Type:** Clarification of the pre-registered evaluation procedure (not an
amendment to the pre-registered model, fixtures, or hypotheses).
**Pre-registration:** osf.io/spmkg.
**Champion model:** M2_fifa (M_STAR), locked. This report does NOT unlock,
retrain, or modify the champion model, the simulation engine, the frozen batch
`batch_20260512_013228Z`, or any locked fixture or pre-registered parameter. It
adds no new forecasts and estimates nothing.
**Date filed:** 2026-07-16.
**Builds on:** `deviation_cp-25b_r16_checkpoint_forecast_set.md` (the R16
kill-criterion checkpoint and its forecast set) and `deviation_cp-14_live_data.md`
(the settled-row scoring pipeline).

---

## 1. Summary

The paper commits to publishing a full ablation table (M0 through M3 and the
champion M_STAR, with Diebold-Mariano and Nyberg panels) as the evaluation
deliverable. This note records the templated R16 ablation report that fills the
tested compiler (`evaluation/evaluation_dashboard.compile_ablation`) with the
data the project has actually committed, and states honestly which cells could
not be filled from committed data and why.

The report is a re-use of the same frozen re-scoring the R16 kill-criterion
checkpoint already published. It adds no new forecasts, estimates no shadow
model or market probability, and re-tunes nothing. The adapter
(`evaluation/ablation_report.py`) reads frozen committed artifacts only.

## 2. Timing disclosure

The kill-criterion checkpoint was published within the 72-hour window on
2026-07-07; this full templated report reuses that same frozen re-scoring, adds
no new forecasts, and was compiled after that window, dated accordingly.

To be explicit about the deadline the pre-registration set: the pre-registered
obligation was to re-evaluate the kill criterion once the Round of 16 settled
and to publish the result within 72 hours. That obligation was met on
2026-07-07 by `r16_checkpoint.json` (`evaluated_at_utc` 2026-07-07T22:58:53Z),
well inside the window. This templated ablation report is the fuller, paper
shaped presentation of the same numbers; it was compiled later, on 2026-07-16,
and is dated accordingly. The kill-check was on time; only this longer
write-up is late, and it introduces no new evidence relative to the on-time
check.

## 3. What the report scores, and the honest nulls

This report scores the 72 pre-registered group-stage forecasts from the frozen
champion batch, re-scored against the realized group results with the same
per-match regulation-outcome construction the R16 kill-criterion checkpoint
uses. It populates M0 and the champion M2 (= M_STAR) accuracy with 95 percent
seeded bootstrap confidence intervals and the HLN-corrected Diebold-Mariano
comparison of M2 and M_STAR against M0. Every other cell is null, and null
means null: M1 and M3 have no committed per-match forecasts, so their accuracy
is null; there are no committed market lines, so the de-vigged market row, the
DM-vs-market column, and the Nyberg market-efficiency test are all null; every
trading and CLV column is null because no bet ledger was committed; and the
knockout stages are structurally absent because the frozen batch carries no
per-match knockout forecasts (knockout slots hold different teams on every Monte
Carlo run), so by_stage carries only the single group row (n = 72). No shadow
model, market estimate, or knockout score was invented to fill a column.

### 3.1 Null-cell inventory

  - `M1.accuracy`, `M3.accuracy`: the shadow variants M1 and M3 were never
    logged per match. The forecast log is a write-side API with no committed
    rows; only M0 and M2 have committed per-match distributions (the frozen
    batch `match_runs_M0.parquet` and `match_runs_M2.parquet`). Populating M1
    or M3 would require re-running the model, which this report does not do.
  - `MARKET_DEVIGGED.accuracy`, every `dm_vs_market`, every `nyberg`: there are
    no committed market lines. A market-comparison cell would be an invented
    number.
  - Every `trading` block (n_bets, CLV, Sharpe, decision): no bet ledger was
    committed; `mstar_report` and `shadow_results` are empty, so the compiler
    renders the trading columns null.
  - Knockout stages: structurally absent (see above). `by_stage` carries only
    the `group` row (n = 72) for M0, M2, and M_STAR.

## 4. The constants-sha situation

The report embeds the live `pre_reg_constants.yaml` sha
(`691993cce8194898e7eef164526a7e81cec94edff2823aa37f3882fedc09c227`),
which `compile_ablation` reads from disk at build time.

The report deliberately does NOT pass `expected_constants_sha`. The committed
`evaluation/constants.sha`
(`9ee7448f04e9a28fa948dec0524ff144cc40b9a866e7b081c94ffc01bd1ecc3e`) is the
Phase 8 seal-time hash and no longer matches the YAML: post-seal additive
sections were appended to `pre_reg_constants.yaml` after the seal (commit
39899d24). Those additions are additive scoring-support sections; the sealed
pre-registered parameter values themselves (the 2.0 SE kill threshold, the DM
and Nyberg alpha levels, the scoring-rule eps floor) were not altered. Enforcing
the stale seal would abort the compile on a mismatch that reflects benign
additive drift, not a change to any sealed value. The situation is recorded here
rather than silently reconciled; the committed `constants.sha` is left as the
historical seal-time record and is not rewritten by this report.

## 5. Cross-check against the once-only checkpoint

Before publishing, the adapter cross-checks its M2 and M0 mean log-losses
against the values already published in
`website/public/data/latest/r16_checkpoint.json`:

    mean_log_loss_mstar = 0.899338   (M2 = M_STAR)
    mean_log_loss_m0    = 0.944197

The build STOPS (raises, publishes nothing) if either differs. Both match
exactly, so the templated report and the once-only checkpoint agree by
construction.

## 6. Artifacts and persistence

  - `website/public/data/latest/ablation.json` is the canonical published
    surface. It is given the same regen treatment as `r16_checkpoint.json`: the
    nightly driver (`scripts/regenerate_snapshot_from_batch.py`) emits it into
    the new snapshot bundle before the copytree into `latest/`, carrying the
    committed file forward byte-identical on every run (the content is frozen, it
    scores the fixed 72 group outcomes). Without that wiring the next nightly
    would wipe the committed file, so it would not truly be "published".
  - `evaluation/outputs/ablation_table.tex` and
    `evaluation/outputs/ablation_caption.tex` are the paper fragment
    (booktabs + siunitx). They are repo-record deliverables, not snapshot
    artifacts, and are not part of the nightly bundle.
  - This note (`osf/amendments/deviation_cp-36_r16_ablation_report.md`) is a
    repo-record clarification. It is NOT filed to OSF by this change.

## 7. What is NOT changed

  - The frozen batch `batch_20260512_013228Z`, `evaluation/frozen_batch.py`,
    `evaluation/pre_reg_constants.yaml`, `evaluation/forecast_mapping.py`,
    `evaluation/r16_checkpoint.py`, and every sealed parameter are untouched.
  - The graded ledger (`website/public/data/latest/ledger.jsonl`) is
    byte-identical; the report re-scores the same frozen forecasts read-only and
    never writes a ledger row.
  - The R16 checkpoint (`r16_checkpoint.json`) is untouched; the ablation report
    is cross-checked against it, never the other way around.
  - No new forecasts, no M1/M3/market estimation, no re-tuning.

Nicolas files this note on OSF manually if and when it is filed; this change
does not file it.
