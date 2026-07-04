"""
tests/scripts/test_knockout_descriptor_validity.py
==================================================
cp-27: the R32 knockout slot descriptors in the canonical fixtures parquet must
form a valid bijection over the 12 group winners and 12 runners-up.

Before the repair, two R32 home slots were transcribed wrong:
  - M76 read "2C" (a second copy of group C's runner-up slot, already carried by
    M78), and
  - M79 read "1A" (a second copy of group A's winner slot, already carried by
    M73),
which left groups G and K with no runner-up slot anywhere. The net effect on the
live bracket surface was that runner-ups of groups G and K (e.g. Algeria, Ghana)
never appeared in any R32 slot, so they were shown with zero knockout
probability, while groups A and C were double-counted.

These tests pin the corrected structure so the corruption cannot recur silently.
They read the same parquet the producers consume
(``data/raw/wc2026_fixtures.parquet``); the website-side equivalent lives in
``website/tests/unit/canonical-draw.test.ts``.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

FIXTURES_PARQUET = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"

ALL_GROUPS = list("ABCDEFGHIJKL")
_WINNER_RE = re.compile(r"^1([A-L])$")
_RUNNER_RE = re.compile(r"^2([A-L])$")
_BEST3_RE = re.compile(r"^BEST3-[A-L]+$")

# The eight best-third candidate-group lists published for the 12-group 2026
# format. Descriptor repair (cp-27) only touched the two winner/runner-up cells;
# the third-place allocations are unchanged and pinned here so a future edit that
# disturbs them also fails.
EXPECTED_BEST3 = sorted(
    [
        "BEST3-CDEFI",
        "BEST3-EHIJK",
        "BEST3-ABCDF",
        "BEST3-ABCFG",
        "BEST3-CEFHI",
        "BEST3-ABDEF",
        "BEST3-BEFIK",
        "BEST3-BCDFG",
    ]
)


@pytest.fixture(scope="module")
def r32_slots() -> list[str]:
    if not FIXTURES_PARQUET.exists():
        pytest.skip(f"fixtures parquet absent at {FIXTURES_PARQUET}")
    df = pd.read_parquet(FIXTURES_PARQUET)
    r32 = df[df["stage"] == "Round of 32"]
    assert len(r32) == 16, f"expected 16 R32 rows, got {len(r32)}"
    slots: list[str] = []
    for _, row in r32.iterrows():
        slots.append(str(row["team_home"]))
        slots.append(str(row["team_away"]))
    return slots


def test_r32_has_32_slots(r32_slots: list[str]) -> None:
    assert len(r32_slots) == 32


def test_each_group_winner_slot_appears_exactly_once(r32_slots: list[str]) -> None:
    winners = [s for s in r32_slots if _WINNER_RE.match(s)]
    assert len(winners) == 12
    groups = sorted(_WINNER_RE.match(s).group(1) for s in winners)
    assert groups == ALL_GROUPS


def test_each_runner_up_slot_appears_exactly_once(r32_slots: list[str]) -> None:
    runners = [s for s in r32_slots if _RUNNER_RE.match(s)]
    assert len(runners) == 12
    groups = sorted(_RUNNER_RE.match(s).group(1) for s in runners)
    assert groups == ALL_GROUPS


def test_third_place_allocations_match_official_structure(r32_slots: list[str]) -> None:
    thirds = sorted(s for s in r32_slots if _BEST3_RE.match(s))
    assert len(thirds) == 8
    assert thirds == EXPECTED_BEST3


def test_no_slot_has_an_unexpected_shape(r32_slots: list[str]) -> None:
    for s in r32_slots:
        ok = _WINNER_RE.match(s) or _RUNNER_RE.match(s) or _BEST3_RE.match(s)
        assert ok, f"unexpected R32 slot descriptor: {s!r}"


def test_repaired_cells_are_pinned() -> None:
    if not FIXTURES_PARQUET.exists():
        pytest.skip(f"fixtures parquet absent at {FIXTURES_PARQUET}")
    df = pd.read_parquet(FIXTURES_PARQUET)
    by_id = df.set_index("match_id")
    assert str(by_id.loc["M76", "team_home"]) == "2G"
    assert str(by_id.loc["M79", "team_home"]) == "2K"
