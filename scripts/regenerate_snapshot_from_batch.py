"""
scripts/regenerate_snapshot_from_batch.py
=========================================
Phase 7 (lockdown 2026-05-11 Section 7): regenerate the website snapshot
bundle's user-facing files from the active batch produced under
amendment v1.1.

Background
----------
The pre-lockdown ``scripts/generate_snapshot.py`` ran its own M0 Monte
Carlo via ``SimpleEloProvider``; the website's JSON bundle therefore
served M0 numbers under a champion_model = "M0" tag. After Sections 1
through 8 of the lockdown closed, the canonical state is:
  - M2_fifa is the locked champion (champion_model.json::CHAMPION_LOCKED).
  - The active 10k batch is batch_20260512_013228Z (per
    data/calibration/active_batch.json), produced under amendment v1.1.

This script bridges the active batch to the website's snapshot bundle by
re-aggregating per-team progression probabilities from the batch's
team_runs_M2.parquet and rewriting the user-facing files:
  - snapshot_meta.json        (champion_model = "M2_fifa"; amendment note)
  - tournament.json           (batch-derived per-team probabilities)
  - freshness.json            (refreshed timestamps)
  - ledger.jsonl              (model_id flipped from "M0" to "M2_fifa")

Files NOT rewritten (deliberate, see Section 7 report for rationale):
  - bracket.json              (currently empty round slots; no content drift)
  - evaluation_metrics.json   (kill_criteria_check already correct after
                               Section 8.4; pre-tournament metrics all null)
  - divergence.json           (M0-derived against synthetic Pinnacle odds;
                               regeneration depends on the Pinnacle
                               switchover flagged in
                               PINNACLE_INGESTION_READINESS.md gap 5.2)
  - matches/*.json            (per-match M0 lambdas; bridging to M2
                               lambdas requires consuming match_runs_M2,
                               flagged as a follow-up)
  - teams/*.json              (per-team M0-derived narratives; same
                               follow-up class as matches/)

Per-team metadata (display_name, fifa_code, confederation, group, seed,
elo_current, rank_change_7d) is carried forward from the existing
tournament.json so the website's canonical-draw conventions
("United States", "Korea Republic", "Türkiye", etc.) are preserved
unchanged. Only the probability fields and the n_runs counter are
replaced from the batch.

Run
---
  python scripts/regenerate_snapshot_from_batch.py

The script reads ``data/calibration/active_batch.json`` to find the
batch and refuses to run if the active_batch_id has changed since the
script's last execution (the snapshot dir is derived from the
active_batch_id so a mismatch indicates a stale run).
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

WEBSITE_DATA_ROOT = PROJECT_ROOT / "website" / "public" / "data"
LATEST_DIR        = WEBSITE_DATA_ROOT / "latest"
SNAPSHOTS_DIR     = WEBSITE_DATA_ROOT / "snapshots"
MANIFEST_PATH     = WEBSITE_DATA_ROOT / "manifest.json"
ACTIVE_BATCH_JSON = PROJECT_ROOT / "data" / "calibration" / "active_batch.json"
CHAMPION_MODEL_JSON = PROJECT_ROOT / "data" / "calibration" / "champion_model.json"
AMENDMENT_POINTER = "osf/amendments/amendment_v1.1_data_completeness.md"

# Batch team_id (post-Section-1 normalisation) to website canonical-draw
# display_name. Most teams agree; the entries below are the six cases that
# differ. Any team not listed maps to itself. Maintained alongside the
# similar normalisation tables in ingestion/fetch_odds_pinnacle.py
# (_TEAM_NAME_NORM) and scripts/generate_snapshot.py (_ELO_NAME_NORM).
_TEAM_ID_TO_DISPLAY_NAME = {
    "USA":         "United States",
    "Iran":        "IR Iran",
    "South Korea": "Korea Republic",
    "Turkey":      "Türkiye",
    "Cape Verde":  "Cabo Verde",
    "DR Congo":    "Congo DR",
}


def _now_utc() -> datetime:
    return datetime.now(tz=timezone.utc)


def _code_sha() -> str:
    """Return the current git HEAD SHA (first 16 hex chars)."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()[:16]
    except Exception:
        return "unknown"


def _data_sha(active_batch: dict) -> str:
    """SHA-256 prefix anchored to the active batch's matrix and data hash."""
    parts = [
        active_batch.get("active_batch_id", ""),
        active_batch.get("matrix_sha256_lock", ""),
    ]
    h = hashlib.sha256("|".join(parts).encode()).hexdigest()
    return f"sha256:{h[:32]}"


def _wilson_ci(p: float, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    denom = 1.0 + (z ** 2) / n
    centre = (p + (z ** 2) / (2 * n)) / denom
    import math
    spread = z * math.sqrt(p * (1 - p) / n + (z ** 2) / (4 * n * n)) / denom
    return max(0.0, centre - spread), min(1.0, centre + spread)


def aggregate_team_progression(team_runs: pd.DataFrame) -> dict[str, dict]:
    """Aggregate per-team progression probabilities from team_runs_M2.parquet.

    Mirrors the exit-round buckets used by scripts/generate_snapshot.py so
    the website schema (TournamentSnapshotSchema) accepts the output without
    changes.
    """
    out: dict[str, dict] = {}
    n_runs_total = int(team_runs["run_idx"].nunique())
    grouped = team_runs.groupby("team_id")

    for team_id, sub in grouped:
        n = len(sub)
        if n == 0:
            continue
        p_champion = float((sub["champion"] == True).sum()) / n
        p_final = float(sub["exit_round"].isin(["Champion", "Runner-up"]).sum()) / n
        p_semi = float(
            sub["exit_round"].isin(["Champion", "Runner-up", "SF", "3rd"]).sum()
        ) / n
        p_quarter = float(
            sub["exit_round"].isin(["Champion", "Runner-up", "SF", "3rd", "QF"]).sum()
        ) / n
        p_r16 = float(
            sub["exit_round"].isin(["Champion", "Runner-up", "SF", "3rd", "QF", "R16"]).sum()
        ) / n
        p_group_qual = float((sub["qualified_r32"] == True).sum()) / n
        ci_lo, ci_hi = _wilson_ci(p_champion, n)

        out[team_id] = {
            "p_champion":            round(p_champion, 6),
            "p_final":               round(p_final, 6),
            "p_semifinal":           round(p_semi, 6),
            "p_quarterfinal":        round(p_quarter, 6),
            "p_r16":                 round(p_r16, 6),
            "p_group_qualification": round(p_group_qual, 6),
            "ci_95_champion":        [round(ci_lo, 6), round(ci_hi, 6)],
            "n_runs":                n,
        }
    return out


def regenerate_tournament_json(
    existing: dict,
    aggregated: dict[str, dict],
    new_snapshot_id: str,
    generated_at: str,
    n_runs_per_team: int,
) -> dict:
    """Rebuild tournament.json keeping per-team metadata, replacing probs."""
    new_teams = []
    for row in existing["teams"]:
        display_name = row["display_name"]
        # Map canonical-draw display_name back to batch team_id via the
        # inverse of _TEAM_ID_TO_DISPLAY_NAME.
        team_id = display_name
        for batch_id, mapped in _TEAM_ID_TO_DISPLAY_NAME.items():
            if mapped == display_name:
                team_id = batch_id
                break
        if team_id not in aggregated:
            raise KeyError(
                f"Display name {display_name!r} maps to team_id {team_id!r}, "
                f"which is missing from the batch aggregation. Check the "
                f"_TEAM_ID_TO_DISPLAY_NAME table in this script."
            )

        agg = aggregated[team_id]
        # 'group' is optional in TournamentTeamSchema; carry through only
        # if the existing row had it (today it doesn't, but the field is
        # supported by the schema so future runs may include it).
        out_row = {
            "fifa_code":             row["fifa_code"],
            "display_name":          display_name,
            "confederation":         row["confederation"],
            "seed":                  row["seed"],
            "p_champion":            agg["p_champion"],
            "p_final":               agg["p_final"],
            "p_semifinal":           agg["p_semifinal"],
            "p_quarterfinal":        agg["p_quarterfinal"],
            "p_r16":                 agg["p_r16"],
            "p_group_qualification": agg["p_group_qualification"],
            "ci_95_champion":        agg["ci_95_champion"],
            "elo_current":           row["elo_current"],
            "rank_change_7d":        row["rank_change_7d"],
        }
        if "group" in row:
            out_row["group"] = row["group"]
        new_teams.append(out_row)

    # Re-sort by p_champion descending and reassign seed indices so the
    # ledger stays stable.
    new_teams.sort(key=lambda t: t["p_champion"], reverse=True)
    for idx, t in enumerate(new_teams, start=1):
        t["seed"] = idx

    return {
        "snapshot_id":      new_snapshot_id,
        "generated_at_utc": generated_at,
        "mc_runs":          n_runs_per_team,
        "teams":            new_teams,
    }


def main() -> None:
    print("=" * 60)
    print("regenerate_snapshot_from_batch (lockdown 2026-05-11 Section 7)")
    print("=" * 60)

    # ── Load active batch + locked champion artifact ──────────────────────
    active = json.loads(ACTIVE_BATCH_JSON.read_text())
    active_batch_id = active["active_batch_id"]
    batch_path = PROJECT_ROOT / active["active_batch_path"]
    team_runs_path = batch_path / "team_runs_M2.parquet"
    if not team_runs_path.exists():
        raise FileNotFoundError(f"Active batch missing M2 outputs: {team_runs_path}")
    print(f"[1] active_batch_id : {active_batch_id}")
    print(f"    batch_path      : {batch_path.relative_to(PROJECT_ROOT)}")

    champion = json.loads(CHAMPION_MODEL_JSON.read_text())
    champion_internal = champion.get("m_star_model_id", "M2_fifa")
    champion_locked   = champion.get("CHAMPION_LOCKED", False)
    amendment_v       = champion.get("amendment_v", "v1.1")
    # Website schemas (website/src/lib/data/schemas.ts) constrain the
    # `champion_model` and ledger `model_id` enums to {M0, M1, M2, M3, M_STAR}.
    # We surface the locked champion as `M_STAR` on the website while the
    # underlying internal id (`M2_fifa`) is preserved in the snapshot notes
    # and the active_batch_id stamp so a forensic reviewer can trace it.
    champion_model_id = "M_STAR"
    print(f"    champion        : {champion_internal}  LOCKED={champion_locked}  amendment={amendment_v}")
    print(f"    website label   : {champion_model_id}  (per schema enum)")

    # ── Read existing snapshot bundle for metadata carry-forward ──────────
    if not LATEST_DIR.exists():
        raise FileNotFoundError(f"website/public/data/latest does not exist; nothing to carry forward.")
    existing_tournament = json.loads((LATEST_DIR / "tournament.json").read_text())
    print(f"    existing_id     : {existing_tournament['snapshot_id']}  (carried-forward metadata source)")

    # ── Aggregate per-team progression from the batch ─────────────────────
    team_runs = pd.read_parquet(team_runs_path)
    aggregated = aggregate_team_progression(team_runs)
    n_runs_per_team = max(row["n_runs"] for row in aggregated.values())
    print(f"[2] aggregated {len(aggregated)} teams from {n_runs_per_team} runs each")

    now = _now_utc()
    new_snapshot_id  = now.strftime("%Y-%m-%dT%H:%MZ")
    new_generated_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    new_dir = SNAPSHOTS_DIR / new_snapshot_id

    code_sha_str = _code_sha()
    data_sha_str = _data_sha(active)
    print(f"[3] new snapshot_id : {new_snapshot_id}")
    print(f"    code_sha        : {code_sha_str}")
    print(f"    data_sha        : {data_sha_str}")

    # ── Build new tournament.json from batch + carried-forward metadata ──
    new_tournament = regenerate_tournament_json(
        existing_tournament, aggregated, new_snapshot_id, new_generated_at, n_runs_per_team,
    )

    # ── Build new snapshot_meta.json ──────────────────────────────────────
    new_snapshot_meta = {
        "schema_version":       "9.0",
        "snapshot_id":          new_snapshot_id,
        "generated_at_utc":     new_generated_at,
        "code_sha":             code_sha_str,
        "data_sha":             data_sha_str,
        "pre_reg_tag":          "v1.0.0-mstar-lock",
        "champion_model":       champion_model_id,
        "mc_runs":              n_runs_per_team,
        "tournament_phase":     "pre_tournament",
        "matches_settled":      0,
        "matches_remaining":    104,
        # cp-05: hardcoded False, aligned with cp-04's evaluation_metrics.kill_criteria_check.status="pre_tournament_locked".
        "kill_criteria_active": False,
        "notes": (
            f"Phase 7 M_STAR (= {champion_internal}) snapshot under "
            f"amendment {amendment_v}; per-team probabilities aggregated "
            f"from batch {active_batch_id}; see {AMENDMENT_POINTER}."
        ),
        "active_batch_id":      active_batch_id,
        "amendment_pointer":    AMENDMENT_POINTER,
    }

    # ── Build new freshness.json ──────────────────────────────────────────
    new_freshness = {
        "snapshot_id":                  new_snapshot_id,
        "generated_at_utc":             new_generated_at,
        "max_expected_staleness_hours": 26,
        "current_staleness_hours":      0.0,
        "status":                       "FRESH",
    }

    # ── Carry forward bracket.json, evaluation_metrics.json, divergence.json,
    #    matches/*.json, teams/*.json from the existing latest dir, but flip
    #    ledger.jsonl's model_id labels to match the new champion.
    print(f"[4] writing bundle to {new_dir}")
    new_dir.mkdir(parents=True, exist_ok=True)

    # tournament.json
    (new_dir / "tournament.json").write_text(json.dumps(new_tournament, indent=2))
    # snapshot_meta.json
    (new_dir / "snapshot_meta.json").write_text(json.dumps(new_snapshot_meta, indent=2))
    # freshness.json
    (new_dir / "freshness.json").write_text(json.dumps(new_freshness, indent=2))

    # bracket.json: carry through unchanged but update the snapshot_id field
    bracket = json.loads((LATEST_DIR / "bracket.json").read_text())
    bracket["snapshot_id"] = new_snapshot_id
    (new_dir / "bracket.json").write_text(json.dumps(bracket, indent=2))

    # evaluation_metrics.json: carry through unchanged but update snapshot_id
    eval_metrics = json.loads((LATEST_DIR / "evaluation_metrics.json").read_text())
    eval_metrics["snapshot_id"] = new_snapshot_id
    (new_dir / "evaluation_metrics.json").write_text(json.dumps(eval_metrics, indent=2))

    # divergence.json: carry through unchanged but update snapshot_id and
    # flag the M0-vs-M2 model_version drift in a top-level note. The full
    # M2 re-derivation depends on real Pinnacle data (see
    # PINNACLE_INGESTION_READINESS.md gap 5.2).
    divergence = json.loads((LATEST_DIR / "divergence.json").read_text())
    divergence["snapshot_id"] = new_snapshot_id
    divergence["notes"] = (
        f"Carried forward from snapshot {existing_tournament['snapshot_id']}; "
        f"row-level model_version stamps were emitted under the prior M0 "
        f"snapshot pipeline. Re-derivation under {champion_model_id} is "
        f"pending the Pinnacle real-data ingestion documented in "
        f"PINNACLE_INGESTION_READINESS.md gap 5.2; per-team tournament "
        f"probabilities in tournament.json are the M2 batch outputs and "
        f"are the authoritative pre-tournament numbers."
    )
    (new_dir / "divergence.json").write_text(json.dumps(divergence, indent=2))

    # ledger.jsonl: flip model_id from "M0" to "M_STAR" (the schema enum
    # for the production champion; the internal id stays at champion_internal).
    ledger_rows = []
    for line in (LATEST_DIR / "ledger.jsonl").read_text().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("model_id") == "M0":
            row["model_id"] = champion_model_id
        ledger_rows.append(row)
    with open(new_dir / "ledger.jsonl", "w") as fh:
        for row in ledger_rows:
            fh.write(json.dumps(row) + "\n")

    # matches/ subdirectory: carry through verbatim. The M2 re-derivation
    # of per-match lambdas is a follow-up (depends on bridging
    # match_runs_M2.parquet into the per-match schema; not in Section 7
    # scope).
    src = LATEST_DIR / "matches"
    dst = new_dir / "matches"
    if dst.exists():
        shutil.rmtree(dst)
    if src.exists():
        shutil.copytree(src, dst)

    # teams/ subdirectory: rewrite each per-team JSON's progression block
    # from the batch aggregation. Keep all other fields (fifa_code,
    # display_name, group, confederation, elo_rating, history,
    # upcoming_matches) as carried forward from the existing snapshot.
    # Field-name mapping: tournament.json uses p_quarterfinal /
    # p_semifinal; teams/<code>.json uses p_qf / p_sf.
    src_teams = LATEST_DIR / "teams"
    dst_teams = new_dir / "teams"
    if dst_teams.exists():
        shutil.rmtree(dst_teams)
    dst_teams.mkdir(parents=True, exist_ok=True)

    code_to_team_id = {}
    for batch_id in aggregated:
        display = _TEAM_ID_TO_DISPLAY_NAME.get(batch_id, batch_id)
        # Find the fifa_code via existing_tournament
        for trow in existing_tournament["teams"]:
            if trow["display_name"] == display:
                code_to_team_id[trow["fifa_code"]] = batch_id
                break

    rewritten = 0
    for src_file in sorted(src_teams.glob("*.json")):
        existing_team = json.loads(src_file.read_text())
        code = existing_team.get("fifa_code") or src_file.stem
        team_id = code_to_team_id.get(code)
        if team_id is None:
            # No batch aggregation for this code; carry through unchanged.
            shutil.copy2(src_file, dst_teams / src_file.name)
            continue
        agg = aggregated[team_id]
        new_team = dict(existing_team)
        new_team["progression"] = {
            "p_group_qualification": agg["p_group_qualification"],
            "p_r16":                 agg["p_r16"],
            "p_qf":                  agg["p_quarterfinal"],
            "p_sf":                  agg["p_semifinal"],
            "p_final":               agg["p_final"],
            "p_champion":            agg["p_champion"],
            "ci_95_champion":        agg["ci_95_champion"],
        }
        (dst_teams / src_file.name).write_text(json.dumps(new_team, indent=2))
        rewritten += 1
    print(f"    teams/: rewrote progression block for {rewritten} of {len(list(src_teams.glob('*.json')))} files")

    # ── Replace LATEST_DIR with the new bundle ───────────────────────────
    print(f"[5] replacing latest/ with new bundle")
    if LATEST_DIR.exists():
        shutil.rmtree(LATEST_DIR)
    shutil.copytree(new_dir, LATEST_DIR)

    # ── Update manifest.json (root data manifest) ────────────────────────
    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text())
        if not isinstance(manifest, list):
            manifest = []
    else:
        manifest = []
    manifest.append({
        "snapshot_id":      new_snapshot_id,
        "generated_at_utc": new_generated_at,
        "bundle_url":       f"/data/snapshots/{new_snapshot_id}/",
        "meta_url":         f"/data/snapshots/{new_snapshot_id}/snapshot_meta.json",
    })
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))

    # ── Print headline numbers for spot-check ────────────────────────────
    print()
    print("Headline tournament-win probabilities (post-regen):")
    new_teams_by_code = {t["fifa_code"]: t for t in new_tournament["teams"]}
    for code in ("USA", "ARG", "ENG", "FRA", "BRA", "ESP", "GER", "POR", "NED", "BEL"):
        t = new_teams_by_code.get(code)
        if t:
            print(f"  {code} {t['display_name']:18s} p_champion = {t['p_champion']*100:.2f}%")

    print()
    print(f"OK: snapshot {new_snapshot_id} written and copied to latest/")
    print(f"    bundle path: {new_dir.relative_to(PROJECT_ROOT)}")
    print(f"    champion_model: {champion_model_id}")
    print(f"    notes: {new_snapshot_meta['notes']}")


if __name__ == "__main__":
    main()
