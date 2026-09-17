# Pinnacle Ingestion Readiness Report

**Generated**: 2026-05-12 (lockdown sprint, Section 6)
**Owner**: The Architect (Opus session managed by Nicolás Duarte)
**Scope**: Verify that the existing Pinnacle ingestion pipeline (producer plus consumers) is wired to switch from synthetic to real data automatically when Pinnacle publishes 2026 World Cup lines.

This document is read-only operational guidance. It does not authorise any change to `data/raw/odds_pinnacle.parquet`, the consumer code (`market/devig.py`, `market/edge_calculator.py`, `market/market_pipeline.py`, `market/volatility_gate.py`, `ingestion/data_loader.py`), or the synthetic generation path. One minimal producer-side patch was applied in Section 6 itself and is documented in "Gaps identified" below.

---

## 1. Current state

`data/raw/odds_pinnacle.parquet` contains **624 synthetic rows** (104 fixtures times 3 outcomes times 2 line types) generated deterministically from Elo by `ingestion/fetch_odds_pinnacle.py::generate_synthetic` (line 323). Every row's `snapshot_id` is prefixed `syn_*` (counts: `{'syn': 624}`). Every row carries `bookmaker = "pinnacle"` and `market_type = "match_winner"`. No other market types are present on disk. `is_opening` and `is_closing` partition the rows 312 to 312 (each row is exactly one of the two; never both, never neither). All 104 canonical match IDs (M01 through M104, including knockout placeholders) appear, six rows per match.

The synthetic data exists by design: Pinnacle has not yet published WC 2026 lines (the producer's docstring at line 44 notes that 2026 lines typically open six to eight weeks before kickoff; T-31 is inside that window but still before publication). The producer is a three-tier cascade. Tier 1 is the Pinnacle commercial API (`PINNACLE_API_KEY`), Tier 2 is The Odds API public aggregator (`THE_ODDS_API_KEY`), Tier 3 is the synthetic fallback. With both API keys absent in `.env`, Tier 3 fires and produces the current file.

`data/raw/odds_polymarket.parquet` and `data/raw/odds_betfair.parquet` are independent and out of scope for this readiness check.

---

## 2. Switchover protocol

When Pinnacle publishes 2026 WC lines, the operator runs the producer in `auto` mode (or in either of the two real-data tiers explicitly). The producer detects real data, writes it to the canonical parquet path, and registers a new snapshot row. Consumers continue to read the same file and need no changes. The exact procedure:

### 2.1. Get an API key (one of the two)

Either of the following unblocks real-data ingestion:

1. **Pinnacle commercial API** (`PINNACLE_API_KEY`). Licensee-only. Higher fidelity (opening and closing tags, intra-period prices, full WC league coverage including knockout futures).
2. **The Odds API public aggregator** (`THE_ODDS_API_KEY`). Free tier at https://the-odds-api.com gives 500 requests per month. Surfaces Pinnacle's prices alongside other books; the producer filters on `bookmakers=pinnacle` so the `bookmaker` column stays canonical.

Add the chosen key to `.env` at the project root. Do not commit the key. `.env.example` shows the variable name.

### 2.2. Run the producer

```bash
# Auto (recommended): try Tier 1, fall through to Tier 2, fall through to synthetic.
python ingestion/fetch_odds_pinnacle.py --force --source auto
```

`--force` is recommended on the first real-data run because cached payloads at `data/raw/_odds_api_raw.json` and `data/raw/_odds_pinnacle_raw.json` would otherwise short-circuit the fetch. Without `--force`, the producer reads the cache on second-and-subsequent runs; with `--force`, it re-hits the API.

Alternative explicit invocations:

```bash
# Tier 1 only (Pinnacle commercial). Falls back to synthetic if it returns empty.
python ingestion/fetch_odds_pinnacle.py --force --source pinnacle

# Tier 2 only (Odds API). Falls back to synthetic if it returns empty.
python ingestion/fetch_odds_pinnacle.py --force --source oddsapi

# Force synthetic. Used in CI / dev when neither key is available.
python ingestion/fetch_odds_pinnacle.py --source synthetic
```

### 2.3. What the producer writes

The producer always writes to `data/raw/odds_pinnacle.parquet` and registers a `SnapshotRegistry` row in `data/snapshots/snapshot_registry.jsonl` with the notes field set to `fetch_odds_pinnacle:<source_label>`, where `<source_label>` is one of `live-pinnacle`, `live-oddsapi`, or `synthetic` (line 1040). The `data_label` is also logged at the success line so the operator can tell at a glance which tier produced the run.

### 2.4. What happens to the synthetic rows when real data lands

The parquet is **wholesale replaced** by a hard `to_parquet(OUTPUT_PARQUET, index=False, engine="pyarrow")` (line 1026). The synthetic rows are not retained as historical context inside the parquet itself; only the latest snapshot lives on disk. The synthetic snapshots' SHAs are persisted in `data/snapshots/snapshot_registry.jsonl` and can be cited there, but the rows themselves are gone after the next run.

This is a deliberate design choice (deterministic snapshot per run; downstream code joins on the latest snapshot only). If the project ever needs to retain synthetic rows alongside real rows for back-testing, the producer would need an append mode; that is **flagged as a future enhancement** in Section 5 of this report, not a blocker for switchover.

### 2.5. After the switchover

No downstream change is required. The consumers are agnostic to the snapshot_id prefix (verified in Section 4). The next forecast tick will read the new parquet, de-vig the real odds via `market/devig.py`, compute edges via `market/edge_calculator.py`, and apply the volatility gate via `market/volatility_gate.py`. The three blocked Athletic press extracts (`{carey,critchley,worville}_market_divergence.csv`) become regenerable; the regeneration script is `scripts/extract_athletic_press_cuts.py` (Section 4 of this lockdown), which today writes only the model-side files because Pinnacle data is synthetic.

---

## 3. Schema compatibility

The producer's three tiers each emit a row dict, then converge through `build_output()` (`ingestion/fetch_odds_pinnacle.py:855`) on a single canonical schema. The canonical schema is the only thing consumers see.

### 3.1. Canonical output schema

| Column | Dtype | Source line | Notes |
|---|---|---|---|
| `snapshot_id` | string | 860 | Per-row identifier. Prefix varies by tier (see 4.1). |
| `timestamp` | `datetime64[ns, UTC]` | 861 | Snapshot capture time (UTC). |
| `match_id` | string | 862 | Canonical M{NN} from `wc2026_fixtures.parquet`. |
| `bookmaker` | string | 863 | Always `"pinnacle"` (Tier 2 normalises Odds API's `pinnacle` key to this). |
| `market_type` | string | 864 | Currently only `"match_winner"`. Future markets enumerated below. |
| `outcome` | string | 865 | One of `home_win`, `draw`, `away_win`. |
| `decimal_odds` | float | 866 | Decimal-odds form (>1.0). |
| `is_opening` | bool | 867 | True for opening line, False otherwise. |
| `is_closing` | bool | 868 | True for closing line, False otherwise. |
| `last_refreshed` | `datetime64[ns, UTC]` | 869 | When the quote was last refreshed at source. |

### 3.2. Tier-by-tier schema parity (Q1)

| Tier | match_id format (pre-Section-6) | match_id format (post-Section-6) | snapshot_id format | Notes |
|---|---|---|---|---|
| Tier 1 (Pinnacle commercial) | `2026-06-11_United_States_Mexico` (legacy `_make_match_id`) | Canonical `M01` (via `_resolve_match_id`) | 8-char uuid hex | Section 6 patched `clean_and_enrich` to route Tier 1 through the shared fixture lookup. See "Gaps identified" 5.1. |
| Tier 2 (Odds API) | Canonical `M01` (via `_resolve_match_id`, line 657) | (unchanged) | `oa_{M01}_{ho}` | Already canonical. |
| Tier 3 (synthetic) | Canonical `M01` (read from `wc2026_fixtures.parquet`, line 356) | (unchanged) | `syn_{M01}_{ho}` (opening), `syn_{M01}_{ho}_c` (closing) | Already canonical. |

After the Section 6 patch, all three tiers emit canonical `M{NN}` match IDs. Schema parity is complete on every other column. The producer's docstring claim at line 8 ("The schema does NOT change between tiers") is now accurate for both column names AND match_id values.

### 3.3. Future markets (Q4)

The producer currently emits only `market_type = "match_winner"` regardless of tier. The Tier 1 fetch is hard-coded to period 0 moneyline (line 781, line 783). The Tier 2 fetch is hard-coded to `markets=h2h` (line 100). The synthetic generator only produces match_winner outcomes.

The consumer code is **ready for additional market types** before the producer is. Specifically:

* `market/edge_calculator.py:35-41` enumerates `MAINLINE_MARKET_CLASSES = {"1x2", "match_winner", "group_winner", "tournament_winner"}` and `DERIVATIVE_MARKET_CLASSES = {"over_under", "btts", "correct_score", "stage_of_elimination", "both_teams_score"}`. A row with any of these market_type values will pass through without code change; the threshold is selected automatically (3 pp mainline, 5 pp derivative).
* `market/devig.py` is market-agnostic. `devig()` accepts a `market_type` parameter but only uses `stage` to decide bias corrections (`market/devig.py:275-282`). Adding new market types requires no devig change.
* `market/market_pipeline.py:240` defaults `market_class` to `"1x2"`. New market types flow in via the per-market input dict, no code change needed.
* `ingestion/data_loader.py:323-324` filters by `market_type` if the column exists, otherwise returns all rows. The filter is opt-in via the `market_type` argument to `get_odds`; default is `"match_winner"`.

Adding new markets is therefore a **producer-side change only**. To unblock the three pending `*_market_divergence.csv` files (Carey, Critchley, Worville) and the Levine packet, the producer's fetch code needs new market-type calls. This is **flagged as a future enhancement** in Section 5 of this report; it is out of scope for the lockdown sprint.

---

## 4. Consumer-agnosticism verification

Each consumer has been read end to end. The summary table below shows what each one reads, whether it touches `snapshot_id` semantically (i.e. would behave differently for a `syn_*` row versus a `live_*` row), and the citation that confirms the answer.

| File | Reads odds parquet? | Filters on `snapshot_id` prefix? | Citation |
|---|---|---|---|
| `market/devig.py` | No (pure function on a list of odds) | No (does not see `snapshot_id`) | `market/devig.py:190-290` (function signature takes `odds: List[float]` and `book: str`, never the parquet) |
| `market/edge_calculator.py` | No (pure function on probability vectors) | No (does not see `snapshot_id`) | `market/edge_calculator.py:136-242` (function signature takes `p_model`, `q_devigged`, `market_class`) |
| `market/market_pipeline.py` | No (consumes pre-assembled `market_inputs: List[Dict]`) | No (does not see `snapshot_id`) | `market/market_pipeline.py:168-224` (`run_once` takes a list of dicts; the caller builds them from the parquet) |
| `market/volatility_gate.py` | No (pure function on `MarketSnapshot` dataclass) | No (does not see `snapshot_id`) | `market/volatility_gate.py:249-307` |
| `market/news_monitor.py` | No (independent) | N/A | `grep snapshot_id market/news_monitor.py` returns zero matches |
| `ingestion/data_loader.py` | Yes (`_load("odds_pinnacle")` reads the parquet via the canonical path) | No (filters by `bookmaker` and `market_type` only; does NOT filter by `snapshot_id`) | `ingestion/data_loader.py:297-333` |

Repo-wide audit for prefix discrimination:

```
$ grep -rn '"syn_"\|"syn_\|\bsyn_\b' --include="*.py" | \
    grep -v "\.venv\|ingestion/fetch_odds_pinnacle\.py"
(zero matches)
```

The only file in the codebase that ever writes a `syn_` string is the producer itself. No consumer hardcodes the prefix. **Q3 answer: yes, every consumer is fully agnostic to the snapshot_id prefix.** When real data lands with `oa_*` or 8-char uuid prefixes, every consumer continues to work without code change.

A second audit confirms the frontend has no prefix logic either:

```
$ grep -rnE 'syn_|snapshot_id' website/src --include="*.ts" --include="*.tsx" --include="*.mdx"
(matches are all generic display strings: <span className="mono">{meta.snapshot_id}</span>, etc.)
```

The frontend renders whatever `snapshot_id` the parquet supplies. No prefix-aware code paths.

---

## 5. Gaps identified

### 5.1. Fixed in Section 6: Tier 1 produced non-canonical match_ids

**Severity**: Switchover-blocking under `PINNACLE_API_KEY`. Real-data Tier 1 records would not have joined to fixtures, simulation outputs, or the website's match-by-match views.

**Pre-fix behaviour** (`ingestion/fetch_odds_pinnacle.py:820-848`, before this section): `clean_and_enrich` built `match_id` from `_make_match_id(date_str, home, away)`, producing strings like `"2026-06-11_United_States_Mexico"`. Tier 2 (Odds API) and Tier 3 (synthetic) both produce canonical `M{NN}` IDs via `_resolve_match_id` and direct fixture lookup respectively. Under `PINNACLE_API_KEY`, the producer would have written real records that no downstream join could resolve.

**Fix**: `clean_and_enrich` now routes Tier 1 through the same `_resolve_match_id` machinery Tier 2 uses (lines 832-857 post-patch). Rows that fail fixture resolution are logged with a diagnostic legacy id and dropped, consistent with Tier 2's drop-on-miss convention (line 706). The legacy `_make_match_id` is retained as a diagnostic helper called only inside the warning log; it no longer assigns `match_id` values to the output.

**Scope check**: `clean_and_enrich` is invoked at exactly two call sites, both Tier 1 only (`ingestion/fetch_odds_pinnacle.py:947, 1001`). The synthetic path (`generate_synthetic` at line 323) does not pass through this function. The Tier 2 path (`fetch_via_odds_api` at line 560) does not pass through this function. Schema and behaviour against synthetic data are unchanged.

**Verification**: synthetic regeneration via the in-process smoke test produces 624 rows with the canonical schema and `syn_M01_aw_c`-style snapshot_ids unchanged. `data/raw/odds_pinnacle.parquet` was not touched; its sha256 remains `e257762eb87306ee329181d3899d5efa3931243ad43d9979310ddd2b3e1e78b6`.

**Post-fix `ingestion/fetch_odds_pinnacle.py` sha256**: `7f1009d9f7ddd8d8e789348309079c5698b794c223cda04d722456a6274a64cb`.
**Pre-fix sha256**: `090a29870aa5411a314d69b5a64e6662e9e0aba9e50ad49a9ac0f5672a273b10`.

### 5.2. Flagged for future: additional market types

**Severity**: Blocks the three `*_market_divergence.csv` press extracts (Carey, Critchley, Worville) and the Levine packet. Does not block tomorrow's marketing resumption; the press extracts that do not depend on Pinnacle are already shipping.

The producer currently emits `market_type = "match_winner"` only. Real-data feeds (both Pinnacle commercial and Odds API) expose at minimum `tournament_winner`, `group_winner`, `over_under_2.5`, and `btts` markets when WC 2026 markets open. Adding fetch code for each is a producer-side change of roughly an hour per market type, plus integration testing against the consumer code (which is already prepared per Section 3.3).

**Recommended next steps**:

1. In `ingestion/fetch_odds_pinnacle.py`, generalise the Tier 1 fetch loop (lines 780-807) to iterate over a configured list of `period.number` and `period.moneyLine`/`period.spread`/`period.total` keys.
2. In the same file, generalise the Tier 2 fetch (lines 596-606) to call `/sports/{sport}/odds?markets=h2h,totals,outrights,...`.
3. Extend the synthetic generator (lines 323-433) with new outcome enumerations (`p_over_2.5`, `p_under_2.5`, etc.) computed from the same Elo-derived match-strength prior.
4. Update the producer's docstring at line 8 to note the supported market types and any tier-specific gaps.

None of these are required to switch from synthetic to real `match_winner` data tomorrow. They are required only to populate the three `*_market_divergence.csv` files.

### 5.3. Flagged for future: parquet replacement vs. append-only history

**Severity**: Cosmetic for the live tournament; historically significant only if a forensic review wants to step through the synthetic-to-real transition row by row.

The producer's `run()` hard-overwrites the parquet at line 1026. Synthetic rows are gone the moment real data lands. The snapshot registry (`data/snapshots/snapshot_registry.jsonl`) preserves the sha256 of every prior snapshot, so the transition is reconstructible from the registry plus version control, but the parquet itself is single-snapshot.

If the project ever needs append-only odds (each tier's writes layered on top with a `tier` or `source` column), the producer would need rewriting. This is a design question, not a bug; flagged for future discussion only.

---

## 6. Files affected by future Pinnacle release

When Pinnacle publishes 2026 lines and the switchover protocol runs, the following files are touched or receive new data:

* `data/raw/odds_pinnacle.parquet`: overwritten with real-data rows (Tier 1 or Tier 2 source label).
* `data/snapshots/snapshot_registry.jsonl`: appended with a `fetch_odds_pinnacle:live-pinnacle` or `:live-oddsapi` row.
* `data/raw/_odds_pinnacle_raw.json` or `data/raw/_odds_api_raw.json`: written as a producer-side cache for the response body. Safe to delete between runs.
* `logs/pipeline.log`: appended with the producer's structured logging.

No code file needs modification at switchover. No consumer file is touched.

After the switchover, the following downstream artifacts become regenerable (currently blocked on synthetic data):

* `press_packets/athletic_carey/brazil_market_divergence.csv` (Carey packet).
* `press_packets/athletic_critchley/argentina_market_divergence.csv` (Critchley packet).
* `press_packets/athletic_worville/england_market_divergence.csv` (Worville packet).
* The Levine packet's full market-efficiency content (`press_packets/levine/`).
* The Calibration Challenge artifact's 30 most market-divergent matches list.

Regeneration runs `scripts/extract_athletic_press_cuts.py` after Pinnacle data lands. The script's market_divergence functions need to be added (they are currently absent because the architect did not want to write code against synthetic data); that is a Section-6-adjacent enhancement, not part of the switchover protocol itself.

---

## 7. Verification protocol

A reviewer can confirm the pipeline's current state and readiness in under five minutes by running the following snippet from the project root with the project's `.venv` activated. It reads the parquet, surfaces the prefix counts and unique market types, exercises `devig` against the latest synthetic snapshot, and confirms `DataLoader.get_odds` returns rows with non-NaN values.

```bash
.venv/bin/python <<'PY'
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').resolve()))

import pandas as pd
from ingestion.data_loader import DataLoader
from market.devig import devig

# 1. Inspect the on-disk parquet.
df = pd.read_parquet('data/raw/odds_pinnacle.parquet')
print(f"rows={len(df)}  cols={df.columns.tolist()}")
print(f"market_type={sorted(df.market_type.unique().tolist())}")
print(f"snapshot_id prefixes={df.snapshot_id.str.split('_').str[0].value_counts().to_dict()}")
print(f"bookmaker={sorted(df.bookmaker.unique().tolist())}")

# 2. Loader path: surfaces the parquet through the unified interface.
loader = DataLoader()
odds = loader.get_odds('pinnacle', 'match_winner')
assert not odds.empty, "DataLoader returned empty odds"
assert odds.decimal_odds.notna().all(), "Some decimal_odds are NaN"
print(f"loader rows={len(odds)}  matches={odds.match_id.nunique()}")

# 3. De-vig the latest snapshot for one match.
sample_match = odds.match_id.iloc[0]
sample = odds[(odds.match_id == sample_match) & (odds.is_closing)].copy()
sample = sample.sort_values('outcome')  # away_win, draw, home_win
labels = sample.outcome.tolist()
prices = sample.decimal_odds.tolist()
result = devig(prices, book='pinnacle', market_type='match_winner', stage='group', outcome_labels=labels)
print(f"sample match={sample_match}  labels={labels}  prices={prices}")
print(f"devig q={[round(x,4) for x in result.q]}  z={result.z:.4f}  overround={result.overround:.4f}")
assert all(0.0 < q < 1.0 for q in result.q), "De-vigged probabilities out of range"
assert abs(sum(result.q) - 1.0) < 1e-6, "De-vigged probabilities do not sum to 1"
print("OK: pipeline reads parquet, surfaces it via DataLoader, and de-vigs cleanly.")
PY
```

Expected output today (synthetic data):

```
rows=624  cols=['snapshot_id', 'timestamp', 'match_id', 'bookmaker', 'market_type', 'outcome', 'decimal_odds', 'is_opening', 'is_closing', 'last_refreshed']
market_type=['match_winner']
snapshot_id prefixes={'syn': 624}
bookmaker=['pinnacle']
loader rows=624  matches=104
sample match=M01  labels=['away_win', 'draw', 'home_win']  prices=[<three decimal odds>]
devig q=[...]  z=<value>  overround=<value between 0.04 and 0.05>
OK: pipeline reads parquet, surfaces it via DataLoader, and de-vigs cleanly.
```

Expected output after switchover (real data, identical structure with new prefix):

```
rows=<varies>  cols=[<same canonical columns>]
market_type=['match_winner']  (or more, once future-markets enhancement lands)
snapshot_id prefixes={'oa': <rows>}  or  {'<8-char-uuid>': <rows>}  or a mix during transition
bookmaker=['pinnacle']
loader rows=<varies>  matches=<varies, but all canonical M{NN}>
sample match=M{NN}  labels=...  prices=...
devig q=[...]  z=<value>  overround=<value, typically 0.02 to 0.05 for Pinnacle>
OK: pipeline reads parquet, surfaces it via DataLoader, and de-vigs cleanly.
```

The "OK" line is the pass condition. Any earlier `assert` failure is a hard halt; produce a report and stop.

---

## 8. "What-if" code-review trace

A walkthrough of one record from producer through to the volatility gate, both for the current synthetic case and for the post-switchover real-data case. Every step is the same in both cases except where explicitly noted.

1. **Producer fires**. Operator runs `python ingestion/fetch_odds_pinnacle.py --force --source auto`. The orchestrator at `run()` (line 979) calls `fetch_real_odds()` (line 931).

   * **Synthetic (today)**: Tier 1 returns empty (no `PINNACLE_API_KEY`). Tier 2 returns empty (no `THE_ODDS_API_KEY`). `fetch_real_odds()` returns `(empty_df, "empty")` at line 962. Control flows to the synthetic fallback at line 1016. `generate_synthetic()` produces 624 rows with `syn_*` snapshot_ids and canonical `M{NN}` match_ids.
   * **Post-switchover (real)**: Tier 1 returns N records (or Tier 2 returns M records). `clean_and_enrich` (Tier 1 only, post-Section-6 patch) resolves each record's canonical `M{NN}` match_id via `_resolve_match_id`. Rows that fail resolution are dropped with a warning. `build_output` selects the canonical columns and writes the parquet.

2. **Parquet written**. Both cases write to `data/raw/odds_pinnacle.parquet`. Schema is identical; only `snapshot_id` prefix and `bookmaker`-column value (synthetic always `"pinnacle"`; Tier 2 normalises Odds API's `pinnacle` key to `"pinnacle"`; Tier 1 always `"pinnacle"`) differ in trivia. The match_ids and outcome enumeration are identical in both cases.

3. **Snapshot registered**. `SnapshotRegistry.register` appends a row to `data/snapshots/snapshot_registry.jsonl` with notes `fetch_odds_pinnacle:synthetic` (today) or `fetch_odds_pinnacle:live-pinnacle` / `:live-oddsapi` (after switchover).

4. **Consumer reads the parquet**. The orchestrator that wires odds into `MarketPipeline.run_once` (the future production tick runner; today exercised only by the stress tests under `stress_tests/stress_test_*.py`) calls `DataLoader.get_odds("pinnacle", "match_winner")` (`ingestion/data_loader.py:297`). The loader filters by `bookmaker == "pinnacle"` and `market_type == "match_winner"`. **It does not filter by `snapshot_id` prefix**. Both synthetic and real rows surface identically.

5. **Latest-snapshot selection**. The orchestrator's per-tick assembly logic groups rows by `(match_id, outcome)` and selects the most recent quote (typically the row with the largest `last_refreshed` or, in synthetic data, the `is_closing == True` row). This selection is timestamp-based, not prefix-based. Same logic for synthetic and real.

6. **De-vig**. `market/devig.py::devig` (line 190) consumes the three decimal odds, the `book` label (`"pinnacle"`), the `market_type` (`"match_winner"`), and the `stage` (`"group"` or one of the knockout-stage labels). It solves `Σ r_i^z − 1 = 0` via Brent's method and returns `q_devigged`. The function is identical for synthetic and real inputs; the differences would be in the input numbers' precision (synthetic rounded to 2 d.p. per Pinnacle convention; real also 2 d.p. per Pinnacle's quote format).

7. **Edge metric**. `market/edge_calculator.py::calculate_edge` (line 136) computes `E_i = p_model − q_devigged` per outcome and flags `|E_i| > threshold`. Threshold is 0.03 (mainline `match_winner` is in `MAINLINE_MARKET_CLASSES` at line 35). Same logic for synthetic and real. Today, against synthetic data, the resulting edges are dominated by the Elo agreement between synthetic odds and M2 (both derive from related Elo signal), so flags are sparse; against real data, the flag density depends on actual market mispricing.

8. **Volatility gate**. `market/volatility_gate.py::apply_gate` (line 249) reads `MarketSnapshot` fields (`pinnacle_q_now`, `pinnacle_q_30min_ago`, `betfair_q`, `polymarket_volume_24h_usd`, `pinnacle_last_updated`). Today, most of these are `None` because the synthetic dataset is a single snapshot with no 30-minute history; gate rules 2, 4, and 5 default to "no suppression" when their inputs are `None` (lines 162-163, 207-208, 226-227). Rule 3 (cross-book spread) fires only if `betfair_q` is available; today it usually is not. After switchover, the orchestrator populates these fields from the same `data/raw/odds_pinnacle.parquet` (history rows, time-bucketed) plus `odds_betfair.parquet` and `odds_polymarket.parquet`. The gate logic is unchanged; only its input availability improves.

9. **Pipeline writes a forecast row**. `market/market_pipeline.py::_process_market` (line 230) assembles a `ForecastLogRow` (Pydantic-validated) and appends it to `data/snapshots/forecast_log.jsonl`. Append-only, no prefix-aware logic. The row's `recommended_stake_fraction` is the Kelly-sized stake (zero if the gate suppressed the flag).

10. **Frontend reads**. The Next.js site reads from prerendered Parquet snapshots (or from API routes that wrap them) and renders `snapshot_id` as a display string. No prefix filtering. The terminal, the match pages, and the divergence table all surface whichever `snapshot_id` the parquet supplied.

At no step does the synthetic-versus-real distinction change behaviour. The pipeline is wired correctly; the synthetic fallback is invisible to the consumer code by design.

---

## 9. Summary

The Pinnacle ingestion pipeline is **ready for switchover** with the following caveats:

* The Tier 1 (Pinnacle commercial API) match_id normalisation gap was fixed in Section 6 (Gap 5.1). The producer is now schema-consistent across all three tiers.
* The producer fetches `match_winner` only. The four additional market types needed for the press extracts are flagged as a follow-up (Gap 5.2). This does not block the lockdown sprint's marketing resumption tomorrow.
* The parquet is wholesale-replaced on every run (Gap 5.3). Historical snapshots live in the snapshot registry, not in the parquet.

The switchover protocol in Section 2 is runnable today. The verification snippet in Section 7 is runnable today and exits clean.

Operator instruction for switchover day: add the chosen API key to `.env`, run `python ingestion/fetch_odds_pinnacle.py --force --source auto`, verify the run's `data_label` in the success log line is `live-pinnacle` or `live-oddsapi` (not `synthetic`), and re-run `scripts/extract_athletic_press_cuts.py` once the producer is generalised for additional market types (Gap 5.2).
