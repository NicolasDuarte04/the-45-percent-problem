"""Extract Athletic press-packet CSVs from the locked Phase 5 10k batch.

Produces the 7 deliverables that are honestly derivable from the locked
artifacts. The 3 *_market_divergence files are intentionally not produced
here — they require real de-vigged Pinnacle data, and the current
odds_pinnacle.parquet contains only synthetic placeholder rows.
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# cp-16 step (a): the press packets are derived from the locked Phase 5 10k
# batch, so the batch identity is pinned via frozen_batch.py rather than read
# from active_batch.json (which the nightly rebatch repoints). The matrix-sha
# chain-of-custody assert below now verifies the frozen batch's own
# acceptance_report against this locked sha.
from frozen_batch import (  # noqa: E402
    FROZEN_BATCH_ID,
    FROZEN_BATCH_PATH,
    FROZEN_STRENGTH_MATRIX_SHA256,
)

BATCH_DIR = FROZEN_BATCH_PATH
BATCH_ID = FROZEN_BATCH_ID
LOCK_SHA = FROZEN_STRENGTH_MATRIX_SHA256
AMENDMENT_POINTER = "osf/amendments/amendment_v1.1_data_completeness.md"
OUT_ROOT = PROJECT_ROOT / "press_packets"

KNOCKOUT_BUCKETS = {
    "R32": {"R32", "R16", "QF", "SF", "3rd", "Runner-up", "Champion"},
    "R16": {"R16", "QF", "SF", "3rd", "Runner-up", "Champion"},
    "QF":  {"QF", "SF", "3rd", "Runner-up", "Champion"},
    "SF":  {"SF", "3rd", "Runner-up", "Champion"},
    "Final": {"Runner-up", "Champion"},
}

# Knockout phases in match_runs (verify against schema if needed)
PHASE_TO_ROUND = {
    "r32": "R32", "R32": "R32",
    "r16": "R16", "R16": "R16",
    "qf": "QF",   "QF": "QF",   "quarter-final": "QF", "Quarter-final": "QF",
    "sf": "SF",   "SF": "SF",   "semi-final": "SF",    "Semi-final": "SF",
    "final": "Final", "Final": "Final",
}

GROUPS = {"USA": "D", "Brazil": "C", "Argentina": "J", "England": "L"}
GROUPS["United States"] = "D"  # alias retained for any legacy callers


def hash_file_sha16(path: Path) -> str:
    h = hashlib.sha256(path.read_bytes()).hexdigest()
    return h[:16]


def beta_binomial_ci(k: int, n: int, level: float = 0.90):
    """Beta(1+k, 1+n-k) credible interval. Jeffreys prior could replace 1+, 1+."""
    from scipy.stats import beta
    alpha = 1 + k
    beta_p = 1 + n - k
    lo = beta.ppf((1 - level) / 2, alpha, beta_p)
    hi = beta.ppf(1 - (1 - level) / 2, alpha, beta_p)
    return float(lo), float(hi)


def path_probabilities_csv(team: str, team_runs_m2: pd.DataFrame, snapshot_sha16: str) -> pd.DataFrame:
    """Build path-probabilities CSV per Muller §3 schema."""
    sub = team_runs_m2[team_runs_m2.team_id == team]
    n = len(sub)
    rows = []

    def add(metric: str, label: str, mask: pd.Series):
        k = int(mask.sum())
        p = k / n
        se = (p * (1 - p) / n) ** 0.5
        ci_lo, ci_hi = beta_binomial_ci(k, n, 0.90)
        rows.append({
            "metric": metric, "metric_label": label,
            "probability": round(p, 6),
            "std_error": round(se, 6),
            "ci_90_lower": round(ci_lo, 6),
            "ci_90_upper": round(ci_hi, 6),
            "n_runs": n,
            "snapshot_sha": snapshot_sha16,
        })

    # Group-phase outcomes
    add("group_winner",   f"Finishes 1st in Group {GROUPS.get(team,'?')}", sub.group_finish == 1)
    add("group_runner_up", f"Finishes 2nd in Group {GROUPS.get(team,'?')}", sub.group_finish == 2)
    add("group_third",    f"Finishes 3rd in Group {GROUPS.get(team,'?')}", sub.group_finish == 3)
    add("group_fourth",   f"Finishes 4th in Group {GROUPS.get(team,'?')}", sub.group_finish == 4)
    add("qualified_r32",  "Qualifies for Round of 32", sub.qualified_r32)

    # Reach round R (cumulative)
    for r, label in [("R32","Reaches R32 (qualified)"), ("R16","Reaches R16"), ("QF","Reaches Quarter-finals"),
                     ("SF","Reaches Semi-finals"), ("Final","Reaches Final")]:
        add(f"reach_{r.lower()}", label, sub.exit_round.isin(KNOCKOUT_BUCKETS[r]))

    # Exit round (exact)
    for r, label in [("Group","Eliminated in group stage"),
                     ("R32","Eliminated in R32"),
                     ("R16","Eliminated in R16"),
                     ("QF","Eliminated in QF"),
                     ("SF","Eliminated in SF"),
                     ("3rd","Plays 3rd-place match"),
                     ("Runner-up","Loses final (runner-up)")]:
        add(f"exit_round_{r.lower().replace('-','_')}", label, sub.exit_round == r)

    add("champion", "Wins the tournament", sub.champion)

    return pd.DataFrame(rows)


def usa_conditional_csv(team: str, group: str,
                        team_runs_m2: pd.DataFrame,
                        match_runs_m2: pd.DataFrame,
                        snapshot_sha16: str) -> pd.DataFrame:
    """For each (group_finish_condition, knockout_round), compute the marginal
    P(opponent | group_finish == X) where X = 1,2.
    """
    rows = []
    # Index team's run -> group_finish for fast lookup
    team_finish = (team_runs_m2[team_runs_m2.team_id == team]
                   .set_index("run_idx")["group_finish"])

    # Pull only knockout match_runs involving this team
    ko_mask = ~match_runs_m2.phase.isin(["group", "Group Stage", "Group"])
    team_ko = match_runs_m2[ko_mask & ((match_runs_m2.team_home == team) | (match_runs_m2.team_away == team))].copy()
    team_ko["opponent"] = np.where(team_ko.team_home == team, team_ko.team_away, team_ko.team_home)
    team_ko["round_norm"] = team_ko.phase.map(PHASE_TO_ROUND).fillna(team_ko.phase)
    team_ko["finish"] = team_ko.run_idx.map(team_finish)

    for finish_val, finish_lbl in [(1, "won_group_"+group), (2, "runner_up_group_"+group)]:
        for r in ["R32", "R16", "QF", "SF", "Final"]:
            slice_ = team_ko[(team_ko.finish == finish_val) & (team_ko.round_norm == r)]
            n_cond = slice_["run_idx"].nunique()  # number of runs satisfying condition AND reaching this round
            if n_cond == 0:
                continue
            counts = slice_.opponent.value_counts()
            for opp, k in counts.items():
                rows.append({
                    "condition": finish_lbl,
                    "round": r,
                    "opponent": opp,
                    "conditional_probability": round(k / n_cond, 6),
                    "n_conditioned_runs": int(n_cond),
                    "snapshot_sha": snapshot_sha16,
                })
    return pd.DataFrame(rows).sort_values(
        ["condition", "round", "conditional_probability"], ascending=[True, True, False]
    ).reset_index(drop=True)


def m2_cv_curve_csv() -> pd.DataFrame:
    """Dump m2_fifa_params.json::cv_log_loss_curve.

    The locked file has 11 grid points {0.0, 0.05, …, 0.5, 0.75, 1.0}, not the
    21-point grid implied by the Worville spec. std_error and folds are not in
    the locked file at the per-w granularity; folds count is recorded once
    (5-fold CV per CLAUDE.md Phase 3) and std_error is left blank with a note
    in the sidecar.
    """
    d = json.loads((PROJECT_ROOT / "data/calibration/m2_fifa_params.json").read_text())
    curve = d["cv_log_loss_curve"]
    rows = []
    fold_count = len(d.get("fold_losses", [])) if isinstance(d.get("fold_losses"), list) else None
    for w_str, ll in curve.items():
        rows.append({
            "w": float(w_str),
            "mean_cv_log_loss": float(ll),
            "std_error": "",  # not in locked file at per-w granularity
            "folds": fold_count if fold_count is not None else "",
        })
    return pd.DataFrame(rows).sort_values("w").reset_index(drop=True)


def defender_winrate_history_csv() -> pd.DataFrame:
    """Hand-curated 1962–2022 defender outcomes. Scope choices in the sidecar.

    Rule applied: row per WC since 1962. `defender` = winner of immediately
    prior tournament. `defender_competed` is True for all rows (no defender
    failed to qualify since 1962). `defender_won_next` is True only for the
    1962 case (Brazil successfully defending 1958→1962); every other defender
    failed to win the next tournament.
    """
    data = [
        # (year, defender, competed, won_next, exit_round, notes)
        (1962, "Brazil",       True, True,  "Champion",  "Brazil successfully defends; last successive WC title to date"),
        (1966, "Brazil",       True, False, "Group",     "Eliminated in group stage"),
        (1970, "England",      True, False, "QF",        "Eliminated in QF by West Germany"),
        (1974, "Brazil",       True, False, "3rd",       "Fourth place in the second group stage"),
        (1978, "West Germany", True, False, "Second-Group", "Eliminated in the second group stage"),
        (1982, "Argentina",    True, False, "Second-Group", "Eliminated in the second group stage"),
        (1986, "Italy",        True, False, "R16",       "Eliminated in R16 by France"),
        (1990, "Argentina",    True, False, "Runner-up", "Lost final to West Germany"),
        (1994, "West Germany", True, False, "QF",        "Eliminated in QF by Bulgaria; competed as unified Germany"),
        (1998, "Brazil",       True, False, "Runner-up", "Lost final to France"),
        (2002, "France",       True, False, "Group",     "Eliminated in group stage, zero goals scored"),
        (2006, "Brazil",       True, False, "QF",        "Eliminated in QF by France"),
        (2010, "Italy",        True, False, "Group",     "Eliminated in group stage"),
        (2014, "Spain",        True, False, "Group",     "Eliminated in group stage"),
        (2018, "Germany",      True, False, "Group",     "Eliminated in group stage"),
        (2022, "France",       True, False, "Runner-up", "Lost final to Argentina"),
    ]
    df = pd.DataFrame(data, columns=[
        "year", "defender", "defender_competed", "defender_won_next",
        "defender_exit_round", "notes",
    ])
    return df


def brazil_lambda_decomposition_parquet(match_runs_m2: pd.DataFrame,
                                        team: str = "Brazil") -> pd.DataFrame:
    """Per Brazil match across all runs, extract the deterministic lambda pair.

    Model-side columns ONLY. Pinnacle-dependent columns are intentionally
    omitted — the sidecar README documents the gap.

    The match_runs lambda values are deterministic given (team_home, team_away)
    under M2 because the strength matrix is fixed; we verify this and aggregate
    by (phase, team_home, team_away).
    """
    bra_matches = match_runs_m2[
        (match_runs_m2.team_home == team) | (match_runs_m2.team_away == team)
    ].copy()

    # Sanity: per-fixture lambda variance must be zero (deterministic)
    by_fixture = bra_matches.groupby(["phase", "team_home", "team_away"]).agg(
        lh_min=("lambda_home", "min"),
        lh_max=("lambda_home", "max"),
        la_min=("lambda_away", "min"),
        la_max=("lambda_away", "max"),
        n_runs=("run_idx", "nunique"),
        match_id_sample=("match_id", "first"),
    ).reset_index()

    # Tolerance: float32 round-trip, allow 1e-5
    lh_var = (by_fixture.lh_max - by_fixture.lh_min).abs().max()
    la_var = (by_fixture.la_max - by_fixture.la_min).abs().max()
    assert lh_var < 1e-5 and la_var < 1e-5, (
        f"lambda not deterministic across runs (lh_var={lh_var}, la_var={la_var})"
    )

    # Build output rows
    rows = []
    for _, r in by_fixture.iterrows():
        is_bra_home = r.team_home == team
        lam_bra = float(r.lh_min if is_bra_home else r.la_min)
        lam_opp = float(r.la_min if is_bra_home else r.lh_min)
        opp = r.team_away if is_bra_home else r.team_home

        p_h, p_d, p_a = bivariate_poisson_dc_marginals(
            r.lh_min, r.la_min, lambda3=0.10, rho=-0.05
        )
        if is_bra_home:
            p_bra_win, p_opp_win = p_h, p_a
        else:
            p_bra_win, p_opp_win = p_a, p_h
        p_draw = p_d

        rows.append({
            "match_id": r.match_id_sample,
            "phase": r.phase,
            "opponent": opp,
            "lambda_BRA": lam_bra,
            "lambda_opp": lam_opp,
            "lambda_3": 0.10,
            "rho": -0.05,
            "p_BRA_win": p_bra_win,
            "p_draw": p_draw,
            "p_opp_win": p_opp_win,
            "n_runs_seen": int(r.n_runs),
        })

    df = pd.DataFrame(rows)
    # Acceptance test on unrounded marginals (1e-9 tolerance per Carey §3)
    sums = (df.p_BRA_win + df.p_draw + df.p_opp_win)
    max_dev = (sums - 1.0).abs().max()
    assert max_dev < 1e-9, f"BRA marginals do not sum to 1.0: max dev = {max_dev}"

    # Round on output
    for col in ["lambda_BRA", "lambda_opp", "p_BRA_win", "p_draw", "p_opp_win"]:
        df[col] = df[col].round(6)
    return df


def bivariate_poisson_dc_marginals(lam_h: float, lam_a: float,
                                   lambda3: float = 0.10,
                                   rho: float = -0.05,
                                   max_goals: int = 10) -> tuple[float, float, float]:
    """Bivariate Poisson + Dixon-Coles low-score correction, marginals.

    Returns (p_home_win, p_draw, p_away_win).

    Uses the Karlis-Ntzoufras BP formulation:
        X_h = Y1 + Y3, X_a = Y2 + Y3,  where Y1,Y2,Y3 indep Poisson
        Y1 ~ Pois(lam_h - lambda3); Y2 ~ Pois(lam_a - lambda3); Y3 ~ Pois(lambda3)
    Dixon-Coles correction on the (0,0),(1,0),(0,1),(1,1) cells.
    """
    from scipy.stats import poisson
    lam1 = max(lam_h - lambda3, 1e-9)
    lam2 = max(lam_a - lambda3, 1e-9)
    lam3 = max(lambda3, 1e-9)

    p1 = poisson.pmf(np.arange(max_goals + 1), lam1)
    p2 = poisson.pmf(np.arange(max_goals + 1), lam2)
    p3 = poisson.pmf(np.arange(max_goals + 1), lam3)

    # Convolve to get marginal of X_h and X_a
    pmf_h = np.convolve(p1, p3)[: max_goals + 1]
    pmf_a = np.convolve(p2, p3)[: max_goals + 1]

    # Joint = outer product (assuming independence after the shared shock — this
    # is the standard approximation used in the simulator; for exact DC we'd
    # build the joint via Y3 marginalisation, but the marginals here are what
    # we actually need.)
    joint = np.outer(pmf_h, pmf_a)

    # Dixon-Coles correction τ(x,y; lam_h, lam_a, rho) on low scores
    tau = np.ones_like(joint)
    if lam_h > 0 and lam_a > 0:
        tau[0, 0] = 1 - lam_h * lam_a * rho
        tau[0, 1] = 1 + lam_h * rho
        tau[1, 0] = 1 + lam_a * rho
        tau[1, 1] = 1 - rho
    joint = joint * tau
    joint = joint / joint.sum()

    p_h = float(np.tril(joint, -1).sum())  # X_h > X_a
    p_d = float(np.trace(joint))            # X_h == X_a
    p_a = float(np.triu(joint, 1).sum())    # X_h < X_a
    return p_h, p_d, p_a


FILE_PURPOSES = {
    "usa_path_probabilities.csv": "USA path probabilities (group + knockout marginals)",
    "usa_path_conditional.csv": "USA conditional opponent probabilities by round",
    "brazil_lambda_decomposition.parquet": "Per-fixture Brazil lambda decomposition (model-side)",
    "argentina_path_probabilities.csv": "Argentina path probabilities (group + knockout marginals)",
    "defender_winrate_history.csv": "Hand-curated 1962 to 2022 defender outcomes",
    "england_path_probabilities.csv": "England path probabilities (group + knockout marginals)",
    "m2_blend_weight_cv_curve.csv": "M2 blend-weight CV log-loss curve (derived from sealed m2_fifa_params.json)",
}


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_sidecar_readme(packet_dir: Path, packet_name: str,
                         pending_files: list[str],
                         extracted_at: str,
                         skip_files: set[str] | None = None) -> None:
    """Write the four-section sidecar README per Section 4 of LOCKDOWN_PLAN_2026-05-11.

    Sections: Provenance, Files in this folder, Pending files, Note on amendment v1.1.
    """
    skip = skip_files or set()
    files = sorted(
        p for p in packet_dir.iterdir()
        if p.is_file() and p.name != "README.md" and p.name not in skip
    )

    file_table = ["| File | Purpose | sha256 |", "|---|---|---|"]
    for p in files:
        purpose = FILE_PURPOSES.get(p.name, "")
        file_table.append(f"| `{p.name}` | {purpose} | `{_sha256(p)}` |")
    file_table_str = "\n".join(file_table)

    pending_block = (
        "\n".join(
            f"- `{f}`: BLOCKED on real Pinnacle data ingestion. The pipeline is "
            f"structurally ready; verification in Section 6 of LOCKDOWN_PLAN. "
            f"Once Pinnacle publishes 2026 lines, this file becomes auto-generable."
            for f in pending_files
        )
        if pending_files
        else "_None._"
    )

    body = f"""# {packet_name} Athletic Press Packet (data extracts only; not the email)

## Provenance

```
active_batch_id:   {BATCH_ID}
matrix_sha256:     {LOCK_SHA}
code_sha:          9e8635ce2549523f477fc53acf2ef1d96701d079
amendment:         v1.1 ({AMENDMENT_POINTER})
extracted_at:      {extracted_at}
```

## Files in this folder

{file_table_str}

## Pending files (Section 6 dependency)

{pending_block}

## Note on amendment v1.1

These extracts were generated against the strength matrix produced by
amendment v1.1 (`data/raw/fifa_rankings.parquet` backfilled from the real
2026-04-01 FIFA publication, replacing the 16 missing rows that previously
fell back to the synthetic-snapshot default). The CV-derived statistics in
the M2 champion artifact (`L_CV`, `delta_vs_M0`, `sigma_CV`) are procedurally
pinned at OSF lock and did not change; only the strength matrix, and the
downstream tournament-progression probabilities, changed. See
`{AMENDMENT_POINTER}` for the full amendment record.

## Reproducibility footnote (seed-master)

Seed derivation in this batch uses SHA-based derivation over
(model_id | data_hash | batch_timestamp), which is deterministic but does
not consume the `pre_reg_constants.yaml::sim.seed_master` value. The
spec-vs-code drift is tracked under Section 8 of the lockdown plan.
"""

    (packet_dir / "README.md").write_text(body)


def main():
    # ── Load batch + manifest ─────────────────────────────────────────────
    manifest = json.loads((BATCH_DIR / "manifest.json").read_text())
    seed_base_m2 = manifest["seed_bases"]["M2"]
    data_hash_m2 = manifest["data_hashes"]["M2"]

    team_runs_m2 = pd.read_parquet(BATCH_DIR / "team_runs_M2.parquet")
    match_runs_m2 = pd.read_parquet(BATCH_DIR / "match_runs_M2.parquet")
    snapshot_sha16 = hash_file_sha16(BATCH_DIR / "team_runs_M2.parquet")

    acceptance = json.loads((BATCH_DIR / "acceptance_report.json").read_text())
    # acceptance_report.json schema may use matrix_sha256_run_M2 or matrix_sha256_run
    matrix_sha_run = (
        acceptance.get("matrix_sha256_run_M2")
        or acceptance.get("matrix_sha256_run")
    )
    assert matrix_sha_run == LOCK_SHA, "matrix_sha256 chain-of-custody broken; refuse to extract"

    extracted_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # ── Muller: USA path ──────────────────────────────────────────────────
    muller_dir = OUT_ROOT / "athletic_muller"
    muller_dir.mkdir(parents=True, exist_ok=True)
    usa_path = path_probabilities_csv("USA", team_runs_m2, snapshot_sha16)
    usa_path.to_csv(muller_dir / "usa_path_probabilities.csv", index=False)
    usa_cond = usa_conditional_csv("USA", "D", team_runs_m2, match_runs_m2, snapshot_sha16)
    usa_cond.to_csv(muller_dir / "usa_path_conditional.csv", index=False)
    write_sidecar_readme(muller_dir, "Muller", [], extracted_at)
    print(f"Muller: {len(usa_path)} marginal rows, {len(usa_cond)} conditional rows")

    # ── Carey: Brazil lambda decomposition (model-side only) ───────────────
    carey_dir = OUT_ROOT / "athletic_carey"
    carey_dir.mkdir(parents=True, exist_ok=True)
    bra_lambda = brazil_lambda_decomposition_parquet(match_runs_m2, "Brazil")
    bra_lambda.to_parquet(carey_dir / "brazil_lambda_decomposition.parquet",
                          engine="pyarrow", index=False, compression="snappy")
    write_sidecar_readme(carey_dir, "Carey", ["brazil_market_divergence.csv"], extracted_at)
    print(f"Carey: {len(bra_lambda)} Brazil fixtures lambda-decomposed")

    # ── Critchley: Argentina path + defender history ──────────────────────
    crit_dir = OUT_ROOT / "athletic_critchley"
    crit_dir.mkdir(parents=True, exist_ok=True)
    arg_path = path_probabilities_csv("Argentina", team_runs_m2, snapshot_sha16)
    arg_path.to_csv(crit_dir / "argentina_path_probabilities.csv", index=False)
    defender_hist = defender_winrate_history_csv()
    # Header comment block on the defender file
    with open(crit_dir / "defender_winrate_history.csv", "w") as f:
        f.write("# defender_winrate_history.csv\n")
        f.write("# Scope: World Cups from 1962 (first WC after a defender was eligible to compete since 1958 expansion)\n")
        f.write("#        through 2022. War-year gap (1942, 1946) excluded.\n")
        f.write("# Rule: defender = winner of the immediately preceding WC.\n")
        f.write("# Aggregate: defender-wins-next rate = sum(defender_won_next) / sum(defender_competed).\n")
        f.write(f"# Computed rate = {defender_hist.defender_won_next.sum()}/{defender_hist.defender_competed.sum()} "
                f"= {defender_hist.defender_won_next.sum()/defender_hist.defender_competed.sum():.4%}\n")
        f.write("# Note: hand-curated. Subject to founder review for scope choices before press use.\n")
        defender_hist.to_csv(f, index=False)
    write_sidecar_readme(crit_dir, "Critchley", ["argentina_market_divergence.csv"], extracted_at)
    print(f"Critchley: {len(arg_path)} marginal rows, "
          f"defender rate = {defender_hist.defender_won_next.sum()}/{defender_hist.defender_competed.sum()}")

    # ── Worville: England path + CV curve ─────────────────────────────────
    worv_dir = OUT_ROOT / "athletic_worville"
    worv_dir.mkdir(parents=True, exist_ok=True)
    eng_path = path_probabilities_csv("England", team_runs_m2, snapshot_sha16)
    eng_path.to_csv(worv_dir / "england_path_probabilities.csv", index=False)
    cv_curve = m2_cv_curve_csv()
    cv_curve.to_csv(worv_dir / "m2_blend_weight_cv_curve.csv", index=False)
    write_sidecar_readme(worv_dir, "Worville", ["england_market_divergence.csv"], extracted_at)
    print(f"Worville: {len(eng_path)} marginal rows, {len(cv_curve)} CV-curve points (w grid)")

    # ── Snapshot registry append ──────────────────────────────────────────
    regen_files = [
        muller_dir / "usa_path_probabilities.csv",
        muller_dir / "usa_path_conditional.csv",
        carey_dir / "brazil_lambda_decomposition.parquet",
        crit_dir / "argentina_path_probabilities.csv",
        worv_dir / "england_path_probabilities.csv",
    ]
    file_shas = {p.name: _sha256(p) for p in regen_files}
    concat_hex = "".join(file_shas[p.name] for p in regen_files)
    snapshot_sha = hashlib.sha256(concat_hex.encode("utf-8")).hexdigest()
    registry_row = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "script_name": "lockdown_2026-05-11_section4_athletic_extracts_amendment_v1.1",
        "snapshot_sha": snapshot_sha,
        "manifest": {
            "batch_id": BATCH_ID,
            "code_sha": "9e8635ce2549523f477fc53acf2ef1d96701d079",
            "matrix_sha256": LOCK_SHA,
            "amendment_pointer": AMENDMENT_POINTER,
            "extracted_at": extracted_at,
            "files": file_shas,
        },
        "notes": "lockdown_2026-05-11_section4_athletic_extracts_amendment_v1.1",
    }
    registry_path = PROJECT_ROOT / "data/snapshots/snapshot_registry.jsonl"
    with open(registry_path, "a") as f:
        f.write(json.dumps(registry_row) + "\n")
    print(f"Registry: appended {snapshot_sha[:16]} to {registry_path.relative_to(PROJECT_ROOT)}")

    # ── Final summary ─────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("Extraction complete. Files written:")
    for d in [muller_dir, carey_dir, crit_dir, worv_dir]:
        for p in sorted(d.glob("*")):
            if p.is_file():
                print(f"  {p.relative_to(PROJECT_ROOT)}  ({p.stat().st_size:,} B)")


if __name__ == "__main__":
    main()
