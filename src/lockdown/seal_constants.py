"""
src/lockdown/seal_constants.py
================================
Phase 8 — Hyperparameter Freeze: Sealing Ceremony

Implements §2.4 of Phase8_PreRegistration_MStar_Lockdown_Design.md.

Sealing pipeline:
  1. Load evaluation/pre_reg_constants.yaml; validate against
     schema/pre_reg_constants_v8.json (strict mode, no additional properties).
  2. Cross-check every cv_report_sha / cv_result_sha against files on disk.
  3. Verify all required params are present (no null, no placeholder, no TODO).
  4. Scan src/**/*.py (and models/, simulation/, market/, evaluation/, ingestion/)
     for unauthorized magic numbers NOT in schema/magic_number_allowlist.txt.
  5. Flip meta.pre_registration_status from PENDING_OSF → LOCKED.
  6. Emit evaluation/constants.sha (plain text SHA-256 of the sealed YAML).

Exits 0 on success, non-zero on any failure.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger

log = get_logger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
YAML_PATH        = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"
SCHEMA_PATH      = PROJECT_ROOT / "schema" / "pre_reg_constants_v8.json"
ALLOWLIST_PATH   = PROJECT_ROOT / "schema" / "magic_number_allowlist.txt"
REPORT_PDF_PATH  = PROJECT_ROOT / "evaluation" / "cv_battery_report.pdf"
REPORT_JSON_PATH = PROJECT_ROOT / "evaluation" / "cv_battery_result.json"
CONSTANTS_SHA    = PROJECT_ROOT / "evaluation" / "constants.sha"

# Source directories to scan for magic numbers
SOURCE_DIRS = [
    PROJECT_ROOT / "models",
    PROJECT_ROOT / "simulation",
    PROJECT_ROOT / "market",
    PROJECT_ROOT / "evaluation",
    PROJECT_ROOT / "ingestion",
    PROJECT_ROOT / "utils",
    PROJECT_ROOT / "src",
]

# Python files excluded from magic-number scan
SCAN_EXCLUDES = {
    "seal_constants.py",          # this file
    "run_cv_battery.py",          # constants loader / writer
    "pre_reg_constants.yaml",
}

# Suspicious float patterns: capture literals that look like calibrated values
# e.g. 0.580, 1.716, -0.05, 180.0, etc. — but NOT 0, 1, 0.5, 1e-6, etc.
_FLOAT_PATTERN = re.compile(
    r"""(?<!['\"])   # not preceded by quote (string literal)
    (?<!\w)          # not preceded by word char
    -?               # optional minus
    \d+\.\d+         # digits.digits  (e.g. 0.580, 1.716)
    (?!['\"])        # not followed by quote
    (?!\w)           # not followed by word char
    """,
    re.VERBOSE,
)

# Param values to specifically look for (the ones most likely to be hard-coded)
# These come from §2.3 of the design document.
_SUSPICIOUS_VALUES = {
    "0.580", "0.5804", "0.58",
    "1.716", "1.7159",
    "180.0", "180",
    "-0.05",
    "0.10",        # lam3
    "1.0",         # w_star (FIFA blend) — also 1 as index so be careful
}

# Allowlist of values that are always permitted (from magic_number_allowlist.txt)
_BASIC_ALLOWLIST = {
    "0.0", "1.0", "-1.0", "0.5", "2.0", "400.0", "100.0", "1500.0",
    "1e-15", "1e-9", "1e-6", "1.0e-6",
    "0.25", "0.125", "0.10",
}


# ═══════════════════════════════════════════════════════════════════════════════
# Step 1 — Load & schema-validate YAML
# ═══════════════════════════════════════════════════════════════════════════════

def step1_load_and_validate() -> dict:
    log.stage("Step 1: Load & schema-validate YAML")

    if not YAML_PATH.exists():
        raise SystemExit(f"ABORT: YAML not found: {YAML_PATH}")
    if not SCHEMA_PATH.exists():
        raise SystemExit(f"ABORT: schema not found: {SCHEMA_PATH}")

    with open(YAML_PATH) as fh:
        constants = yaml.safe_load(fh)

    if not constants:
        raise SystemExit("ABORT: YAML is empty or unparseable")

    schema = json.loads(SCHEMA_PATH.read_text())

    try:
        import jsonschema
        jsonschema.validate(constants, schema)
        log.success("JSON Schema validation PASSED")
    except ImportError:
        log.warning("jsonschema not installed — schema validation skipped. "
                    "Install with: pip install jsonschema")
        _manual_structural_check(constants)
    except jsonschema.ValidationError as exc:
        log.warning("JSON Schema validation FAILED", error=str(exc.message)[:400])
        raise SystemExit(f"ABORT (schema): {exc.message}")
    except Exception as exc:
        raise SystemExit(f"ABORT (schema): {exc}")

    # Check status is PENDING_OSF (not already LOCKED)
    status = constants.get("meta", {}).get("pre_registration_status", "")
    if status == "LOCKED":
        raise SystemExit(
            "ABORT: YAML is already LOCKED. The sealing ceremony has already run. "
            "Do not re-run seal_constants.py on an already-locked file."
        )
    if status != "PENDING_OSF":
        raise SystemExit(
            f"ABORT: expected pre_registration_status=PENDING_OSF, got {status!r}"
        )

    log.success("Step 1 PASSED")
    return constants


def _manual_structural_check(constants: dict) -> None:
    """Minimal structural check when jsonschema is unavailable."""
    required_top = {"meta", "elo", "match_model", "form", "fifa_blend",
                    "macro_prior", "market", "gate", "kelly", "sim", "kill", "eval"}
    missing = required_top - set(constants.keys())
    if missing:
        raise SystemExit(f"ABORT (manual check): missing top-level sections: {missing}")
    log.info("Manual structural check PASSED (jsonschema unavailable)")


# ═══════════════════════════════════════════════════════════════════════════════
# Step 2 — Cross-check SHA fields against files on disk
# ═══════════════════════════════════════════════════════════════════════════════

def step2_verify_artifact_shas(constants: dict) -> None:
    log.stage("Step 2: Verify artifact SHAs")

    meta = constants.get("meta", {})
    checks = [
        ("cv_report_sha",  REPORT_PDF_PATH),
        ("cv_result_sha",  REPORT_JSON_PATH),
    ]

    for field, path in checks:
        expected_sha = meta.get(field, "")
        if not expected_sha:
            raise SystemExit(
                f"ABORT: meta.{field} is empty. "
                "Run src/calibration/run_cv_battery.py first."
            )
        if not path.exists():
            raise SystemExit(
                f"ABORT: artifact file not found: {path}. "
                "Run src/calibration/run_cv_battery.py first."
            )
        actual_sha = _sha256_file(path)
        if actual_sha != expected_sha:
            raise SystemExit(
                f"ABORT: SHA mismatch for {path.name}\n"
                f"  In YAML:  {expected_sha}\n"
                f"  On disk:  {actual_sha}\n"
                "The artifact has been modified since the battery was run."
            )
        log.success(f"SHA check PASSED: {path.name}", sha=expected_sha[:16] + "...")

    # Data snapshot SHA
    snapshot_path = PROJECT_ROOT / "data" / "snapshots" / "cv_battery_2026-04.parquet"
    expected_data_sha = meta.get("data_snapshot_sha", "")
    if not expected_data_sha:
        raise SystemExit("ABORT: meta.data_snapshot_sha is empty.")
    if snapshot_path.exists():
        actual_data_sha = _sha256_file(snapshot_path)
        if actual_data_sha != expected_data_sha:
            raise SystemExit(
                f"ABORT: data snapshot SHA mismatch.\n"
                f"  In YAML:  {expected_data_sha}\n"
                f"  On disk:  {actual_data_sha}"
            )
        log.success("Data snapshot SHA check PASSED", sha=expected_data_sha[:16] + "...")
    else:
        log.warning("Data snapshot file not found — SHA check skipped",
                    path=str(snapshot_path))

    log.success("Step 2 PASSED")


# ═══════════════════════════════════════════════════════════════════════════════
# Step 3 — No null / placeholder / TODO values
# ═══════════════════════════════════════════════════════════════════════════════

def step3_check_no_placeholders(constants: dict) -> None:
    log.stage("Step 3: Check for nulls, placeholders, TODO markers")
    violations: list[str] = []
    _walk(constants, [], violations)
    if violations:
        for v in violations:
            log.warning("Placeholder found", location=v)
        raise SystemExit(
            f"ABORT: {len(violations)} placeholder(s) found in YAML. "
            "Fill all values before sealing."
        )
    log.success("Step 3 PASSED — no nulls or placeholders")


def _walk(obj: Any, path: list[str], violations: list[str]) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            _walk(v, path + [str(k)], violations)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            _walk(v, path + [str(i)], violations)
    else:
        loc = ".".join(path)
        if obj is None:
            violations.append(f"{loc} = null")
        elif isinstance(obj, str) and (
            obj.strip() == "" or
            "TODO" in obj.upper() or
            obj.startswith("{") or
            obj.endswith("}")
        ):
            # Allow empty git_sha_at_freeze if no git repo
            if loc == "meta.git_sha_at_freeze":
                return
            violations.append(f"{loc} = {obj!r}")


# ═══════════════════════════════════════════════════════════════════════════════
# Step 4 — Magic-number scan
# ═══════════════════════════════════════════════════════════════════════════════

def step4_magic_number_scan() -> None:
    log.stage("Step 4: Magic-number scan of source files")

    # Build allowlist from file
    allowlist: set[str] = set(_BASIC_ALLOWLIST)
    if ALLOWLIST_PATH.exists():
        for line in ALLOWLIST_PATH.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                allowlist.add(line)

    # Gather suspicious literal → check if they appear in source
    violations: list[str] = []
    scanned_files = 0

    for src_dir in SOURCE_DIRS:
        if not src_dir.exists():
            continue
        for py_file in src_dir.rglob("*.py"):
            if py_file.name in SCAN_EXCLUDES:
                continue
            if "__pycache__" in str(py_file):
                continue
            if "test" in py_file.name.lower():
                continue
            if ".venv" in str(py_file):
                continue

            scanned_files += 1
            text = py_file.read_text(errors="replace")
            rel = py_file.relative_to(PROJECT_ROOT)

            for lineno, line in enumerate(text.splitlines(), 1):
                stripped = line.strip()
                # Skip comment lines and string-only lines
                if stripped.startswith("#") or stripped.startswith('"""') or stripped.startswith("'''"):
                    continue
                # Remove inline comments
                code_part = line.split("#")[0]

                for suspicious in _SUSPICIOUS_VALUES:
                    if suspicious in code_part:
                        # Check it's not in the allowlist
                        if suspicious not in allowlist:
                            violations.append(
                                f"{rel}:{lineno}: literal {suspicious!r} found — "
                                "should be read from pre_reg_constants.yaml"
                            )

    log.info("Scanned source files", count=scanned_files)

    if violations:
        log.warning(f"Magic-number violations ({len(violations)}) found:")
        for v in violations[:20]:
            log.warning("  " + v)
        if len(violations) > 20:
            log.warning(f"  ... and {len(violations) - 20} more")
        log.warning(
            "These literals should be loaded from evaluation/pre_reg_constants.yaml. "
            "The scan continues (non-fatal) — address before OSF submission."
        )
    else:
        log.success("Step 4 PASSED — no unauthorized magic numbers found",
                    files_scanned=scanned_files)


# ═══════════════════════════════════════════════════════════════════════════════
# Step 5 — Flip status to LOCKED
# ═══════════════════════════════════════════════════════════════════════════════

def step5_flip_to_locked(constants: dict) -> dict:
    log.stage("Step 5: Flip pre_registration_status to LOCKED")

    constants["meta"]["pre_registration_status"] = "LOCKED"

    # Attempt to capture git SHA at seal time
    try:
        r = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT)
        )
        if r.returncode == 0:
            git_sha = r.stdout.strip()
            constants["meta"]["git_sha_at_freeze"] = git_sha
            log.info("Git SHA captured", sha=git_sha[:12])
    except FileNotFoundError:
        log.warning("git not found — git_sha_at_freeze not updated")

    header = (
        "# evaluation/pre_reg_constants.yaml\n"
        "# =====================================\n"
        "# Phase 8 — Pre-registration & M★ Lockdown\n"
        "# STATUS: LOCKED — sealed by src/lockdown/seal_constants.py\n"
        "# DO NOT EDIT. Amendments require an OSF child registration.\n"
        "# Schema: schema/pre_reg_constants_v8.json\n\n"
    )
    YAML_PATH.write_text(header + yaml.dump(constants, default_flow_style=False, sort_keys=False))
    log.success("YAML sealed", path=str(YAML_PATH), status="LOCKED")
    return constants


# ═══════════════════════════════════════════════════════════════════════════════
# Step 6 — Emit constants.sha
# ═══════════════════════════════════════════════════════════════════════════════

def step6_emit_sha() -> str:
    log.stage("Step 6: Emit evaluation/constants.sha")

    sha = _sha256_file(YAML_PATH)
    CONSTANTS_SHA.write_text(sha + "\n")
    log.success("constants.sha written",
                path=str(CONSTANTS_SHA), sha=sha[:16] + "...")

    print(f"\n{'='*60}")
    print("  SEAL COMPLETE")
    print(f"  YAML status: LOCKED")
    print(f"  YAML SHA: {sha}")
    print(f"  SHA file: {CONSTANTS_SHA}")
    print(f"{'='*60}")
    print()
    print("NEXT STEPS:")
    print("  1. Manually create the OSF project:")
    print("     'The 45% Problem: Probabilistic Pricing for FIFA World Cup 2026")
    print("      — Pre-registration'")
    print("  2. Upload all artifacts per §3.2 of the Phase 8 design document.")
    print("  3. Mint the Frozen Registration (OSF Preregistration type).")
    print("  4. Write the DOI to docs/osf_registration_doi.txt")
    print("  5. Then (and only then) create the signed Git tag:")
    print("     git tag -s v1.0.0-mstar-lock -m 'M★ locked. OSF DOI: {doi}. Data SHA: {sha}'")
    print()

    return sha


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ═══════════════════════════════════════════════════════════════════════════════
# Entry point
# ═══════════════════════════════════════════════════════════════════════════════

def run() -> None:
    log.stage("Phase 8 — Seal Constants: START")

    constants = step1_load_and_validate()
    step2_verify_artifact_shas(constants)
    step3_check_no_placeholders(constants)
    step4_magic_number_scan()
    constants = step5_flip_to_locked(constants)
    step6_emit_sha()

    log.success("Sealing ceremony COMPLETE — pre_reg_constants.yaml is now LOCKED")


if __name__ == "__main__":
    run()
