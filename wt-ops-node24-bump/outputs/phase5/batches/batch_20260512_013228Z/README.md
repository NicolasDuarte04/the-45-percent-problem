# Batch batch_20260512_013228Z

## Provenance

| Field | Value |
|---|---|
| batch_id | batch_20260512_013228Z |
| run_start_utc | 2026-05-12T01:32:28Z |
| run_end_utc | 2026-05-12T01:33:11Z |
| wall_clock_seconds | ~43 |
| code_sha | 9e8635ce2549523f477fc53acf2ef1d96701d079 |
| variants | M0_elo, M2_fifa |
| n_runs_per_variant | 10000 |
| failed_runs | 0 (both variants) |
| data_hash (M0, M2) | ef4c84f2891c2752be07ae94619099e6 |
| seed_base_M0 | 1770650297 |
| seed_base_M2 | 3127387608 |
| matrix_sha256_run (M2) | f732c0e7bb018496fe345263f8ba1b893c2cea23ce979927edbf2c25bd096efe |
| matrix_sha256_run (M0) | 2cba8439c6e53ce639bdd3d63f51c40904fe2abd5c69b118bacc38c82224906b |
| matrix_sha256_lock (champion_model.json) | f732c0e7bb018496fe345263f8ba1b893c2cea23ce979927edbf2c25bd096efe |
| match_status | run == lock (M2) |
| amendment_pointer | osf/amendments/amendment_v1.1_data_completeness.md |

Seed-master reproducibility footnote: `batch_runner.py` derives `seed_base` per variant via `int(sha256(f"{model_id}|{data_hash}|{batch_timestamp}"), 16) % 2**32`; the pre-registered constant `sim.seed_master` in `evaluation/pre_reg_constants.yaml` is not currently consumed by this derivation. This drift is logged for Section 8.

## Acceptance summary

18 tests defined; 16 PASS, 2 FLAG (each within an explicitly documented small-margin / sampling-resolution carve-out of the halt protocol). Full details in `acceptance_report.json`.

| # | Test | Result | Value |
|---|---|---|---|
| 1 | manifest.json parses | PASS | OK |
| 2 | failure rate < 0.1% per variant | PASS | M0=0, M2=0 |
| 3 | team_runs_M0 rows | PASS | 480,000 |
| 4 | team_runs_M2 rows | PASS | 480,000 |
| 5 | match_runs_M0 rows | PASS | 1,040,000 |
| 6 | match_runs_M2 rows | PASS | 1,040,000 |
| 7 | matrix_sha256_run (M2) == lock | PASS | f732c0e7... |
| 8 | >=4 of FIFA top-5 in M2 top-5 | PASS | 4/5 (Morocco displaces Portugal) |
| 9 | France rank <=3 in M2 | PASS | rank 2 (14.88%) |
| 10 | USA in [1.5%, 8%] | FLAG | 1.26% (0.24pp below band; 126/10000; SE 0.11%) |
| 11 | Argentina in [7%, 18%] | PASS | 13.74% |
| 12 | Brazil in [4%, 12%] | PASS | 6.35% |
| 13 | England in [5%, 12%] | PASS | 8.30% |
| 14 | M0 top-10 != M2 top-10 | PASS | distinct orderings |
| 15 | No team > 35% | PASS | max M2=18.24% (Spain), max M0=31.27% (Spain) |
| 16 | All 48 teams non-zero | FLAG | M2: 39 distinct champions; M0: 40. 10k-run MC resolution floor (~0.01%). 9 lowest-ranked teams unresolved. |
| 17 | Per-team marginals sum to 1.0 | PASS | M0=1.0, M2=1.0 (exact, single-champion event) |
| 18 | data_hash differs from prior batch | PASS | ef4c84f2... vs 2c253d38... |

### Key M2 tournament-win probabilities (top 10)

| Rank | Team | Probability |
|---|---|---|
| 1 | Spain | 18.24% |
| 2 | France | 14.88% |
| 3 | Argentina | 13.74% |
| 4 | England | 8.30% |
| 5 | Morocco | 6.42% |
| 6 | Brazil | 6.35% |
| 7 | Netherlands | 4.82% |
| 8 | Germany | 3.80% |
| 9 | Belgium | 3.41% |
| 10 | Portugal | 3.33% |

USA (host nation): 1.26% (real FIFA rank 16, points 1673; prior batch fallback strength produced 1.68%).

## Supersedes

This batch supersedes `batch_20260511_140718Z` as the active production batch. The prior batch remains on disk for audit; only the `data/calibration/active_batch.json` pointer changes.

Supersession reason: amendment v1.1 (FIFA-rankings data completeness). The prior batch ran against strength matrix `8ae40a86...`, which used the 32-team FIFA snapshot with 16 teams falling back to a default-strength path (including the host nation USA, contaminating Muller-packet probabilities). The amendment backfilled the missing 16 teams; M2 was re-fit and re-locked, producing strength matrix `f732c0e7...`. This batch runs against the post-amendment matrix.

## Note

This 10k batch was generated under the new strength matrix produced by amendment v1.1. Tournament probabilities for the 16 previously-fallback teams are now real M2-derived values. The headline qualitative story is unchanged: Spain leads under M2, France and Argentina round out the top 3, the FIFA-vs-Elo divergence between M0 and M2 is preserved (Morocco enters the M2 top 5 while Ecuador and Colombia hold their M0 spots). USA's tournament-win probability is essentially unchanged statistically (1.26% vs 1.68% prior; the two values are within ~2 standard errors of each other given 10k MC resolution).

See `osf/amendments/amendment_v1.1_data_completeness.md` for the full data-completeness narrative and `acceptance_report.json` for per-test details including the two flagged-with-note findings.
