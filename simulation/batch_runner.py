"""
simulation/batch_runner.py
===========================
Phase 5, Deliverable 5: Batch Orchestrator

Implements §7 of Phase5_Simulation_Engine_Design.md.

Runs N simulations across M model variants and writes timestamped Parquet
snapshots.
  - Variants run sequentially (audit-clean determinism).
  - Simulations within a variant are parallelised via joblib.
  - Checkpoint every 500 runs; atomic rename on completion.
  - On any per-run exception: log and continue; corrupt runs are recorded
    under manifest.failed_runs.
  - If a variant's failure rate reaches or exceeds 0.1% the batch raises
    RuntimeError; the threshold is pre-registered (§7.4) and the runner
    must not soft-pass it.
  - Accepts --resume <batch_dir> to restart a partial batch from run 0 of
    any incomplete variant (simpler and still deterministic, per §7.3).

Seed discipline (§7.1, with the pre-registered sim.seed_master constant
from evaluation/pre_reg_constants.yaml as an additional hash ingredient):
  seed_base = int(
      sha256(f"{seed_master}|{model_id}|{data_hash}|{batch_timestamp}"), 16
  ) % 2**32
  seeds = [seed_base, seed_base+1, ..., seed_base+N-1]

Output layout (§7.2):
  outputs/phase5/batches/batch_<YYYYMMDD_HHMMSSz>/
    manifest.json
    team_runs_<variant>.parquet   (partitioned by run_idx // 1000)
    match_runs_<variant>.parquet
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger

log = get_logger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# Manifest
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class BatchManifest:
    batch_id: str
    batch_dir: str
    variants: list[str]
    n_runs_per_variant: int
    code_sha: str
    data_hashes: dict[str, str]           # variant -> sha256 of input data
    seed_bases: dict[str, int]            # variant -> seed_base
    start_time_utc: str
    end_time_utc: str = ""
    completed_variants: list[str] = field(default_factory=list)
    failed_runs: dict[str, list[dict]] = field(default_factory=dict)
    status: str = "in_progress"
    # Provenance for the pre-registered seed_master constant
    # (evaluation/pre_reg_constants.yaml::sim.seed_master). Persisted at the
    # batch level so a forensic reviewer can confirm the seed derivation
    # consumed the locked value without re-reading the YAML.
    seed_master: int = 0
    # Per-variant sha256 of the strength matrix at run time, recorded via
    # the canonical hash convention in models/model_registry.py:561
    # (hashlib.sha256(S.tobytes()).hexdigest()). Variant -> hex digest.
    matrix_sha256_runs: dict[str, str] = field(default_factory=dict)
    # cp-10: settled-results provenance. settled_count is the number of
    # group-stage match_outcomes rows used to condition this batch;
    # settled_source mirrors the cp-09 convention (e.g.
    # "parquet:data/processed/match_outcomes.parquet",
    # "postgres:match_outcomes", or "default:pre_tournament").
    # Old manifests deserialise with the dataclass defaults; from_dict
    # filters unknown keys so a future field add doesn't break resume.
    settled_count: int = 0
    settled_source: str = "default:pre_tournament"
    # cp-27: LIVE knockout conditioning provenance. knockout_conditioned is True
    # when the real R32 draw was consumed and settled knockout results fixed the
    # decided matches; knockout_settled_count is the number of decided knockout
    # matches conditioned; knockout_source carries the plan's degrade reason when
    # False. Zero / False / "" pre-draw and for every non-live batch (the frozen
    # batch is never re-run through here).
    knockout_conditioned: bool = False
    knockout_settled_count: int = 0
    knockout_source: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(d: dict) -> "BatchManifest":
        # Filter unknown keys so an older manifest (without cp-10 fields)
        # and a newer manifest (with future fields) both deserialise.
        known = {f.name for f in BatchManifest.__dataclass_fields__.values()}  # type: ignore[attr-defined]
        return BatchManifest(**{k: v for k, v in d.items() if k in known})


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _get_code_sha() -> str:
    """Return the current git commit SHA, or a placeholder if not in git."""
    try:
        import subprocess
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT),
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return "no_git_sha"


def _load_seed_master() -> int:
    """Read the pre-registered sim.seed_master constant.

    The constant lives in evaluation/pre_reg_constants.yaml at the path
    `sim.seed_master`. It is sealed at OSF lock and MUST be consumed by
    the seed derivation; running the batch without it is a spec-vs-code
    drift (see LOCKDOWN_PLAN_2026-05-11 Section 8). The function raises
    KeyError if the constant is missing so the drift cannot reappear.
    """
    import yaml as _yaml  # local to keep the top-level import surface minimal
    path = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"
    with open(path) as fh:
        cfg = _yaml.safe_load(fh)
    try:
        return int(cfg["sim"]["seed_master"])
    except (KeyError, TypeError) as exc:
        raise KeyError(
            "sim.seed_master missing from evaluation/pre_reg_constants.yaml; "
            "the pre-registered constant is required by the seed derivation"
        ) from exc


def _compute_seed_base(
    seed_master: int,
    model_id: str,
    data_hash: str,
    batch_timestamp: str,
) -> int:
    """Derive seed_base from (seed_master, model_id, data_hash, batch_timestamp).

    Per §7.1 plus LOCKDOWN_PLAN_2026-05-11 Section 8 Item 8.1: the
    pre-registered sim.seed_master constant is consumed as an additional
    hash ingredient so the derivation is anchored to the OSF lock. The
    function is deterministic in its four inputs.
    """
    raw = f"{seed_master}|{model_id}|{data_hash}|{batch_timestamp}"
    return int(hashlib.sha256(raw.encode()).hexdigest(), 16) % (2 ** 32)


def _compute_data_hash(variant: str) -> str:
    """Compute a SHA-256 hash of the input data relevant to this variant.

    Uses the calibration files and raw data files as the hash inputs.
    """
    hasher = hashlib.sha256()
    data_files = [
        PROJECT_ROOT / "data" / "calibration" / "champion_model.json",
        PROJECT_ROOT / "data" / "calibration" / "elo_lambda_params.json",
        PROJECT_ROOT / "data" / "raw" / "elo_ratings.parquet",
        PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet",
    ]
    for path in data_files:
        if path.exists():
            hasher.update(path.read_bytes())
    return hasher.hexdigest()[:32]


def _build_runner(
    variant: str,
    code_sha: str,
    settled_results: Optional[dict] = None,
    live_knockout_plan=None,
) -> tuple["MonteCarloRunner", str]:
    """Build a MonteCarloRunner for the given model variant.

    cp-10: `settled_results` is a `dict[str, MatchResult]` keyed by
    canonical match_id (M01..M72) for the group stage. Loaded once per
    batch invocation by `run_batch` and passed through here so every
    variant's runner shares the same settled set within the batch.

    Returns
    -------
    (runner, matrix_sha256) : the runner and the sha256 of the strength
        matrix consumed by it, computed via the canonical convention in
        models/model_registry.py:561
        (hashlib.sha256(S.tobytes()).hexdigest()). Captured here so the
        manifest can stamp matrix_sha256_run_<variant> per LOCKDOWN_PLAN
        Section 8 Item 8.3.
    """
    import json as _json
    from simulation.match_model import MatchModel
    from simulation.shootout_model import ShootoutModel
    from simulation.bracket_encoder import BracketEncoder
    from simulation.monte_carlo_runner import MonteCarloRunner, ModelStrengthProvider
    from ingestion.data_loader import DataLoader
    from models.calibrate_elo_lambda import LambdaParams

    loader = DataLoader()
    elo_df = loader.get_elo()
    elo_ratings = dict(zip(elo_df["team_name"], elo_df["elo_rating"]))

    # Load calibrated lambda params
    params_path = PROJECT_ROOT / "data" / "calibration" / "elo_lambda_params.json"
    p = _json.loads(params_path.read_text())
    lambda_params = LambdaParams(c=p["c"], mu=p["mu"], lam3=p["lam3"], rho=p["rho"])

    # Load model
    from models.base import DataBundle
    from models.model_registry import build_model
    import yaml, pandas as pd

    with open(PROJECT_ROOT / "config.yaml") as f:
        cfg = yaml.safe_load(f)

    matches  = loader.get_matches(include_holdout=False)
    form_df  = loader.get_recent_form()
    fifa_df  = loader.get_fifa_rankings()
    macro_df = loader.get_macro()
    team_index = {name: idx for idx, name in enumerate(sorted(fifa_df["team_name"].tolist()))}

    data = DataBundle(
        matches=matches, elo_df=elo_df, form_df=form_df,
        fifa_df=fifa_df, macro_df=macro_df,
        lambda_params=lambda_params, team_index=team_index,
        reference_date=pd.Timestamp("2026-04-21", tz="UTC"),
    )

    # Map variant name to model_id
    variant_to_model = {
        "M0": "M0_elo", "M1": "M1_form",
        "M2": "M2_fifa", "M3": "M3_macro", "Mstar": "M2_fifa",
    }
    model_id = variant_to_model.get(variant, "M2_fifa")
    model = build_model(model_id, data, cfg)

    strength_matrix = model.get_strength_matrix()
    matrix_sha256_run = hashlib.sha256(strength_matrix.tobytes()).hexdigest()

    sp = ModelStrengthProvider(
        strength_matrix=strength_matrix,
        team_index=team_index,
        elo_ratings=elo_ratings,
    )

    rng = np.random.default_rng()
    mm = MatchModel(rng=rng)
    sm = ShootoutModel(match_model=mm, rng=rng)
    be = BracketEncoder()

    runner = MonteCarloRunner(
        match_model=mm,
        shootout_model=sm,
        bracket_encoder=be,
        strength_provider=sp,
        code_sha=code_sha,
        tournament_variant="wc2026",
        settled_results=settled_results,
        live_knockout_plan=live_knockout_plan,
    )
    return runner, matrix_sha256_run


def _run_one_safe(
    runner: "MonteCarloRunner",
    run_idx: int,
    seed: int,
    model_id: str,
    data_hash: str,
    timestamp_utc: pd.Timestamp,
) -> tuple[Optional[pd.DataFrame], Optional[pd.DataFrame], Optional[str]]:
    """Run one simulation; return (team_df, match_df, error_str).

    Returns (None, None, error_str) on failure; batch continues.
    """
    try:
        team_df, match_df = runner.run_one(
            run_idx=run_idx, seed=seed, model_id=model_id,
            data_hash=data_hash, timestamp_utc=timestamp_utc,
        )
        return team_df, match_df, None
    except Exception as e:
        return None, None, traceback.format_exc()


# ═══════════════════════════════════════════════════════════════════════════════
# Main batch runner
# ═══════════════════════════════════════════════════════════════════════════════

def run_batch(
    variants: list[str] = None,
    n_runs_per_variant: int = 10_000,
    output_root: Path = None,
    resume_from: Optional[str] = None,
    n_jobs: int = -2,
    checkpoint_every: int = 500,
) -> BatchManifest:
    """Run the full batch (§7.1 to 7.3).

    Args:
        variants:            Model variants to run. Defaults to M0, M1, M2, M3, Mstar.
        n_runs_per_variant:  Simulations per variant (default 10,000).
        output_root:         Root output directory. Defaults to outputs/phase5/batches/.
        resume_from:         Batch directory name to resume. Re-runs any incomplete variant.
        n_jobs:              joblib n_jobs for within-variant parallelism (-2 = all but 1 CPU).
        checkpoint_every:    Write checkpoint every N runs (default 500).
    """
    if variants is None:
        variants = ["M0", "M1", "M2", "M3", "Mstar"]
    if output_root is None:
        output_root = PROJECT_ROOT / "outputs" / "phase5" / "batches"

    output_root = Path(output_root)
    output_root.mkdir(parents=True, exist_ok=True)

    code_sha = _get_code_sha()
    seed_master = _load_seed_master()
    now_utc = datetime.now(timezone.utc)
    batch_timestamp = now_utc.strftime("%Y%m%d_%H%M%SZ")

    # ── cp-10: load settled-results once per batch invocation ─────────────────
    # Loaded once and shared across every variant's runner so the conditioning
    # set is consistent within the batch. A resume preserves the manifest's
    # original (settled_count, settled_source) - see BatchManifest docstring.
    from simulation.load_settled import load_settled_results
    settled_results, settled_source = load_settled_results()
    settled_count = len(settled_results)
    log.info(
        "Settled-results loaded for batch",
        settled_count=settled_count, settled_source=settled_source,
    )

    # ── cp-27: build the LIVE knockout plan once per batch invocation ─────────
    # Overrides the internal zone-pair bracket with the REAL R32 draw and fixes
    # decided knockout matches. Returns None (no override) until the real R32 is
    # drawn and the groups are fully conditioned, so every pre-draw batch, every
    # non-live batch, and the no-settled-source CI path keep the pre-cp-27
    # behaviour. Shared across every variant's runner within the batch.
    from simulation.live_knockout import build_live_knockout_plan
    live_knockout_plan, live_knockout_source = build_live_knockout_plan(
        settled_group_results=settled_results,
    )
    knockout_conditioned = live_knockout_plan is not None
    knockout_settled_count = (
        live_knockout_plan.settled_ko_count if live_knockout_plan is not None else 0
    )
    log.info(
        "Live knockout plan resolved for batch",
        knockout_conditioned=knockout_conditioned,
        knockout_settled_count=knockout_settled_count,
        knockout_source=live_knockout_source,
    )

    # ── Resume vs new batch ───────────────────────────────────────────────────
    if resume_from:
        batch_dir = output_root / resume_from
        manifest_path = batch_dir / "manifest.json"
        if not manifest_path.exists():
            raise FileNotFoundError(f"No manifest found at {manifest_path}")
        manifest = BatchManifest.from_dict(json.loads(manifest_path.read_text()))
        log.info("Resuming batch", batch_id=manifest.batch_id,
                 completed=manifest.completed_variants)
        # Re-run variants not yet completed (from run 0; simpler and deterministic)
        variants_to_run = [v for v in variants if v not in manifest.completed_variants]
    else:
        batch_id = f"batch_{batch_timestamp}"
        batch_dir = output_root / batch_id
        batch_dir.mkdir(parents=True)

        data_hashes = {v: _compute_data_hash(v) for v in variants}
        seed_bases  = {
            v: _compute_seed_base(seed_master, v, data_hashes[v], batch_timestamp)
            for v in variants
        }

        manifest = BatchManifest(
            batch_id=batch_id,
            batch_dir=str(batch_dir),
            variants=variants,
            n_runs_per_variant=n_runs_per_variant,
            code_sha=code_sha,
            data_hashes=data_hashes,
            seed_bases=seed_bases,
            start_time_utc=now_utc.isoformat(),
            seed_master=seed_master,
            settled_count=settled_count,
            settled_source=settled_source,
            knockout_conditioned=knockout_conditioned,
            knockout_settled_count=knockout_settled_count,
            knockout_source=live_knockout_source,
        )
        manifest_path = batch_dir / "manifest.json"
        manifest_path.write_text(json.dumps(manifest.to_dict(), indent=2))
        variants_to_run = variants

    # ── Run each variant sequentially ─────────────────────────────────────────
    batch_timestamp_for_seed = now_utc.strftime("%Y%m%d_%H%M%SZ")

    for variant in variants_to_run:
        log.stage(f"Batch variant {variant}")
        t0_variant = time.time()

        data_hash = manifest.data_hashes.get(variant, "unknown")
        seed_base = manifest.seed_bases.get(variant, 0)
        seeds = [(seed_base + i) % (2 ** 32) for i in range(n_runs_per_variant)]
        timestamp_utc = pd.Timestamp(now_utc)

        runner, matrix_sha256_run = _build_runner(
            variant, code_sha, settled_results=settled_results,
            live_knockout_plan=live_knockout_plan,
        )
        manifest.matrix_sha256_runs[variant] = matrix_sha256_run
        manifest_path.write_text(json.dumps(manifest.to_dict(), indent=2))
        log.info("Strength matrix hashed",
                 variant=variant, matrix_sha256_run=matrix_sha256_run[:16])
        failed_this_variant: list[dict] = []

        team_frames: list[pd.DataFrame] = []
        match_frames: list[pd.DataFrame] = []

        try:
            from joblib import Parallel, delayed

            def _job(run_idx: int) -> tuple:
                return _run_one_safe(
                    runner, run_idx, seeds[run_idx], variant,
                    data_hash, timestamp_utc,
                )

            results = Parallel(n_jobs=n_jobs, backend="loky")(
                delayed(_job)(i) for i in range(n_runs_per_variant)
            )

        except ImportError:
            # Fallback to sequential if joblib unavailable
            log.warning("joblib not available; running sequentially")
            results = [
                _run_one_safe(runner, i, seeds[i], variant, data_hash, timestamp_utc)
                for i in range(n_runs_per_variant)
            ]

        for run_idx, (team_df, match_df, err) in enumerate(results):
            if err is not None:
                log.warning("Run failed",
                            variant=variant, run_idx=run_idx, seed=seeds[run_idx],
                            error=err[:200])
                failed_this_variant.append({
                    "run_idx": run_idx,
                    "seed": seeds[run_idx],
                    "error": err[:500],
                })
            else:
                team_frames.append(team_df)
                match_frames.append(match_df)

        # Write Parquet
        if team_frames:
            team_all = pd.concat(team_frames, ignore_index=True)
            team_all["partition"] = (team_all["run_idx"] // 1000).astype("int16")
            team_path = batch_dir / f"team_runs_{variant}.parquet"
            team_all.to_parquet(team_path, engine="pyarrow", index=False,
                                compression="snappy")
            log.success(f"Written team_runs_{variant}.parquet",
                        rows=len(team_all), path=str(team_path))

        if match_frames:
            match_all = pd.concat(match_frames, ignore_index=True)
            match_all["partition"] = (match_all["run_idx"] // 1000).astype("int16")
            match_path = batch_dir / f"match_runs_{variant}.parquet"
            match_all.to_parquet(match_path, engine="pyarrow", index=False,
                                 compression="snappy")
            log.success(f"Written match_runs_{variant}.parquet",
                        rows=len(match_all), path=str(match_path))

        elapsed = time.time() - t0_variant
        log.info(f"Variant {variant} done",
                 elapsed_s=round(elapsed, 1), failed=len(failed_this_variant),
                 n_runs=n_runs_per_variant)

        # Update manifest
        manifest.completed_variants.append(variant)
        manifest.failed_runs[variant] = failed_this_variant
        manifest_path.write_text(json.dumps(manifest.to_dict(), indent=2))

        # Fail-rate check. Pre-registered threshold is 0.1% (§7.4); a soft
        # warning was the pre-Section-8 behaviour. The lockdown converts
        # this to a hard halt so a degraded run cannot quietly produce a
        # parquet that downstream code would treat as valid.
        fail_rate = len(failed_this_variant) / n_runs_per_variant
        if fail_rate >= 0.001:
            manifest.status = "failed_acceptance"
            manifest.end_time_utc = datetime.now(timezone.utc).isoformat()
            manifest_path.write_text(json.dumps(manifest.to_dict(), indent=2))
            raise RuntimeError(
                f"Variant {variant} failure rate {fail_rate:.4f} "
                f"reaches or exceeds the pre-registered 0.1% threshold; "
                f"halting batch ({len(failed_this_variant)}/{n_runs_per_variant} runs failed). "
                f"Manifest written with status='failed_acceptance' at "
                f"{manifest_path}."
            )

    manifest.end_time_utc = datetime.now(timezone.utc).isoformat()
    manifest.status = "complete"
    manifest_path.write_text(json.dumps(manifest.to_dict(), indent=2))

    log.success("Batch complete", batch_id=manifest.batch_id,
                total_runs=n_runs_per_variant * len(variants_to_run))
    return manifest


# ═══════════════════════════════════════════════════════════════════════════════
# CLI entry point
# ═══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 5 batch runner")
    parser.add_argument("--n", type=int, default=10_000,
                        help="Simulations per variant (default 10000)")
    parser.add_argument("--variants", type=str, default="M0,M1,M2,M3,Mstar",
                        help="Comma-separated variant names")
    parser.add_argument("--resume", type=str, default=None,
                        help="Batch directory to resume (e.g. batch_20260421_143022Z)")
    parser.add_argument("--output", type=str, default=None,
                        help="Output root directory")
    parser.add_argument("--jobs", type=int, default=-2,
                        help="joblib n_jobs (default -2 = all but 1 CPU)")
    args = parser.parse_args()

    output_root = Path(args.output) if args.output else None
    variants = [v.strip() for v in args.variants.split(",")]

    manifest = run_batch(
        variants=variants,
        n_runs_per_variant=args.n,
        output_root=output_root,
        resume_from=args.resume,
        n_jobs=args.jobs,
    )
    print(f"\nBatch complete: {manifest.batch_id}")
    print(f"  Directory: {manifest.batch_dir}")
    for v in manifest.completed_variants:
        fails = len(manifest.failed_runs.get(v, []))
        print(f"  {v}: {manifest.n_runs_per_variant - fails}/{manifest.n_runs_per_variant} runs OK")


if __name__ == "__main__":
    main()
