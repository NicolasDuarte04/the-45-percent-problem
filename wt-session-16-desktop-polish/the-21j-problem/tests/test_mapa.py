"""
tests/test_mapa.py
==================
Session 06 · El Voto del 21 de Junio — Mapa del Voto Decisivo tests.

Offline and deterministic. The wikitext parser is exercised on a fixture; the
projection / roll-up logic is exercised through build_dataset() reading the
committed baseline CSV and the Session 04 snapshot (no network, no writes).

Run from the-21j-problem/ root:
    python -m pytest tests/test_mapa.py -v
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import ingestion.fetch_baseline as fb  # noqa: E402
import model.build_mapa as bm  # noqa: E402
from schemas import MarginBand, MunicipioBaseline  # noqa: E402

FORBIDDEN = ("gana", "apuesta", "favorito", "pronóstico", "pronostico")
DIRECTIONAL = ("deliver", "entregar votos", "votar por", "vote for")


# =============================================================================
# Dataset fixture (pure build, no write, no network)
# =============================================================================


@pytest.fixture(scope="module")
def dataset() -> dict:
    return bm.build_dataset(generated_at=datetime(2026, 6, 5, tzinfo=timezone.utc))


@pytest.fixture(scope="module")
def baseline_df() -> pd.DataFrame:
    return bm.load_baseline()


# =============================================================================
# Wikitext parser (deterministic, on a fixture)
# =============================================================================


_FIXTURE = """
{| class="wikitable sortable"
|-
|[[Amazonas (Colombia)|Amazonas]]||style="background:purple"| 12&nbsp;883|| 54,61
| 10&nbsp;250|| 43,45|| 456|| 1,93|| 214||48
! 23&nbsp;851!!46,24
|-
|[[Antioquia]]|| 942&nbsp;005||33,04
|style="background:gold"| 1&nbsp;822&nbsp;700|| 63,93|| 86 367|| 3,02|| 42&nbsp;431||4 246
! 2&nbsp;897&nbsp;749!!56,65
|}
"""


def test_parse_units_fixture() -> None:
    units = fb.parse_units(_FIXTURE)
    by_name = {u["departamento"]: u for u in units}
    assert set(by_name) == {"Amazonas", "Antioquia"}
    amz = by_name["Amazonas"]
    assert amz["petro_votes"] == 12883
    assert amz["hernandez_votes"] == 10250
    assert amz["total_votes"] == 23851
    assert amz["turnout_pct"] == pytest.approx(46.24)
    ant = by_name["Antioquia"]
    assert ant["petro_votes"] == 942005
    assert ant["hernandez_votes"] == 1822700


# =============================================================================
# Baseline CSV — sourced, real, two-way shares
# =============================================================================


def test_every_baseline_row_has_http_source_url(baseline_df: pd.DataFrame) -> None:
    assert len(baseline_df) > 0
    for _, row in baseline_df.iterrows():
        url = str(row["source_url"])
        assert url.lower().startswith(("http://", "https://")), row["municipio"]


def test_baseline_shares_in_unit_interval(baseline_df: pd.DataFrame) -> None:
    for _, row in baseline_df.iterrows():
        assert 0.0 <= row["share_left_2022"] <= 1.0
        assert 0.0 <= row["share_right_2022"] <= 1.0
        assert row["share_left_2022"] + row["share_right_2022"] == pytest.approx(1.0, abs=5e-3)


def test_baseline_margin_consistent_with_shares(baseline_df: pd.DataFrame) -> None:
    for _, row in baseline_df.iterrows():
        expected = (row["share_right_2022"] - row["share_left_2022"]) * 100.0
        assert row["margin_2022"] == pytest.approx(expected, abs=0.11)


def test_baseline_rejects_empty_url() -> None:
    with pytest.raises(Exception):
        MunicipioBaseline(
            dane_code="05", municipio="X", departamento="X", granularity="departamento",
            potential_votes=100, share_left_2022=0.5, share_right_2022=0.5,
            margin_2022=0.0, source="s", source_url="",
        )


def test_baseline_rejects_non_two_way_shares() -> None:
    with pytest.raises(Exception):
        MunicipioBaseline(
            dane_code="05", municipio="X", departamento="X", granularity="departamento",
            potential_votes=100, share_left_2022=0.3, share_right_2022=0.3,  # sums 0.6
            margin_2022=0.0, source="s", source_url="https://x",
        )


# =============================================================================
# Margin band schema
# =============================================================================


def test_margin_band_rejects_out_of_order() -> None:
    with pytest.raises(Exception):
        MarginBand(mean=5.0, ci80_low=10.0, ci80_high=20.0)


def test_margin_band_accepts_ordered() -> None:
    b = MarginBand(mean=5.0, ci80_low=-3.0, ci80_high=14.0)
    assert b.ci80_low <= b.mean <= b.ci80_high


# =============================================================================
# Projection logic (pure)
# =============================================================================


_DELTA = {"mean": 4.0, "ci80_low": -10.0, "ci80_high": 18.0}


def test_project_unit_toss_up_and_decisiveness() -> None:
    # baseline -4 + delta 4 = 0 projected -> toss-up, decisiveness ~1
    proj, raw = proj_at(-4.0)
    assert proj.lean == "toss-up"
    assert proj.decisiveness == pytest.approx(1.0, abs=1e-6)
    assert raw == pytest.approx(0.0, abs=1e-9)


def test_project_unit_left_and_right() -> None:
    left, _ = proj_at(-60.0)   # -60 + 4 = -56 -> left
    right, _ = proj_at(60.0)   # 60 + 4 = 64 -> right
    assert left.lean == "left"
    assert right.lean == "right"
    assert 0.0 <= left.decisiveness <= 1.0
    assert 0.0 <= right.decisiveness <= 1.0


def test_project_unit_band_ordered_and_in_range() -> None:
    proj, _ = proj_at(10.0)
    b = proj.projected_margin_2026
    assert -100.0 <= b.ci80_low <= b.mean <= b.ci80_high <= 100.0


def test_project_unit_clamps_extremes() -> None:
    proj, _ = proj_at(98.0)   # 98 + 18 (hi) = 116 -> clamps to 100
    assert proj.projected_margin_2026.ci80_high <= 100.0
    assert proj.projected_margin_2026.mean <= 100.0


def proj_at(baseline_margin: float):
    return bm.project_unit("05", baseline_margin, 100000, _DELTA)


def test_compute_delta() -> None:
    nat = {"mean": 0.818, "ci80_low": -13.076, "ci80_high": 14.656}
    delta = bm.compute_delta(nat)
    assert delta["mean"] == pytest.approx(nat["mean"] - bm.NATIONAL_2022_MARGIN_PP, abs=1e-6)


# =============================================================================
# Roll-up sanity
# =============================================================================


def test_rollup_reconstructs_national_within_tolerance(dataset: dict) -> None:
    chk = dataset["rollup_check"]
    assert chk["passes"] is True
    assert abs(chk["residual_pp"]) <= chk["tolerance_pp"]
    assert chk["weight"] == "potential_votes"


# =============================================================================
# Dataset contract
# =============================================================================


def test_dataset_has_coverage_and_assumptions(dataset: dict) -> None:
    cov = dataset["coverage"]
    assert cov["granularity"] == "departamento"
    assert cov["geographic_units"] >= 1
    assert "municipio_coverage" in cov
    assert dataset["assumptions"]["swing_model"] == "uniform_additive_swing"
    assert "national_margin_source" in dataset


def test_every_unit_has_projection_band(dataset: dict) -> None:
    for u in dataset["units"]:
        p = u["projection"]
        assert p["is_projection"] is True
        b = p["projected_margin_2026"]
        assert b["ci80_low"] <= b["mean"] <= b["ci80_high"]  # a band, not a point
        assert 0.0 <= p["decisiveness"] <= 1.0
        assert p["lean"] in ("left", "right", "toss-up")  # neutral bloc labels only


def test_units_shares_in_unit_interval(dataset: dict) -> None:
    for u in dataset["units"]:
        assert 0.0 <= u["share_left_2022"] <= 1.0
        assert 0.0 <= u["share_right_2022"] <= 1.0


def test_no_forbidden_or_directional_words(dataset: dict) -> None:
    raw = json.dumps(dataset, ensure_ascii=False).lower()
    for word in FORBIDDEN:
        assert word not in raw, f"forbidden word: {word!r}"
    for phrase in DIRECTIONAL:
        assert phrase not in raw, f"directional framing: {phrase!r}"


def test_national_margin_source_recorded(dataset: dict) -> None:
    src = dataset["national_margin_source"]
    assert src["source_file"].endswith("latest.json")
    assert "margin_mean_pp" in src
    assert src["snapshot_data_hash"]  # provenance carried through
