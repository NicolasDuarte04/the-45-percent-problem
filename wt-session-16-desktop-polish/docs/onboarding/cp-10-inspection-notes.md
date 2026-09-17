# cp-10 MC group-stage settled-result conditioning. Inspection notes

Stage 1 deliverable for `cp-10-mc-group-conditioning`. Diagnostic §3.1 names this as the load-bearing live-readiness fix: the Monte Carlo simulator does not condition on settled results, so on June 12 the bracket will still show Mexico at 92% group survival even after a 0-3 opening-match loss. This file captures the end-to-end data flow today, identifies the single root-cause gap (the fixture loader drops `match_id`), evaluates three implementation paths, and recommends one. STOP gate at the bottom. Nicolás reviews before Stage 2.

**Branch state.** `cp-10-mc-group-conditioning` is off `main` at `593b47f` (the cp-09 merge). One commit on the branch so far: `6557062 chore(docs): import architecture diagnostic 2026-06-01`, placing the diagnostic at `docs/audit/architecture-diagnostic-2026-06-01.md` per Nicolás's request. Working tree otherwise clean.

**Architectural decisions already taken** (from Nicolás, re Q1 of the diagnostic §7):
- Re-batch the full 10k MC on a settled-count change. No reweighting. Q2 (bracket revalidation), Q3 (bracket.json backfill, shipped), Q4 (M0 cleanup), Q5 (Volatility Gate) are out of scope for cp-10.

---

## 1. Data flow today

Tracing one group match end-to-end, from the database back through to the snapshot.

```
website match_outcomes (Postgres)         data/raw/wc2026_fixtures.parquet
  match_id      "M01"                       match_id   "M01"
  stage         "group"                     stage      "Group Stage"
  home_team     "MEX"  (FIFA code)          group      "A"
  away_team     "RSA"  (FIFA code)          team_home  "Mexico"   (full name)
  home_goals    0                           team_away  "South Africa"
  away_goals    3                           kickoff_utc, venue, city, country, is_neutral
  settled_at, entered_at, ...
                                         (canonical 104-row schedule, M01..M104)

         │                                            │
         │ (no Python loader today; cp-09 only        │ pd.read_parquet(...)
         │  reads COUNT(*), not full rows)            │ filter stage == "Group Stage"
         ▼                                            ▼
  (cp-10 must build this loader)         _load_wc2026_fixtures()  ← monte_carlo_runner.py:142
                                          returns dict[group → list[(team_home, team_away)]]
                                          *** DROPS match_id ***
                                                      │
                                                      ▼
                                          MonteCarloRunner.run_one()  ← :245-273
                                            for group in self._groups:
                                              for match_num, (home, away) in enumerate(fixtures, 1):
                                                lam_h, lam_a = sp.get_lambdas(home, away, "group")
                                                h, a = mm.sample_scoreline(lam_h, lam_a)    ← always sampled
                                                MatchResult(home, away, h, a)
                                                match_rows.append({
                                                  "match_id": f"G-{group}-{match_num}",     ← synthesized inline
                                                  "phase": "group", "winner": None, ...
                                                })
                                                      │
                                                      ▼
                                            (10k runs) → team_runs_M2.parquet,
                                                         match_runs_M2.parquet
                                                      │
                                                      ▼
                                            regenerate_snapshot_from_batch.py
                                                      │
                                                      ▼
                                            website/public/data/latest/tournament.json
```

The MC's match_id (`G-A-1`) and the canonical id (`M01`) never meet. The settled set in `match_outcomes` is keyed by the canonical id and is invisible to the MC.

### 1.1 MC group-stage loop. `simulation/monte_carlo_runner.py:245-273`

- `self._group_fixtures.get(group, [])` returns `list[(home, away)]` of full team names (e.g. `("Mexico", "South Africa")`). The `group` key is a single uppercase letter `"A".."L"`.
- `sample_scoreline(lam_h, lam_a)` returns `(int, int)` for `(home_goals, away_goals)`.
- `MatchResult` (imported from `simulation.bracket_encoder:206`) is a `@dataclass` with fields `home, away, home_goals, away_goals` plus computed `home_points` and `away_points`. **No `settled` field** and per the prompt none is needed there.
- `match_rows` group-stage shape (lines 255-272): `{run_idx, model_id, data_hash, seed, code_sha, timestamp_utc, match_id, phase: "group", team_home, team_away, lambda_home, lambda_away, reg_home_goals, reg_away_goals, went_to_ET: False, et_*: None, went_to_pens: False, pen_*: None, winner: None}`.

### 1.2 Fixture loader. `simulation/monte_carlo_runner.py:142-155`

```python
def _load_wc2026_fixtures() -> dict[str, list[tuple[str, str]]]:
    parquet_path = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
    df = pd.read_parquet(parquet_path)
    group_df = df[df["stage"] == "Group Stage"]
    fixtures: dict[str, list[tuple[str, str]]] = {}
    for _, row in group_df.iterrows():
        g = row["group"]
        fixtures.setdefault(g, []).append((row["team_home"], row["team_away"]))
    return fixtures
```

`row["match_id"]` is in the iterator but never read. The synthesized `G-{group}-{match_num}` downstream is an accident of inline f-string construction, not a deliberate id contract.

### 1.3 Fixtures parquet. `data/raw/wc2026_fixtures.parquet`

| column | type | sample |
|---|---|---|
| `match_id` | string | `"M01" ... "M104"` |
| `kickoff_utc` | timestamp(tz=UTC) | `2026-06-11 19:00:00+00:00` |
| `stage` | string | `"Group Stage" \| "Round of 32" \| "Round of 16" \| "Quarter-final" \| "Semi-final" \| "Third Place" \| "Final"` |
| `group` | string | `"A".."L"` (group stage only) |
| `team_home`, `team_away` | string | **full names**, e.g. `"Mexico"`, `"South Africa"` |
| `venue`, `city`, `country` | string | venue metadata |
| `is_neutral` | bool | always `True` for 2026 |

Row count: 104 (72 group stage M01-M72, 16 R32 M73-M88, 8 R16 M89-M96, 4 QF M97-M100, 2 SF M101-M102, 1 third-place M103, 1 final M104).

Group A example (the Mexico group): M01 `Mexico vs South Africa`, M02 `South Korea vs Czechia`, M25 `Mexico vs South Korea`, M26 `Czechia vs South Africa`, M49 `Mexico vs Czechia`, M50 `South Africa vs South Korea`.

The iteration order matters for the current MC's `match_num`: the parquet is ordered by `match_id`, so `df.iterrows()` filtered to Group Stage yields Group A rows in order [M01, M02, M25, M26, M49, M50]. Today's MC therefore maps `G-A-1 → M01, G-A-2 → M02, G-A-3 → M25, G-A-4 → M26, G-A-5 → M49, G-A-6 → M50`. This bijection is stable on the current parquet but is *not* the round-robin order a reader would expect (which would be by kickoff round, not raw match_id index). Either way the cp-10 fix removes the synthesized id, so this is just useful context for understanding what was true before.

### 1.4 `match_outcomes` table. `website/src/lib/db/schema.ts:268-299`

```sql
match_outcomes (
  match_id          text PRIMARY KEY,        -- "M01", "R32_M1" per schema comment
                                             -- (live ingestion in practice writes M01-M104,
                                             --  inherited from fixtures.match_id; the
                                             --  "R32_M1" example in the comment is aspirational)
  competition       text     NOT NULL,
  stage             text     NOT NULL,       -- enum "group" | "r32" | "r16" | "qf" | "sf" | "final"
  home_team         varchar(3) NOT NULL,     -- FIFA 3-letter codes, NOT full names
  away_team         varchar(3) NOT NULL,     -- "MEX", "RSA", "KOR", "CZE", "ARG", ...
  home_goals        integer   NOT NULL,
  away_goals        integer   NOT NULL,
  shootout_winner   varchar(3),              -- knockout only; null for group
  settled_at        timestamptz NOT NULL,
  entered_at        timestamptz NOT NULL DEFAULT now(),
  entered_by        text     NOT NULL,       -- "brief-dispatch" | "ingest"
  meta              jsonb DEFAULT '{}'::jsonb
)
indexes: (stage), (settled_at)
check:   home_goals >= 0 AND away_goals >= 0
```

Two write paths (see `website/CLAUDE.md`):
- **Live ingestion (hourly):** `ingestion/fetch_match_outcomes.py` pulls from Football-Data.org, maps team names via `DISPLAY_NAME_TO_FIFA`, POSTs to `/api/ingest/match-outcomes`. Active only inside the WC window (June 11 to July 19 + 3-day buffer).
- **Admin fallback:** `/api/admin/match-outcomes`, bearer-authed via `BRIEF_DISPATCH_TOKEN`, single outcome per call.

Both paths upsert by `match_id`. The fixtures parquet's `match_id` is the keying contract on both sides - there is **no Football-Data.org ID stored** and no translator needed. cp-10's settled-results loader can key directly off `match_outcomes.match_id` and find the matching row in the fixtures parquet trivially.

The `home_team`/`away_team` columns store FIFA codes (`"MEX"`), while the fixtures parquet uses full names (`"Mexico"`). cp-10 must NOT use `match_outcomes.home_team` as the `MatchResult.home` field - the MC's strength provider is keyed by full name. The right pattern is: key the settled-results dict by `match_id` and pull `home/away` names from the fixtures parquet when building each `MatchResult`. The DB row only supplies `home_goals`/`away_goals`/`stage`.

### 1.5 cp-09 settled-count load path. `scripts/regenerate_snapshot_from_batch.py:236-315`

cp-09 introduced a two-tier loader for `COUNT(*)`-style queries. The precedence is exactly what cp-10 should reuse:

1. **Parquet-first.** `data/processed/match_outcomes.parquet` (env override `MATCH_OUTCOMES_PARQUET`). Returns `None` if absent; reads `match_id` column otherwise. Today's tree has **no parquet on disk** - a future ingestion shim is expected to export it.
2. **Postgres fallback.** `DATABASE_URL` or `POSTGRES_URL`; tries `psycopg` v3, falls back to `psycopg2`; runs `SELECT COUNT(*) FROM match_outcomes`. Failures (missing driver, missing URL, query error) print a warning and return `None` rather than raising - by design, so a missing DB connection in CI never crashes the nightly snapshot.
3. **Default 0.** Source label `"default:pre_tournament"`.

The returned tuple is `(settled_count, source_label)`, where `source_label` is written into `snapshot_meta.notes` for traceability. cp-10's `load_settled_results()` extends the same precedence to load *full rows* (match_id, home_goals, away_goals, stage) rather than just COUNT.

### 1.6 `active_batch.json`. `data/calibration/active_batch.json`

Current fields:

```json
{
  "schema_version": "1.0",
  "active_batch_id": "batch_20260512_013228Z",
  "active_batch_path": "outputs/phase5/batches/batch_20260512_013228Z",
  "activated_at_utc": "2026-05-12T01:33:11Z",
  "matrix_sha256_run": "...",
  "matrix_sha256_lock": "...",
  "prior_active_batch_id": "batch_20260511_140718Z",
  "prior_active_batch_path": "outputs/phase5/batches/...",
  "supersession_reason": "Amendment v1.1 ...",
  "amendment_pointer": "osf/amendments/amendment_v1.1_data_completeness.md"
}
```

Missing: anything that ties the batch to a specific settled-results snapshot. cp-10 adds `settled_count_at_batch_time` and `settled_source` (the cp-09 source label) so the regenerate script can detect "settled set has changed since the active batch was produced".

### 1.7 `batch_runner._build_runner()`. `simulation/batch_runner.py:172-252`

Constructs the runner once per variant per batch invocation: loads Elo, fits the model, instantiates the strength provider, builds `MatchModel`, `ShootoutModel`, `BracketEncoder`, then `MonteCarloRunner(match_model, shootout_model, bracket_encoder, strength_provider, code_sha, tournament_variant)`. The 10k runs all share this single runner instance via `_run_one_safe()`. So the settled-results dict is loaded once per batch invocation (not per run), threaded into `_build_runner()`, and passed to `MonteCarloRunner.__init__`.

### 1.8 Downstream consumers of the synthesized `G-A-1` match_id

Grep across `scripts/`, `simulation/`, `evaluation/`, `website/`, `tests/`, `ingestion/`, `models/` for the patterns `"G-[A-L]-"`, `f"G-{`, `"G-A-"`, etc.:

- **Zero matches** anywhere in production code. The synthesized id is written into the match_runs parquet but never filtered or joined on. Downstream consumers (`regenerate_snapshot_from_batch.py`, `extract_athletic_press_cuts.py`) filter on `phase` or `team_home`/`team_away`, not on `match_id`.
- One **documentation** reference: a schema table in `website/.next/server/app/vault/simulation*` (rendered from a vault MDX page) lists `match_id` example as `"G-A-1, KO-R32-1"`. This is a doc string only; updating it is a one-line edit.

Implication: switching the MC's match_id format to the canonical M01-M104 has effectively zero downstream-code churn.

---

## 2. Match-ID mapping table

| Source | Format | Where | Notes |
|---|---|---|---|
| Football-Data.org match_id | int / opaque | NOT stored anywhere | The ingestion script consumes it transiently and discards it. No upstream → canonical translator needed. |
| `match_outcomes.match_id` | `M01..M104` text PK | Postgres + future `data/processed/match_outcomes.parquet` export | Set by `fetch_match_outcomes.py`, inherited from fixtures parquet. Schema comment says "e.g. M01, R32_M1" but `R32_M1` style is aspirational - live ingestion writes M-prefix for both group and knockout. |
| `wc2026_fixtures.match_id` | `M01..M104` text | `data/raw/wc2026_fixtures.parquet` | Canonical. The source of truth that everything else inherits. |
| MC group-stage `match_id` | `G-{group}-{match_num}` (e.g. `G-A-1`) | inline f-string at `monte_carlo_runner.py:257`, written into `match_runs_M2.parquet` | **Drift.** Synthesized at write time; never aligned with the canonical id. |
| MC knockout `match_id` | `KO-{round}-{n}` (e.g. `KO-R32-1`, `KO-3rd-1`, `KO-Final-1`) | `monte_carlo_runner.py:377, 442, 501` | Also synthesized, also drifts. Knockout conditioning is explicitly out of cp-10 scope so this is a follow-up concern. |

**Gap:** the MC's synthesized group format `G-A-1` does not align with the canonical `M01`. That's the entire reason the conditioning wasn't trivial to retrofit. cp-10 closes the gap by carrying the canonical `match_id` through the fixture loader and writing it directly into `match_rows.match_id`.

**Non-gap:** there is no upstream Football-Data.org ID problem to bridge. Both the ingest path and the fixtures parquet agree on M01-M104.

---

## 3. Implementation options

### Option A - Adopt M01-M104 as canonical match_id throughout the MC (RECOMMENDED)

Modify `_load_wc2026_fixtures()` to return `dict[group → list[(match_id, home, away)]]`. The group-stage loop iterates `(match_id, home, away)` tuples directly, uses `match_id` for the `settled_results` lookup, and writes the canonical `match_id` into `match_rows`. Add a settled-results loader (parquet + Postgres precedence, reusing cp-09's pattern) that returns `dict[match_id → (home_goals, away_goals)]`, filtered to `stage == "group"`. Thread it through `batch_runner._build_runner()` and `MonteCarloRunner.__init__`.

**Pros:**
- Single source of truth. The canonical id flows end-to-end. No translator to maintain.
- Cleanest long-term: when the knockout follow-up checkpoint lands (post-June-11), the same pattern extends to M73-M104 with one more loader filter; no second-system drift to clean up first.
- Zero downstream code churn (per §1.8 grep). The only non-MC edit is the vault schema doc.
- Naturally produces the `settled: bool` provenance field on `match_rows` because the lookup is local to the group-stage loop.

**Cons:**
- `match_runs.match_id` values change from `G-A-1` to `M01` in every future batch. Existing batches on disk keep their old format (parquets are immutable). Any local notebook joining future batches to historical ones on `match_id` would break - but the §1.8 grep found no such consumer, so this is theoretical.
- One vault MDX page needs the example string updated.

**Touch list:**
- `simulation/monte_carlo_runner.py`: `_load_wc2026_fixtures()` (return shape change), `__init__` (accept `settled_results`), group-stage loop (use M-format match_id, branch on settled vs sampled), `match_rows.append({...settled: True/False})`.
- `simulation/batch_runner.py`: `_build_runner()` calls a new `simulation/load_settled.py::load_settled_results()` and passes the result into `MonteCarloRunner(...)`.
- `simulation/load_settled.py` (new): parquet/Postgres precedence loader, filtered to `stage == 'group'` per the cp-10 scope cut. Returns `dict[match_id → MatchResult]` constructed from match_id + (home_goals, away_goals) + (home, away) read from the fixtures parquet.
- `scripts/regenerate_snapshot_from_batch.py`: detect settled-count delta, re-batch when changed, stamp `settled_count_at_batch_time` and `settled_source` into `active_batch.json`. Reuse cp-09's `_count_settled_matches()` for the delta check.
- One vault MDX page for the schema example.
- Tests: `tests/scripts/test_settled_conditioning.py` (acceptance + directional).

### Option B - Translator in `batch_runner.py`

Keep MC's `G-A-1` format intact. Build a translator that, given the fixtures parquet, constructs the bijection `{M01: ("A", 1), M02: ("A", 2), M25: ("A", 3), ...}`. `batch_runner` loads settled results from `match_outcomes` keyed by M-format, translates to MC-format using the bijection, then passes a `dict[G-A-1 → MatchResult]` to the runner.

**Pros:**
- Smallest possible diff to `monte_carlo_runner.py`. Only `__init__` and the loop change; the fixture loader stays as-is.
- `match_runs.match_id` values stay stable across batches.

**Cons:**
- A translator that can drift. If the fixtures parquet ever re-orders rows (e.g. a CONCACAF schedule change), the synthesized `G-A-N` indices shift but the M-format does not, and any cached settled-results dict computed against the old bijection silently mismatches.
- Inverts the semantics: the canonical M-format becomes "the foreign id" inside the MC, even though everywhere else in the system it is the source of truth.
- Doesn't help the knockout follow-up. cp-10's successor will have to either repeat the same translator pattern for `KO-R32-1` → `M73` or do Option A then, after Option B has been the production path for weeks. That's two refactors when one would do.

### Option C - Skip the database; ingestion writes directly to parquet

The cp-10 prompt lists this for completeness. It would replace `/api/ingest/match-outcomes` with a "GitHub Action writes directly to a parquet" path keyed by M01-M104, and the MC reads from there. This decouples the pipeline from the website DB.

**Pros:**
- Decouples pipeline from website DB.

**Cons:**
- Bigger architectural change. The website still needs `match_outcomes` for the predictions evaluator (Reality-Score, prediction-state log). So this isn't a removal - it adds a second source. Over-engineering for cp-10.

### Recommendation: Option A

Option A is the cleanest path with the lowest risk *and* the smallest total diff once the vault doc edit is counted. The §1.8 grep eliminates the only theoretical drawback of Option A (downstream churn) and makes Option B's stability argument moot. Option A also positions the knockout follow-up to be a small, local change rather than a second migration. **Recommend Option A.**

---

## 4. Re-batch trigger strategy

Two flavors of "re-batch full 10k MC" (the Q1-resolved approach):

### Trigger A - Always re-batch on every nightly cron

Defensible: every snapshot is fresh, nothing can go stale. But the cp-10 prompt itself notes 10k runs ≈ 35 seconds compute plus IO; on the GitHub Actions runner that's likely a few minutes total. Defensible but wasteful on days when `match_outcomes` is unchanged.

### Trigger B - Re-batch only when settled_count has changed (RECOMMENDED)

Stamp `settled_count_at_batch_time` into `active_batch.json`. The nightly `regenerate_snapshot_from_batch.py` compares against the current count from `_count_settled_matches()`. If the count is unchanged, re-aggregate from the existing active batch (cp-09's current behavior - fast, deterministic, identical output). If changed, invoke `batch_runner.py` to produce a fresh batch with the new settled set, update `active_batch.json`, then re-aggregate.

**Pros:**
- Cheaper. Most nights during the WC will have a delta only once or twice (the day's matches close); during the long pre-tournament period and quiet inter-day stretches no re-batch happens.
- The stale-batch check is explicit and auditable - it's just an integer compare.

**Cons:**
- One additional source of "did this snapshot reflect today's results?" complexity. Mitigation: the source label and `settled_count_at_batch_time` are stamped in `snapshot_meta.notes` so the answer is in the JSON.

**Edge case to handle:** `settled_count` going *down* (e.g. an admin retracts an erroneously-entered outcome). Should re-batch in that case too. The condition is `current_settled_count != settled_count_at_batch_time`, not `>` - easy to get right, easy to get subtly wrong.

**Recommendation: Trigger B (re-batch only when settled_count has changed).** Document the alternative (Trigger A - always re-batch) in the PR description; if Nicolás prefers the defensible-always-fresh flavor, that's a one-line code change later.

---

## 5. `active_batch.json` lifecycle

The current schema (§1.6) already supports per-batch directories - every new batch is its own directory under `outputs/phase5/batches/<batch_id>/`, and `active_batch.json` is a pointer that gets updated on supersession (per Amendment v1.1's pattern, which left `prior_active_batch_id` populated for audit).

cp-10 adds two fields:

```json
{
  "schema_version": "1.1",
  "active_batch_id": "...",
  "active_batch_path": "...",
  "activated_at_utc": "...",
  "matrix_sha256_run": "...",
  "matrix_sha256_lock": "...",
  "prior_active_batch_id": "...",
  "prior_active_batch_path": "...",
  "supersession_reason": "Settled-count delta 0 → 1 (Mexico vs South Africa, M01)",  // cp-10 may add a settled-delta reason
  "amendment_pointer": "...",
  "settled_count_at_batch_time": 0,                   // NEW
  "settled_source": "parquet:data/processed/match_outcomes.parquet"  // NEW (mirrors cp-09's source label)
}
```

`schema_version` bumps 1.0 → 1.1. Consumers tolerate the new fields: schema-version-aware readers ignore unknown fields; the existing readers (regenerate_snapshot_from_batch.py only) will be updated as part of cp-10's implementation.

Historical batches stay on disk for audit; the directory structure does not change. The cron's write access to `active_batch.json` is established by the cp-09 work (the nightly cron updates `snapshot_meta.json` and related files already), so no permissions plumbing is needed.

---

## 6. Open risks and unknowns

These should be visible to Nicolás before Stage 2 begins.

1. **`data/processed/match_outcomes.parquet` does not exist on disk.** cp-09's `_count_settled_matches()` falls back to Postgres (or default 0) today. For cp-10 the Postgres path will be the live path during the tournament; the parquet export is "a future ingestion shim" per cp-09 inline comments. Two implications: (a) the cron environment needs `DATABASE_URL` set, with `psycopg`/`psycopg2` available; (b) a side-effect-free way to test the conditioning logic locally without a Postgres connection is to write the parquet by hand (which the cp-10 acceptance test does, since the test fixture inserts a hardcoded settled set). The decision tree in the cp-10 prompt anticipates this case: "If `_count_settled_matches()` in cp-09 used a parquet fallback, reuse that." Confirmed yes. No scope expansion needed.

2. **Postgres credentials in the GH Actions cron.** Check `.github/workflows/nightly_pipeline.yml` (cp-09 already wired) - the cron needs `DATABASE_URL` available. If it does, cp-10 is free; if it doesn't, cp-10 must either (a) add the secret to the cron env, or (b) require an ingestion shim to write `match_outcomes.parquet` before the cron runs. To verify in Stage 2 before pushing.

3. **Knockout match_id format in `match_outcomes`.** The schema comment claims `R32_M1`-style ids may appear, but live ingestion writes M-prefix. cp-10 explicitly filters to `stage == "group"` per §3.1 of the diagnostic and the prompt's scope cut, so any ambiguous knockout rows are ignored defensively. The follow-up checkpoint that does knockout conditioning will need to re-confirm the knockout id format at that point.

4. **Re-batch latency.** The 10k MC is timed at ~35s plus IO in the cp-04/cp-05 work, but the GH Actions runner has variable IO. If the re-batch takes >5 minutes consistently, Trigger B's "skip when unchanged" optimization becomes more valuable; if <30s, Trigger A becomes plausible. To measure once in Stage 2 (manual `python simulation/batch_runner.py` against the current zero-settled state). Decision can be revisited then.

5. **Idempotency on re-batch.** If the cron runs twice in the same night (manual dispatch on top of scheduled), the second invocation must either be a no-op (settled-count unchanged) or produce a fresh batch directory with a new id. The cp-04/cp-05 batch_runner already names batches with a UTC timestamp, so two invocations produce two distinct directories. cp-10 relies on this; no change needed.

---

## 7. STOP

Stage 1 deliverable complete. Findings:

- Data flow mapped end-to-end. Single root-cause gap: `_load_wc2026_fixtures()` drops `match_id`.
- No upstream Football-Data.org ID translator needed; M01-M104 is canonical from the fixtures parquet through `match_outcomes`.
- Zero non-MC consumers of the `G-A-1` synthesized format, so Option A is near-zero-churn.
- Recommended path: **Option A** (canonical match_id through the MC) + **Trigger B** (re-batch only on settled-count delta) + **`active_batch.json` schema_version bump 1.0 → 1.1** with two new fields.
- Five open risks documented (§6), each with a Stage 2 verification step.

Awaiting Nicolás's green light. On approval, Stage 2 implementation will:

1. Add `simulation/load_settled.py` with parquet/Postgres precedence (mirroring cp-09's pattern), filtered to `stage == "group"`. Returns `dict[match_id → MatchResult]` with `home/away` pulled from the fixtures parquet.
2. Modify `simulation/monte_carlo_runner.py`: `_load_wc2026_fixtures()` returns `list[(match_id, home, away)]`; `MonteCarloRunner.__init__` accepts `settled_results: dict[str, MatchResult]`; the group-stage loop branches on settled vs sampled; `match_rows.match_id` writes the canonical M-format; `match_rows.settled: bool` flag added.
3. Modify `simulation/batch_runner.py::_build_runner()` to call the new loader and pass `settled_results` through.
4. Modify `scripts/regenerate_snapshot_from_batch.py` to detect settled-count delta and re-batch when changed; stamp `settled_count_at_batch_time` and `settled_source` into `active_batch.json` (`schema_version` → "1.1").
5. Add `tests/scripts/test_settled_conditioning.py`: 1k-run Mexico 0-3 loss → `p_champion < 0.005`; directional assertion that the other Group A teams' `p_r16` rises.
6. Update the vault schema doc (`website/src/app/(vault)/vault/simulation/*.mdx` or similar) to replace the `G-A-1, KO-R32-1` example with `M01, KO-R32-1` (knockout still synthesized in this checkpoint).
7. Confirm the GH Actions cron env has `DATABASE_URL` and a psycopg driver, or - if not - add it before pushing.

PR will be opened as draft when verification (per the cp-10 prompt's checklist) all passes Y.
