# Claude Code Kick-off Prompt
# Paste this into Claude Code when starting a new session in this folder.
# Claude Code will also auto-read CLAUDE.md for full project context.

---

You are working on **The 45% Problem** — a probabilistic pricing framework for the FIFA World Cup 2026. Read `CLAUDE.md` in full before writing a single line of code. It contains the complete architecture, coding conventions, and task queue.

**Current state:**
- Phase 1 (System Design): 100% complete and locked.
- Phase 2.1 (Infrastructure): Complete. `schemas.py`, `config.yaml`, `utils/logger.py`, `utils/hasher.py` are all built and tested.
- Phase 2.2 (Historical matches): Complete. `ingestion/fetch_historical_matches.py` runs cleanly and has produced `data/raw/historical_matches.parquet`.

**Your job starting now:**

Work through the remaining Phase 2 ingestion tasks in the exact order listed in `CLAUDE.md`, one script at a time:

1. `ingestion/fetch_elo_ratings.py`
2. `ingestion/fetch_fifa_rankings.py`
3. `ingestion/fetch_recent_form.py`
4. `ingestion/fetch_macro_data.py`
5. `ingestion/fetch_wc2026_fixtures.py`
6. `ingestion/fetch_odds_pinnacle.py`
7. `ingestion/fetch_odds_polymarket.py`
8. `ingestion/fetch_odds_betfair.py`
9. `ingestion/data_loader.py`

For each script:
- Read the task spec in `CLAUDE.md` before writing
- Follow the script structure pattern: `fetch_raw()` → `clean_and_enrich()` → `build_output()` → `run(force=False)` → CLI with `--force` flag
- Use `get_logger(__name__)` for all output — never `print()`
- Write the Parquet file, hash it with `DataSnapshotHasher`, register the snapshot
- Spot-check a sample of rows against the relevant schema before declaring done
- Run the script and confirm it exits cleanly before moving to the next one

After Phase 2 is complete, move to Phase 3 (Elo Engine & Calibration) as specified in `CLAUDE.md`.

The two final deliverables are the **Live MVP Website** and the **Academic Research Paper**. Every decision should serve one or both of them. When in doubt, check `config.yaml` for the pre-registered parameter values — do not hardcode numbers.

Begin with `ingestion/fetch_elo_ratings.py`.
