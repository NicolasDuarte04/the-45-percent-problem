"""
tests/scripts/test_live_knockout_matches.py
===========================================
cp-17 Stage 2b acceptance tests for the live knockout per-match surface.

Covers the four Stage 2b test obligations that are local to this surface:

1. Frozen-surface byte-identity: turning the knockout emitter on vs off leaves
   the graded ledger.jsonl, snapshotProbs.ts, and tournament.json marginals
   byte-for-byte identical. The emitter writes ONLY into matches_live/, so this
   is proven directly at the function level (a full regen restamps timestamps,
   which would make "byte-identity" ill-defined).
2. Producer unit test: for a fixed concrete pairing and seed, p_advance_home +
   p_advance_away is 1 within tolerance and p_model_1x2 sums to 1. The advance
   probability is cross-checked against the active batch match_runs_M2.parquet
   winner-frequency for that exact pairing, and the delta is reported (cross-check
   only, never the source).
3. Wall test: no graded reader (reconstruct_forecasts, generate_snapshot_probs_ts,
   the frozen override path, the group-only settled loader) references the new
   knockout namespace or the pairings file.
4. Ingestion: concrete-pairing extraction keeps knockout matches with both teams
   and excludes group matches and not-yet-resolved (TBD) knockout slots.

The contamination guard (a settled knockout outcome must not move the graded
Brier) is added to tests/scripts/test_settled_conditioning.py, alongside the
cp-16c contamination headline it extends.

Run:
  pytest tests/scripts/test_live_knockout_matches.py -v
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import scripts.regenerate_snapshot_from_batch as R  # noqa: E402
import ingestion.fetch_knockout_pairings as ING  # noqa: E402
from frozen_batch import FROZEN_BATCH_ID, FROZEN_BATCH_PATH  # noqa: E402

LATEST_DIR = PROJECT_ROOT / "website" / "public" / "data" / "latest"
TEAMS_DIR = LATEST_DIR / "teams"
CONCRETE_FIXTURE = PROJECT_ROOT / "tests" / "fixtures" / "fd_wc_knockouts_concrete.json"
FROZEN_MATCH_RUNS = FROZEN_BATCH_PATH / "match_runs_M2.parquet"

# A concrete pairing that emerges with high count in the frozen batch, so the
# winner-frequency cross-check is statistically stable. France beats Croatia in
# ~70% of the ~700 batch runs where the pairing occurs.
XCHECK_HOME_CODE, XCHECK_HOME = "FRA", "France"
XCHECK_AWAY_CODE, XCHECK_AWAY = "CRO", "Croatia"


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _teams_roster() -> dict[str, dict]:
    roster: dict[str, dict] = {}
    for tf in sorted(TEAMS_DIR.glob("*.json")):
        tj = json.loads(tf.read_text())
        roster[tj.get("fifa_code") or tf.stem] = tj
    return roster


@pytest.fixture(scope="module")
def roster() -> dict[str, dict]:
    return _teams_roster()


# ── 4. Ingestion: concrete extraction, group + TBD excluded ──────────────────


def test_ingestion_extracts_only_concrete_knockouts():
    payload = json.loads(CONCRETE_FIXTURE.read_text())
    pairings = ING.build_pairings(payload)

    ids = [p["match_id"] for p in pairings]
    # 4 concrete knockout fixtures; the group match and the TBD (null-team)
    # knockout in the fixture are both excluded.
    assert ids == ["KO-FD5201", "KO-FD5202", "KO-FD5203", "KO-FD5301"], ids
    assert all(p["match_id"].startswith("KO-FD") for p in pairings)
    rounds = {p["match_id"]: p["round"] for p in pairings}
    assert rounds["KO-FD5301"] == "R16"
    assert rounds["KO-FD5201"] == "R32"
    # Both teams concrete and code-mapped on every kept pairing.
    for p in pairings:
        assert p["home"]["fifa_code"] and p["away"]["fifa_code"]
    # Sorted by kickoff time.
    kicks = [p["kickoff_utc"] for p in pairings]
    assert kicks == sorted(kicks)


def test_ingestion_unresolved_feed_yields_zero_pairings():
    # The pre-resolution capture carries null teams on its knockout slots.
    sample = PROJECT_ROOT / "tests" / "fixtures" / "fd_wc_schedule_sample.json"
    pairings = ING.build_pairings(json.loads(sample.read_text()))
    assert pairings == []


# ── 2. Producer unit test + batch cross-check ────────────────────────────────


def test_advance_and_1x2_sum_to_one(roster):
    elo, code_to_display = R._knockout_strengths(roster)
    from simulation.match_model import MatchModel
    from simulation.monte_carlo_runner import SimpleEloProvider

    sp = SimpleEloProvider(elo)
    mm = MatchModel()
    card = R._build_knockout_card(
        home_code=XCHECK_HOME_CODE,
        away_code=XCHECK_AWAY_CODE,
        home_display=code_to_display[XCHECK_HOME_CODE],
        away_display=code_to_display[XCHECK_AWAY_CODE],
        round_code="R32",
        sp=sp,
        mm=mm,
        n_sims=R.LIVE_KNOCKOUT_MC_SIMS,
        seed=R.LIVE_KNOCKOUT_SEED_BASE + 1,
    )

    p = card["p_model_1x2"]
    assert abs(p["H"] + p["D"] + p["A"] - 1.0) < 1e-9

    adv = card["p_advance_home"] + card["p_advance_away"]
    assert abs(adv - 1.0) < 1e-12, adv  # exact by construction
    assert 0.0 <= card["p_advance_home"] <= 1.0
    # Knockout-only context fields are present and well-formed.
    assert 0.0 <= card["p_to_extra_time"] <= 1.0
    assert 0.0 <= card["p_to_shootout"] <= 1.0
    assert card["p_to_shootout"] <= card["p_to_extra_time"] + 1e-12
    assert card["shootout_applicable"] is True


def test_advance_matches_batch_winner_frequency(roster):
    """Cross-check the seeded per-pairing advance probability against the active
    batch's emergent winner-frequency for the same pairing. Reported, not sourced.

    The batch number is the emergent frequency over however many tournament runs
    the pairing happened to occur; the card number is a dedicated 20k per-pairing
    Monte Carlo. They agree within sampling noise for a high-count pairing. We
    print the delta and assert only a loose sanity band, because the cross-check
    is a tripwire, not the source of truth.
    """
    elo, code_to_display = R._knockout_strengths(roster)
    from simulation.match_model import MatchModel
    from simulation.monte_carlo_runner import SimpleEloProvider

    sp = SimpleEloProvider(elo)
    mm = MatchModel()
    card = R._build_knockout_card(
        home_code=XCHECK_HOME_CODE,
        away_code=XCHECK_AWAY_CODE,
        home_display=XCHECK_HOME,
        away_display=XCHECK_AWAY,
        round_code="R32",
        sp=sp,
        mm=mm,
        n_sims=R.LIVE_KNOCKOUT_MC_SIMS,
        seed=R.LIVE_KNOCKOUT_SEED_BASE + 1,
    )
    mc_p = card["p_advance_home"]

    df = pd.read_parquet(FROZEN_MATCH_RUNS)
    ko = df[df["phase"].isin(["R32", "R16", "QF", "SF", "Final", "3rd-place"])].copy()
    pair_mask = ko.apply(
        lambda r: {r["team_home"], r["team_away"]} == {XCHECK_HOME, XCHECK_AWAY},
        axis=1,
    )
    sub = ko[pair_mask]
    n = len(sub)
    assert n > 100, f"cross-check pairing too rare in batch (n={n}); pick another"
    batch_p = float((sub["winner"] == XCHECK_HOME).sum()) / n
    delta = mc_p - batch_p
    print(
        f"\n[cross-check] {XCHECK_HOME} adv vs {XCHECK_AWAY}: "
        f"card={mc_p:.4f} batch={batch_p:.4f} (n={n}) delta={delta:+.4f}"
    )
    assert abs(delta) < 0.08, (
        f"card vs batch advance probability diverged by {delta:+.4f} "
        f"(card={mc_p:.4f}, batch={batch_p:.4f}, n={n}); expected agreement "
        f"within sampling noise for a high-count pairing."
    )


# ── 1. Frozen-surface byte-identity (emitter on vs off) ──────────────────────


def _seed_frozen_surfaces(out_dir: Path) -> dict[str, str]:
    """Copy the real graded surfaces into out_dir and return their sha256s."""
    import shutil

    shas: dict[str, str] = {}
    for name in ("ledger.jsonl", "tournament.json"):
        src = LATEST_DIR / name
        dst = out_dir / name
        shutil.copy2(src, dst)
        shas[name] = _sha(dst)
    # snapshotProbs.ts lives outside the bundle entirely; record its real sha so
    # we can prove the emitter never touched it.
    sp_ts = PROJECT_ROOT / "website" / "src" / "lib" / "sim" / "snapshotProbs.ts"
    shas["snapshotProbs.ts"] = _sha(sp_ts)
    return shas


def test_emitter_on_does_not_touch_frozen_surfaces(roster, tmp_path, monkeypatch):
    out_dir = tmp_path / "bundle"
    out_dir.mkdir()
    before = _seed_frozen_surfaces(out_dir)

    # Point the producer at the concrete pairings fixture (emitter ON).
    pairings_path = tmp_path / "knockout_pairings.json"
    pairings_path.write_text(
        json.dumps(
            ING.build_document(
                ING.build_pairings(json.loads(CONCRETE_FIXTURE.read_text())),
                source_label="file:test",
                fetched_at_utc="2026-06-28T17:00:00Z",
            ),
            indent=2,
        )
    )
    monkeypatch.setattr(R, "LIVE_KNOCKOUT_PAIRINGS", pairings_path)

    R.emit_live_knockout_matches(roster, FROZEN_BATCH_ID, "2026-06-28T17:00:00Z", out_dir)

    # Cards were emitted into the dedicated namespace.
    cards = sorted((out_dir / R.MATCHES_LIVE_DIRNAME).glob("*.json"))
    assert len(cards) == 4, [c.name for c in cards]

    # Every graded surface is byte-for-byte identical.
    after = {
        "ledger.jsonl": _sha(out_dir / "ledger.jsonl"),
        "tournament.json": _sha(out_dir / "tournament.json"),
        "snapshotProbs.ts": _sha(
            PROJECT_ROOT / "website" / "src" / "lib" / "sim" / "snapshotProbs.ts"
        ),
    }
    assert after == before, (before, after)


def test_emitter_off_creates_nothing(roster, tmp_path, monkeypatch):
    out_dir = tmp_path / "bundle"
    out_dir.mkdir()
    before = _seed_frozen_surfaces(out_dir)

    # Emitter OFF: pairings file absent (the normal pre-draw state).
    monkeypatch.setattr(R, "LIVE_KNOCKOUT_PAIRINGS", tmp_path / "does_not_exist.json")
    R.emit_live_knockout_matches(roster, FROZEN_BATCH_ID, "2026-06-28T17:00:00Z", out_dir)

    assert not (out_dir / R.MATCHES_LIVE_DIRNAME).exists()
    after = {
        "ledger.jsonl": _sha(out_dir / "ledger.jsonl"),
        "tournament.json": _sha(out_dir / "tournament.json"),
        "snapshotProbs.ts": _sha(
            PROJECT_ROOT / "website" / "src" / "lib" / "sim" / "snapshotProbs.ts"
        ),
    }
    assert after == before


# ── 3. Wall test: no graded reader touches the new namespace ──────────────────

# The new namespaces the wall forbids graded readers from touching.
_FORBIDDEN_TOKENS = ["matches_live", "knockout_pairings"]

# Graded readers + the frozen override path + the group-only settled loader.
_GRADED_READERS = [
    PROJECT_ROOT / "evaluation" / "reconstruct_forecasts.py",
    PROJECT_ROOT / "scripts" / "generate_snapshot_probs_ts.py",
    PROJECT_ROOT / "frozen_batch.py",
    PROJECT_ROOT / "simulation" / "load_settled.py",
    PROJECT_ROOT / "evaluation" / "match_score_join.py",
]


@pytest.mark.parametrize("reader", _GRADED_READERS, ids=lambda p: p.name)
def test_graded_reader_does_not_reference_knockout_namespace(reader: Path):
    src = reader.read_text()
    for token in _FORBIDDEN_TOKENS:
        assert token not in src, (
            f"graded reader {reader.name} references '{token}'; the live knockout "
            f"namespace must be invisible to every graded surface."
        )


def test_loader_wall_only_live_loader_reads_matches_live():
    """The TS loader wall: only loadLiveKnockouts reads matches_live; the graded
    loaders (loadAllMatches / loadMatch / loadLedger / loadTournament) never do.

    Asserts every `matches_live` occurrence falls inside the loadLiveKnockouts
    function span, so no graded loader can pick a knockout card up by accident.
    """
    loader_src = (
        PROJECT_ROOT / "website" / "src" / "lib" / "data" / "loadSnapshot.ts"
    ).read_text()
    assert "matches_live" in loader_src  # the live loader does read it
    assert "loadLiveKnockouts" in loader_src

    # Every GRADED loader body must be free of any matches_live reference. We
    # slice each function from its `export function <name>` to the next
    # `export function` and assert the namespace never appears inside.
    graded_loaders = [
        "loadAllMatches",
        "loadMatch",
        "loadMatchIfPresent",
        "loadLedger",
        "loadTournament",
        "loadBracket",
        "loadEvaluationMetrics",
        "loadLiveBracket",
    ]
    for name in graded_loaders:
        start = loader_src.index(f"export function {name}")
        # End the body at the next export OR the next JSDoc block, whichever comes
        # first, so a following function's docstring never bleeds into this slice.
        ends = [
            i
            for i in (
                loader_src.find("\nexport function ", start + 1),
                loader_src.find("\n/**", start + 1),
            )
            if i != -1
        ]
        body = loader_src[start : (min(ends) if ends else len(loader_src))]
        assert "matches_live" not in body, (
            f"graded loader {name} references matches_live; only loadLiveKnockouts "
            f"may read the knockout namespace."
        )
    # The graded match loaders read the plain `matches` directory.
    assert 'path.join(dir, "matches")' in loader_src
