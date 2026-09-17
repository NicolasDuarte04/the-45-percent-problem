"""
tests/test_eligibility.py
=========================
Session 10 · El Voto del 21 de Junio — calibrated-cycle inclusion gate.

These tests pin the guardrail that must land BEFORE any publishing automation:
only pollsters with a calibrated cycle (2018/2022) in the house-effects corpus
may feed the runoff posterior, the rule is content-neutral, and an ineligible
real poll is recorded as excluded rather than deleted.

Run from the-21j-problem/ root:
    python -m pytest tests/test_eligibility.py -v
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import model.aggregate_polls as agg  # noqa: E402
import model.eligibility as elig  # noqa: E402
import model.simulate_runoff as sim  # noqa: E402
from schemas import CANONICAL_POLLSTERS  # noqa: E402

HOUSE_EFFECTS_JSON = PROJECT_ROOT / agg.CFG["calibration"]["paths"]["house_effects_json"]

# A real 2026 runoff pollster with no 2018/2022 cycle in the corpus — the
# motivating case from Session 09 / PR #91. Not a corpus key, so not
# bias-correctable, so excluded by the content-neutral rule (not by a name match).
NON_CORPUS_FIRM = "CB Global Data"


def _poll(poll_id, pollster, fw_end, n, cep, esp, other=0.0, und=0.0):
    return {
        "poll_id": poll_id,
        "pollster": pollster,
        "fieldwork_start": pd.Timestamp(fw_end),
        "fieldwork_end": pd.Timestamp(fw_end),
        "sample_size": n,
        "cepeda_pct": cep,
        "espriella_pct": esp,
        "other_pct": other,
        "undecided_pct": und,
    }


# =============================================================================
# Eligible set is derived from the corpus file, never hardcoded
# =============================================================================


def test_eligible_set_derived_from_corpus_file() -> None:
    firms = elig.load_corpus_pollsters(HOUSE_EFFECTS_JSON)
    # The five canonical in-window firms are all corpus-eligible.
    assert {"AtlasIntel", "CNC", "GAD3", "Guarumo", "Invamer"}.issubset(firms)
    # The motivating non-corpus firm is NOT in the eligible set — by absence
    # from the corpus, not by any name-based blocklist.
    assert NON_CORPUS_FIRM not in firms


def test_record_and_file_resolve_same_eligible_set() -> None:
    import json

    record = json.loads(HOUSE_EFFECTS_JSON.read_text(encoding="utf-8"))
    assert elig.corpus_pollsters_from_record(record) == elig.load_corpus_pollsters(
        HOUSE_EFFECTS_JSON
    )


def test_canonical_pollsters_subset_of_corpus() -> None:
    """
    CI invariant: ingestion's recognised-firm allowlist must never drift to admit
    a firm that is not bias-correctable. Every CANONICAL_POLLSTER must have a
    calibrated cycle in the corpus, so whatever ingestion passes is eligible at
    the aggregator. This is the bridge that keeps the two filters consistent.
    """
    firms = elig.load_corpus_pollsters(HOUSE_EFFECTS_JSON)
    assert CANONICAL_POLLSTERS <= firms, (
        "CANONICAL_POLLSTERS contains a firm with no calibrated cycle in the "
        f"corpus: {sorted(CANONICAL_POLLSTERS - firms)}"
    )


# =============================================================================
# is_eligible — content-neutral, standardisation-aware
# =============================================================================


def test_is_eligible_content_neutral() -> None:
    firms = elig.load_corpus_pollsters(HOUSE_EFFECTS_JSON)
    # Eligible regardless of which candidate a poll favours (eligibility never
    # sees the numbers — it only sees the firm name).
    assert elig.is_eligible("Invamer", firms) is True
    assert elig.is_eligible(NON_CORPUS_FIRM, firms) is False


def test_is_eligible_matches_standardised_name() -> None:
    firms = elig.load_corpus_pollsters(HOUSE_EFFECTS_JSON)
    # A raw label that standardises onto a corpus key is eligible, mirroring the
    # house-effect lookup in aggregate_polls._firm_house_effect.
    assert elig.is_eligible("Atlas Intel", firms) is True
    assert elig.is_eligible("Centro Nacional de Consultoría", firms) is True


# =============================================================================
# partition_polls — eligible feed the posterior, ineligible recorded not deleted
# =============================================================================


def test_partition_records_excluded_with_reason() -> None:
    firms = frozenset({"Invamer"})
    polls = pd.DataFrame(
        [
            _poll("invamer_2026-06-10", "Invamer", "2026-06-10", 2000, 55.0, 43.0, 2.0),
            _poll("cb_2026-06-12", NON_CORPUS_FIRM, "2026-06-12", 1200, 40.0, 56.0, 4.0),
        ]
    )
    result = elig.partition_polls(polls, firms)

    assert result.n_polls_considered == 2
    assert result.n_polls_used == 1
    assert result.pollsters_included == ["Invamer"]
    # The ineligible poll is recorded, not dropped silently.
    assert len(result.used) == 1
    assert result.excluded_polls == [
        {
            "poll_id": "cb_2026-06-12",
            "pollster": NON_CORPUS_FIRM,
            "reason": elig.NOT_CALIBRATED_REASON,
        }
    ]
    assert result.pollsters_excluded == [
        {"pollster": NON_CORPUS_FIRM, "n_polls": 1, "reason": elig.NOT_CALIBRATED_REASON}
    ]


def test_partition_all_eligible_is_noop() -> None:
    firms = frozenset({"Invamer", "CNC"})
    polls = pd.DataFrame(
        [
            _poll("invamer_2026-06-10", "Invamer", "2026-06-10", 2000, 55.0, 43.0, 2.0),
            _poll("cnc_2026-06-11", "CNC", "2026-06-11", 2000, 46.0, 38.0, 16.0),
        ]
    )
    result = elig.partition_polls(polls, firms)
    assert result.n_polls_used == result.n_polls_considered == 2
    assert result.pollsters_excluded == []
    assert result.excluded_polls == []


# =============================================================================
# Real data — the gate resolves to exactly the five calibrated firms, no churn
# =============================================================================


def test_real_run_includes_five_calibrated_firms_only() -> None:
    polls, record, _ = agg.load_inputs()
    result = sim.apply_gate(polls, record)
    assert result.pollsters_included == ["AtlasIntel", "CNC", "GAD3", "Guarumo", "Invamer"]
    # On the real seed CB Global Data was already absent, so the gate excludes
    # nothing — this is exactly why the re-run reproduces the Session 09 numbers.
    assert result.pollsters_excluded == []
    assert result.n_polls_considered == result.n_polls_used == len(polls)


# =============================================================================
# THE fixture: a non-corpus poll that WOULD flip the flag is held out, flag stays thin
# =============================================================================


def _synthetic_record() -> dict:
    """One eligible firm (Invamer) with zero bias so house-effects on/off agree."""
    return {
        "recency_halflife_days": 5.0,
        "house_effects": {
            "Invamer": {"left_bloc_bias": 0.0, "right_bloc_bias": 0.0, "confidence": "high"},
        },
        "corpus_sha": "synthetic",
    }


def _snapshot_for(polls: pd.DataFrame, record: dict, eligibility) -> dict:
    """Run the real aggregate + sensitivity + snapshot assembly on a poll set."""
    used = eligibility.used
    post = agg.aggregate(used, record, halflife=5.0, house_effects_on=True, cfg=agg.CFG)
    mc = sim.monte_carlo(post)
    sens = sim.run_sensitivity(used, record)
    return sim.build_snapshot(
        used, record, post, mc, sens, 5.0,
        generated_at=datetime.now(timezone.utc),
        eligibility=eligibility,
    )


def test_non_corpus_flip_is_blocked_and_flag_stays_thin() -> None:
    """
    Inject a synthetic non-corpus pollster whose INCLUSION would flip
    data_sufficiency from thin to ok (it lifts n_polls over MIN_POLLS_OK while the
    numbers stay stable). With the gate ON it is excluded, recorded, and the flag
    stays thin. The companion gate-OFF run proves the synthetic poll really is
    flip-capable, so the test is meaningful and not vacuous.
    """
    record = _synthetic_record()
    eligible = elig.corpus_pollsters_from_record(record)  # {"Invamer"}

    # Four agreeing eligible polls: stable (no winner flip, tiny spread) but BELOW
    # MIN_POLLS_OK, so the only thin reason is the starved-input one.
    n_eligible = sim.MIN_POLLS_OK - 1
    rows = [
        _poll(f"invamer_2026-06-1{i}", "Invamer", f"2026-06-1{i}", 2000, 60.0, 38.0, 2.0)
        for i in range(n_eligible)
    ]
    # One non-corpus poll, equally stable, that pushes the count to MIN_POLLS_OK.
    cb_poll = _poll("cb_2026-06-19", NON_CORPUS_FIRM, "2026-06-19", 2000, 60.0, 38.0, 2.0)
    all_polls = pd.DataFrame(rows + [cb_poll])

    # ── Gate ON: the non-corpus poll is held out; the flag must stay thin. ──────
    on = elig.partition_polls(all_polls, eligible)
    assert on.n_polls_considered == sim.MIN_POLLS_OK
    assert on.n_polls_used == n_eligible
    assert any(e["pollster"] == NON_CORPUS_FIRM for e in on.pollsters_excluded)
    assert on.excluded_polls[0]["reason"] == elig.NOT_CALIBRATED_REASON
    snap_on = _snapshot_for(all_polls, record, on)
    assert snap_on["data_sufficiency"] == "thin"
    assert any("runoff polls" in r for r in snap_on["data_sufficiency_reasons"])
    # The snapshot is the durable, auditable log of the exclusion.
    assert snap_on["pollsters_excluded"] == [
        {"pollster": NON_CORPUS_FIRM, "n_polls": 1, "reason": elig.NOT_CALIBRATED_REASON}
    ]
    assert snap_on["n_polls_considered"] == sim.MIN_POLLS_OK
    assert snap_on["n_polls_used"] == n_eligible

    # ── Gate OFF (control): including the non-corpus poll flips the flag to ok. ──
    all_firms = frozenset(str(p) for p in all_polls["pollster"].unique())
    off = elig.partition_polls(all_polls, all_firms)
    snap_off = _snapshot_for(all_polls, record, off)
    assert snap_off["data_sufficiency"] == "ok", (
        "control failed: the synthetic non-corpus poll does not actually flip the "
        "flag, so the gate test would be vacuous"
    )
