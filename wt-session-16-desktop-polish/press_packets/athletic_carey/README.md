# Carey Athletic Press Packet (data extracts only; not the email)

## Provenance

```
active_batch_id:   batch_20260512_013228Z
matrix_sha256:     f732c0e7bb018496fe345263f8ba1b893c2cea23ce979927edbf2c25bd096efe
code_sha:          9e8635ce2549523f477fc53acf2ef1d96701d079
amendment:         v1.1 (osf/amendments/amendment_v1.1_data_completeness.md)
extracted_at:      2026-05-12T01:50:10Z
```

## Files in this folder

| File | Purpose | sha256 |
|---|---|---|
| `brazil_lambda_decomposition.parquet` | Per-fixture Brazil lambda decomposition (model-side) | `9c47db6d87b54b711e57654d009d1a05cc94b24fddd18142cfaaac398f468d3c` |
| `draft_column.md` |  | `f6e6831066e2a36fc970d9bc9861de2d48df0ec4bc7eed2313235a2579f4125b` |

## Pending files (Section 6 dependency)

- `brazil_market_divergence.csv`: BLOCKED on real Pinnacle data ingestion. The pipeline is structurally ready; verification in Section 6 of LOCKDOWN_PLAN. Once Pinnacle publishes 2026 lines, this file becomes auto-generable.

## Note on amendment v1.1

These extracts were generated against the strength matrix produced by
amendment v1.1 (`data/raw/fifa_rankings.parquet` backfilled from the real
2026-04-01 FIFA publication, replacing the 16 missing rows that previously
fell back to the synthetic-snapshot default). The CV-derived statistics in
the M2 champion artifact (`L_CV`, `delta_vs_M0`, `sigma_CV`) are procedurally
pinned at OSF lock and did not change; only the strength matrix, and the
downstream tournament-progression probabilities, changed. See
`osf/amendments/amendment_v1.1_data_completeness.md` for the full amendment record.

## Reproducibility footnote (seed-master)

Seed derivation in this batch uses SHA-based derivation over
(model_id | data_hash | batch_timestamp), which is deterministic but does
not consume the `pre_reg_constants.yaml::sim.seed_master` value. The
spec-vs-code drift is tracked under Section 8 of the lockdown plan.
