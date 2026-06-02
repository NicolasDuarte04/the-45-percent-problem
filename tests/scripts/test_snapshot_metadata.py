"""
cp-09 part 2 (Fix 2 / diagnostic §3.4): phase-derivation tests.

The pre-cp-09 ``scripts/regenerate_snapshot_from_batch.py`` hardcoded
``tournament_phase: "pre_tournament"``, ``matches_settled: 0``, and
``matches_remaining: 104``. cp-09 replaced those literals with values
derived from a settled-match count and the canonical WC 2026 schedule
length. This suite exercises every transition point in the derivation
function so a future change to the boundary table can't silently
mis-classify a phase the moment a real match settles.

Boundary table (canonical, confirmed against
``data/raw/wc2026_fixtures.parquet`` 2026-06-01):

    cumulative  0       → pre_tournament
    cumulative  1..72   → group_stage     (Group Stage:  72 matches)
    cumulative  73..88  → round_of_32     (Round of 32:  16 matches)
    cumulative  89..96  → round_of_16     (Round of 16:   8 matches)
    cumulative  97..100 → quarter_final   (Quarter-final: 4 matches)
    cumulative 101..102 → semi_final      (Semi-final:    2 matches)
    cumulative 103      → final           (Third Place + Final: 1 + 1)
    cumulative 104      → completed
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

# The scripts/ directory is not a Python package (no __init__.py) and
# the regenerate script lives there. Load it via importlib so the test
# does not depend on scripts/ being importable as a regular module.
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
_SPEC = importlib.util.spec_from_file_location(
    "regenerate_snapshot_from_batch",
    PROJECT_ROOT / "scripts" / "regenerate_snapshot_from_batch.py",
)
assert _SPEC is not None and _SPEC.loader is not None
_module = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_module)
_derive_phase = _module._derive_phase
_PHASE_BOUNDS = _module._PHASE_BOUNDS


class TestDerivePhase:
    """One assertion per transition point. Failure of any one of these
    means a real-world settled count would render the wrong phase
    string in snapshot_meta.json."""

    def test_zero_settled_is_pre_tournament(self):
        assert _derive_phase(0, 104) == "pre_tournament"

    def test_one_settled_enters_group_stage(self):
        assert _derive_phase(1, 104) == "group_stage"

    def test_last_group_match_is_still_group_stage(self):
        assert _derive_phase(72, 104) == "group_stage"

    def test_first_r32_match_is_round_of_32(self):
        assert _derive_phase(73, 104) == "round_of_32"

    def test_last_r32_match_is_still_round_of_32(self):
        assert _derive_phase(88, 104) == "round_of_32"

    def test_first_r16_match_is_round_of_16(self):
        assert _derive_phase(89, 104) == "round_of_16"

    def test_last_r16_match_is_still_round_of_16(self):
        assert _derive_phase(96, 104) == "round_of_16"

    def test_first_qf_match_is_quarter_final(self):
        assert _derive_phase(97, 104) == "quarter_final"

    def test_last_qf_match_is_still_quarter_final(self):
        assert _derive_phase(100, 104) == "quarter_final"

    def test_first_sf_match_is_semi_final(self):
        assert _derive_phase(101, 104) == "semi_final"

    def test_last_sf_match_is_still_semi_final(self):
        assert _derive_phase(102, 104) == "semi_final"

    def test_third_place_settled_is_final_phase(self):
        # The SnapshotMetaSchema phase enum has no third_place value;
        # the third-place playoff (M103) and the final (M104) both
        # live in the `final` phase until both settle.
        assert _derive_phase(103, 104) == "final"

    def test_all_settled_is_completed(self):
        assert _derive_phase(104, 104) == "completed"

    def test_overshoot_clamps_to_completed(self):
        # Defensive: never let an over-count silently leak past the
        # `completed` terminal phase. The regenerate script clamps the
        # settled count before calling _derive_phase, so a settled
        # count above `total` is already a recoverable warning rather
        # than an exception. The function itself returns `completed`
        # for settled >= total.
        assert _derive_phase(105, 104) == "completed"

    def test_negative_settled_raises(self):
        with pytest.raises(ValueError):
            _derive_phase(-1, 104)


class TestPhaseBoundsTable:
    """Sanity-check the canonical boundary table itself so a refactor
    that re-orders or drops a row is caught here rather than in a
    visible-on-launch-day regression."""

    def test_bounds_are_monotonically_increasing(self):
        bounds = [b for b, _ in _PHASE_BOUNDS]
        assert bounds == sorted(bounds)

    def test_bounds_cover_every_pre_completion_count(self):
        # Every cumulative count from 0 to 103 must map to a
        # non-completed phase. 104 maps to `completed` via the
        # early-return branch in _derive_phase.
        seen = set()
        for n in range(0, 104):
            seen.add(_derive_phase(n, 104))
        assert seen == {
            "pre_tournament",
            "group_stage",
            "round_of_32",
            "round_of_16",
            "quarter_final",
            "semi_final",
            "final",
        }
