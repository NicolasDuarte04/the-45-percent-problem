# The 45% Problem
### Probabilistic Pricing for FIFA World Cup 2026

> *"Structural variables explain ~55% of World Cup performance variance. The remaining 45% residual is what we price under — with calibrated uncertainty, not prediction."*
> — Hoffmann, Ging & Ramasamy (2002)

---

## What This Is

A **probabilistic pricing framework** for the FIFA World Cup 2026. Not a prediction tool — a market-comparison engine. It estimates full probability distributions for match outcomes and tournament progression, converts bookmaker odds into implied probabilities using the power de-vigging method (Shin 1993 / Strumbelj 2014), and flags mispricings above a pre-specified edge threshold.

**Two and only two deliverables:**
1. **Live MVP Website** — public-facing, daily-updating during the 2026 WC. Shows M★ probabilities and model-vs-market divergence.
2. **Academic Research Paper** — ablation study of M0–M3, Nyberg market efficiency tests, pre-registered hypotheses.

---

## Pre-registration (OSF) — LOCKED

This project is formally pre-registered on the Open Science Framework. The registration is **immutable** and predates the opening match of FIFA World Cup 2026.

| Field | Value |
|-------|-------|
| **OSF Persistent Identifier** | [https://osf.io/8b5hd](https://osf.io/8b5hd) |
| **Registration Status** | LOCKED — 2026-04-23 |
| **M★ Champion** | M2 — Elo + FIFA Ranking Shrinkage Blend |
| **Lockdown Tag** | `v1.0.0-MSTAR-LOCKED` |
| **Constants SHA-256** | `9ee7448f04e9a28fa948dec0524ff144cc40b9a866e7b081c94ffc01bd1ecc3e` |

The lockdown certificate is at [`docs/lockdown_certificate.md`](docs/lockdown_certificate.md).

---

## Model Roster

| Model | Description | CV Log-Loss |
|-------|-------------|-------------|
| **M0** | Pure Elo (null baseline) | 1.0318 |
| **M1** | Elo + exponential-decay form (last 8 matches) | 1.0644 |
| **M2 ★** | Elo + FIFA ranking shrinkage blend (`w=1.0`) | **1.0002** |
| **M3** | Bayesian macro-prior (Hoffmann-HGR) updated by Elo | 1.0190 |

**M★ = M2** selected per pre-registered CV log-loss protocol (§1.3.5 of Phase 8 design). M2 beats M0 by 6.21 SE — well above the 2 SE sanity gate.

---

## Architecture

```
the-45-percent-problem/
├── schemas.py          ← Pydantic v2 models
├── config.yaml         ← single source of truth for all parameters
├── ingestion/          ← data fetching (historical matches, Elo, FIFA, odds)
├── models/             ← M0–M3 model implementations
├── simulation/         ← bivariate Poisson + Dixon-Coles Monte Carlo engine
├── market/             ← power de-vigging, edge calculator, volatility gate
├── evaluation/         ← CLV tracker, forecast log, accuracy metrics
│   ├── pre_reg_constants.yaml   ← SEALED — do not modify
│   └── cv_battery_report.pdf    ← formal M★ adjudication report
├── src/
│   ├── calibration/    ← CV battery runner
│   └── lockdown/       ← seal & certificate scripts
├── tests/              ← pytest suite
└── docs/
    └── lockdown_certificate.md  ← Phase 8 lockdown certificate
```

---

## Simulation Engine

- **Match model**: Bivariate Poisson with Dixon-Coles low-score correction (ρ = −0.05)
- **Tournament**: 48 teams, 12 groups, official FIFA 2026 cross-group bracket
- **Monte Carlo**: 10,000 runs (website) / 100,000 runs (paper)
- **Market de-vigging**: Power method only — never proportional

---

## Reproducibility

Clone the repo at the locked tag and re-run the CV battery:

```bash
git clone https://github.com/NicolasDuarte04/the-45-percent-problem.git
cd the-45-percent-problem
git checkout v1.0.0-MSTAR-LOCKED
python -m venv .venv && source .venv/bin/activate
pip install -e .
python src/calibration/run_cv_battery.py
```

The resulting `evaluation/cv_battery_result.json` must be byte-identical to the OSF-registered copy. The `data_snapshot_sha` in the file is the authoritative fingerprint of the calibration corpus.

---

## Post-lock Commit Policy

After `v1.0.0-MSTAR-LOCKED`, only two categories of commits are accepted on `main`:

1. **Pure data additions** to `data/snapshots/` (daily odds captures, match results).
2. **Amendment records** under `amendments/` — each linked to a child OSF registration.

Any modification to `src/`, `schema/`, or `evaluation/pre_reg_constants.yaml` constitutes a registration violation and triggers the hotfix protocol (Phase 8 §4.6).

---

## Author

**Nicolás Duarte Jaraba**
Pre-registration: [https://osf.io/8b5hd](https://osf.io/8b5hd)
