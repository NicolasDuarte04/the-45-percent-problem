"""
ingestion/fetch_polls.py
========================
Session 02 · El Voto del 21 de Junio — Poll ingestion

Ingests recently-published voting-intention polls for the 21 de junio de 2026
presidential runoff (Iván Cepeda vs Abelardo de la Espriella), standardises
them into one schema, validates, and writes a snapshot-hashed Parquet.

Source of truth: a human-curated seed CSV (data/manual/polls_seed.csv), one row
per published poll, every row carrying a real, verifiable source_url. Per-source
scrapers are an additive future path (none enabled yet); the seed CSV is the
spine. Every row, seeded or scraped, passes the same `Poll` validation.

This pipeline is self-contained inside the-21j-problem/. It does NOT write into
the sibling the-45-percent-problem/ repo or its snapshot registry.

Output
------
  data/raw/polls_co_2026.parquet              — validated Poll records
  data/snapshots/snapshot_registry.jsonl      — 21J's own append-only registry

Run
---
  python ingestion/fetch_polls.py
  python ingestion/fetch_polls.py --force     # re-read seed, ignore nothing cached
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import yaml

# ── Project root on sys.path so we can import utils / schemas ─────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas import (  # noqa: E402
    CANONICAL_POLLSTERS,
    Poll,
    make_poll_id,
    standardise_pollster,
)
from utils.hasher import DataSnapshotHasher, SnapshotRegistry  # noqa: E402
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

# =============================================================================
# Config
# =============================================================================

with open(PROJECT_ROOT / "config.yaml", encoding="utf-8") as _f:
    CFG = yaml.safe_load(_f)

SEED_CSV       = PROJECT_ROOT / CFG["paths"]["manual_seed"]
OUTPUT_PARQUET = PROJECT_ROOT / CFG["paths"]["output_parquet"]
SNAPSHOT_REG   = PROJECT_ROOT / CFG["paths"]["snapshot_registry"]

AS_OF_DATE   = date.fromisoformat(str(CFG["as_of_date"]))
WINDOW_DAYS  = int(CFG["ingestion"]["window_days"])
WINDOW_CUTOFF = AS_OF_DATE - timedelta(days=WINDOW_DAYS)

# Final column order written to Parquet (schema order).
OUTPUT_COLUMNS = [
    "poll_id",
    "pollster",
    "fieldwork_start",
    "fieldwork_end",
    "publication_date",
    "sample_size",
    "cepeda_pct",
    "espriella_pct",
    "other_pct",
    "undecided_pct",
    "abstention_pct",
    "margin_error",
    "source_url",
    "ingested_at",
]

SORT_KEY = list(CFG["sort_key"])  # ["fieldwork_end", "poll_id"]


# =============================================================================
# Fetch raw
# =============================================================================


def fetch_raw(force: bool = False) -> pd.DataFrame:
    """
    Load the human-curated seed CSV. `force` is accepted for interface parity
    with the canonical ingestion pattern; there is no remote cache here, so the
    seed is always read fresh from disk.

    Per-source scrapers would append to the returned frame here. None are
    enabled yet — the seed CSV is the source of truth.
    """
    if not SEED_CSV.exists():
        raise FileNotFoundError(f"Seed CSV not found: {SEED_CSV}")

    log.stage("Loading curated poll seed", path=str(SEED_CSV), force=force)
    df = pd.read_csv(SEED_CSV, dtype=str)  # parse everything as str; coerce later
    log.info("Seed rows loaded", rows=len(df))
    return df


# =============================================================================
# Clean, enrich & validate
# =============================================================================


def _coerce_optional_float(value: object) -> float | None:
    """CSV blanks / NaN -> None; otherwise float."""
    if value is None:
        return None
    s = str(value).strip()
    if s == "" or s.lower() in {"nan", "n/a", "na", "none"}:
        return None
    return float(s)


def clean_and_enrich(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardise pollster names, filter to the 60-day window and recognised
    firms, build deterministic poll_ids, and validate every row against the
    `Poll` schema. Rows that fail validation (bad share sum, empty URL, bad
    dates, non-positive sample) are excluded and logged, never invented.
    """
    log.stage(
        "Cleaning, filtering and validating polls",
        window_cutoff=WINDOW_CUTOFF.isoformat(),
        as_of=AS_OF_DATE.isoformat(),
    )

    ingested_at = datetime.now(timezone.utc)  # one timestamp for the whole run

    valid: list[dict] = []
    excluded_window = 0
    excluded_pollster = 0
    excluded_invalid = 0

    for idx, raw in df.iterrows():
        pollster = standardise_pollster(str(raw["pollster"]))

        # ── Parse fieldwork_end early: needed for window filter + poll_id ──────
        try:
            fw_start = date.fromisoformat(str(raw["fieldwork_start"]).strip())
            fw_end = date.fromisoformat(str(raw["fieldwork_end"]).strip())
            pub_date = date.fromisoformat(str(raw["publication_date"]).strip())
        except (ValueError, KeyError) as exc:
            excluded_invalid += 1
            log.warning("Excluded — unparseable date", row=int(idx), error=str(exc))
            continue

        # ── 60-day window filter ──────────────────────────────────────────────
        if fw_end < WINDOW_CUTOFF:
            excluded_window += 1
            log.warning(
                "Excluded — outside 60-day window",
                pollster=pollster,
                fieldwork_end=fw_end.isoformat(),
                cutoff=WINDOW_CUTOFF.isoformat(),
            )
            continue

        # ── Recognised-firm filter ────────────────────────────────────────────
        if pollster not in CANONICAL_POLLSTERS:
            excluded_pollster += 1
            log.warning(
                "Excluded — pollster not in recognised in-window set",
                pollster=pollster,
            )
            continue

        # ── Build + validate the Poll record ──────────────────────────────────
        try:
            poll = Poll(
                poll_id=make_poll_id(pollster, fw_end),
                pollster=pollster,
                fieldwork_start=fw_start,
                fieldwork_end=fw_end,
                publication_date=pub_date,
                sample_size=int(str(raw["sample_size"]).strip()),
                cepeda_pct=float(raw["cepeda_pct"]),
                espriella_pct=float(raw["espriella_pct"]),
                other_pct=float(raw["other_pct"]),
                undecided_pct=float(raw["undecided_pct"]),
                abstention_pct=_coerce_optional_float(raw.get("abstention_pct")),
                margin_error=_coerce_optional_float(raw.get("margin_error")),
                source_url=str(raw["source_url"]).strip(),
                ingested_at=ingested_at,
            )
        except Exception as exc:  # noqa: BLE001 — exclude + log, never invent
            excluded_invalid += 1
            log.warning(
                "Excluded — failed Poll validation",
                pollster=pollster,
                fieldwork_end=fw_end.isoformat(),
                error=str(exc).splitlines()[0],
            )
            continue

        valid.append(poll.model_dump())

    if excluded_window or excluded_pollster or excluded_invalid:
        log.info(
            "Exclusions",
            outside_window=excluded_window,
            unrecognised_pollster=excluded_pollster,
            failed_validation=excluded_invalid,
        )

    if not valid:
        raise RuntimeError(
            "No valid polls after filtering — check the seed CSV and the window."
        )

    out = pd.DataFrame(valid)

    # ── Deduplicate on poll_id (deterministic key) ────────────────────────────
    before = len(out)
    out = out.drop_duplicates(subset="poll_id", keep="first")
    if before - len(out) > 0:
        log.warning("Removed duplicate poll_ids", count=before - len(out))

    log.success(
        "Validation complete",
        valid_polls=len(out),
        pollsters=sorted(out["pollster"].unique().tolist()),
    )
    return out


# =============================================================================
# Build output
# =============================================================================


def build_output(df: pd.DataFrame) -> pd.DataFrame:
    """Select schema columns, set dtypes, sort by natural key, reset index."""
    out = df[OUTPUT_COLUMNS].copy()

    # Nullable integer for sample_size (capitalised Int64 per repo convention).
    out["sample_size"] = out["sample_size"].astype("Int64")

    # tz-aware UTC timestamp for ingested_at.
    out["ingested_at"] = pd.to_datetime(out["ingested_at"], utc=True)

    # Date columns stay as python `date` objects (pyarrow -> date32).
    out = out.sort_values(SORT_KEY).reset_index(drop=True)
    return out


# =============================================================================
# Stats report
# =============================================================================


def print_stats(df: pd.DataFrame) -> str:
    """Print a concise ingestion report and return it as a string."""
    lines = [
        "=" * 62,
        "  El Voto del 21 de Junio — Poll Ingestion Report",
        f"  Generated : {datetime.now(timezone.utc).isoformat()}",
        "=" * 62,
        f"  Valid polls           : {len(df):>4}",
        f"  Pollsters             : {', '.join(sorted(df['pollster'].unique()))}",
        f"  Fieldwork-end range   : {df['fieldwork_end'].min()} -> {df['fieldwork_end'].max()}",
        f"  Window cutoff         : {WINDOW_CUTOFF.isoformat()} (as_of {AS_OF_DATE.isoformat()}, {WINDOW_DAYS}d)",
        "",
        "  Polls per pollster:",
    ]
    for p, grp in df.groupby("pollster"):
        lines.append(f"    {p:<14} {len(grp):>3}")
    lines += [
        "",
        f"  Cepeda %     : {df['cepeda_pct'].min():.1f} -> {df['cepeda_pct'].max():.1f}",
        f"  Espriella %  : {df['espriella_pct'].min():.1f} -> {df['espriella_pct'].max():.1f}",
        "=" * 62,
    ]
    report = "\n".join(lines)
    print(report)
    return report


# =============================================================================
# Sample schema validation
# =============================================================================


def _validate_sample(df: pd.DataFrame, n: int = 5) -> None:
    """Re-validate n rows of the built output against the Poll schema."""
    sample = df.head(min(n, len(df)))
    errors: list[str] = []
    for _, row in sample.iterrows():
        try:
            Poll(
                poll_id=str(row["poll_id"]),
                pollster=str(row["pollster"]),
                fieldwork_start=row["fieldwork_start"],
                fieldwork_end=row["fieldwork_end"],
                publication_date=row["publication_date"],
                sample_size=int(row["sample_size"]),
                cepeda_pct=float(row["cepeda_pct"]),
                espriella_pct=float(row["espriella_pct"]),
                other_pct=float(row["other_pct"]),
                undecided_pct=float(row["undecided_pct"]),
                abstention_pct=None if pd.isna(row["abstention_pct"]) else float(row["abstention_pct"]),
                margin_error=None if pd.isna(row["margin_error"]) else float(row["margin_error"]),
                source_url=str(row["source_url"]),
                ingested_at=row["ingested_at"].to_pydatetime(),
            )
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{row['poll_id']}: {str(exc).splitlines()[0]}")

    if errors:
        log.warning("Sample schema validation issues", count=len(errors))
        for err in errors:
            log.warning("  " + err)
    else:
        log.success(f"Schema validation passed on {len(sample)} sample rows")


# =============================================================================
# Main
# =============================================================================


def run(force: bool = False) -> Path:
    """Full ingestion pipeline. Returns the path to the output Parquet file."""
    log.stage("=== fetch_polls · Session 02 (21J) ===")

    raw_df = fetch_raw(force=force)
    cleaned_df = clean_and_enrich(raw_df)
    output_df = build_output(cleaned_df)

    log.stage("Spot-checking records against Poll schema")
    _validate_sample(output_df)

    OUTPUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_parquet(OUTPUT_PARQUET, index=False, engine="pyarrow")
    log.success(
        "Parquet written",
        path=str(OUTPUT_PARQUET),
        rows=len(output_df),
        size_kb=round(OUTPUT_PARQUET.stat().st_size / 1024, 1),
    )

    # Hash & register snapshot (21J's own registry, not the WC one).
    # Hash the DATA content, excluding the per-run `ingested_at` provenance
    # column, so the snapshot SHA is reproducible: it changes iff the poll data
    # changes, not merely because the pipeline was re-run at a different time.
    hasher = DataSnapshotHasher()
    hasher.add_dataframe(
        output_df.drop(columns=["ingested_at"]),
        label="polls_co_2026",
        sort_by=SORT_KEY,
    )
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="fetch_polls")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    print_stats(output_df)

    log.success(
        "fetch_polls complete", output=str(OUTPUT_PARQUET), rows=len(output_df)
    )
    return OUTPUT_PARQUET


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Ingest 21 de junio de 2026 runoff polls into a hashed Parquet."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-read the seed CSV fresh (no remote cache exists to bypass).",
    )
    args = parser.parse_args()
    run(force=args.force)
