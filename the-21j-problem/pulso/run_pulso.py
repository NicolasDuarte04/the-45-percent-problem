"""
pulso/run_pulso.py
==================
Session 05 · El Voto del 21 de Junio — Pulso Patrio orchestrator.

Fetches every wired input, combines the available ones into a single 0-100
index, smooths over the 6-hour append-only history, and writes the hourly
snapshot the detail page will later read. The index reports how many inputs are
live and degrades honestly: nothing is fabricated to fill a missing input.

What Pulso is (governs the design):
  * A measure of INTENSITY and emotional charge, not direction. Candidate-neutral
    by construction. It does not say who is ahead.
  * Sentiment, not probability. The candidate probabilities live in the Session
    04 snapshot; Pulso sits beside them, never replaces them.
  * None of the project's banned prediction / betting tokens appear in any key,
    value, or comment (enforced by tests/test_pulso.py).

Outputs (all under the-21j-problem/data/snapshots/pulso/):
  pulso_YYYYMMDDHH.json   — this hour's snapshot
  pulso_history.jsonl     — append-only hourly history (one row per hour)
  latest.json             — pointer to the newest snapshot
  ...and the snapshot SHA is registered in the 21J snapshot registry.

Run
---
  python pulso/run_pulso.py
  python pulso/run_pulso.py --force     # regenerate this hour's snapshot
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pulso.combine import combine_readings, load_recent_raws, rolling_smooth  # noqa: E402
from pulso.input_headlines import HeadlinesInput  # noqa: E402
from pulso.input_market import MarketInput  # noqa: E402
from pulso.input_tiktok import TikTokInput  # noqa: E402
from pulso.input_trends import TrendsInput  # noqa: E402
from pulso.input_x import XInput  # noqa: E402
from schemas import InputReading, PulsoSnapshot  # noqa: E402
from utils.hasher import DataSnapshotHasher, SnapshotRegistry, hash_dict  # noqa: E402
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

# =============================================================================
# Config
# =============================================================================

with open(PROJECT_ROOT / "config.yaml", encoding="utf-8") as _f:
    CFG = yaml.safe_load(_f)

_PULSO = CFG["pulso"]
WEIGHTS = _PULSO["weights"]
SMOOTHING_WINDOW_HOURS = int(_PULSO["smoothing_window_hours"])
MIN_INPUTS_OK = int(_PULSO["min_inputs_ok"])

SNAPSHOT_DIR = PROJECT_ROOT / CFG["paths_session05"]["snapshot_dir"]
HISTORY_JSONL = PROJECT_ROOT / CFG["paths_session05"]["history_jsonl"]
LATEST_POINTER = PROJECT_ROOT / CFG["paths_session05"]["latest_pointer"]
SNAPSHOT_REG = PROJECT_ROOT / CFG["paths"]["snapshot_registry"]

# Plain-language methodology recorded in every snapshot. Intensity / sentiment,
# never probability, never directional. No banned prediction / betting tokens.
METHODOLOGY = (
    "El Pulso Patrio mide la intensidad y la carga emocional de la conversacion "
    "sobre la segunda vuelta. Es una medida de cuanto y con que fuerza se habla, "
    "no una probabilidad y no dice quien va adelante. Las probabilidades por "
    "candidato viven aparte, en el snapshot del modelo. Las senales que parecen "
    "direccionales (divergencia de busquedas, spread de mercado) entran solo como "
    "magnitud y volatilidad. Se combinan unicamente las entradas disponibles, "
    "renormalizando sus pesos; con menos de dos entradas vivas el indice se marca "
    "como demo."
)


# =============================================================================
# Input registry
# =============================================================================


def build_inputs() -> list:
    """Instantiate every wired input with its pre-registered weight."""
    return [
        HeadlinesInput(weight=WEIGHTS["headlines"], cfg=_PULSO),
        TrendsInput(weight=WEIGHTS["trends"], cfg=_PULSO),
        MarketInput(weight=WEIGHTS["market"], cfg=_PULSO),
        XInput(weight=WEIGHTS["x"], cfg=_PULSO),
        TikTokInput(weight=WEIGHTS["tiktok"], cfg=_PULSO),
    ]


def gather_readings() -> list[InputReading]:
    """Fetch every input. A fetch must not raise; if one does, record a blank."""
    readings: list[InputReading] = []
    for inp in build_inputs():
        try:
            reading = inp.fetch()
        except Exception as exc:  # noqa: BLE001 — defensive; never let one input kill the run
            log.warning("Input raised in fetch", source=inp.source, error=str(exc).splitlines()[0])
            reading = InputReading(
                source=inp.source,
                value=None,
                available=False,
                weight=inp.weight,
                note=f"fetch raised: {str(exc).splitlines()[0]}",
            )
        status = "live" if reading.available else "unavailable"
        log.info("Input read", source=reading.source, status=status, value=reading.value)
        readings.append(reading)
    return readings


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


def _data_hash(readings: list[InputReading]) -> str:
    """
    Reproducible hash of the readings' substance (source, value, available,
    weight), excluding the volatile fetched_at. Changes iff the inputs change.
    """
    substance = sorted(
        (
            {
                "source": r.source,
                "value": r.value,
                "available": r.available,
                "weight": r.weight,
            }
            for r in readings
        ),
        key=lambda d: d["source"],
    )
    return hash_dict({"readings": substance})


# =============================================================================
# Snapshot assembly
# =============================================================================


def build_snapshot(
    readings: list[InputReading],
    *,
    now: datetime,
    history_path: Path = HISTORY_JSONL,
) -> PulsoSnapshot:
    """
    Combine the readings, smooth over the history window, and assemble a
    validated PulsoSnapshot. Pure apart from reading the history file.
    """
    snapshot_hour = now.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)

    combined = combine_readings(readings, min_inputs_ok=MIN_INPUTS_OK)
    recent_raws = load_recent_raws(history_path, snapshot_hour, SMOOTHING_WINDOW_HOURS)
    index_value = rolling_smooth(combined["index_raw"], recent_raws)

    return PulsoSnapshot(
        snapshot_hour=snapshot_hour,
        generated_at=now.astimezone(timezone.utc),
        index_value=index_value,
        index_raw=combined["index_raw"],
        inputs_live=combined["inputs_live"],
        inputs_total=combined["inputs_total"],
        readings=readings,
        data_sufficiency=combined["data_sufficiency"],
        methodology=METHODOLOGY,
        code_sha=_code_sha(),
        data_hash=_data_hash(readings),
    )


def _reproducible_view(snapshot: dict) -> dict:
    """The snapshot without wall-clock fields, for a stable content hash."""
    return {k: v for k, v in snapshot.items() if k not in ("generated_at",)}


def _serialise(snapshot: PulsoSnapshot) -> dict:
    """PulsoSnapshot -> JSON-ready dict with ISO timestamps."""
    return json.loads(snapshot.model_dump_json())


# =============================================================================
# Main
# =============================================================================


def run(
    force: bool = False,
    *,
    readings: list[InputReading] | None = None,
    now: datetime | None = None,
) -> Path:
    """
    Full Pulso pipeline. Returns the path to this hour's snapshot JSON.

    `readings` and `now` are injectable so the pipeline can be exercised offline
    and deterministically in tests; in production both default to a live fetch
    and the current UTC time.
    """
    log.stage("=== run_pulso · Session 05 (21J) ===")

    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    snapshot_hour = now.replace(minute=0, second=0, microsecond=0)

    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SNAPSHOT_DIR / f"pulso_{snapshot_hour.strftime('%Y%m%d%H')}.json"
    already_existed = out_path.exists()
    if already_existed and not force:
        log.info("Snapshot for this hour exists — pass --force to regenerate", path=str(out_path))
        return out_path

    if readings is None:
        log.stage("Fetching inputs")
        readings = gather_readings()

    snapshot = build_snapshot(readings, now=now, history_path=HISTORY_JSONL)
    payload = _serialise(snapshot)

    # Hourly snapshot + latest pointer.
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    LATEST_POINTER.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # Append to the append-only history exactly once per hour. A forced
    # regeneration rewrites the hourly file but does NOT add a duplicate-hour row.
    if not already_existed:
        with HISTORY_JSONL.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
        log.info("History appended", path=str(HISTORY_JSONL))
    else:
        log.info("History not appended (hour already recorded; append-only)", hour=snapshot_hour.isoformat())

    # Register the reproducible snapshot SHA in the 21J registry.
    snapshot_sha = hash_dict(_reproducible_view(payload))
    hasher = DataSnapshotHasher()
    hasher.add_dict(_reproducible_view(payload), label="pulso_snapshot")
    manifest = hasher.manifest()
    manifest["snapshot_sha"] = snapshot_sha
    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, manifest, notes="run_pulso")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    print_report(payload, snapshot_sha)
    log.success("run_pulso complete", output=str(out_path))
    return out_path


def print_report(snapshot: dict, snapshot_sha: str) -> str:
    """Human-readable run report."""
    s = snapshot
    lines = [
        "=" * 70,
        "  El Voto del 21 de Junio — Pulso Patrio (Session 05)",
        f"  snapshot_hour : {s['snapshot_hour']}   generated_at : {s['generated_at']}",
        "=" * 70,
        f"  index_value (6h smoothed) : {s['index_value']}",
        f"  index_raw                 : {s['index_raw']}",
        f"  inputs_live / total       : {s['inputs_live']} / {s['inputs_total']}",
        f"  data_sufficiency          : {s['data_sufficiency'].upper()}",
        "",
        "  Per-input status:",
    ]
    for r in s["readings"]:
        status = "live" if r["available"] else "unavailable"
        val = r["value"] if r["value"] is not None else "-"
        lines.append(f"    {r['source']:<10} {status:<12} value={val!s:<7} w={r['weight']}  {r['note'] or ''}")
    lines += [
        "",
        f"  snapshot_sha : {snapshot_sha[:16]}",
        f"  code_sha     : {s['code_sha'][:16]}",
        "=" * 70,
    ]
    report = "\n".join(lines)
    print(report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Combine Pulso Patrio inputs into a 0-100 hourly intensity index."
    )
    parser.add_argument("--force", action="store_true", help="Regenerate this hour's snapshot.")
    args = parser.parse_args()
    run(force=args.force)
