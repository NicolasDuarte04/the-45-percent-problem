"""
pulso/combine.py
================
Combine the AVAILABLE inputs into a single 0-100 index, then smooth over the
append-only history.

Two rules govern the combine, both from the brief:
  * Combine ONLY available inputs, renormalising the pre-registered weights
    across whatever is live. An unavailable input drops out cleanly; it never
    drags the index toward zero.
  * Below `min_inputs_ok` live inputs, the index is labelled "demo".

Everything here is a pure function so the combiner and the 6-hour smoothing can
be unit-tested against fixtures with no network and no disk. `index_raw` is a
convex combination of values already in [0,100], so it is guaranteed to land in
[0,100]; it is None only when zero inputs are live (honest degradation, never a
fabricated number).
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas import InputReading  # noqa: E402


def combine_readings(readings: list[InputReading], *, min_inputs_ok: int) -> dict:
    """
    Weighted combine over live readings only, with weights renormalised across
    the live set. Pure.

    Returns {index_raw, inputs_live, inputs_total, data_sufficiency,
             live_sources, weight_sum}. `index_raw` is None iff no input is live
    (or the live weights sum to zero).
    """
    inputs_total = len(readings)
    live = [r for r in readings if r.available and r.value is not None and r.weight > 0]
    inputs_live = sum(1 for r in readings if r.available and r.value is not None)

    weight_sum = sum(r.weight for r in live)
    if not live or weight_sum <= 0:
        index_raw: float | None = None
    else:
        weighted = sum(float(r.value) * r.weight for r in live)
        index_raw = round(max(0.0, min(100.0, weighted / weight_sum)), 2)

    data_sufficiency = "ok" if inputs_live >= min_inputs_ok else "demo"

    return {
        "index_raw": index_raw,
        "inputs_live": inputs_live,
        "inputs_total": inputs_total,
        "data_sufficiency": data_sufficiency,
        "live_sources": [r.source for r in live],
        "weight_sum": round(weight_sum, 6),
    }


def rolling_smooth(current_raw: float | None, recent_raws: list[float]) -> float | None:
    """
    6-hour rolling mean: average the current raw index with the prior raw indices
    already inside the smoothing window. Pure.

    None values are ignored. Returns None only when there is nothing to average
    (current raw is None and no recent raws).
    """
    pool = [v for v in ([current_raw] + list(recent_raws)) if v is not None]
    if not pool:
        return None
    return round(sum(pool) / len(pool), 2)


def _parse_hour(value: str) -> datetime:
    """
    Parse an ISO hour timestamp, tolerating the trailing 'Z' that Pydantic emits
    (Python 3.9's fromisoformat rejects it). Naive timestamps are assumed UTC.
    """
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    dt = datetime.fromisoformat(value)
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def load_recent_raws(
    history_path: Path,
    current_hour: datetime,
    window_hours: int,
) -> list[float]:
    """
    Read prior `index_raw` values from the append-only history whose
    `snapshot_hour` falls strictly before `current_hour` but within
    `window_hours` of it. Missing file -> []. Malformed lines are skipped.
    """
    history_path = Path(history_path)
    if not history_path.exists():
        return []

    window_start = current_hour - timedelta(hours=window_hours)
    out: list[float] = []
    with history_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                hour = _parse_hour(row["snapshot_hour"])
            except (ValueError, KeyError, TypeError):
                continue
            raw = row.get("index_raw")
            if raw is None:
                continue
            if window_start < hour < current_hour:
                out.append(float(raw))
    return out
