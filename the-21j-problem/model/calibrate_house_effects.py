"""
model/calibrate_house_effects.py
================================
Session 03 · El Voto del 21 de Junio — House effects + recency weighting

Calibrates two pre-registered parameters the public 21J model depends on:

  1. House effects — each pollster's signed bias on an ideological-bloc axis
     (left = Petro/Cepeda, right = Duque/Hernandez/De la Espriella), estimated
     against the certified Registraduria results of the 2018 and 2022
     presidential rounds.
  2. Recency half-life — the exponential-decay half-life (days) that says how
     fast an old poll loses weight, calibrated by grid search on those same
     past rounds.

Produces one frozen, snapshot-registered artifact:
  data/calibration/co_house_effects.json

Self-contained inside the-21j-problem/. Writes only under the-21j-problem/data/
and registers in the-21j-problem/data/snapshots/snapshot_registry.jsonl. Never
touches the WC pre-registered logs.

Run
---
  python model/calibrate_house_effects.py
  python model/calibrate_house_effects.py --force   # overwrite existing JSON
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

# ── Project root on sys.path so we can import utils / schemas ─────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas import standardise_pollster  # noqa: E402  (reuse Session 02 map)
from utils.hasher import DataSnapshotHasher, SnapshotRegistry, hash_file  # noqa: E402
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

# =============================================================================
# Config
# =============================================================================

with open(PROJECT_ROOT / "config.yaml", encoding="utf-8") as _f:
    CFG = yaml.safe_load(_f)

_CAL = CFG["calibration"]
CORPUS_CSV     = PROJECT_ROOT / _CAL["paths"]["historical_polls_seed"]
OUTPUT_JSON    = PROJECT_ROOT / _CAL["paths"]["house_effects_json"]
SNAPSHOT_REG   = PROJECT_ROOT / CFG["paths"]["snapshot_registry"]

HALFLIFE_GRID  = [float(h) for h in _CAL["recency_halflife_grid_days"]]
HALFLIFE_MIN   = float(_CAL["recency_halflife_min_days"])
HALFLIFE_MAX   = float(_CAL["recency_halflife_max_days"])
MIN_YEARS      = int(_CAL["house_effect_min_election_years"])
BLOC_MAP       = _CAL["bloc_map"]
ELECTIONS      = _CAL["elections"]

BLOCS = ("left", "right")

# Verdict thresholds for the leave-one-out stability check.
LOO_HALFLIFE_TOL_DAYS = 10.0
LOO_BIAS_TOL_PP       = 4.0


# =============================================================================
# Fetch raw
# =============================================================================


def fetch_raw(force: bool = False) -> pd.DataFrame:
    """Load the human-curated historical-poll corpus. `force` kept for parity."""
    if not CORPUS_CSV.exists():
        raise FileNotFoundError(f"Calibration corpus not found: {CORPUS_CSV}")
    log.stage("Loading historical-poll calibration corpus", path=str(CORPUS_CSV), force=force)
    df = pd.read_csv(CORPUS_CSV)
    log.info("Corpus rows loaded", rows=len(df))
    return df


# =============================================================================
# Clean / validate
# =============================================================================


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    """Standardise names, parse dates, verify days_before and certified values."""
    df = df.copy()
    df["pollster"] = df["pollster"].map(standardise_pollster)

    # Every row needs a non-empty source_url (no fabricated figures may ship).
    bad_url = df["source_url"].isna() | (df["source_url"].astype(str).str.strip() == "")
    if bad_url.any():
        raise ValueError(f"{int(bad_url.sum())} corpus row(s) missing source_url")

    df["election_date"] = pd.to_datetime(df["election_date"]).dt.date
    df["fieldwork_end"] = pd.to_datetime(df["fieldwork_end"]).dt.date

    # Recompute days_before from dates (authoritative) and verify the CSV column.
    computed = df.apply(
        lambda r: (r["election_date"] - r["fieldwork_end"]).days, axis=1
    )
    mismatch = computed != df["days_before_election"]
    if mismatch.any():
        for _, r in df[mismatch].iterrows():
            log.warning(
                "days_before_election mismatch — using recomputed value",
                pollster=r["pollster"],
                election=r["election_id"],
                csv=int(r["days_before_election"]),
                computed=int((r["election_date"] - r["fieldwork_end"]).days),
            )
    df["days_before_election"] = computed.astype(int)

    # Cross-check certified results against the authoritative config block.
    for eid, g in df.groupby("election_id"):
        cfg = ELECTIONS.get(eid)
        if cfg is None:
            raise ValueError(f"election_id {eid!r} not in config.calibration.elections")
        for bloc in BLOCS:
            cfg_val = float(cfg[f"{bloc}_certified_pct"])
            csv_vals = g[f"{bloc}_certified_pct"].unique()
            if len(csv_vals) != 1 or abs(float(csv_vals[0]) - cfg_val) > 1e-6:
                raise ValueError(
                    f"{eid} {bloc}_certified_pct in CSV {csv_vals} != config {cfg_val}"
                )

    log.success(
        "Corpus validated",
        rows=len(df),
        rounds=sorted(df["election_id"].unique().tolist()),
        pollsters=sorted(df["pollster"].unique().tolist()),
    )
    return df


# =============================================================================
# Recency half-life calibration
# =============================================================================


def _weights(days: pd.Series, halflife: float) -> pd.Series:
    """Exponential recency weight: 0.5 ** (days_before / halflife)."""
    return np.power(0.5, days.astype(float) / halflife)


def calibrate_halflife(df: pd.DataFrame) -> tuple[float, dict[str, float]]:
    """
    Grid-search the half-life that minimises mean absolute error of the
    recency-weighted poll aggregate vs the certified result, across every
    (round x bloc). Returns (halflife_clamped, error_curve).
    """
    curve: dict[str, float] = {}
    for h in HALFLIFE_GRID:
        abs_errs: list[float] = []
        for _, g in df.groupby("election_id"):
            w = _weights(g["days_before_election"], h)
            wsum = w.sum()
            for bloc in BLOCS:
                agg = float((w * g[f"{bloc}_poll_pct"]).sum() / wsum)
                cert = float(g[f"{bloc}_certified_pct"].iloc[0])
                abs_errs.append(abs(agg - cert))
        curve[str(int(h)) if float(h).is_integer() else str(h)] = round(
            float(np.mean(abs_errs)), 4
        )

    best_key = min(curve, key=lambda k: curve[k])
    best_h = float(best_key)
    clamped = float(min(max(best_h, HALFLIFE_MIN), HALFLIFE_MAX))
    return clamped, curve


# =============================================================================
# House effects
# =============================================================================


def compute_house_effects(df: pd.DataFrame, halflife: float) -> dict[str, dict]:
    """
    Per pollster, per bloc: recency-weighted mean signed error (poll - certified),
    its unweighted dispersion, and a confidence flag based on distinct election
    years covered.
    """
    out: dict[str, dict] = {}
    for pollster, g in df.groupby("pollster"):
        w = _weights(g["days_before_election"], halflife)
        wsum = float(w.sum())
        rec: dict = {}
        for bloc in BLOCS:
            err = g[f"{bloc}_poll_pct"] - g[f"{bloc}_certified_pct"]
            wmean = float((w * err).sum() / wsum)
            rec[f"{bloc}_bloc_bias"] = round(wmean, 3)
            rec[f"{bloc}_bloc_std"] = round(float(err.std(ddof=0)), 3)
        n_rounds = int(g["election_id"].nunique())
        n_years = int(g["election_id"].str[:4].nunique())
        rec["n_rounds"] = n_rounds
        rec["n_election_years"] = n_years
        rec["n_polls"] = int(len(g))
        rec["confidence"] = "high" if n_years >= MIN_YEARS else "low"
        out[pollster] = rec
    return out


# =============================================================================
# Leave-one-election-out stability
# =============================================================================


def leave_one_out(
    df: pd.DataFrame, full_halflife: float, full_effects: dict[str, dict]
) -> dict:
    """Refit excluding each round in turn; report half-life and bias movement."""
    per_round: dict[str, dict] = {}
    max_h_delta = 0.0
    max_bias_delta = 0.0

    for eid in sorted(df["election_id"].unique()):
        sub = df[df["election_id"] != eid]
        h2, _ = calibrate_halflife(sub)
        he2 = compute_house_effects(sub, h2)

        deltas: list[float] = []
        for p, rec in he2.items():
            if p in full_effects:
                deltas.append(abs(rec["left_bloc_bias"] - full_effects[p]["left_bloc_bias"]))
                deltas.append(abs(rec["right_bloc_bias"] - full_effects[p]["right_bloc_bias"]))
        bias_delta = round(max(deltas), 3) if deltas else 0.0
        h_delta = round(h2 - full_halflife, 2)

        per_round[eid] = {
            "halflife_days": h2,
            "halflife_delta_days": h_delta,
            "max_bias_delta_pp": bias_delta,
        }
        max_h_delta = max(max_h_delta, abs(h_delta))
        max_bias_delta = max(max_bias_delta, bias_delta)

    thick_enough = (
        max_h_delta <= LOO_HALFLIFE_TOL_DAYS and max_bias_delta <= LOO_BIAS_TOL_PP
    )
    per_round["summary"] = {
        "max_halflife_delta_days": round(max_h_delta, 2),
        "max_bias_delta_pp": round(max_bias_delta, 3),
        "halflife_tol_days": LOO_HALFLIFE_TOL_DAYS,
        "bias_tol_pp": LOO_BIAS_TOL_PP,
        "thick_enough_to_freeze": bool(thick_enough),
    }
    return per_round


# =============================================================================
# Build output
# =============================================================================


def build_output(
    df: pd.DataFrame,
    halflife: float,
    curve: dict[str, float],
    effects: dict[str, dict],
    loo: dict,
    generated_at: datetime,
) -> dict:
    """Assemble the co_house_effects.json record (generated_at added last)."""
    round_counts = df["election_id"].value_counts().to_dict()
    record = {
        "recency_halflife_days": halflife,
        "recency_halflife_range": [HALFLIFE_MIN, HALFLIFE_MAX],
        "recency_error_curve": curve,
        "house_effects": effects,
        "leave_one_out": loo,
        "assumptions": {
            "bloc_map": BLOC_MAP,
            "house_effect_min_election_years": MIN_YEARS,
            "method": (
                "signed error = poll_pct - certified_pct per ideological bloc; "
                "house effect = recency-weighted mean signed error per (pollster, bloc) "
                "with weight 0.5**(days_before/halflife); halflife calibrated by grid "
                "search minimising MAE of the recency-weighted poll aggregate vs the "
                "certified result across every (round x bloc)."
            ),
            "sourcing_note": (
                "Corpus figures are transcribed from the public Wikipedia poll "
                "aggregations (en: 2018 election page; es: 2026/2022 sondeos anexo), "
                "which is the source_url on every row. Certified shares are the "
                "Registraduria results. No figure is fabricated or interpolated."
            ),
            "first_round_caveat": (
                "First-round bloc errors partly reflect late campaign dynamics "
                "(e.g. Hernandez's 2022 surge), not pure pollster bias; the right "
                "bloc in a first round is the eventual runoff finalist. Recency "
                "weighting down-weights the earlier/first-round polls, and 2026 is a "
                "runoff, so second-round house effects carry the cleaner signal."
            ),
        },
        "corpus": {
            "n_rows": int(len(df)),
            "n_pollsters": int(df["pollster"].nunique()),
            "rounds": {k: int(v) for k, v in round_counts.items()},
            "pollsters": sorted(df["pollster"].unique().tolist()),
            "source_csv": str(CORPUS_CSV.relative_to(PROJECT_ROOT)),
        },
        "corpus_sha": hash_file(CORPUS_CSV),
        "generated_at": generated_at.isoformat(),
    }
    return record


# =============================================================================
# Stats report
# =============================================================================


def print_report(record: dict) -> str:
    lines = [
        "=" * 70,
        "  El Voto del 21 de Junio — House Effects + Recency Calibration",
        f"  Generated : {record['generated_at']}",
        "=" * 70,
        f"  recency_halflife_days : {record['recency_halflife_days']}  "
        f"(range {record['recency_halflife_range']})",
        "",
        "  Recency error curve (half-life days -> MAE pp):",
    ]
    for k, v in record["recency_error_curve"].items():
        marker = "  <- chosen" if float(k) == float(record["recency_halflife_days"]) else ""
        lines.append(f"    {k:>4} d : {v:>6.4f}{marker}")
    lines += ["", "  House effects (signed bias, pp; + = poll over-states bloc):",
              f"    {'pollster':<16}{'left':>8}{'right':>8}{'n_yrs':>7}{'conf':>7}"]
    for p, rec in sorted(record["house_effects"].items()):
        lines.append(
            f"    {p:<16}{rec['left_bloc_bias']:>8.2f}{rec['right_bloc_bias']:>8.2f}"
            f"{rec['n_election_years']:>7}{rec['confidence']:>7}"
        )
    s = record["leave_one_out"]["summary"]
    lines += [
        "",
        "  Leave-one-election-out:",
        f"    max half-life delta : {s['max_halflife_delta_days']} d (tol {s['halflife_tol_days']})",
        f"    max bias delta      : {s['max_bias_delta_pp']} pp (tol {s['bias_tol_pp']})",
        f"    thick enough to freeze: {'YES' if s['thick_enough_to_freeze'] else 'NO'}",
        "=" * 70,
    ]
    report = "\n".join(lines)
    print(report)
    return report


# =============================================================================
# Main
# =============================================================================


def run(force: bool = False) -> Path:
    """Full calibration pipeline. Returns the path to the JSON artifact."""
    log.stage("=== calibrate_house_effects · Session 03 (21J) ===")

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    if OUTPUT_JSON.exists() and not force:
        log.info("Output exists — pass --force to recalibrate", path=str(OUTPUT_JSON))
        return OUTPUT_JSON

    raw = fetch_raw(force=force)
    df = _clean(raw)

    log.stage("Calibrating recency half-life (grid search)")
    halflife, curve = calibrate_halflife(df)
    log.info("Half-life calibrated", halflife_days=halflife, grid_min_mae=min(curve.values()))

    log.stage("Computing per-pollster house effects")
    effects = compute_house_effects(df, halflife)

    log.stage("Leave-one-election-out stability check")
    loo = leave_one_out(df, halflife, effects)

    generated_at = datetime.now(timezone.utc)
    record = build_output(df, halflife, curve, effects, loo, generated_at)

    OUTPUT_JSON.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
    log.success("House-effects JSON written", path=str(OUTPUT_JSON), pollsters=len(effects))

    # Snapshot: hash the corpus CSV + the record WITHOUT the volatile timestamp,
    # so the snapshot SHA is reproducible across runs with unchanged inputs.
    reproducible = {k: v for k, v in record.items() if k != "generated_at"}
    hasher = DataSnapshotHasher()
    hasher.add_file(CORPUS_CSV, label="co_historical_polls")
    hasher.add_dict(reproducible, label="co_house_effects")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="calibrate_house_effects")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    print_report(record)
    log.success("calibrate_house_effects complete", output=str(OUTPUT_JSON))
    return OUTPUT_JSON


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Calibrate 21J house effects + recency half-life."
    )
    parser.add_argument("--force", action="store_true", help="Recalibrate even if JSON exists.")
    args = parser.parse_args()
    run(force=args.force)
