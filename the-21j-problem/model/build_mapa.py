"""
model/build_mapa.py
===================
Session 06 · El Voto del 21 de Junio — Mapa del Voto Decisivo data engine.

Turns the national 2026 runoff margin (Session 04 snapshot) into a per-unit
number: each unit's certified 2022 baseline, its projected 2026 lean under a
uniform additive swing, and a candidate-neutral decisiveness figure. The output
is the dataset the Mapa UI will later read to answer DÓNDE ESTÁS / QUÉ HARÍA
FALTA / QUÉ PUEDES HACER.

Method
------
  * Baseline (FACT): each unit's 2022 two-way share and margin, from certified
    results (ingestion/fetch_baseline.py).
  * Projection (ESTIMATE): uniform additive swing — shift every unit's 2022
    margin by the SAME national delta (national 2026 margin minus national 2022
    margin), carrying the national 80% credible band through as each unit's band.
  * Decisiveness (CIVIC, candidate-neutral): closeness in [0,1], 1 at a projected
    tie, plus the projected margin expressed in votes (a magnitude).
  * Roll-up sanity: potential-vote-weighted mean of the per-unit projections must
    reconstruct the national 2026 margin within tolerance, else the swing model
    or baseline join is broken and the run says so.

Margin sign convention matches the Session 04 snapshot: margin = right - left in
pp, positive = De la Espriella (right) ahead. Bloc labels are neutral lineage
tags. None of the project's banned prediction / betting tokens appear anywhere.

Self-contained under the-21j-problem/. Writes only under data/; registers in the
21J registry; never touches the WC pre-registered logs.

Run
---
  python model/build_mapa.py
  python model/build_mapa.py --force     # overwrite the dataset
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas import MarginBand, MunicipioBaseline, MunicipioProjection  # noqa: E402
from utils.hasher import DataSnapshotHasher, SnapshotRegistry, hash_dict  # noqa: E402
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

with open(PROJECT_ROOT / "config.yaml", encoding="utf-8") as _f:
    CFG = yaml.safe_load(_f)

_MAPA = CFG["mapa"]
BASELINE_CSV = PROJECT_ROOT / _MAPA["paths"]["baseline_csv"]
OUTPUT_JSON = PROJECT_ROOT / _MAPA["paths"]["output_json"]
SNAPSHOT_REG = PROJECT_ROOT / CFG["paths"]["snapshot_registry"]
NATIONAL_SNAPSHOT = PROJECT_ROOT / CFG["paths_session04"]["latest_pointer"]

SWING_MODEL = _MAPA["swing_model"]
TOSS_UP_BAND_PP = float(_MAPA["toss_up_band_pp"])
ROLLUP_TOLERANCE_PP = float(_MAPA["rollup_tolerance_pp"])

_E22 = CFG["calibration"]["elections"]["2022_r2"]
NAT_LEFT_CERT = float(_E22["left_certified_pct"])
NAT_RIGHT_CERT = float(_E22["right_certified_pct"])
# National 2022 two-way margin (right - left, pp). Petro (left) won => negative.
NATIONAL_2022_MARGIN_PP = round(
    (NAT_RIGHT_CERT - NAT_LEFT_CERT) / (NAT_LEFT_CERT + NAT_RIGHT_CERT) * 100.0, 4
)


def _clamp(v: float, lo: float = -100.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


# =============================================================================
# Inputs
# =============================================================================


def load_baseline() -> pd.DataFrame:
    """Load + re-validate every baseline row against MunicipioBaseline."""
    if not BASELINE_CSV.exists():
        raise FileNotFoundError(
            f"Baseline CSV not found: {BASELINE_CSV}. Run ingestion/fetch_baseline.py first."
        )
    df = pd.read_csv(BASELINE_CSV, dtype={"dane_code": str})
    valid: list[dict] = []
    for _, row in df.iterrows():
        model = MunicipioBaseline(
            dane_code=str(row["dane_code"]),
            municipio=str(row["municipio"]),
            departamento=str(row["departamento"]),
            granularity=str(row["granularity"]),
            potential_votes=int(row["potential_votes"]),
            share_left_2022=float(row["share_left_2022"]),
            share_right_2022=float(row["share_right_2022"]),
            margin_2022=float(row["margin_2022"]),
            source=str(row["source"]),
            source_url=str(row["source_url"]),
        )
        valid.append(model.model_dump())
    log.info("Baseline loaded + validated", rows=len(valid))
    return pd.DataFrame(valid)


def load_national_margin() -> dict:
    """Read the Session 04 national 2026 margin (right - left, pp) + its band."""
    if not NATIONAL_SNAPSHOT.exists():
        raise FileNotFoundError(f"Session 04 snapshot not found: {NATIONAL_SNAPSHOT}")
    snap = json.loads(NATIONAL_SNAPSHOT.read_text(encoding="utf-8"))
    margin = snap["margin"]  # mean / ci80_low / ci80_high, pp, right - left
    return {
        "snapshot_date": snap["snapshot_date"],
        "data_sufficiency": snap.get("data_sufficiency"),
        "snapshot_data_hash": snap.get("data_hash"),
        "mean": float(margin["mean"]),
        "ci80_low": float(margin["ci80_low"]),
        "ci80_high": float(margin["ci80_high"]),
    }


# =============================================================================
# Projection
# =============================================================================


def compute_delta(national_2026: dict) -> dict:
    """Uniform swing delta = national 2026 margin minus national 2022 margin."""
    return {
        "mean": round(national_2026["mean"] - NATIONAL_2022_MARGIN_PP, 4),
        "ci80_low": round(national_2026["ci80_low"] - NATIONAL_2022_MARGIN_PP, 4),
        "ci80_high": round(national_2026["ci80_high"] - NATIONAL_2022_MARGIN_PP, 4),
    }


def project_unit(
    dane_code: str, baseline_margin_pp: float, potential_votes: int, delta: dict
) -> tuple[MunicipioProjection, float]:
    """
    Apply the uniform swing to one unit. Returns the validated projection and the
    UNCLAMPED projected mean (for an exact roll-up).
    """
    raw_mean = baseline_margin_pp + delta["mean"]
    mean = _clamp(raw_mean)
    lo = _clamp(baseline_margin_pp + delta["ci80_low"])
    hi = _clamp(baseline_margin_pp + delta["ci80_high"])

    decisiveness = round(max(0.0, min(1.0, 1.0 - abs(mean) / 100.0)), 4)
    margin_votes = int(round(abs(mean) / 100.0 * potential_votes))

    if abs(mean) < TOSS_UP_BAND_PP:
        lean = "toss-up"
    elif mean > 0:
        lean = "right"
    else:
        lean = "left"

    proj = MunicipioProjection(
        dane_code=dane_code,
        projected_margin_2026=MarginBand(mean=round(mean, 4), ci80_low=round(lo, 4), ci80_high=round(hi, 4)),
        decisiveness=decisiveness,
        projected_margin_votes=margin_votes,
        lean=lean,
        is_projection=True,
    )
    return proj, raw_mean


def rollup_check(baseline: pd.DataFrame, raw_means: list[float], national_2026_mean: float) -> dict:
    """Potential-vote-weighted reconstruction of the national margin."""
    w = baseline["potential_votes"].to_numpy(dtype=float)
    reconstructed = float((pd.Series(raw_means).to_numpy() * w).sum() / w.sum())
    residual = reconstructed - national_2026_mean
    passes = abs(residual) <= ROLLUP_TOLERANCE_PP
    return {
        "weight": "potential_votes",
        "reconstructed_margin_pp": round(reconstructed, 4),
        "national_margin_pp": round(national_2026_mean, 4),
        "residual_pp": round(residual, 4),
        "tolerance_pp": ROLLUP_TOLERANCE_PP,
        "passes": bool(passes),
        "note": (
            "Uniform swing is mean-preserving, so the residual reflects censo "
            "weighting vs cast-vote weighting, not a broken join. A many-point "
            "residual would indicate the baseline or swing is broken."
        ),
    }


# =============================================================================
# Provenance
# =============================================================================


def _code_sha() -> str:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=str(PROJECT_ROOT),
            capture_output=True, text=True, check=True,
        )
        return out.stdout.strip()
    except Exception:  # noqa: BLE001
        return "unknown"


def _data_hash(baseline: pd.DataFrame, national_2026: dict, delta: dict) -> str:
    hasher = DataSnapshotHasher()
    hasher.add_dataframe(baseline, label="mapa_baseline", sort_by=["dane_code"])
    hasher.add_dict(
        {
            "national_2022_margin_pp": NATIONAL_2022_MARGIN_PP,
            "national_2026_margin": national_2026,
            "delta": delta,
            "swing_model": SWING_MODEL,
            "toss_up_band_pp": TOSS_UP_BAND_PP,
        },
        label="mapa_params",
    )
    return hasher.finalise()


# =============================================================================
# Assembly
# =============================================================================


def build_dataset(*, generated_at: datetime) -> dict:
    """Assemble the full Mapa dataset dict (generated_at excluded from the hash)."""
    baseline = load_baseline()
    national_2026 = load_national_margin()
    delta = compute_delta(national_2026)

    units: list[dict] = []
    raw_means: list[float] = []
    for _, row in baseline.iterrows():
        proj, raw_mean = project_unit(
            str(row["dane_code"]), float(row["margin_2022"]), int(row["potential_votes"]), delta
        )
        raw_means.append(raw_mean)
        entry = {k: row[k] for k in baseline.columns}
        entry["projection"] = proj.model_dump()
        units.append(entry)

    check = rollup_check(baseline, raw_means, national_2026["mean"])

    geographic = baseline[baseline["dane_code"] != "00"]
    coverage = {
        "granularity": _MAPA["granularity"],
        "total_rows": int(len(baseline)),
        "geographic_units": int(len(geographic)),
        "includes_exterior": bool((baseline["dane_code"] == "00").any()),
        "municipio_coverage": "0 of ~1100 municipios — departamento fallback (municipio file not verifiable)",
        "note": (
            "Departamento granularity: 32 departamentos + Bogotá D.C. as geographic "
            "units, plus the non-geographic Consulados (exterior) bucket kept for the "
            "national roll-up. The map UI joins on dane_code and skips code '00'."
        ),
    }

    dataset = {
        "generated_at": generated_at.isoformat(),
        "granularity": _MAPA["granularity"],
        "coverage": coverage,
        "national_2022_margin_pp": NATIONAL_2022_MARGIN_PP,
        "national_margin_source": {
            "source_file": str(NATIONAL_SNAPSHOT.relative_to(PROJECT_ROOT)),
            "snapshot_date": national_2026["snapshot_date"],
            "data_sufficiency": national_2026["data_sufficiency"],
            "snapshot_data_hash": national_2026["snapshot_data_hash"],
            "margin_mean_pp": national_2026["mean"],
            "margin_ci80_low_pp": national_2026["ci80_low"],
            "margin_ci80_high_pp": national_2026["ci80_high"],
        },
        "swing_delta_pp": delta,
        "rollup_check": check,
        "assumptions": {
            "swing_model": SWING_MODEL,
            "swing_model_note": (
                "Uniform additive swing: every unit's certified 2022 two-way margin "
                "is shifted by the same national delta (national 2026 margin minus "
                "national 2022 margin). No regional/proportional swing is assumed."
            ),
            "margin_sign": "margin = right - left in pp; positive = De la Espriella (right) ahead.",
            "bloc_lineage": "left = Petro (2022) -> Cepeda (2026); right = Hernández (2022) -> De la Espriella (2026).",
            "decisiveness": "1 - |projected_margin_pp| / 100, in [0,1]; civic closeness, candidate-neutral.",
            "projected_margin_votes": "|projected_margin| as a share of potential_votes; a magnitude, not a direction.",
            "toss_up_band_pp": TOSS_UP_BAND_PP,
            "is_projection": "All 2026 fields are model estimates, distinct from the certified 2022 baseline.",
            "uncertainty": "Each unit carries the national 80% credible band, propagated through the uniform delta.",
        },
        "units": units,
        "code_sha": _code_sha(),
        "data_hash": _data_hash(baseline, national_2026, delta),
    }
    return dataset


def _reproducible_view(dataset: dict) -> dict:
    return {k: v for k, v in dataset.items() if k != "generated_at"}


def run(force: bool = False) -> Path:
    """Full Mapa build. Returns the path to the dataset JSON."""
    log.stage("=== build_mapa · Session 06 (21J) ===")

    if OUTPUT_JSON.exists() and not force:
        log.info("Dataset exists — pass --force to regenerate", path=str(OUTPUT_JSON))
        return OUTPUT_JSON

    generated_at = datetime.now(timezone.utc)
    dataset = build_dataset(generated_at=generated_at)

    check = dataset["rollup_check"]
    if not check["passes"]:
        log.warning(
            "Roll-up check FAILED — projections do not reconstruct the national margin",
            residual_pp=check["residual_pp"], tolerance_pp=check["tolerance_pp"],
        )
    else:
        log.success("Roll-up check passed", residual_pp=check["residual_pp"])

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(dataset, indent=2, ensure_ascii=False), encoding="utf-8")
    log.success("Mapa dataset written", path=str(OUTPUT_JSON), units=len(dataset["units"]))

    snapshot_sha = hash_dict(_reproducible_view(dataset))
    hasher = DataSnapshotHasher()
    hasher.add_file(BASELINE_CSV, label="mapa_baseline_csv")
    hasher.add_dict(_reproducible_view(dataset), label="mapa_dataset")
    manifest = hasher.manifest()
    manifest["snapshot_sha"] = snapshot_sha
    SnapshotRegistry(SNAPSHOT_REG).register(snapshot_sha, manifest, notes="build_mapa")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    print_report(dataset, snapshot_sha)
    log.success("build_mapa complete", output=str(OUTPUT_JSON))
    return OUTPUT_JSON


def print_report(dataset: dict, snapshot_sha: str) -> str:
    d = dataset
    chk = d["rollup_check"]
    lines = [
        "=" * 70,
        "  El Voto del 21 de Junio — Mapa del Voto Decisivo (Session 06)",
        f"  granularity : {d['granularity']}   units : {len(d['units'])}",
        "=" * 70,
        f"  national 2022 margin (right-left pp) : {d['national_2022_margin_pp']}",
        f"  national 2026 margin (pp)            : {d['national_margin_source']['margin_mean_pp']}",
        f"  swing delta (pp)                     : {d['swing_delta_pp']['mean']}",
        f"  roll-up reconstructed / national     : {chk['reconstructed_margin_pp']} / {chk['national_margin_pp']}",
        f"  roll-up residual (tol {chk['tolerance_pp']} pp)      : {chk['residual_pp']}  -> {'PASS' if chk['passes'] else 'FAIL'}",
        f"  coverage : {d['coverage']['geographic_units']} geographic units (+exterior); {d['coverage']['municipio_coverage']}",
        "",
        "  Example units (margin pp, + = right):",
    ]
    by_margin = sorted(
        [u for u in d["units"] if u["dane_code"] != "00"],
        key=lambda u: u["projection"]["projected_margin_2026"]["mean"],
    )
    examples = [by_margin[0], by_margin[len(by_margin) // 2], by_margin[-1]]
    for u in examples:
        p = u["projection"]
        lines.append(
            f"    {u['municipio']:<20} 2022 {u['margin_2022']:+7.2f}  ->  2026 "
            f"{p['projected_margin_2026']['mean']:+7.2f} "
            f"[{p['projected_margin_2026']['ci80_low']:+.1f},{p['projected_margin_2026']['ci80_high']:+.1f}] "
            f"{p['lean']:<8} decisiveness={p['decisiveness']}"
        )
    lines += [
        "",
        f"  snapshot_sha : {snapshot_sha[:16]}",
        f"  code_sha     : {d['code_sha'][:16]}",
        "=" * 70,
    ]
    report = "\n".join(lines)
    print(report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the Mapa del Voto Decisivo per-unit dataset.")
    parser.add_argument("--force", action="store_true", help="Overwrite the dataset.")
    args = parser.parse_args()
    run(force=args.force)
