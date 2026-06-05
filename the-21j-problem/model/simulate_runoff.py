"""
model/simulate_runoff.py
========================
Session 04 · El Voto del 21 de Junio — Monte Carlo runoff simulator

Consumes the Bayesian aggregator (model/aggregate_polls.py) and turns its
posterior over Cepeda's two-way vote share into the first public probability for
the 21 de junio de 2026 runoff. Writes one snapshot JSON per run in the exact
shape the website will later read.

Pipeline
--------
  1. Aggregate the runoff polls into a posterior (house effects ON, half-life
     read from the calibration JSON).
  2. Monte Carlo: draw N samples from the share posterior, propagating
     turnout / undecided uncertainty, from a fixed recorded seed. Per draw
     record the realised margin and the winner; aggregate to p_cepeda,
     p_espriella, and the margin distribution.
  3. Sensitivity / honesty gate: recompute the probability with house effects
     off vs on and half-life 5 vs 10. If the winner flips, or p_cepeda moves
     more than the configured threshold, force data_sufficiency = "thin".
  4. Write data/snapshots/21j/snapshot_YYYYMMDD.json + latest.json, hash the
     snapshot, and register it in the 21J snapshot registry.

Honesty rules (from the session brief and IMPLEMENTATION_PLAN §9):
  * Every number is real model output. Nothing is fabricated to fill a gap.
  * None of the project's four banned prediction / betting tokens appear in any
    key, value, or comment. Neutral keys only: p_cepeda, p_espriella, share_*,
    margin_*. (The banned set is enforced by tests/test_simulator.py.)
  * The snapshot is reproducible from the seed: rerun gives identical output
    apart from the wall-clock `generated_at` field (excluded from the hash).

Self-contained inside the-21j-problem/. Writes only under the-21j-problem/data/.
Never touches the WC pre-registered logs.

Run
---
  python model/simulate_runoff.py
  python model/simulate_runoff.py --force     # overwrite today's snapshot
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

# ── Project root on sys.path so we can import utils / schemas / model ──────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from model.aggregate_polls import Posterior, aggregate, load_inputs  # noqa: E402
from utils.hasher import DataSnapshotHasher, SnapshotRegistry, hash_dict, hash_file  # noqa: E402
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

# =============================================================================
# Config
# =============================================================================

with open(PROJECT_ROOT / "config.yaml", encoding="utf-8") as _f:
    CFG = yaml.safe_load(_f)

POLLS_PARQUET = PROJECT_ROOT / CFG["paths"]["output_parquet"]
HOUSE_EFFECTS_JSON = PROJECT_ROOT / CFG["calibration"]["paths"]["house_effects_json"]
SNAPSHOT_REG = PROJECT_ROOT / CFG["paths"]["snapshot_registry"]

SNAPSHOT_DIR = PROJECT_ROOT / CFG["paths_session04"]["snapshot_dir"]
LATEST_POINTER = PROJECT_ROOT / CFG["paths_session04"]["latest_pointer"]

AS_OF_DATE = date.fromisoformat(str(CFG["as_of_date"]))

_SIM = CFG["simulator"]
MC_RUNS = int(_SIM["mc_runs"])
SEED = int(_SIM["seed"])
DECISION_THRESHOLD = float(_SIM["decision_threshold"])
TURNOUT_SIGMA = float(_SIM["turnout_undecided_sigma"])
SENS_HALFLIVES = [float(h) for h in _SIM["sensitivity"]["halflife_days"]]
SENS_MODES = list(_SIM["sensitivity"]["house_effects_modes"])
FLIP_P_THRESHOLD = float(_SIM["sensitivity"]["flip_p_threshold"])

MIN_POLLS_OK = int(CFG["aggregator"]["min_polls_ok"])

# CI mass: 80 percent credible interval (10th / 90th percentiles).
CI_LOW_Q = 10.0
CI_HIGH_Q = 90.0


# =============================================================================
# Monte Carlo
# =============================================================================


def monte_carlo(
    post: Posterior,
    *,
    seed: int = SEED,
    n_runs: int = MC_RUNS,
    turnout_sigma: float = TURNOUT_SIGMA,
    threshold: float = DECISION_THRESHOLD,
) -> dict:
    """
    Draw n_runs samples of Cepeda's two-way share from the posterior, widened by
    turnout/undecided uncertainty, and reduce to probabilities and the margin
    distribution. Deterministic for a fixed seed.

    Returns a dict of plain floats (neutral keys only). `margin` is in
    percentage points of the two-way vote, positive = De la Espriella lead.
    """
    rng = np.random.default_rng(seed)

    # Total draw std: posterior uncertainty of the mean + turnout/undecided term.
    draw_std = float(np.sqrt(post.var + turnout_sigma ** 2))
    share_cepeda = rng.normal(post.mean, draw_std, size=n_runs)
    share_cepeda = np.clip(share_cepeda, 0.0, 1.0)
    share_espriella = 1.0 - share_cepeda

    cepeda_wins = share_cepeda > threshold
    p_cepeda = float(np.mean(cepeda_wins))
    p_espriella = float(1.0 - p_cepeda)

    # Margin in percentage points, positive = Espriella lead.
    margin_pp = (share_espriella - share_cepeda) * 100.0

    def ci(arr: np.ndarray) -> tuple[float, float, float]:
        return (
            float(np.mean(arr)),
            float(np.percentile(arr, CI_LOW_Q)),
            float(np.percentile(arr, CI_HIGH_Q)),
        )

    sc_mean, sc_lo, sc_hi = ci(share_cepeda)
    se_mean, se_lo, se_hi = ci(share_espriella)
    m_mean, m_lo, m_hi = ci(margin_pp)

    return {
        "p_cepeda": round(p_cepeda, 4),
        "p_espriella": round(p_espriella, 4),
        "share_cepeda": {
            "mean": round(sc_mean, 4),
            "ci80_low": round(sc_lo, 4),
            "ci80_high": round(sc_hi, 4),
        },
        "share_espriella": {
            "mean": round(se_mean, 4),
            "ci80_low": round(se_lo, 4),
            "ci80_high": round(se_hi, 4),
        },
        "margin": {
            "mean": round(m_mean, 3),
            "ci80_low": round(m_lo, 3),
            "ci80_high": round(m_hi, 3),
        },
        "draw_std": round(draw_std, 5),
    }


# =============================================================================
# Sensitivity / honesty gate
# =============================================================================


def run_sensitivity(polls: pd.DataFrame, record: dict) -> dict:
    """
    Recompute p_cepeda over the cross-product of house-effect modes (off/on) and
    half-lives (config; 5 vs 10). Same seed throughout so the only thing moving
    is the assumption. Returns the four probabilities plus a verdict.
    """
    arms: dict[str, float] = {}
    p_values: list[float] = []
    winners: list[bool] = []  # True = Cepeda

    for mode in SENS_MODES:
        for h in SENS_HALFLIVES:
            post = aggregate(
                polls, record, halflife=h, house_effects_on=(mode == "on"), cfg=CFG
            )
            mc = monte_carlo(post)
            key = f"house_effects_{mode}__halflife_{int(h) if float(h).is_integer() else h}d"
            arms[key] = mc["p_cepeda"]
            p_values.append(mc["p_cepeda"])
            winners.append(mc["p_cepeda"] > 0.5)

    p_spread = float(max(p_values) - min(p_values))
    winner_flips = len(set(winners)) > 1
    trips_gate = winner_flips or p_spread > FLIP_P_THRESHOLD

    return {
        "arms": arms,
        "p_cepeda_spread": round(p_spread, 4),
        "winner_flips": bool(winner_flips),
        "flip_p_threshold": FLIP_P_THRESHOLD,
        "trips_thin_gate": bool(trips_gate),
        "note": (
            "Each arm reruns the full aggregate + Monte Carlo with one assumption "
            "changed and the same seed. winner_flips is true if p_cepeda crosses "
            "0.5 across arms; the gate also trips if p_cepeda moves more than "
            "flip_p_threshold."
        ),
    }


# =============================================================================
# Provenance
# =============================================================================


def _code_sha() -> str:
    """Current git commit SHA, or 'unknown' if git is unavailable."""
    try:
        out = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            check=True,
        )
        return out.stdout.strip()
    except Exception:  # noqa: BLE001
        return "unknown"


def _data_hash(polls: pd.DataFrame, record: dict) -> str:
    """
    Reproducible hash of the model inputs: the poll data (excluding the per-run
    ingested_at provenance column) and the house-effects record (excluding its
    volatile generated_at). Changes iff the inputs change.
    """
    he_reproducible = {k: v for k, v in record.items() if k != "generated_at"}
    hasher = DataSnapshotHasher()
    hasher.add_dataframe(
        polls.drop(columns=[c for c in ["ingested_at"] if c in polls.columns]),
        label="polls_co_2026",
        sort_by=list(CFG["sort_key"]),
    )
    hasher.add_dict(he_reproducible, label="co_house_effects")
    return hasher.finalise()


# =============================================================================
# Snapshot assembly
# =============================================================================


def build_snapshot(
    polls: pd.DataFrame,
    record: dict,
    headline_post: Posterior,
    headline_mc: dict,
    sensitivity: dict,
    halflife: float,
    *,
    generated_at: datetime,
) -> dict:
    """
    Assemble the website-contract snapshot dict. `generated_at` is added last and
    is the only non-reproducible field (excluded from the snapshot hash).
    """
    n_polls = int(headline_post.n_polls)

    # data_sufficiency: thin if the honesty gate trips or too few polls feed it.
    thin_reasons: list[str] = []
    if sensitivity["winner_flips"]:
        thin_reasons.append(
            "sensitivity gate: the winner flips across the house-effect / half-life arms"
        )
    if sensitivity["p_cepeda_spread"] > FLIP_P_THRESHOLD:
        thin_reasons.append(
            f"sensitivity gate: p_cepeda spread {sensitivity['p_cepeda_spread']} "
            f"> {FLIP_P_THRESHOLD} across arms"
        )
    if n_polls < MIN_POLLS_OK:
        thin_reasons.append(f"only {n_polls} runoff polls (< {MIN_POLLS_OK})")
    data_sufficiency = "thin" if thin_reasons else "ok"

    snapshot = {
        "snapshot_date": AS_OF_DATE.isoformat(),
        "generated_at": generated_at.isoformat(),
        "p_cepeda": headline_mc["p_cepeda"],
        "p_espriella": headline_mc["p_espriella"],
        "share_cepeda": headline_mc["share_cepeda"],
        "share_espriella": headline_mc["share_espriella"],
        "margin": headline_mc["margin"],
        "n_polls": n_polls,
        "newest_poll_date": headline_post.newest_poll_date.isoformat(),
        "oldest_poll_date": headline_post.oldest_poll_date.isoformat(),
        "recency_halflife_days": halflife,
        "house_effect_mode": "soft",
        "mc_runs": MC_RUNS,
        "seed": SEED,
        "data_sufficiency": data_sufficiency,
        "data_sufficiency_reasons": thin_reasons,
        "assumptions": {
            "input_path": "runoff_head_to_head",
            "input_path_note": (
                f"{n_polls} head-to-head Cepeda vs De la Espriella runoff polls fed "
                "the posterior directly; no first-round transfer assumption was used."
            ),
            "share_definition": (
                "Two-way share among the two named candidates: cepeda / "
                "(cepeda + espriella); other + undecided are dropped before "
                "normalisation. share_cepeda + share_espriella = 1."
            ),
            "house_effect_application": (
                "Soft prior: the central estimate is corrected by "
                f"{CFG['aggregator']['house_effect_shrink']} of each pollster's "
                "estimated bloc bias; the un-applied remainder is carried as "
                "variance. Low-confidence firms "
                f"({sorted(CFG['aggregator']['low_confidence_firms'])}) have their "
                f"variance multiplied by {CFG['aggregator']['low_confidence_variance_mult']}."
            ),
            "aggregation": (
                "Precision-weighted normal update. Per-poll precision = recency / "
                "(within-poll variance + tau^2), recency = 0.5**(days_before/H). "
                f"Between-poll heterogeneity: {headline_post.heterogeneity} "
                f"(DerSimonian-Laird tau^2 = {round(headline_post.tau2, 6)}); "
                "closed-form, no MCMC."
            ),
            "recency_halflife_note": (
                f"H = {halflife} days, read from the calibration JSON, not refit. "
                "This is a recency-dominant boundary solution (the lower edge of "
                "the calibrated grid): with the polls 19+ days from the runoff, the "
                "most recent poll carries most of the weight."
            ),
            "turnout_model": (
                f"Each Monte Carlo draw adds a turnout/undecided share-space std of "
                f"{TURNOUT_SIGMA} in quadrature with the posterior std, modelling "
                "uncertainty in how undecided voters and turnout resolve."
            ),
            "margin_sign": "margin is in percentage points, positive = De la Espriella lead.",
            "units": "p_* and share_* are fractions in [0,1]; margin is percentage points.",
        },
        "sensitivity": sensitivity,
        "house_effects_corpus_sha": record.get("corpus_sha"),
        "code_sha": _code_sha(),
        "data_hash": _data_hash(polls, record),
    }
    return snapshot


def _reproducible_view(snapshot: dict) -> dict:
    """The snapshot without the wall-clock field, for a stable content hash."""
    return {k: v for k, v in snapshot.items() if k != "generated_at"}


# =============================================================================
# Main
# =============================================================================


def run(force: bool = False) -> Path:
    """Full simulation pipeline. Returns the path to the snapshot JSON."""
    log.stage("=== simulate_runoff · Session 04 (21J) ===")

    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SNAPSHOT_DIR / f"snapshot_{AS_OF_DATE.strftime('%Y%m%d')}.json"
    if out_path.exists() and not force:
        log.info("Snapshot exists — pass --force to regenerate", path=str(out_path))
        return out_path

    polls, record, halflife = load_inputs()

    log.stage("Aggregating runoff polls (house effects ON, calibrated half-life)")
    headline_post = aggregate(
        polls, record, halflife=halflife, house_effects_on=True, cfg=CFG
    )
    log.info(
        "Posterior",
        share_cepeda_mean=round(headline_post.mean, 4),
        posterior_std=round(headline_post.std, 4),
        tau2=round(headline_post.tau2, 6),
        n_polls=headline_post.n_polls,
    )

    log.stage("Monte Carlo", runs=MC_RUNS, seed=SEED)
    headline_mc = monte_carlo(headline_post)
    log.info(
        "Headline probabilities",
        p_cepeda=headline_mc["p_cepeda"],
        p_espriella=headline_mc["p_espriella"],
        margin_ci80=[headline_mc["margin"]["ci80_low"], headline_mc["margin"]["ci80_high"]],
    )

    log.stage("Sensitivity / honesty gate")
    sensitivity = run_sensitivity(polls, record)
    log.info(
        "Sensitivity",
        spread=sensitivity["p_cepeda_spread"],
        winner_flips=sensitivity["winner_flips"],
        trips_thin=sensitivity["trips_thin_gate"],
    )

    generated_at = datetime.now(timezone.utc)
    snapshot = build_snapshot(
        polls, record, headline_post, headline_mc, sensitivity, halflife,
        generated_at=generated_at,
    )

    out_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8")
    log.success(
        "Snapshot written",
        path=str(out_path),
        p_cepeda=snapshot["p_cepeda"],
        data_sufficiency=snapshot["data_sufficiency"],
    )

    # latest.json pointer → newest snapshot.
    LATEST_POINTER.write_text(
        json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    log.info("latest.json updated", path=str(LATEST_POINTER))

    # Hash the reproducible snapshot (without generated_at) + register it.
    snapshot_sha = hash_dict(_reproducible_view(snapshot))
    hasher = DataSnapshotHasher()
    hasher.add_file(POLLS_PARQUET, label="polls_co_2026_file")
    hasher.add_file(HOUSE_EFFECTS_JSON, label="co_house_effects_file")
    hasher.add_dict(_reproducible_view(snapshot), label="snapshot_21j")
    manifest = hasher.manifest()
    manifest["snapshot_sha"] = snapshot_sha

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, manifest, notes="simulate_runoff")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    print_report(snapshot, snapshot_sha)
    log.success("simulate_runoff complete", output=str(out_path))
    return out_path


def print_report(snapshot: dict, snapshot_sha: str) -> str:
    """Human-readable run report."""
    s = snapshot
    lines = [
        "=" * 70,
        "  El Voto del 21 de Junio — Runoff Posterior (Session 04)",
        f"  snapshot_date : {s['snapshot_date']}   generated_at : {s['generated_at']}",
        "=" * 70,
        f"  p_cepeda      : {s['p_cepeda']:.4f}",
        f"  p_espriella   : {s['p_espriella']:.4f}",
        f"  share_cepeda  : {s['share_cepeda']['mean']:.4f}  "
        f"(CI80 {s['share_cepeda']['ci80_low']:.4f} .. {s['share_cepeda']['ci80_high']:.4f})",
        f"  share_espriella: {s['share_espriella']['mean']:.4f}  "
        f"(CI80 {s['share_espriella']['ci80_low']:.4f} .. {s['share_espriella']['ci80_high']:.4f})",
        f"  margin (pp, + = Espriella): {s['margin']['mean']:.2f}  "
        f"(CI80 {s['margin']['ci80_low']:.2f} .. {s['margin']['ci80_high']:.2f})",
        f"  n_polls       : {s['n_polls']}  ({s['oldest_poll_date']} .. {s['newest_poll_date']})",
        f"  half-life     : {s['recency_halflife_days']} d   house_effect_mode : {s['house_effect_mode']}",
        f"  mc_runs/seed  : {s['mc_runs']} / {s['seed']}",
        "",
        "  Sensitivity (p_cepeda per arm):",
    ]
    for k, v in s["sensitivity"]["arms"].items():
        lines.append(f"    {k:<40} {v:.4f}")
    lines += [
        f"    spread {s['sensitivity']['p_cepeda_spread']:.4f}   "
        f"winner_flips {s['sensitivity']['winner_flips']}",
        "",
        f"  data_sufficiency : {s['data_sufficiency'].upper()}",
    ]
    for r in s["data_sufficiency_reasons"]:
        lines.append(f"     - {r}")
    lines += [
        f"  snapshot_sha  : {snapshot_sha[:16]}",
        f"  code_sha      : {s['code_sha'][:16]}",
        "=" * 70,
    ]
    report = "\n".join(lines)
    print(report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Aggregate 21 de junio de 2026 runoff polls and Monte Carlo the result."
    )
    parser.add_argument("--force", action="store_true", help="Overwrite today's snapshot.")
    args = parser.parse_args()
    run(force=args.force)
