"""
utils/hasher.py
===============
SHA-256 snapshot hashing for The 45% Problem.

Every figure in the academic paper can be reproduced by checking out a
specific code SHA and loading the corresponding data snapshot SHA. This
module provides the tools to compute, store, and verify those hashes.

Usage:
    from utils.hasher import hash_file, hash_dataframe, DataSnapshotHasher

    # Hash a single file
    sha = hash_file("data/raw/historical_matches.parquet")

    # Combine multiple sources into one snapshot SHA
    hasher = DataSnapshotHasher()
    hasher.add_file("data/raw/historical_matches.parquet")
    hasher.add_file("data/raw/elo_ratings.parquet")
    snapshot_sha = hasher.finalise()
    # → store snapshot_sha in every ForecastRecord for this batch run
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd


# =============================================================================
# Primitive hashers
# =============================================================================


def hash_string(value: str, *, truncate: int = 64) -> str:
    """SHA-256 of a UTF-8 string, returning the first `truncate` hex chars."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:truncate]


def hash_bytes(data: bytes, *, truncate: int = 64) -> str:
    """SHA-256 of raw bytes."""
    return hashlib.sha256(data).hexdigest()[:truncate]


def hash_file(path: str | Path, *, truncate: int = 64, chunk_size: int = 1 << 20) -> str:
    """
    SHA-256 of a file's contents, streamed in chunks to avoid loading large
    Parquet files fully into memory.

    Raises:
        FileNotFoundError: if the file does not exist.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Cannot hash non-existent file: {path}")
    h = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(chunk_size):
            h.update(chunk)
    return h.hexdigest()[:truncate]


def hash_dataframe(
    df: pd.DataFrame,
    *,
    sort_by: list[str] | None = None,
    truncate: int = 64,
) -> str:
    """
    SHA-256 of a DataFrame's canonical Parquet serialisation.

    The DataFrame is sorted before hashing so that the same logical dataset
    always produces the same hash regardless of row order.
    """
    import io

    sort_cols = sort_by if sort_by is not None else list(df.columns)
    sort_cols = [c for c in sort_cols if c in df.columns]
    df_sorted = df.sort_values(by=sort_cols).reset_index(drop=True) if sort_cols else df

    buf = io.BytesIO()
    df_sorted.to_parquet(buf, index=False, engine="pyarrow")
    return hash_bytes(buf.getvalue(), truncate=truncate)


def hash_dict(obj: dict[str, Any], *, truncate: int = 64) -> str:
    """SHA-256 of a JSON-serialisable dict with sorted keys."""
    canonical = json.dumps(obj, sort_keys=True, default=str)
    return hash_string(canonical, truncate=truncate)


# =============================================================================
# DataSnapshotHasher
# =============================================================================


class DataSnapshotHasher:
    """
    Combines hashes of multiple input files into a single snapshot SHA.

    Each batch run calls add_file() for every data source consumed, then
    finalise() to produce the data_snapshot_sha stored in every ForecastRecord.
    Any change in any upstream file changes the snapshot SHA, making the
    provenance chain explicit and verifiable.

    Example:
        hasher = DataSnapshotHasher()
        hasher.add_file("data/raw/historical_matches.parquet")
        hasher.add_file("data/raw/elo_ratings.parquet")
        hasher.add_file("data/raw/wc2026_fixtures.parquet")
        snapshot_sha = hasher.finalise()
    """

    def __init__(self) -> None:
        self._components: list[tuple[str, str]] = []  # (label, sha)

    def add_file(self, path: str | Path, *, label: str | None = None) -> "DataSnapshotHasher":
        path = Path(path)
        self._components.append((label or path.name, hash_file(path)))
        return self

    def add_dataframe(
        self,
        df: pd.DataFrame,
        label: str,
        *,
        sort_by: list[str] | None = None,
    ) -> "DataSnapshotHasher":
        self._components.append((label, hash_dataframe(df, sort_by=sort_by)))
        return self

    def add_dict(self, obj: dict[str, Any], label: str) -> "DataSnapshotHasher":
        """Add frozen hyperparameters or config dicts to the snapshot."""
        self._components.append((label, hash_dict(obj)))
        return self

    def finalise(self, *, truncate: int = 64) -> str:
        """
        Produce the final snapshot SHA.

        Components are sorted by label before hashing, so the order in which
        add_file() was called does not affect the result.
        """
        sorted_components = sorted(self._components, key=lambda x: x[0])
        combined = json.dumps(sorted_components, sort_keys=True)
        return hash_string(combined, truncate=truncate)

    def manifest(self) -> dict[str, str]:
        """Return the label → sha mapping for logging and audit."""
        return dict(self._components)

    def __repr__(self) -> str:
        n = len(self._components)
        return f"DataSnapshotHasher({n} component{'s' if n != 1 else ''})"


# =============================================================================
# SnapshotRegistry — append-only JSONL manifest
# =============================================================================


class SnapshotRegistry:
    """
    Append-only registry that maps snapshot SHAs to their source manifests.

    Written to data/snapshots/snapshot_registry.jsonl. Each batch run
    appends one record containing the snapshot_sha, full manifest, and
    timestamp — allowing any ForecastRecord to be traced back to its
    exact data inputs.

    Example:
        registry = SnapshotRegistry("data/snapshots/snapshot_registry.jsonl")
        registry.register(snapshot_sha, manifest, model_variant="M1")
    """

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def register(
        self,
        snapshot_sha: str,
        manifest: dict[str, str],
        *,
        model_variant: str | None = None,
        notes: str | None = None,
    ) -> None:
        record = {
            "registered_at": datetime.now(tz=timezone.utc).isoformat(),
            "snapshot_sha":  snapshot_sha,
            "model_variant": model_variant,
            "manifest":      manifest,
            "notes":         notes,
        }
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")

    def lookup(self, snapshot_sha: str) -> dict[str, Any] | None:
        """Find the most recent entry for a given snapshot_sha."""
        if not self.path.exists():
            return None
        match: dict[str, Any] | None = None
        with self.path.open(encoding="utf-8") as f:
            for line in f:
                record = json.loads(line)
                if record.get("snapshot_sha") == snapshot_sha:
                    match = record
        return match

    def all_entries(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        with self.path.open(encoding="utf-8") as f:
            return [json.loads(line.strip()) for line in f]
