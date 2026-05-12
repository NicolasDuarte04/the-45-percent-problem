# The 45% Problem — Claude Code Project Memory

> This file is read automatically by Claude Code every session.
> It is the authoritative guide to this codebase. Follow it exactly.

---

## What This Project Is

A **probabilistic pricing framework** for the FIFA World Cup 2026. Not a prediction tool — a market-comparison engine. It estimates full probability distributions for match outcomes and tournament progression, converts bookmaker odds into implied probabilities using the power de-vigging method, and flags mispricings above a pre-specified edge threshold.

The name comes from Hoffmann, Ging & Ramasamy (2002): structural variables explain ~55% of World Cup performance variance. The remaining **45% residual** is the project's subject — we price under it with calibrated uncertainty, not predict through it.

**Two and only two final deliverables:**
1. **Live MVP Website** — public-facing, daily-updating during the 2026 WC. Shows M★ probabilities and model-vs-market divergence. No betting advice language.
2. **Academic Research Paper** — ablation study of M0–M3, Nyberg market efficiency tests, pre-registered hypotheses. Working paper pre-tournament; journal submission post-tournament.

Every line of code must serve one or both of these deliverables. If it doesn't, don't write it.

---

## Architecture (Framework Blueprint v1.0 — LOCKED)

The blueprint lives at `../Framework_Blueprint_v1.0.docx`. Nothing in it changes. The code implements it.

### The Model Roster

All models share the same simulation engine. Only the strength-estimation function differs.

| Model | Description | Research Purpose |
|-------|-------------|-----------------|
| **M0** | Pure Elo (no form, no macro, no FIFA rank) | Null baseline — all richer models must beat this |
| **M1** | Elo + exponential-decay form (last 8 matches, calibrated half-life, ±15% λ cap) | Expected M★ candidate |
| **M2** | Shrinkage blend of Elo + FIFA ranking points (cross-validated weight w) | Tests FIFA rank redundancy hypothesis |
| **M3** | Bayesian macro-prior (Hoffmann-HGR variables) updated by Elo | Replicates Klement/Hoffmann thesis |
| **M★** | Winner of CV log-loss battery on M0–M3 | Production model feeding the live website |

M★ is selected by a frozen protocol before the opening match. After that, only data inputs update — model code is frozen with its Git SHA.

### Simulation Engine (shared by all models)

- **Match model**: Bivariate Poisson with Dixon-Coles low-score correction (ρ calibrated on historical data)
- **Tournament**: 48 teams, 12 groups, official FIFA 2026 cross-group bracket. Group tiebreakers in order: points → GD → GS → H2H → H2H GD → Fair Play → lots
- **Extra time**: λ × 0.6 scaling on expected goals
- **Shootout**: near-random Bernoulli with small Elo-linked skew (max 0.05)
- **Monte Carlo**: 10,000 runs (website), 100,000 runs (paper). Per run: sample α_i, β_i from posteriors → play 72 group matches → tiebreakers → bracket → knockouts → write Parquet row with {run_idx, model_id, data_hash, seed}

### Market Layer

- **De-vigging**: Power method (Shin 1993 / Strumbelj 2014). NOT the proportional method.
- **Edge metric**: E = p_model − q_devigged. Threshold: ε = 3% mainline, 5% derivative/low-volume
- Sources: Pinnacle (primary), Betfair Exchange (spread check), Polymarket (volume check)

### Volatility Gate (M★ only — 5 suppression rules)

1. Named-event suppression: injury/suspension/manager change logged in last 24h, with 6h suppression window before market close
2. Price-discovery suppression: >3% price swing in any 30-min window within 2h of recommendation time
3. Exchange spread suppression: Pinnacle vs. Betfair de-vigged spread >2.5%
4. Liquidity suppression: Polymarket 24h volume <$50,000, or Pinnacle line >4h stale
5. Sizing guardrails: Kelly f=1/4 mainline, f=1/8 longshots (<10% implied prob); per-market cap 5%; per-event cap 8%; drawdown stop 20% from peak → halve stakes

All suppressions are written to `data/snapshots/event_log.jsonl` with trigger reason and timestamp.

### Evaluation

- **CLV (M★ only)**: store p_model, q_open, q_close per recommendation. Compute CLV/bet = q_close − q_open. Positive CLV = market moved toward model position.
- **Pseudo-CLV (M0–M3)**: apply M★ bet-selection logic hypothetically to each variant. Secondary ablation table.
- **Accuracy metrics**: Brier score, RPS, log-loss, Diebold-Mariano tests, Nyberg market efficiency tests.
- **Forecast log**: append-only JSONL at `data/snapshots/forecast_log.jsonl`. One row per (match × model_variant) at Pinnacle opening line time. Contains: timestamp (UTC ms), match_id, model_variant, code_sha, data_snapshot_sha, probability vector, MC seed. **No overwrites. Ever.**

---

## Repository Structure

```
the-45-percent-problem/
├── CLAUDE.md                    ← you are here
├── schemas.py                   ← Pydantic v2 models (Match, Team, OddsSnapshot, ForecastRecord, EventLog)
├── config.yaml                  ← single source of truth for all parameters
├── pyproject.toml               ← dependencies (Python >=3.9)
├── .env                         ← API keys (never commit)
├── .env.example                 ← template
│
├── data/
│   ├── raw/                     ← immutable downloaded files (Parquet, CSV)
│   ├── processed/               ← derived datasets (Elo time-series, team features, etc.)
│   └── snapshots/               ← append-only logs: forecast_log.jsonl, event_log.jsonl, snapshot_registry.jsonl
│
├── ingestion/                   ← all data fetching scripts
│   ├── fetch_historical_matches.py   ✅ DONE — calibration corpus + 2022 hold-out
│   ├── fetch_elo_ratings.py          ← NEXT
│   ├── fetch_fifa_rankings.py
│   ├── fetch_recent_form.py
│   ├── fetch_macro_data.py
│   ├── fetch_wc2026_fixtures.py
│   ├── fetch_odds_pinnacle.py
│   ├── fetch_odds_polymarket.py
│   ├── fetch_odds_betfair.py
│   └── data_loader.py               ← unified interface (build last in Phase 2)
│
├── models/                      ← frozen JSON hyperparameter files + model code (Phase 4)
├── simulation/                  ← simulation engine (Phase 5)
├── market/                      ← de-vigging, edge calculator, volatility gate (Phase 6)
├── evaluation/                  ← CLV tracker, forecast log, accuracy metrics (Phase 7)
├── utils/
│   ├── logger.py                ✅ DONE — structured logging (Rich console + JSON file)
│   └── hasher.py                ✅ DONE — SHA-256 file/DataFrame/snapshot hashing
├── website/                     ← Next.js or SvelteKit MVP (Phase 9)
├── tests/                       ← pytest suite
└── logs/                        ← pipeline.log (gitignored)
```

---

## What Is Already Built

**Phase 1 — System Design: 100% COMPLETE (locked)**

**Phase 2.1 — Project Infrastructure: COMPLETE**
- `schemas.py` — Pydantic v2 models: `Match`, `Team`, `OddsSnapshot`, `ForecastRecord`, `EventLog` with auto-computed `data_hash` fields
- `config.yaml` — all hyperparameters, API keys (via env), paths, pre-registered parameters
- `pyproject.toml` — full dependency list, Python >=3.9
- `utils/logger.py` — `get_logger(__name__)` returns `PipelineLogger` with structured kwargs
- `utils/hasher.py` — `hash_file()`, `hash_dataframe()`, `DataSnapshotHasher`, `SnapshotRegistry`
- `.gitignore`, `.env.example` — complete

**Phase 2.2 — Historical Match Results: COMPLETE**
- `ingestion/fetch_historical_matches.py` — downloads Mart Jürisoo dataset, filters to 11 tournament windows (WC 2010/14/18 calibration + WC 2022 hold-out + 6 continental tournaments), standardises team names, validates against `Match` schema, writes `data/raw/historical_matches.parquet`, registers SHA snapshot

**Phase 2.3–2.7 — Remaining Ingestion: COMPLETE**
- All eight ingestion scripts written and run; outputs in `data/raw/`: `elo_ratings.parquet`, `fifa_rankings.parquet`, `recent_form.parquet`, `macro_data.parquet`, `wc2026_fixtures.parquet`, `odds_{pinnacle,polymarket,betfair}.parquet`
- `ingestion/data_loader.py` — unified `DataLoader` interface

**Phase 3 — Elo Engine & Calibration: COMPLETE (locked 2026-04-21)**
- `models/elo_calculator.py` — Elo update + walk-forward
- `models/calibrate_elo_lambda.py` — fit `c, μ, λ₃, ρ`. Output: `data/calibration/elo_lambda_params.json`
- M1 form half-life calibrated, M2 FIFA blend weight calibrated, M3 macro θ fit. Outputs: `m1_form_params.json`, `m2_fifa_params.json`, `m3_macro_theta.json` in `data/calibration/`
- 5-fold walk-forward CV battery executed (`data/snapshots/cv_battery_2026-04.parquet`)

**Phase 4 — Models M0-M3 + Champion Selection: COMPLETE (locked 2026-04-21)**
- `models/model_m{0,1,2,3}_*.py` — all four variants implementing `BaseModel`
- `models/model_registry.py` — fits all variants, runs CV battery, selects champion per pre-registered protocol
- **CHAMPION LOCKED**: `data/calibration/champion_model.json` — `M2_fifa`, `L_CV = 0.99337`, `Δ_vs_M0 = -0.04096`, `CHAMPION_LOCKED: true`
- CV log-loss table (locked, `data/calibration/cv_battery_results.json`):
  - M0_elo:   1.034330
  - M1_form:  1.081097  (DM p=0.0061 vs M0 — disqualified, significantly worse)
  - **M2_fifa: 0.993370 ← champion**
  - M3_macro: 1.026943
- Subsequent canonical scoring run with hold-out evaluation: `evaluation/cv_battery_result.json` (2026-04-23). Includes `holdout_log_loss` per model — used for downstream reliability/calibration analysis. Note: this run has slightly different CV numbers from the calibration-folder file because it was a separate run with different seed; the locked champion-decision values are the calibration-folder file.

**Phase 5 — Simulation Engine: PARTIAL**
- `simulation/{match_model,shootout_model,bracket_encoder,monte_carlo_runner,batch_runner}.py` exist
- `outputs/phase5/batches/batch_20260422_180255Z/` has a smoke-test M2 batch (50 runs)
- Full 10k/100k production runs not yet executed against the 2026 fixtures

**Phase 7 — Evaluation Framework: PARTIAL**
- `evaluation/{accuracy_metrics,clv_tracker,evaluation_dashboard,forecast_log,pseudo_clv}.py` exist
- `evaluation/score_on_2022_holdout.py` — written 2026-05-07 to materialise per-match (predicted_prob, outcome) tuples for the 2022 hold-out, used by the Burn-Murdoch reliability chart. Outputs `data/processed/holdout_probs_m{0,1,2,3}.parquet`

---

## What To Build Next (In This Order)

### Phase 2 — Data Ingestion (remaining)

#### Task 2.3a — `ingestion/fetch_elo_ratings.py`
Fetch current Elo ratings for all teams from eloratings.net or WorldFootballElo.
- Source URL: `https://www.eloratings.net/World.tsv` (may need scraping fallback)
- Capture: team name, Elo rating, rank, last match date
- Map team names to the same standardised names used in `fetch_historical_matches.py`
- Output: `data/raw/elo_ratings.parquet`
- Hash with `DataSnapshotHasher` and register with `SnapshotRegistry`

#### Task 2.3b — `ingestion/fetch_fifa_rankings.py`
Fetch current FIFA ranking points for all 48 WC 2026 qualifiers.
- Source: FIFA official page or an open API (e.g. `https://www.fifa.com/fifa-world-ranking/men`)
- Capture: team name, FIFA points (not just rank position), ranking date
- Output: `data/raw/fifa_rankings.parquet`

#### Task 2.3c — `ingestion/fetch_recent_form.py`
Fetch the last 8 international matches per team from the historical dataset (already in `data/raw/historical_matches.parquet`) plus any more recent matches not yet in that dataset.
- Compute a raw form series per team: [(date, result W/D/L, opponent_elo, competition_weight)]
- Do NOT compute the decayed form score yet — that happens during model calibration
- Output: `data/raw/recent_form.parquet`

#### Task 2.4 — `ingestion/fetch_macro_data.py`
Fetch Hoffmann-HGR macro variables for M3.
- Variables: log(GDP per capita), log(population), mean annual temperature, is_host flag, WC appearances 1960–2026 (decayed)
- Sources: IMF WEO API, World Bank API, open climate datasets
- Output: `data/raw/macro_data.parquet`

#### Task 2.5 — `ingestion/fetch_wc2026_fixtures.py`
Fetch the confirmed 2026 World Cup group assignments and match schedule.
- 48 teams, 12 groups, full schedule with kickoff times (UTC) and venues
- Hard-code as a fallback if no reliable API exists yet (tournament is upcoming)
- Output: `data/raw/wc2026_fixtures.parquet`

#### Task 2.6a — `ingestion/fetch_odds_pinnacle.py`
- Historical: 2010–2022 WC closing lines (for bias correction calibration)
- Live: opening lines for 2026 WC matches when available
- Store opening AND closing prices per market line
- Output: `data/raw/odds_pinnacle.parquet`

#### Task 2.6b — `ingestion/fetch_odds_polymarket.py`
- Fetch de-vigged prices + 24h volume for WC markets
- Volume is a Volatility Gate trigger — must be stored alongside price
- Output: `data/raw/odds_polymarket.parquet`

#### Task 2.6c — `ingestion/fetch_odds_betfair.py`
- Fetch best available back/lay prices for the Pinnacle spread check
- Output: `data/raw/odds_betfair.parquet`

#### Task 2.7 — `ingestion/data_loader.py`
Build last. Single typed interface consumed by all models and the simulation engine.
- `DataLoader` class with methods: `get_matches()`, `get_teams()`, `get_elo()`, `get_odds(bookmaker, market_type)`, `get_fixtures()`
- Returns validated, snapshot-hashed data using `schemas.py` types
- Abstracts Parquet files; callers never touch raw files directly

---

### Phase 3 — Elo Engine & Calibration

- `models/elo_calculator.py` — standard Elo update rule, calibrate K-factor on 2010–2021 data
- `models/calibrate_elo_lambda.py` — fit Elo differential → λ (expected goals) mapping; output `models/elo_lambda_params.json`
- `models/calibrate_form_decay.py` — cross-validate M1 decay half-life; enforce ±15% cap; freeze to config
- `models/calibrate_fifa_blend.py` — CV log-loss minimise M2 blend weight w; freeze to config
- `models/validate_on_2022_holdout.py` — run all calibrated models on 2022 WC hold-out, record log-loss scores for pre-registration

### Phase 4 — Model Development (M0–M3)

All models implement the same interface: `get_strength_matrix() -> np.ndarray` of shape (48, 48).

- `models/model_m0_elo.py`
- `models/model_m1_form.py`
- `models/model_m2_fifa.py`
- `models/model_m3_macro.py`
- `models/model_registry.py` — M★ selection protocol

**Holdout probability artifact** — produced by `evaluation/score_on_2022_holdout.py` and consumed by `scripts/generate_burn_murdoch_chart.py` and any other reliability-diagram consumer:

```
data/processed/holdout_probs_m0.parquet
data/processed/holdout_probs_m1.parquet
data/processed/holdout_probs_m2.parquet
data/processed/holdout_probs_m3.parquet
```

Schema (192 rows per file = 64 hold-out matches × 3 outcomes):

| column           | dtype   | notes                                                    |
|------------------|---------|----------------------------------------------------------|
| match_id         | string  | matches `Match.match_id` from `historical_matches.parquet` |
| outcome_class    | string  | one of `home_win`, `draw`, `away_win`                     |
| predicted_prob   | float64 | model's probability for this outcome class                |
| outcome          | int8    | 1 if this class realised, 0 otherwise                     |

Aggregate hold-out log-loss from these files must match the canonical `evaluation/cv_battery_result.json` `holdout_log_loss` values to ≤ 1e-6:
- M0: 1.018142
- M1: 1.101231
- M2: 0.987659
- M3: 0.997438

If they don't match, do not regenerate the press chart — the locked params or training split has drifted.

### Phase 5 — Simulation Engine

- `simulation/match_model.py` — bivariate Poisson + Dixon-Coles
- `simulation/shootout_model.py` — Bernoulli per-kick, Elo-linked skew
- `simulation/bracket_encoder.py` — official FIFA 2026 bracket paths
- `simulation/monte_carlo_runner.py` — core loop, Parquet output
- `simulation/batch_runner.py` — nightly job for all 5 variants

### Phase 6 — Market Layer & Volatility Gate

- `market/devig.py` — power method
- `market/edge_calculator.py` — E = p_model − q_devigged
- `market/volatility_gate.py` — all 5 suppression rules
- `market/kelly_sizer.py` — fractional Kelly with caps
- `market/bias_tests.py` — 7 pre-registered behavioral hypotheses
- `market/news_monitor.py` — named-event ingestion
- `market/market_pipeline.py` — orchestrator

### Phase 7 — Evaluation Framework

- `evaluation/forecast_log.py` — append-only JSONL writer
- `evaluation/clv_tracker.py` — CLV telemetry for M★
- `evaluation/pseudo_clv.py` — hypothetical CLV for M0–M3
- `evaluation/accuracy_metrics.py` — Brier, RPS, log-loss, DM, Nyberg
- `evaluation/evaluation_dashboard.py` — ablation table → JSON + LaTeX

### Phase 8 — Pre-registration & M★ Selection

- Run CV battery on M0–M3, apply selection protocol, freeze M★
- Write pre-registration package, submit to OSF
- Tag Git commit with M★ SHA

### Phase 9 — Live MVP Website

Next.js or SvelteKit. Static site reading from daily Parquet snapshots. Pages: Home, Tournament Probabilities, Match Analysis, Model vs Market, About.

### Phase 10 — Academic Research Paper

LaTeX. Pre-tournament draft → post-tournament revision with realised results → journal submission.

---

## Coding Conventions

**Always follow these. No exceptions.**

### Python version
Target Python 3.9+. Always include `from __future__ import annotations` at the top of every file. This enables `str | None` union syntax on Python 3.9.

### Imports
```python
from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger
from utils.hasher import DataSnapshotHasher, SnapshotRegistry
from schemas import Match, Team   # etc.
```

### Logging
```python
log = get_logger(__name__)

log.stage("Starting task X")          # pipeline transition
log.info("Processing", rows=1000)     # structured kwargs → JSON log
log.warning("Missing data", field="score_home", match_id="2022-12-18_ARG_FRA")
log.success("Written", path="data/raw/foo.parquet", rows=700)
```

Never use `print()` for operational output. Use `log.*`.

### Hashing (every script that writes a Parquet file must do this)
```python
hasher = DataSnapshotHasher()
hasher.add_file(OUTPUT_PARQUET, label="descriptive_name")
snapshot_sha = hasher.finalise()
registry = SnapshotRegistry("data/snapshots/snapshot_registry.jsonl")
registry.register(snapshot_sha, hasher.manifest(), notes="script_name")
log.info("Snapshot registered", sha=snapshot_sha[:16])
```

### Config loading
```python
import yaml
with open(PROJECT_ROOT / "config.yaml") as f:
    cfg = yaml.safe_load(f)

output_path = PROJECT_ROOT / cfg["data_sources"]["elo_ratings"]["output_file"]
```

### Script structure
Every ingestion script must follow this pattern:
1. `fetch_raw()` — download/cache raw data
2. `clean_and_enrich()` — standardise, validate, enrich
3. `build_output()` — select final columns, sort, reset index
4. `run(force=False) -> Path` — orchestrates 1–3, writes Parquet, hashes, returns output path
5. `if __name__ == "__main__":` with `argparse` `--force` flag

### Parquet output rules
- Engine: always `engine="pyarrow"`
- No index: `index=False`
- Sort by natural key before writing (e.g. `["date", "match_id"]` for matches)
- Nullable integer columns: use pandas `Int64` dtype (capitalised) for scores that may be null

### Pre-registered parameters
Parameters marked `[PRE-REGISTERED]` in `config.yaml` must never be hardcoded in scripts. Always read from config. After the pre-registration is submitted to OSF, any change to these values requires a deviation report.

### The hold-out set
The 2022 World Cup (`is_holdout=True` rows in `historical_matches.parquet`) must **never** be used during calibration. Only `validate_on_2022_holdout.py` may touch these rows, and only after all models are fully specified.

### Append-only logs
`data/snapshots/forecast_log.jsonl` and `data/snapshots/event_log.jsonl` are append-only. No script may delete rows from or overwrite these files. Updates = new rows.

**Local invocation guard.** Any script that writes to either file must accept a `--dev-sandbox` flag that redirects writes to `tmp/` (gitignored). Production writes happen only from CI, against the real `data/snapshots/` paths. A local invocation without `--dev-sandbox` is an error: a partial run, a debug execution, or a stray test would otherwise corrupt the pre-registered append-only stream and require a deviation report to OSF. Convention:

```python
parser.add_argument(
    "--dev-sandbox",
    action="store_true",
    help="Redirect writes to tmp/ instead of data/snapshots/. "
         "Required for any local invocation; CI omits this flag.",
)
# ...
if args.dev_sandbox:
    output_path = PROJECT_ROOT / "tmp" / "snapshots" / output_path.name
elif os.environ.get("CI") != "true":
    raise RuntimeError(
        "Refusing to write to data/snapshots/ outside CI. "
        "Pass --dev-sandbox for local runs."
    )
```

This applies to `evaluation/forecast_log.py`, the event-log writer, and any future script that appends to a pre-registered log. Implement the guard before wiring the script into a pipeline, not after.

### Team name standardisation
Use the same `TEAM_NAME_MAP` dict established in `fetch_historical_matches.py`. When adding new team names, update that dict in place and import it in other scripts that need it. Do not maintain separate name maps.

---

## Workflow Conventions

These rules govern how changes land in this repo. They exist because the repo backs a pre-registered academic claim: a corrupted or unreviewed commit on `main` is harder to undo here than in a typical product codebase.

### Required first-time setup

After cloning, run `scripts/install-hooks.sh` once. This wires up the repo-managed git hooks (currently: `pre-push` conflict-marker check). Re-run after any change to `scripts/git-hooks/*`. The hook is required, not optional — see "Pre-push hook" below.

### PR discipline

Any change beyond a single-file lint fix or a tightly-confined hotfix goes through a feature branch + pull request + maintainer review, regardless of size. **"Small enough to skip" is not a category.** The failure mode the rule prevents is bundling unrelated changes into one push, which makes blame and rollback harder later.

Direct pushes to `main` are reserved for:
- Single-file typo, lint, or unescaped-character fixes
- A tightly-confined hotfix to a specific known-broken commit, with the fix and nothing else in the diff
- Bot pushes (e.g. the nightly snapshot pipeline)

Anything else — new dependencies, schema changes, multi-file refactors, new features, test infrastructure changes, hook scripts, workflow rule changes — requires a PR.

### Git hygiene

When the rebase target is known to also touch generated files (data snapshots, build artifacts, lockfiles), prefer:

```bash
git fetch origin
git reset --hard origin/main
# then re-apply your committed work, e.g. by re-running the change against
# the fresh tree, or by cherry-picking the relevant commit
```

over:

```bash
git stash -u && git pull --rebase origin main && git stash pop
```

The stash-pop pattern silently writes git conflict markers into the working tree when the stashed changes touch the same files as the rebased commits. The push succeeds because the markers are unstaged, but the working tree (and any process that reads from disk without going through git — dev server, test runner, build) sees broken JSON / broken source. The `pre-push` hook catches markers that reach the index, but unstaged-only corruption escapes it.

**Always run `git status` after `git stash pop`.** If it reports unmerged paths, resolve them before doing anything else.

### Pre-push hook

`scripts/git-hooks/pre-push` greps every commit being pushed for git conflict markers (`<{7} `, `={7}$`, `>{7} `) and aborts the push if any are found. Bypass only when intentional: `git push --no-verify`. The hook lives at `scripts/git-hooks/pre-push` and is symlinked into `.git/hooks/` by `scripts/install-hooks.sh`.

If you find yourself wanting to bypass it, the answer is almost always to fix the diff, not the hook.

---

## Key Numbers to Know

| Parameter | Value | Source |
|-----------|-------|--------|
| MC runs (website) | 10,000 | Blueprint §3.4 |
| MC runs (paper) | 100,000 | Blueprint §3.4 |
| Form window | last 8 matches | Blueprint §2.2 |
| Form cap | ±15% of Elo-implied λ | Blueprint §2.2 |
| Edge threshold (mainline) | 3% | Blueprint §4.3 |
| Edge threshold (derivative) | 5% | Blueprint §4.3 |
| Kelly fraction (mainline) | 1/4 | Blueprint §5.4 |
| Kelly fraction (longshot) | 1/8 | Blueprint §5.4 |
| Longshot threshold | <10% implied prob | Blueprint §5.4 |
| Per-market cap | 5% of bankroll | Blueprint §5.4 |
| Per-event cap | 8% of bankroll | Blueprint §5.4 |
| Drawdown stop | 20% from peak | Blueprint §5.4 |
| Polymarket volume floor | $50,000 (24h) | Blueprint §5.3 |
| Pinnacle staleness cap | 4 hours | Blueprint §5.3 |
| Price swing threshold | 3% in 30 min | Blueprint §5.2 |
| Exchange spread threshold | 2.5% | Blueprint §5.2 |
| DM test significance | α = 0.05 | Blueprint §6.3 |
| Macro contribution cap (top-30 Elo) | <10% posterior weight | Blueprint §2.4 |
| Macro contribution cap (first-timers) | up to 40% posterior weight | Blueprint §2.4 |

---

## Environment

- Python: 3.9.6 (already installed in `.venv`)
- All dependencies installed via: `pip install pandas numpy pyarrow scipy pydantic pydantic-settings pyyaml python-dotenv httpx requests beautifulsoup4 lxml rich structlog tqdm tenacity python-dateutil pytz statsmodels`
- Activate venv: `source .venv/bin/activate`
- Run any script from project root: `python ingestion/fetch_elo_ratings.py`
- The editable install (`pip install -e .`) will work now that `pyproject.toml` is fixed to `requires-python = ">=3.9"`

---

## Definition of Done

A task is complete when:
1. The script runs without errors from the project root
2. Output Parquet file exists in the correct path
3. Snapshot SHA is registered in `data/snapshots/snapshot_registry.jsonl`
4. A sample of rows validates against the relevant Pydantic schema
5. `log.success()` is called with the output path and row count
