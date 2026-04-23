"""
evaluation/forecast_log.py
==========================
Append-only forecast store.  Phase 7, Module 1.

Single source of truth for every probability the project has ever produced.
All five design invariants (write-once, dual hashing, seed transparency,
UTC timestamps, schema versioning) are enforced here.

Storage layout::

    evaluation/
      forecasts/
        {tournament}/
          {match_id}/
            opening.jsonl
            closing.jsonl
            corrections.jsonl
        index.parquet    ← materialised view, rebuilt nightly, never primary

Key exceptions:
  DirtyWorkingTreeError     — git HEAD not clean at emission time
  UnregisteredSnapshotError — data_sha not in snapshot registry
  DuplicateEmissionError    — (match_id, model_id, market_phase) already written
  InvalidProbabilityError   — p_model does not sum to 1 ± 1e-9
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import pandas as pd
from pydantic import BaseModel, Field, model_validator

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# ULID generator  (no external dependency)
# ---------------------------------------------------------------------------

_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _encode_crockford(n: int, length: int) -> str:
    chars: list[str] = []
    for _ in range(length):
        chars.append(_CROCKFORD[n & 0x1F])
        n >>= 5
    return "".join(reversed(chars))


def generate_ulid() -> str:
    """Return a new 26-character ULID (48-bit ms timestamp + 80-bit random)."""
    ts_ms = int(time.time() * 1000)
    rand = int.from_bytes(os.urandom(10), "big")
    return _encode_crockford(ts_ms, 10) + _encode_crockford(rand, 16)


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class DirtyWorkingTreeError(RuntimeError):
    """Raised when the git working tree has uncommitted changes."""


class UnregisteredSnapshotError(ValueError):
    """Raised when data_sha is not registered in snapshot_registry.jsonl."""


class DuplicateEmissionError(ValueError):
    """Raised when (match_id, model_id, market_phase) tuple already exists."""


class InvalidProbabilityError(ValueError):
    """Raised when p_model does not sum to 1.0 within 1e-9."""


# ---------------------------------------------------------------------------
# Pydantic schema — Phase 7 ForecastRecord  (schema_version = "7.0")
# ---------------------------------------------------------------------------


class ProbVector(BaseModel):
    """Outcome probability triplet {H, D, A} — must sum to 1 ± 1e-9."""

    H: float = Field(ge=0.0, le=1.0)
    D: float = Field(ge=0.0, le=1.0)
    A: float = Field(ge=0.0, le=1.0)

    model_config = {"frozen": True}

    @model_validator(mode="after")
    def _check_sum(self) -> "ProbVector":
        total = self.H + self.D + self.A
        if abs(total - 1.0) > 1e-9:
            raise InvalidProbabilityError(
                f"ProbVector must sum to 1 ± 1e-9, got {total:.12f}"
            )
        return self


class ForecastRecord(BaseModel):
    """
    One JSONL row in the Phase 7 forecast log.

    The caller supplies all fields.  Use :func:`make_forecast_record` to
    auto-generate ``forecast_id`` and ``emitted_at_utc``.
    """

    forecast_id: str = Field(description="ULID — monotonic, collision-free")
    schema_version: str = Field(default="7.0")
    emitted_at_utc: str = Field(description="ISO-8601 UTC with ms, suffix Z")
    match_id: str
    model_id: str
    is_champion: bool = Field(description="True iff model_id == M_STAR")
    market_phase: str = Field(description="'opening' or 'closing'")

    # Probabilities
    p_model: ProbVector
    p_model_markets: dict[str, Any] = Field(
        default_factory=dict,
        description="Derivative market probs (M_STAR only)",
    )
    q_market_raw: dict[str, float] = Field(
        default_factory=dict, description="Raw Pinnacle decimal odds"
    )
    q_market_devigged: dict[str, float] = Field(
        default_factory=dict, description="Power-method de-vigged probs"
    )
    pinnacle_bias_applied: dict[str, float] = Field(default_factory=dict)

    # Reproducibility
    code_sha: str = Field(description="git rev-parse --short HEAD, clean tree")
    data_sha: str = Field(description="SHA-256 of Parquet snapshot used")
    mc_seed: int
    mc_runs: int

    # Gate / edge / sizing
    volatility_gate_state: dict[str, Any] = Field(default_factory=dict)
    edge: dict[str, Any] = Field(default_factory=dict)
    kelly_stake_pct: float = Field(ge=0.0)

    notes: str = ""

    model_config = {"frozen": True}

    @model_validator(mode="after")
    def _validate_model_id(self) -> "ForecastRecord":
        valid = {"M0", "M1", "M2", "M3", "M_STAR"}
        if self.model_id not in valid:
            raise ValueError(f"model_id '{self.model_id}' not in {valid}")
        return self

    @model_validator(mode="after")
    def _validate_phase(self) -> "ForecastRecord":
        if self.market_phase not in {"opening", "closing"}:
            raise ValueError(f"market_phase must be 'opening' or 'closing'")
        return self

    @model_validator(mode="after")
    def _validate_champion_flag(self) -> "ForecastRecord":
        if self.is_champion != (self.model_id == "M_STAR"):
            raise ValueError(
                f"is_champion={self.is_champion} inconsistent with model_id='{self.model_id}'"
            )
        return self


@dataclass
class CorrectionRecord:
    correction_id: str
    schema_version: str
    emitted_at_utc: str
    original_forecast_id: str
    reason_code: str
    payload: dict[str, Any]


VALID_CORRECTION_CODES: frozenset[str] = frozenset(
    {
        "CORR_DATA_FIX",
        "CORR_ALIAS_RESOLVED",
        "CORR_SCHEMA_MIGRATION",
        "CORR_KICKOFF_MOVED",
    }
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _now_utc_ms() -> str:
    """Return current UTC time as ISO-8601 with millisecond precision + Z."""
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"


def _get_clean_git_sha(project_root: Path) -> str:
    """Return short HEAD SHA; raise DirtyWorkingTreeError if tree is dirty."""
    try:
        status = subprocess.check_output(
            ["git", "status", "--porcelain"],
            cwd=project_root,
            stderr=subprocess.DEVNULL,
        ).decode().strip()
        if status:
            raise DirtyWorkingTreeError(
                "Git working tree has uncommitted changes.  Commit or stash "
                f"before emitting forecasts.\n{status}"
            )
        sha = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=project_root,
            stderr=subprocess.DEVNULL,
        ).decode().strip()
        return sha
    except subprocess.CalledProcessError as exc:
        raise DirtyWorkingTreeError(f"git command failed: {exc}") from exc


def _check_snapshot_registered(data_sha: str, project_root: Path) -> None:
    """Raise UnregisteredSnapshotError if data_sha is not in registry."""
    registry = project_root / "data" / "snapshots" / "snapshot_registry.jsonl"
    if not registry.exists():
        log.warning(
            "snapshot_registry.jsonl not found; skipping snapshot check",
            registry=str(registry),
        )
        return
    with open(registry, encoding="utf-8") as fh:
        for raw in fh:
            raw = raw.strip()
            if not raw:
                continue
            try:
                row = json.loads(raw)
                # Support both 'snapshot_sha' (SnapshotRegistry) and 'sha' keys
                if row.get("snapshot_sha") == data_sha or row.get("sha") == data_sha:
                    return
            except json.JSONDecodeError:
                continue
    raise UnregisteredSnapshotError(
        f"data_sha '{data_sha}' is not registered in snapshot_registry.jsonl. "
        "Register the snapshot before emitting forecasts."
    )


def _phase_file(root: Path, tournament: str, match_id: str, phase: str) -> Path:
    return root / "evaluation" / "forecasts" / tournament / match_id / f"{phase}.jsonl"


def _corrections_file(root: Path, tournament: str, match_id: str) -> Path:
    return root / "evaluation" / "forecasts" / tournament / match_id / "corrections.jsonl"


def _index_file(root: Path) -> Path:
    return root / "evaluation" / "forecasts" / "index.parquet"


def _append_row(path: Path, json_str: str) -> None:
    """Append one JSON line atomically with fsync.  Thread-safe via flock."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        try:
            import fcntl
            fcntl.flock(fh, fcntl.LOCK_EX)
        except (ImportError, OSError):
            pass  # Non-POSIX fallback: no locking, fsync still called
        fh.write(json_str + "\n")
        fh.flush()
        os.fsync(fh.fileno())
        try:
            import fcntl
            fcntl.flock(fh, fcntl.LOCK_UN)
        except (ImportError, OSError):
            pass


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    """Read a JSONL file, returning parsed dicts in file order."""
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def _check_duplicate(path: Path, match_id: str, model_id: str, phase: str) -> None:
    """Raise DuplicateEmissionError if the (match_id, model_id, phase) key exists."""
    for row in _read_jsonl(path):
        if (
            row.get("match_id") == match_id
            and row.get("model_id") == model_id
            and row.get("market_phase") == phase
        ):
            raise DuplicateEmissionError(
                f"Row ({match_id!r}, {model_id!r}, {phase!r}) already present in {path}. "
                "Use emit_correction() to record amendments."
            )


def _sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def make_forecast_record(
    match_id: str,
    model_id: str,
    market_phase: str,
    p_home: float,
    p_draw: float,
    p_away: float,
    code_sha: str,
    data_sha: str,
    mc_seed: int,
    mc_runs: int,
    kelly_stake_pct: float = 0.0,
    q_market_raw: Optional[dict[str, float]] = None,
    q_market_devigged: Optional[dict[str, float]] = None,
    pinnacle_bias_applied: Optional[dict[str, float]] = None,
    volatility_gate_state: Optional[dict[str, Any]] = None,
    edge: Optional[dict[str, Any]] = None,
    p_model_markets: Optional[dict[str, Any]] = None,
    notes: str = "",
) -> ForecastRecord:
    """
    Construct a :class:`ForecastRecord` with an auto-generated ULID and
    current UTC timestamp.  Validates ``p_model`` sum before returning.
    """
    return ForecastRecord(
        forecast_id=generate_ulid(),
        emitted_at_utc=_now_utc_ms(),
        match_id=match_id,
        model_id=model_id,
        is_champion=(model_id == "M_STAR"),
        market_phase=market_phase,
        p_model=ProbVector(H=p_home, D=p_draw, A=p_away),
        p_model_markets=p_model_markets or {},
        q_market_raw=q_market_raw or {},
        q_market_devigged=q_market_devigged or {},
        pinnacle_bias_applied=pinnacle_bias_applied or {},
        code_sha=code_sha,
        data_sha=data_sha,
        mc_seed=mc_seed,
        mc_runs=mc_runs,
        volatility_gate_state=volatility_gate_state or {},
        edge=edge or {},
        kelly_stake_pct=kelly_stake_pct,
        notes=notes,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def emit_opening(
    forecast: ForecastRecord,
    project_root: Path = PROJECT_ROOT,
    tournament: str = "FIFA2026",
    *,
    skip_git_check: bool = False,
    skip_snapshot_check: bool = False,
) -> str:
    """
    Append a single forecast row at opening-line capture.

    Returns the ``forecast_id``.  Raises :exc:`DirtyWorkingTreeError` if the
    git working tree is not clean.  Raises :exc:`DuplicateEmissionError` if
    ``(match_id, model_id, 'opening')`` has already been written.
    """
    if not skip_git_check:
        _get_clean_git_sha(project_root)
    if not skip_snapshot_check:
        _check_snapshot_registered(forecast.data_sha, project_root)

    path = _phase_file(project_root, tournament, forecast.match_id, "opening")
    _check_duplicate(path, forecast.match_id, forecast.model_id, "opening")

    row = forecast.model_dump()
    _append_row(path, json.dumps(row, separators=(",", ":")))
    log.info(
        "emit_opening",
        forecast_id=forecast.forecast_id,
        match_id=forecast.match_id,
        model_id=forecast.model_id,
    )
    return forecast.forecast_id


def emit_closing(
    forecast: ForecastRecord,
    project_root: Path = PROJECT_ROOT,
    tournament: str = "FIFA2026",
    *,
    skip_git_check: bool = False,
    skip_snapshot_check: bool = False,
) -> str:
    """
    Append a closing-line record at T-5 min.  Same invariants as
    :func:`emit_opening`.  Returns ``forecast_id``.
    """
    if not skip_git_check:
        _get_clean_git_sha(project_root)
    if not skip_snapshot_check:
        _check_snapshot_registered(forecast.data_sha, project_root)

    path = _phase_file(project_root, tournament, forecast.match_id, "closing")
    _check_duplicate(path, forecast.match_id, forecast.model_id, "closing")

    row = forecast.model_dump()
    _append_row(path, json.dumps(row, separators=(",", ":")))
    log.info(
        "emit_closing",
        forecast_id=forecast.forecast_id,
        match_id=forecast.match_id,
        model_id=forecast.model_id,
    )
    return forecast.forecast_id


def emit_correction(
    original_forecast_id: str,
    reason_code: str,
    payload: dict[str, Any],
    match_id: str,
    project_root: Path = PROJECT_ROOT,
    tournament: str = "FIFA2026",
    *,
    skip_git_check: bool = False,
) -> str:
    """
    Append a correction record.  The original row is **never** edited.

    Parameters
    ----------
    original_forecast_id
        The ``forecast_id`` of the row being corrected.
    reason_code
        Must be one of the values in :data:`VALID_CORRECTION_CODES`.
    payload
        Arbitrary correction details (the corrected values, etc.).
    match_id
        Used to locate the correct ``corrections.jsonl`` file.

    Returns the new ``correction_id`` (ULID).
    """
    if reason_code not in VALID_CORRECTION_CODES:
        raise ValueError(
            f"reason_code '{reason_code}' is not valid.  "
            f"Allowed: {sorted(VALID_CORRECTION_CODES)}"
        )
    if not skip_git_check:
        _get_clean_git_sha(project_root)

    correction_id = generate_ulid()
    correction = {
        "correction_id": correction_id,
        "schema_version": "7.0",
        "emitted_at_utc": _now_utc_ms(),
        "original_forecast_id": original_forecast_id,
        "reason_code": reason_code,
        "payload": payload,
    }
    path = _corrections_file(project_root, tournament, match_id)
    _append_row(path, json.dumps(correction, separators=(",", ":")))
    log.info(
        "emit_correction",
        correction_id=correction_id,
        reason_code=reason_code,
        original_forecast_id=original_forecast_id,
    )
    return correction_id


def read(
    match_id: str,
    model_id: Optional[str] = None,
    project_root: Path = PROJECT_ROOT,
    tournament: str = "FIFA2026",
) -> list[ForecastRecord]:
    """
    Return all forecast rows for ``match_id`` in emission order.

    Optionally filter to a single ``model_id``.  Invalid rows are logged as
    warnings and skipped (no silent filtering of valid rows).
    """
    result: list[ForecastRecord] = []
    for phase in ("opening", "closing"):
        path = _phase_file(project_root, tournament, match_id, phase)
        for row in _read_jsonl(path):
            if model_id is not None and row.get("model_id") != model_id:
                continue
            try:
                result.append(ForecastRecord.model_validate(row))
            except Exception as exc:  # noqa: BLE001
                log.warning(
                    "Skipping malformed forecast row",
                    match_id=match_id,
                    phase=phase,
                    error=str(exc),
                )
    return result


def rebuild_index(
    project_root: Path = PROJECT_ROOT,
    tournament: str = "FIFA2026",
) -> None:
    """
    Materialise ``index.parquet`` from all JSONL files.

    Non-destructive (never touches JSONL files) and idempotent
    (two consecutive calls produce byte-identical Parquet).
    """
    forecasts_root = project_root / "evaluation" / "forecasts" / tournament
    if not forecasts_root.exists():
        log.warning("rebuild_index: forecasts directory not found", path=str(forecasts_root))
        return

    all_rows: list[dict[str, Any]] = []
    for phase in ("opening", "closing"):
        for jsonl_path in sorted(forecasts_root.rglob(f"{phase}.jsonl")):
            all_rows.extend(_read_jsonl(jsonl_path))

    if not all_rows:
        log.warning("rebuild_index: no forecast rows found under", path=str(forecasts_root))
        return

    df = pd.DataFrame(all_rows)

    # Serialize dict/object columns as JSON strings (PyArrow can't infer empty-dict schemas)
    _object_cols = [
        "p_model", "p_model_markets", "q_market_raw", "q_market_devigged",
        "pinnacle_bias_applied", "volatility_gate_state", "edge",
    ]
    for col in _object_cols:
        if col in df.columns:
            df[col] = df[col].apply(lambda v: json.dumps(v, separators=(",", ":")) if isinstance(v, (dict, list)) else str(v))

    # Deterministic column order for byte-identical Parquet across runs
    head_cols = [
        "forecast_id",
        "schema_version",
        "emitted_at_utc",
        "match_id",
        "model_id",
        "is_champion",
        "market_phase",
        "code_sha",
        "data_sha",
        "mc_seed",
        "mc_runs",
        "kelly_stake_pct",
        "notes",
    ]
    ordered = [c for c in head_cols if c in df.columns] + sorted(
        c for c in df.columns if c not in head_cols
    )
    df = (
        df[ordered]
        .sort_values(["match_id", "model_id", "market_phase", "emitted_at_utc"])
        .reset_index(drop=True)
    )

    out = _index_file(project_root)
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out, index=False, engine="pyarrow")
    log.success("rebuild_index", rows=len(df), path=str(out))


def pre_reg_constants_sha(project_root: Path = PROJECT_ROOT) -> str:
    """Return the SHA-256 of the frozen pre_reg_constants.yaml."""
    yaml_path = project_root / "evaluation" / "pre_reg_constants.yaml"
    return _sha256_of_file(yaml_path)
