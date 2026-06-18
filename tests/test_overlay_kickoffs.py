"""
tests/test_overlay_kickoffs.py
==============================
cp-19. Tests for the kickoff-healing overlay used by the snapshot regen. The
regen carries matches/*.json forward verbatim, so this overlay is the one place
the frozen kickoffs get corrected from the authoritative FD-sourced map.
"""

from __future__ import annotations

import json
from pathlib import Path

from scripts.regenerate_snapshot_from_batch import (
    load_kickoff_overrides,
    overlay_kickoffs,
)


def _write(p: Path, match_id: str, kickoff: str) -> None:
    p.write_text(json.dumps({"match_id": match_id, "kickoff_utc": kickoff}) + "\n")


def test_overlay_corrects_only_mapped_ids(tmp_path: Path):
    _write(tmp_path / "M24.json", "M24", "2026-06-18T02:00:00+00:00")  # wrong
    _write(tmp_path / "M99.json", "M99", "2026-07-04T20:00:00+00:00")  # not mapped

    changed = overlay_kickoffs(tmp_path, {"M24": "2026-06-17T23:00:00Z"})

    assert changed == 1
    m24 = json.loads((tmp_path / "M24.json").read_text())
    m99 = json.loads((tmp_path / "M99.json").read_text())
    # Normalised to the published +00:00 form, not left as a bare Z.
    assert m24["kickoff_utc"] == "2026-06-17T23:00:00+00:00"
    assert m99["kickoff_utc"] == "2026-07-04T20:00:00+00:00"


def test_overlay_is_idempotent(tmp_path: Path):
    _write(tmp_path / "M25.json", "M25", "2026-06-16T19:00:00+00:00")
    overrides = {"M25": "2026-06-19T03:00:00Z"}

    first = overlay_kickoffs(tmp_path, overrides)
    second = overlay_kickoffs(tmp_path, overrides)

    assert first == 1
    assert second == 0  # already corrected, nothing rewritten


def test_overlay_noop_on_empty_map(tmp_path: Path):
    _write(tmp_path / "M01.json", "M01", "2026-06-11T19:00:00+00:00")
    assert overlay_kickoffs(tmp_path, {}) == 0


def test_load_kickoff_overrides_reads_kickoffs_block(tmp_path: Path):
    p = tmp_path / "wc2026_kickoffs.json"
    p.write_text(json.dumps({"_source": "x", "kickoffs": {"M24": "2026-06-17T23:00:00Z"}}))
    assert load_kickoff_overrides(p) == {"M24": "2026-06-17T23:00:00Z"}


def test_load_kickoff_overrides_missing_file(tmp_path: Path):
    assert load_kickoff_overrides(tmp_path / "nope.json") == {}
