"""Generate website/src/lib/sim/snapshotProbs.ts from the active M2 batch.

cp-11 (Fix 3): closes the M0/M2 split-brain. Before this script, the
prediction evaluator graded user picks against a hand-frozen M0 table
(``// Auto-generated from M0 snapshot 2026-05-04...``) while the bracket
page rendered M2 probabilities — two model regimes live at once. This
script regenerates the static ``snapshotProbs.ts`` table from the active
M2 batch so the evaluator and the bracket serve the same numbers.

Per architectural decision Q4 (PLAN.md): keep ``snapshotProbs.ts`` a
static table (do NOT refactor ``runEvaluator.ts`` to read live M2 probs);
regenerate its contents from M2 on every nightly. This script is wired
into ``.github/workflows/nightly_pipeline.yml`` as a step after
``regenerate_snapshot_from_batch.py`` and before the git-commit step.

Source of truth — why we read the parquet, not tournament.json
--------------------------------------------------------------
We re-derive per-team reach probabilities straight from
``team_runs_M2.parquet`` via the canonical ``aggregate_team_progression``
helper (imported from ``regenerate_snapshot_from_batch.py`` so the
aggregation logic has exactly one definition). We deliberately do NOT
read ``website/public/data/latest/tournament.json``: its team roster is
corrupted (Congo DR duplicated, Tunisia missing) because the regen path's
``code->team_id`` map is built from that same roster. Reading from the
parquet sidesteps the bug and produces all 48 teams correctly. cp-12 will
fix the root cause; see PLAN.md cp-12 expanded scope and
docs/onboarding/cp-11-inspection-notes.md §8.

Field mapping (team_runs_M2 reach probs -> TeamProbs):
    pG <- p_group_qualification   (P qualify from group / enter R32)
    pR <- p_r16                   (P reach Round of 16)
    pQ <- p_quarterfinal          (P reach quarterfinal)
    pS <- p_semifinal             (P reach semifinal)
    pF <- p_final                 (P reach final)
    pC <- p_champion              (P win tournament)

Team-id -> FIFA code mapping comes from the (clean, 48-unique) per-team
``teams/*.json`` roster in the latest snapshot bundle, translated through
the canonical ``_TEAM_ID_TO_DISPLAY_NAME`` table. The script fails loudly
if any batch team fails to resolve to a code — it must never silently
drop a team (a dropped team would grade that user pick at probability 0).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd

from scripts.regenerate_snapshot_from_batch import (
    _TEAM_ID_TO_DISPLAY_NAME,
    aggregate_team_progression,
)

ACTIVE_BATCH_JSON = PROJECT_ROOT / "data" / "calibration" / "active_batch.json"
TEAMS_DIR = PROJECT_ROOT / "website" / "public" / "data" / "latest" / "teams"
OUTPUT_TS = PROJECT_ROOT / "website" / "src" / "lib" / "sim" / "snapshotProbs.ts"

EXPECTED_TEAMS = 48


def _fmt(x: float) -> str:
    """Format a probability as a deterministic, float-noise-free TS literal.

    aggregate_team_progression already rounds to 6 dp; we render up to 6 dp,
    trim trailing zeros, and keep at least one fractional digit so the value
    is unambiguously a float (e.g. 0.2843, 0.0, 1.0). This avoids artefacts
    like ``0.30000000000000004`` and keeps the git diff minimal.
    """
    s = f"{x:.6f}".rstrip("0").rstrip(".")
    if "." not in s:
        s += ".0"
    return s


def _build_code_map() -> dict[str, str]:
    """Map batch team_id -> FIFA code via the clean teams/*.json roster.

    teams/*.json carries the authoritative (display_name, fifa_code) pairs
    for all 48 teams with no duplicates (unlike tournament.json). We invert
    _TEAM_ID_TO_DISPLAY_NAME to translate a batch team_id into the roster's
    display_name, then look up the code.
    """
    if not TEAMS_DIR.exists():
        raise FileNotFoundError(
            f"Team roster dir not found: {TEAMS_DIR}. "
            f"Run regenerate_snapshot_from_batch.py first."
        )
    display_to_code: dict[str, str] = {}
    for team_file in sorted(TEAMS_DIR.glob("*.json")):
        team = json.loads(team_file.read_text())
        code = team.get("fifa_code") or team_file.stem
        display = team.get("display_name")
        if display is None:
            raise ValueError(f"{team_file.name} has no display_name")
        display_to_code[display] = code
    return display_to_code


def build_team_probs() -> tuple[dict[str, dict[str, float]], str, str]:
    """Return (probs_by_code, batch_id, batch_timestamp_utc)."""
    active = json.loads(ACTIVE_BATCH_JSON.read_text())
    batch_id = active["active_batch_id"]
    batch_path = PROJECT_ROOT / active["active_batch_path"]
    team_runs_path = batch_path / "team_runs_M2.parquet"
    if not team_runs_path.exists():
        raise FileNotFoundError(f"Active batch missing M2 outputs: {team_runs_path}")

    team_runs = pd.read_parquet(team_runs_path)
    aggregated = aggregate_team_progression(team_runs)

    # Batch production time — intrinsic to the batch, so the generated file
    # is deterministic per batch and only changes when the batch changes
    # (no spurious nightly timestamp churn). Falls back to active_batch.json.
    if "timestamp_utc" in team_runs.columns and len(team_runs):
        ts = pd.Timestamp(team_runs["timestamp_utc"].max())
        batch_ts = ts.tz_convert("UTC").strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        batch_ts = active.get("activated_at_utc", "unknown")

    display_to_code = _build_code_map()

    probs_by_code: dict[str, dict[str, float]] = {}
    unresolved: list[str] = []
    for team_id, agg in aggregated.items():
        display = _TEAM_ID_TO_DISPLAY_NAME.get(team_id, team_id)
        code = display_to_code.get(display)
        if code is None:
            unresolved.append(f"{team_id!r} (display {display!r})")
            continue
        probs_by_code[code] = {
            "pG": agg["p_group_qualification"],
            "pR": agg["p_r16"],
            "pQ": agg["p_quarterfinal"],
            "pS": agg["p_semifinal"],
            "pF": agg["p_final"],
            "pC": agg["p_champion"],
        }

    if unresolved:
        raise KeyError(
            "Could not resolve these batch teams to a FIFA code via the "
            f"teams/*.json roster: {unresolved}. Refusing to emit a table "
            f"that silently drops teams. Check _TEAM_ID_TO_DISPLAY_NAME and "
            f"the team roster."
        )
    if len(probs_by_code) != EXPECTED_TEAMS:
        raise ValueError(
            f"Expected {EXPECTED_TEAMS} teams, resolved {len(probs_by_code)}. "
            f"Aborting rather than emit an incomplete table."
        )
    return probs_by_code, batch_id, batch_ts


def render_ts(probs_by_code: dict[str, dict[str, float]], batch_id: str, batch_ts: str) -> str:
    lines: list[str] = []
    lines.append(f"// Auto-generated from M2 batch {batch_id} on {batch_ts}.")
    lines.append("// Source: scripts/generate_snapshot_probs_ts.py")
    lines.append("// Do not edit manually. cp-11 ships this regeneration on every nightly.")
    lines.append("// Generator reads team_runs_M2.parquet directly via aggregate_team_progression()")
    lines.append("// rather than tournament.json, because the regen path has a known")
    lines.append("// code→team_id mapping bug (Congo DR duplicated, Tunisia missing).")
    lines.append("// Reading from parquet sidesteps that bug; cp-12 will fix the root cause.")
    lines.append("// Fields: pG=group_qual pR=reach_r16 pQ=reach_qf pS=reach_sf pF=reach_final pC=champion")
    lines.append("")
    lines.append("export interface TeamProbs {")
    lines.append("  pG: number; // P(qualify from group = enter R32)")
    lines.append("  pR: number; // P(advance past R32 to R16)")
    lines.append("  pQ: number; // P(advance past R16 to QF)")
    lines.append("  pS: number; // P(advance past QF to SF)")
    lines.append("  pF: number; // P(advance past SF to F)")
    lines.append("  pC: number; // P(win tournament)")
    lines.append("}")
    lines.append("")
    lines.append("export const TEAM_PROBS: Record<string, TeamProbs> = {")
    for code in sorted(probs_by_code):
        p = probs_by_code[code]
        lines.append(
            f"  {code}: {{ pG: {_fmt(p['pG'])}, pR: {_fmt(p['pR'])}, "
            f"pQ: {_fmt(p['pQ'])}, pS: {_fmt(p['pS'])}, "
            f"pF: {_fmt(p['pF'])}, pC: {_fmt(p['pC'])} }},"
        )
    lines.append("};")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    print("=" * 60)
    print("generate_snapshot_probs_ts (cp-11 M0/M2 reconciliation)")
    print("=" * 60)
    probs_by_code, batch_id, batch_ts = build_team_probs()
    ts_source = render_ts(probs_by_code, batch_id, batch_ts)
    OUTPUT_TS.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_TS.write_text(ts_source)
    print(f"[1] active_batch_id : {batch_id}")
    print(f"    batch_ts        : {batch_ts}")
    print(f"[2] teams written   : {len(probs_by_code)}")
    print(f"[3] output          : {OUTPUT_TS.relative_to(PROJECT_ROOT)}")
    # Headline spot-check
    for code in ("ESP", "ARG", "BRA", "FRA", "ENG"):
        p = probs_by_code.get(code)
        if p:
            print(f"    {code} pC = {p['pC'] * 100:.2f}%")
    print("OK: snapshotProbs.ts regenerated from M2 batch.")


if __name__ == "__main__":
    main()
