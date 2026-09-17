# Preflight inspection notes — 2026-06-03 (run 2026-06-04)

Read-only verification that production state still matches the claims in
`docs/audit/architecture-diagnostic-2026-06-03.md` (§3.1, §3.2) before cp-10.1
starts. Captured on the `docs/foundation-2026-06-03` branch off `main`
(HEAD = PR #78 merge `4fff112`, which includes the diagnostic merge PR #77 `d61b63a`).

**Verdict:** No drift. Every diagnostic claim holds. One additive data point —
a second nightly failure on 2026-06-04 with the identical error — strengthens the
diagnostic rather than contradicting it.

---

## Step 1 — Nightly cron failure (`gh run list --workflow nightly_pipeline.yml --limit 10`)

```
completed	failure	Nightly Simulation Pipeline	Nightly Simulation Pipeline	main	schedule	26926522097	50s	2026-06-04T02:31:45Z
completed	failure	Nightly Simulation Pipeline	Nightly Simulation Pipeline	main	schedule	26860278471	55s	2026-06-03T02:36:05Z
completed	success	Nightly Simulation Pipeline	Nightly Simulation Pipeline	main	schedule	26794654219	57s	2026-06-02T02:29:52Z
completed	success	Nightly Simulation Pipeline	Nightly Simulation Pipeline	main	schedule	26732044164	47s	2026-06-01T02:30:27Z
completed	success	Nightly Simulation Pipeline	Nightly Simulation Pipeline	main	schedule	26700717771	54s	2026-05-31T02:08:49Z
completed	success	Nightly Simulation Pipeline	Nightly Simulation Pipeline	main	schedule	26671276155	55s	2026-05-30T01:54:30Z
completed	success	Nightly Simulation Pipeline	Nightly Simulation Pipeline	main	schedule	26613477477	53s	2026-05-29T02:00:26Z
completed	success	Nightly Simulation Pipeline	Nightly Simulation Pipeline	main	schedule	26549738869	57s	2026-05-28T01:50:44Z
completed	success	Nightly Simulation Pipeline	Nightly Simulation Pipeline	probe/github-token	workflow_dispatch	26534292687	1m3s	2026-05-27T19:38:24Z
completed	failure	Nightly Simulation Pipeline	Nightly Simulation Pipeline	main	workflow_dispatch	26531324425	36s	2026-05-27T18:41:08Z
```

**Reading:** Matches the diagnostic's §3.1. The first scheduled failure after cp-09
merged is run `26860278471` (2026-06-03T02:36Z), exactly as cited. The four prior
scheduled runs (2026-05-29 … 2026-06-02) all succeeded. GitHub did NOT pause
scheduling — it ran again on 2026-06-04 (run `26926522097`) and failed identically,
producing the "string of failures" the diagnostic anticipated. The lone 2026-05-27
`workflow_dispatch` failure predates cp-09 and is unrelated. No manual
`workflow_dispatch` has unfrozen production.

## Step 2 — Latest failure log (`gh run view 26926522097 --log-failed | tail -50`, abridged to the traceback)

```
[warn] postgres settled-count query failed: relation "match_outcomes" does not exist
    cp-10           : back-filled settled_count_at_batch_time=0 source=default:pre_tournament into active_batch.json
[1] active_batch_id : batch_20260512_013228Z
    champion        : M2_fifa  LOCKED=True  amendment=v1.1
    website label   : M_STAR  (per schema enum)
    existing_id     : 2026-06-02T16:24Z  (carried-forward metadata source)
[2] aggregated 48 teams from 10000 runs each
[3] new snapshot_id : 2026-06-04T02:32Z
    code_sha        : 4fff112d1a2dfc44
    data_sha        : sha256:49974caa284edc2eb31524afb92aca4b
  File ".../scripts/regenerate_snapshot_from_batch.py", line 823, in <module>
    main()
  File ".../scripts/regenerate_snapshot_from_batch.py", line 624, in main
    total_matches = _count_total_matches()
  File ".../scripts/regenerate_snapshot_from_batch.py", line 229, in _count_total_matches
    raise FileNotFoundError(
FileNotFoundError: wc2026 fixtures parquet not found at .../data/raw/wc2026_fixtures.parquet; cannot derive matches_remaining.
##[error]Process completed with exit code 1.
```

**Reading:** The fatal error is exactly the one §3.1 predicted —
`FileNotFoundError: wc2026 fixtures parquet not found ... cannot derive matches_remaining`,
raised at `_count_total_matches()` (`regenerate_snapshot_from_batch.py:229`). The
`relation "match_outcomes" does not exist` line above it is a non-fatal `[warn]`
(the DB table is empty pre-tournament; the code back-fills `settled_count=0` and
continues) — it is NOT the cause of the exit-1. Diagnosis confirmed, scope unchanged.

## Step 3 — Production frozen (`curl .../snapshot_meta.json | jq`)

```json
{
  "snapshot_id": "2026-06-02T16:24Z",
  "generated_at_utc": "2026-06-02T16:24:10Z",
  "champion_model": "M_STAR",
  "kill_criteria_active": false,
  "active_batch_id": "batch_20260512_013228Z"
}
```

**Reading:** All five fields match the diagnostic exactly. `snapshot_id` is still
`2026-06-02T16:24Z`; `generated_at_utc` is 2026-06-02, not today; champion is
`M_STAR`; kill criteria inactive; active batch `batch_20260512_013228Z`. Production
is frozen. Nothing has unfrozen it.

## Step 4 — Gitignore state

```
$ git check-ignore -v data/raw/wc2026_fixtures.parquet
.gitignore:26:data/raw/*.parquet	data/raw/wc2026_fixtures.parquet

$ git ls-files 'data/raw/*.parquet' | wc -l
0

$ ls -la data/raw/*.parquet
-rw-r--r--  11453  Apr 21 12:12  data/raw/elo_ratings.parquet
-rw-r--r--   4647  May 11 14:36  data/raw/fifa_rankings.parquet
-rw-r--r--  18956  Apr 21 12:32  data/raw/historical_matches.parquet
-rw-r--r--  10094  Apr 21 12:52  data/raw/macro_data.parquet
-rw-r--r--   5251  Apr 21 13:03  data/raw/odds_betfair.parquet
-rw-r--r--  17283  May  4 15:53  data/raw/odds_pinnacle.parquet
-rw-r--r--   5315  Apr 21 13:03  data/raw/odds_polymarket.parquet
-rw-r--r--  16430  Apr 21 12:36  data/raw/recent_form.parquet
-rw-r--r--   9412  May 11 14:34  data/raw/wc2026_fixtures.parquet
```

**Reading:** The fixtures parquet is ignored by `.gitignore:26` (`data/raw/*.parquet`),
exactly as §3.1/§3.2 cite. Zero `data/raw/*.parquet` files are tracked. All six
cp-10.1 input parquets exist on Nicolás's disk and are ready for cp-10.1 to
force-track: `elo_ratings`, `fifa_rankings`, `historical_matches`, `macro_data`,
`recent_form`, `wc2026_fixtures` (plus the three odds files, out of cp-10.1's scope).

## Step 5 — Foundation docs present and untracked (pre-commit)

```
$ git status --short WORKFLOW.md PLAN.md CHECKPOINT_10.1_DATA_AVAILABILITY_PROMPT.md
?? CHECKPOINT_10.1_DATA_AVAILABILITY_PROMPT.md
?? PLAN.md
?? WORKFLOW.md
```

**Reading:** All three files exist on disk and were untracked before this PR.
`WORKFLOW.md` and `PLAN.md` are committed in this PR's first commit; the cp-10.1
prompt stays untracked and gets handed directly to the next session.

---

Production state verified to match the 2026-06-03 diagnostic (with one additive,
consistent data point: a second identical nightly failure on 2026-06-04).
Foundation docs committed. cp-10.1 is ready to hand off.
