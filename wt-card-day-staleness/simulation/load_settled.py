"""
simulation/load_settled.py
==========================
cp-10: settled-result conditioning for the Monte Carlo group stage.
cp-16c: translate raw match_outcomes ids (cron FD{id} and admin M{NN}) to
canonical M{NN} keys by TEAM IDENTITY, so cron rows actually condition.

Loads the website's `match_outcomes` rows that the MC should treat as
realized (rather than sampled) for the current batch. Returns a dict
keyed by canonical match_id (M01..M72 for the group stage) mapping to
a fully-populated `MatchResult`.

## cp-16c: the id-translation fix

Before cp-16c this loader keyed the returned dict on the DB row's raw
`match_id`. The website stores TWO kinds of settled rows:
  - cron rows  : `match_id = "FD{source_id}"` (Football-Data.org id)
  - admin rows : `match_id = "M{NN}"`         (canonical)
The Monte Carlo group loop looks up `settled_results[match_id]` with the
canonical M{NN} from the fixtures parquet, so admin rows conditioned but
cron rows never matched and were silently dropped - the rebatch ran
unconditioned. cp-16c reuses the cp-14 resolver
(`evaluation.forecast_mapping.build_model_map` + `map_settled`), which
translates both id spaces to canonical M{NN} by team identity with
bijection guards, and rebuilds the dict on the canonical key. The MC is
unchanged: it still keys by canonical M{NN}.

`build_model_map` defaults its `batch_parquet` to the FROZEN champion
batch (cp-16a / #123), so this loader gets the frozen group pairings for
free; pairings are identical across batches, so this affects only the
slot LABEL, never the bijection.

## Team names

`MatchResult.home` / `.away` must be the project-canonical full names the
MC's strength provider keys off ("Mexico", not "MEX"). Those names come
from the loader's own fixtures-parquet name map (keyed by canonical
M{NN}), NOT from the resolver's published-JSON display names, so the
conditioned MatchResult is name-consistent with the sampled fixtures.

## Same-score collapse / score-conflict halt (caller-side policy)

For the conditioning caller a same-score admin+cron duplicate on one
fixture is collapsed (condition once) by a caller-side drop_duplicates on
(home_team, away_team, home_goals, away_goals) before the resolver runs.
A genuine score-conflict (same fixture, different scorelines) is NOT
collapsed; it survives into `map_settled`, whose strict semantics raise
MappingError. This keeps the shared resolver's strict semantics (the
graded scoring path depends on them) untouched.

## Degrade-not-break + the settled-vs-conditioned guard

This loader feeds ONLY `batch_runner.run_batch` -> the active re-sim ->
the live conditional bracket. The frozen graded bundle is produced by a
separate path (`reconstruct_forecasts` reading the FROZEN batch) and
never calls this loader. So a conditioning failure here degrades the LIVE
view only and can never break the frozen publish:

  - On any structural failure (resolver MappingError, or a settled group
    match that fails to map to a canonical name) the loader logs a loud
    ERROR, conditions NOTHING, and returns an empty dict with a
    `;conditioning_error=<reason>` tag appended to the source label. The
    active re-sim then runs unconditioned and `emit_live_conditional_bracket`
    stamps `conditioned=false` with the reason; the frozen bundle is
    untouched.
  - The runtime settled-vs-conditioned guard asserts that the conditioned
    count equals the mappable in-scope settled-group count (one row per
    distinct settled group fixture after the same-score collapse). A
    mismatch is the silent-drop bug recurring; it fails loud (ERROR log +
    degrade) here, and a CI tripwire test asserts the same equality so the
    regression also fails the build.

cp-10 conditions ONLY group-stage matches; the resolver is called with
`stage_scope="group"` so knockout rows are returned as "deferred" and the
MC keeps sampling them. A separate post-cp-10 checkpoint extends this to
knockouts.

Source-precedence order is inherited from `evaluation.settled_source`:
parquet snapshot at MATCH_OUTCOMES_PARQUET (override via
`MATCH_OUTCOMES_PARQUET`) -> live Postgres -> none.

Returns `(settled_results, source_label)`. The source label is written
into batch / snapshot provenance so a reviewer can trace which path was
active and whether conditioning degraded.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulation.bracket_encoder import MatchResult
from utils.logger import get_logger

log = get_logger(__name__)

FIXTURES_PARQUET = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
MATCH_OUTCOMES_PARQUET = PROJECT_ROOT / "data" / "processed" / "match_outcomes.parquet"

# `match_outcomes.stage` enum value for group matches. The website's
# Postgres schema (website/src/lib/db/schema.ts) uses the short lowercase
# form; the resolver scopes on the same spelling.
_DB_STAGE_GROUP = "group"

# Caller-side same-score collapse key. Two settled rows that share team
# pair AND scoreline are the same realized result reported twice (admin +
# cron); collapse to one. Differing scorelines on one pair are NOT
# collapsed and reach the resolver's score-conflict halt.
_COLLAPSE_KEY = ["home_team", "away_team", "home_goals", "away_goals"]


def _load_fixture_name_map() -> dict[str, tuple[str, str]]:
    """Return `dict[match_id -> (team_home, team_away)]` for every fixture.

    Reads the canonical fixtures parquet and indexes by canonical M{NN}.
    Used to recover the full team names the MC's strength provider expects;
    the MC's group loop reads the same parquet, so these names match the
    sampled-fixture names exactly. Covers all 104 fixtures so the same map
    serves the future knockout-conditioning checkpoint unchanged.
    """
    if not FIXTURES_PARQUET.exists():
        raise FileNotFoundError(
            f"wc2026 fixtures parquet not found at {FIXTURES_PARQUET}; "
            f"cannot resolve settled-results team names."
        )
    df = pd.read_parquet(
        FIXTURES_PARQUET, columns=["match_id", "team_home", "team_away"]
    )
    return {
        str(row.match_id): (str(row.team_home), str(row.team_away))
        for row in df.itertuples(index=False)
    }


def _reason_tag(message: str) -> str:
    """Classify a resolver MappingError message into a short provenance token.

    The token is appended to the source label and surfaced verbatim in the
    live object's `conditioned_reason`. Kept short and space-free so it
    reads cleanly in provenance strings.
    """
    m = message.lower()
    if "score-conflict" in m:
        return "score_conflict"
    if "double-claim" in m:
        return "double_claim"
    if "map to no group fixture" in m or "identity or orientation" in m:
        return "unmapped_identity"
    if "canonical id that disagrees" in m:
        return "id_team_mismatch"
    if "predates its fixture kickoff" in m:
        return "kickoff_predate"
    if "bijection" in m or "published group matches" in m or "batch group slots" in m:
        return "model_map_error"
    return "mapping_error"


def _collapse_same_score_duplicates(outcomes: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Caller-side same-score collapse (decided policy).

    Drops rows that duplicate an existing (home_team, away_team, home_goals,
    away_goals) tuple, keeping the first after a stable sort by match_id so
    the choice is deterministic. The kept row's source id is moot - the
    scoreline is identical, so which id survives never changes the
    conditioned result. Genuine score-conflicts (same pair, different score)
    are left intact and reach the resolver's MappingError.

    Returns `(collapsed_frame, n_collapsed)`.
    """
    if outcomes.empty:
        return outcomes, 0
    ordered = outcomes.sort_values("match_id", kind="stable")
    collapsed = ordered.drop_duplicates(subset=_COLLAPSE_KEY, keep="first")
    n_collapsed = int(len(ordered) - len(collapsed))
    return collapsed, n_collapsed


def load_settled_results() -> tuple[dict[str, MatchResult], str]:
    """Return `(settled_results, source_label)` for the MC group-stage loop.

    `settled_results` is keyed by canonical match_id (M01..M72) and maps to
    a `MatchResult(home, away, home_goals, away_goals)` with team names
    pulled from the fixtures parquet. cp-16c translates cron FD{id} and
    admin M{NN} rows to canonical M{NN} by team identity via the cp-14
    resolver, so both id spaces condition.

    Source label vocabulary (the success labels mirror cp-09 / settled_source
    so active_batch provenance stays consistent):
      - "parquet:<path>"                         parquet export used
      - "postgres:match_outcomes"                live DB queried
      - "default:pre_tournament"                 no source / no settled rows
      - "<source>;conditioning_error=<reason>"   structural failure: nothing
                                                 conditioned, live view degrades,
                                                 frozen bundle unaffected
    """
    # Imported lazily so the no-source fast path and non-conditioning callers
    # don't pay the resolver's pandas/import cost at module load.
    from evaluation.forecast_mapping import MappingError, build_model_map, map_settled
    from evaluation.settled_source import load_settled_outcomes

    name_map = _load_fixture_name_map()

    outcomes, source = load_settled_outcomes()
    if outcomes is None or outcomes.empty:
        # No reachable source, or the export ran with nothing settled yet.
        # Correct pre-tournament; condition nothing.
        return {}, "default:pre_tournament"

    # In-scope (group) rows only; knockouts are deferred by the resolver and
    # the MC keeps sampling them.
    group_rows = outcomes[outcomes["stage"] == _DB_STAGE_GROUP].copy()
    if group_rows.empty:
        return {}, source

    collapsed, n_collapsed = _collapse_same_score_duplicates(group_rows)
    if n_collapsed:
        log.info(
            "cp-16c collapsed same-score duplicate settled rows (conditioned once)",
            n_collapsed=n_collapsed,
            collapse_key=_COLLAPSE_KEY,
        )

    # Independent count of mappable settled group fixtures: one per distinct
    # (pair, score) after the same-score collapse. The conditioned count must
    # equal this; a shortfall is the silent-drop bug recurring.
    expected_count = int(len(collapsed))

    try:
        model_map = build_model_map()  # batch_parquet defaults to FROZEN_MATCH_RUNS_M2
        mapped = map_settled(model_map, collapsed, stage_scope=_DB_STAGE_GROUP)
    except MappingError as exc:
        reason = _reason_tag(str(exc))
        log.error(
            "cp-16c conditioning STRUCTURAL FAILURE; conditioning nothing "
            "(live view degrades, frozen graded bundle unaffected)",
            reason=reason,
            error=str(exc),
        )
        return {}, f"{source};conditioning_error={reason}"

    scored = mapped["scored"]

    results: dict[str, MatchResult] = {}
    missing_names: list[str] = []
    for row in scored.itertuples(index=False):
        match_id = str(row.match_id)  # canonical M{NN} from the resolver
        names = name_map.get(match_id)
        if names is None:
            # A mapped canonical id with no fixtures-parquet name is the exact
            # silent-drop class this checkpoint exists to kill: surface it.
            missing_names.append(match_id)
            continue
        home_name, away_name = names
        results[match_id] = MatchResult(
            home=home_name,
            away=away_name,
            home_goals=int(row.home_goals),
            away_goals=int(row.away_goals),
        )

    # ── Settled-vs-conditioned guard (runtime layer) ──────────────────────────
    # Fail loud (ERROR + degrade) if the conditioned count does not equal the
    # mappable settled-group count. The resolver already raises on unmappable
    # rows, so this catches a regression that re-introduces a silent drop
    # (e.g. a name-map miss above). Degrade rather than raise so the frozen
    # bundle still publishes; the CI tripwire test fails the build on the same
    # mismatch.
    conditioned_count = len(results)
    if missing_names or conditioned_count != expected_count:
        log.error(
            "cp-16c settled-vs-conditioned GUARD tripped: conditioned count does "
            "not match mappable settled-group count (silent-drop guard); "
            "conditioning nothing (frozen bundle unaffected)",
            conditioned_count=conditioned_count,
            expected_count=expected_count,
            missing_names=missing_names,
        )
        return {}, f"{source};conditioning_error=settled_vs_conditioned_mismatch"

    log.info(
        "cp-16c conditioning loaded",
        conditioned_count=conditioned_count,
        deferred=len(mapped.get("deferred", [])),
        collapsed=len(mapped.get("collapsed", [])) + n_collapsed,
        source=source,
    )
    return results, source
