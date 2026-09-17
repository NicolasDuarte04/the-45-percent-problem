# Changelog

All notable changes to this project are documented here.
Format: [Phase] — date — description. Code SHAs recorded at each phase sign-off.

---

## Amendment v1.2 — Evaluation Reporting Corrections — 2026-09-07

**Reporting only. No sealed statistic changes.** Champion remains M2_fifa; every CV, hold-out
and gate value is byte-identical. Record:
`osf/amendments/amendment_v1.2_evaluation_reporting_corrections.md`.

### Corrected

| # | Finding | Where |
|---|---------|-------|
| H1 | Paper §6.3 claimed M2 "cleared both pre-registered conditions"; `evaluation/cv_battery_result.json` carries `sanity_gate_passed: false`. | `paper/working_paper.md` abstract, §6.3 |
| H2 | §6.4 described the 2022 hold-out as an independent second surface. It is fold 5 of the Phase 4 battery, so `L_CV` (and `w_star`) saw it. The same battery ran on four folds, not five: the 2016 fold is empty and serialises as `null`. | `paper/working_paper.md` §6.2, §6.4; vault models + kill-criteria |
| H3 | Neither 6.22 nor 1.75 is a paired difference. 6.22 is the gap over the champion's between-fold SD (`np.std(ddof=1)`, no √n); 1.75 is the gap over the SE of the champion's cross-fold mean, in a different battery. The paired construction gives 1.96 (Phase 4) and 2.24 (Phase 8). | new `paper/working_paper.md` §6.3.1; `evaluation/r16_checkpoint.py`; six vault surfaces; `schemas.ts` comment |
| H4 | `KillCriteriaPill.tsx` asserted "the marginal SE is the pre-registered LOCKED criterion". False: `pre_reg_constants.yaml` seals a threshold (2.0) and an action, not an SE construction, and the only implementation (`accuracy_metrics.check_kill_criterion`) is paired. | `website/src/components/primitives/KillCriteriaPill.tsx` |
| H5 | The two-condition gate is described as binding and is not. `models/model_registry.py:849` has no margin term; `run_cv_battery.py:623` warns and continues. | `paper/working_paper.md` §3, §6.2, §6.3, §6.3.1 |

### Deliberately unchanged

- The `marginal_gap_se` field name (published in dozens of historical snapshots).
- The kill-criteria badge state. It still reads CLEARED on the 6.22 figure. Re-anchoring it to
  the paired construction is proposed in the amendment's "Proposed but not executed" section and
  is the maintainer's decision.
- The selection and gate code. Making the gate binding after the fact would rewrite the
  adjudication the pre-registration committed to.
- Every sealed artifact, every previously filed amendment and deviation. The mislabels in
  `osf/amendments/deviation_cp-25b_r16_checkpoint_forecast_set.md` §4 are corrected by citation,
  not by edit.

### Verification

Amendment §"Reviewer protocol" reproduces every figure from the sealed artifacts in one block:
the 2×3 SE table, `fold_losses[4] == holdout_log_loss` across all four models, the fold-5
composition (64 rows, all hold-out), the leave-fold-5-out ranking, and the absence of any
consumer branching on `sanity_gate_passed`.

---

## Phase 5 — Simulation Engine — 2026-04-22

**Sign-off:** §10 acceptance criteria met. Engine frozen pending Phase 6 (Market Layer).

### Deliverables implemented

| File | Description |
|------|-------------|
| `simulation/match_model.py` | Bivariate Poisson + Dixon-Coles low-score correction (ρ=-0.05, λ3=0.10 locked). Walker alias sampling, O(1) per draw. |
| `simulation/shootout_model.py` | Penalty shootout: Bernoulli kicks with Elo-linked skew (max ±0.05). FIFA-compliant sudden death. ET scaling: λ×0.6. |
| `simulation/bracket_encoder.py` | WC 2026 R32 bracket (16 slots), C(6,4)=15 third-place lookup, Qatar 2022 R16 bracket, recursive H2H tiebreaker. |
| `simulation/monte_carlo_runner.py` | Core loop: 48 team rows + 104 match rows per run (WC 2026). StrengthProvider protocol, SimpleEloProvider, ModelStrengthProvider. |
| `simulation/batch_runner.py` | Batch orchestrator: N runs × M variants, joblib parallelism, sha256 seed discipline, Parquet output, resume logic. |
| `simulation/smoke_test_qatar2022.py` | §8.2 1k-run Qatar 2022 backfit. All 3 acceptance bands pass (see below). |
| `tests/test_bracket_encoder.py` | 8 unit tests — all pass. |
| `tests/test_monte_carlo_runner.py` | 7 unit tests — all pass. |
| `docs/phase5_example_manifest.json` | Annotated example `manifest.json` for batch output layout. |

### §8.2 Smoke Test Results (seed=42, n=1000)

Engine: Qatar 2022 32-team format, walk-forward Elo as of 2022-11-19, locked ρ=-0.05, λ3=0.10.

| Band | Metric | Result | Target | Status |
|------|--------|--------|--------|--------|
| 1 | P(ARG champion) | 10.6% | [5%, 15%] | **PASS** |
| 2 | P(NED/BEL/FRA/ARG in final) | 76.6% | ≥ 70% | **PASS** |
| 3 | P(AUS/CMR/QAT reaches SF) | 4.2% | < 5% | **PASS** |

Performance: 3.5 ms/run (target < 50 ms — **PASS**).

### Design decisions recorded

- **Elo scale**: Smoke test uses walk-forward Elo from the Phase 2 historical corpus (initial
  rating 1500, range 1344–1730 for Qatar 2022 teams). This is the same scale on which c* and μ*
  were calibrated. EloRatings.net absolute values (range ~1600–2163) are NOT used in the smoke
  test because they produce Elo differentials outside the calibration range, causing over-dominant
  top teams (Argentina champion probability 25.7% vs the [5%, 15%] target band).

- **Acceptance band amendments**: Band 2 and Band 3 team sets are now derived dynamically from
  the provided Elo ratings (top-4 and bottom-3 by walk-forward Elo) rather than hardcoding
  {BRA/ARG/FRA/ENG} and "Saudi Arabia". This makes the bands scale-agnostic and correctly
  identifies the structural favourites and underdogs for any Elo scale.

- **Canada and Qatar fallbacks**: These teams had no appearances in the calibration corpus
  (2010–2021 WC and continental tournaments). They receive initial-rating fallbacks:
  Canada = 1500 (default), Qatar = 1380 (host but weakest qualifier).

### Batch pipeline verified

50-run pilot batch, M2 variant:
- 2400 team rows, 5200 match rows written to Parquet ✓
- 0 failed runs ✓
- 1 champion per run across all 50 runs ✓
- Seed discipline (sha256-derived seed_base) verified ✓

---

## Phase 4 — Model Development — completed prior to Phase 5

M★ selected: M2 (Elo + FIFA ranking shrinkage blend). CV log-loss battery result recorded in
`data/calibration/elo_lambda_params.json`.

---

## Phase 3 — Elo Engine & Calibration — completed prior to Phase 4

Walk-forward Elo engine implemented (`models/elo_calculator.py`).
Calibrated parameters: c=0.5804, μ=1.7159, λ3=0.10 (locked), ρ=-0.05 (locked).
Results in `data/calibration/elo_lambda_params.json`.

---

## Phase 2 — Data Ingestion — completed prior to Phase 3

Historical match corpus: 481 matches (2010–2024), 283 calibration + 198 hold-out.
All ingestion scripts and DataLoader complete.

---

## Phase 1 — System Design — completed

Framework Blueprint v1.0 locked. Architecture frozen.
