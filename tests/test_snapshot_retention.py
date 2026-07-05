"""
tests/test_snapshot_retention.py
================================
cp-32: unit tests for the snapshot retention rule
(``scripts/snapshot_retention.py``).

Coverage:
  * keep/prune selection (last 48h + each earlier Colombia day's final);
  * absolute exclusions are provably untouchable (latest/, frozen batch,
    non-bundle names, stray files);
  * idempotence (a second pass prunes nothing);
  * Colombia-day boundary handling around UTC midnight.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest

from frozen_batch import FROZEN_BATCH_ID
from scripts.snapshot_retention import (
    DEFAULT_PROTECTED_NAMES,
    parse_snapshot_ts,
    prune_snapshots,
    select_prunable,
)

# A fixed "now" so the tests never touch the wall clock. 2026-07-05 12:00Z.
NOW = datetime(2026, 7, 5, 12, 0, tzinfo=timezone.utc)


def _mk_bundle(root: Path, name: str) -> Path:
    """Create a plausible bundle dir with a file inside."""
    d = root / name
    d.mkdir(parents=True)
    (d / "snapshot_meta.json").write_text("{}")
    return d


# ─── parse_snapshot_ts ────────────────────────────────────────────────────────


def test_parse_snapshot_ts_accepts_bundle_names():
    assert parse_snapshot_ts("2026-07-05T19:27Z") == datetime(
        2026, 7, 5, 19, 27, tzinfo=timezone.utc
    )


@pytest.mark.parametrize(
    "name",
    [
        "latest",
        FROZEN_BATCH_ID,
        "snapshot_registry.jsonl",
        ".gitkeep",
        "2026-07-05",  # date only
        "2026-07-05T19:27:00Z",  # seconds precision, not the bundle form
        "README.md",
        "",
    ],
)
def test_parse_snapshot_ts_rejects_non_bundles(name):
    assert parse_snapshot_ts(name) is None


# ─── select_prunable: the core rule ───────────────────────────────────────────


def test_keeps_everything_within_48h():
    # All within 48h of NOW (2026-07-03 12:00Z .. now). None pruned.
    names = [
        "2026-07-05T11:00Z",
        "2026-07-04T18:00Z",
        "2026-07-03T13:00Z",
    ]
    keep, prune = select_prunable(names, NOW)
    assert keep == set(names)
    assert prune == set()


def test_keeps_only_final_of_each_earlier_day():
    # Three bundles on 2026-07-01 (Colombia day), all older than 48h. Only the
    # latest UTC one survives. Its Colombia day is 2026-07-01 for all three
    # (07-01 06:00/12:00/23:00Z -> 01:00/07:00/18:00 COT, same civil day).
    names = [
        "2026-07-01T06:00Z",
        "2026-07-01T12:00Z",
        "2026-07-01T23:00Z",
    ]
    keep, prune = select_prunable(names, NOW)
    assert keep == {"2026-07-01T23:00Z"}
    assert prune == {"2026-07-01T06:00Z", "2026-07-01T12:00Z"}


def test_mixed_recent_and_old():
    # window_start = NOW - 48h = 2026-07-03 12:00Z. The two old days below use
    # times that stay on the SAME Colombia civil day after the -5h shift, so
    # each old day keeps exactly its final and prunes the earlier one.
    names = [
        # Within 48h (kept by window):
        "2026-07-05T11:00Z",
        "2026-07-04T09:00Z",
        # Colombia day 07-01 (COT 07:00 and 16:00): keep the 21:00Z final.
        "2026-07-01T12:00Z",
        "2026-07-01T21:00Z",
        # Colombia day 06-30 (COT 05:00 and 17:00): keep the 22:00Z final.
        "2026-06-30T10:00Z",
        "2026-06-30T22:00Z",
    ]
    keep, prune = select_prunable(names, NOW)
    assert keep == {
        "2026-07-05T11:00Z",
        "2026-07-04T09:00Z",
        "2026-07-01T21:00Z",
        "2026-06-30T22:00Z",
    }
    assert prune == {"2026-07-01T12:00Z", "2026-06-30T10:00Z"}


def test_colombia_day_boundary_around_utc_midnight():
    # 2026-07-02T03:00Z is 2026-07-01 22:00 COT -> belongs to Colombia day
    # 07-01, NOT 07-02. So it competes with 07-01 bundles for "final of 07-01".
    # 07-01T23:00Z is 07-01 18:00 COT (earlier same civil day), so the 03:00Z
    # bundle is the later one and wins the day.
    names = [
        "2026-07-01T23:00Z",  # 07-01 18:00 COT
        "2026-07-02T03:00Z",  # 07-01 22:00 COT  (later, same Colombia day)
        "2026-07-02T18:00Z",  # 07-02 13:00 COT  (final of 07-02)
    ]
    keep, prune = select_prunable(names, NOW)
    assert keep == {"2026-07-02T03:00Z", "2026-07-02T18:00Z"}
    assert prune == {"2026-07-01T23:00Z"}


# ─── exclusions are untouchable ───────────────────────────────────────────────


def test_protected_and_non_bundle_never_candidates():
    names = [
        "latest",
        FROZEN_BATCH_ID,
        "snapshot_registry.jsonl",
        ".gitkeep",
        "2026-07-01T06:00Z",  # a real prune candidate
        "2026-07-01T23:00Z",  # the day's final (kept)
    ]
    keep, prune = select_prunable(names, NOW)
    # Only the two real bundles appear in keep/prune; everything else is neither.
    assert "latest" not in keep and "latest" not in prune
    assert FROZEN_BATCH_ID not in keep and FROZEN_BATCH_ID not in prune
    assert "snapshot_registry.jsonl" not in (keep | prune)
    assert ".gitkeep" not in (keep | prune)
    assert prune == {"2026-07-01T06:00Z"}
    assert keep == {"2026-07-01T23:00Z"}


def test_default_protected_names_contents():
    assert "latest" in DEFAULT_PROTECTED_NAMES
    assert FROZEN_BATCH_ID in DEFAULT_PROTECTED_NAMES


# ─── prune_snapshots: filesystem behaviour ────────────────────────────────────


def test_prune_snapshots_removes_only_selected(tmp_path):
    snaps = tmp_path / "snapshots"
    snaps.mkdir()
    all_names = [
        "2026-07-05T11:00Z",  # keep (window)
        "2026-07-01T12:00Z",  # prune (07-01 07:00 COT, earlier of the day)
        "2026-07-01T21:00Z",  # keep (07-01 16:00 COT, day final)
        "2026-06-30T10:00Z",  # prune (06-30 05:00 COT, earlier of the day)
        "2026-06-30T22:00Z",  # keep (06-30 17:00 COT, day final)
    ]
    for n in all_names:
        _mk_bundle(snaps, n)
    # Untouchable siblings placed INSIDE snapshots/ to prove the guards hold
    # even against a misplacement.
    _mk_bundle(snaps, "latest")
    _mk_bundle(snaps, FROZEN_BATCH_ID)
    (snaps / "snapshot_registry.jsonl").write_text("{}\n")
    (snaps / ".gitkeep").write_text("")

    result = prune_snapshots(snaps, NOW, logger=lambda _m: None)

    assert set(result["pruned"]) == {"2026-07-01T12:00Z", "2026-06-30T10:00Z"}
    # Pruned dirs gone.
    assert not (snaps / "2026-07-01T12:00Z").exists()
    assert not (snaps / "2026-06-30T10:00Z").exists()
    # Kept dirs remain.
    for keep in ["2026-07-05T11:00Z", "2026-07-01T21:00Z", "2026-06-30T22:00Z"]:
        assert (snaps / keep).exists()
    # Untouchables remain, always.
    assert (snaps / "latest" / "snapshot_meta.json").exists()
    assert (snaps / FROZEN_BATCH_ID / "snapshot_meta.json").exists()
    assert (snaps / "snapshot_registry.jsonl").exists()
    assert (snaps / ".gitkeep").exists()


def test_prune_snapshots_dry_run_changes_nothing(tmp_path):
    snaps = tmp_path / "snapshots"
    snaps.mkdir()
    for n in ["2026-07-05T11:00Z", "2026-07-02T08:00Z", "2026-07-02T20:00Z"]:
        _mk_bundle(snaps, n)

    result = prune_snapshots(snaps, NOW, dry_run=True, logger=lambda _m: None)
    assert set(result["pruned"]) == {"2026-07-02T08:00Z"}
    # Dry run: the dir is still on disk.
    assert (snaps / "2026-07-02T08:00Z").exists()


def test_prune_snapshots_is_idempotent(tmp_path):
    snaps = tmp_path / "snapshots"
    snaps.mkdir()
    for n in [
        "2026-07-05T11:00Z",
        "2026-07-02T08:00Z",
        "2026-07-02T20:00Z",
        "2026-06-30T01:00Z",
        "2026-06-30T22:00Z",
    ]:
        _mk_bundle(snaps, n)

    first = prune_snapshots(snaps, NOW, logger=lambda _m: None)
    assert first["pruned"]

    # Second pass over the already-pruned tree with the SAME now: prunes nothing.
    second = prune_snapshots(snaps, NOW, logger=lambda _m: None)
    assert second["pruned"] == []
    assert set(second["kept"]) == set(first["kept"])


def test_prune_snapshots_absent_dir(tmp_path):
    result = prune_snapshots(tmp_path / "nope", NOW, logger=lambda _m: None)
    assert result["pruned"] == []
    assert result["kept"] == []
