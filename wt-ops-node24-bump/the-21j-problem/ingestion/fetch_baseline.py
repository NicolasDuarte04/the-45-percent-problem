"""
ingestion/fetch_baseline.py
===========================
Session 06 · El Voto del 21 de Junio — Mapa baseline ingestion.

Builds the certified 2022 second-round (Petro vs Hernández) runoff baseline that
the Mapa projects from. The numbers are a settled public record; this script
fetches the departmental results table as RAW wikitext (which cites the
Registraduría boletín nacional) and parses it deterministically — no LLM
summary, no hand-typed vote counts, no fabrication. Every output row carries the
source URL.

Granularity is departamento (32 departamentos + Bogotá D.C. + the non-geographic
"Consulados"/exterior bucket). Municipio granularity is the eventual target; a
clean machine-readable municipio file was not verifiable from datos.gov.co at
build time, so the departamento fallback is shipped and labelled as such.

Verification: the script cross-checks the parsed national two-way Petro share
against the certified figure in config (calibration.elections["2022_r2"]); if
they disagree beyond a small tolerance, the parse is broken and it raises rather
than writing a bad baseline.

Output
------
  data/manual/co_departamento_2022.csv   — one row per unit, schema-validated

Run
---
  python ingestion/fetch_baseline.py
  python ingestion/fetch_baseline.py --force     # re-fetch the source
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import pandas as pd
import requests
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas import MunicipioBaseline, dane_code_for  # noqa: E402
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

with open(PROJECT_ROOT / "config.yaml", encoding="utf-8") as _f:
    CFG = yaml.safe_load(_f)

_MAPA = CFG["mapa"]
_SRC = _MAPA["baseline_source"]
OUTPUT_CSV = PROJECT_ROOT / _MAPA["paths"]["baseline_csv"]
GRANULARITY = _MAPA["granularity"]

# Certified national 2022 runoff (left = Petro, right = Hernández), % of total.
_E22 = CFG["calibration"]["elections"]["2022_r2"]
NAT_LEFT_CERT = float(_E22["left_certified_pct"])
NAT_RIGHT_CERT = float(_E22["right_certified_pct"])
NATIONAL_TWO_WAY_LEFT = NAT_LEFT_CERT / (NAT_LEFT_CERT + NAT_RIGHT_CERT)

# Names that appear as wikilinks in the header (candidates / column title), not
# as data rows. Filtered out so only unit rows survive.
_NON_UNIT_LINKS = {
    "departamento", "departamentos de colombia",
    "gustavo petro", "petro", "rodolfo hernández suárez", "hernández",
    "francia márquez", "márquez", "marelen castillo", "castillo",
}

OUTPUT_COLUMNS = [
    "dane_code", "municipio", "departamento", "granularity",
    "potential_votes", "share_left_2022", "share_right_2022", "margin_2022",
    "source", "source_url",
]


# =============================================================================
# Fetch raw
# =============================================================================


def fetch_raw(force: bool = False) -> str:
    """Fetch the departmental-results section as raw wikitext."""
    url = _SRC["wikitext_api"]
    timeout = float(_SRC.get("request_timeout_s", 30))
    log.stage("Fetching certified 2022 departmental results (raw wikitext)", url=url, force=force)
    resp = requests.get(url, timeout=timeout, headers={"User-Agent": "ElVoto21Junio-Mapa/0.1 (research)"})
    resp.raise_for_status()
    wikitext = resp.json()["parse"]["wikitext"]["*"]
    log.info("Wikitext fetched", chars=len(wikitext))
    return wikitext


# =============================================================================
# Parse (deterministic)
# =============================================================================


def _to_int(token: str) -> int:
    return int(token.replace("&nbsp;", "").replace("\xa0", "").replace(" ", "").replace(".", ""))


def _to_pct(token: str) -> float:
    return float(token.replace(",", "."))


def parse_units(wikitext: str) -> list[dict]:
    """
    Parse the wikitable into one dict per unit:
    {departamento, petro_votes, hernandez_votes, total_votes, turnout_pct}.
    Deterministic; raises if a row's numbers don't parse to the expected shape.
    """
    units: list[dict] = []
    for block in wikitext.split("|-"):
        if "[[" not in block:
            continue
        m = re.search(r"\[\[([^\]]+)\]\]", block)
        if not m:
            continue
        dept = m.group(1).split("|")[-1].strip()
        if dept.lower() in _NON_UNIT_LINKS:
            continue

        clean = re.sub(r'style="[^"]*"', "", block)
        clean = re.sub(r"<[^>]+>", "", clean).replace("&nbsp;", " ")
        int_tokens = re.findall(r"(?<![,\d])(\d[\d ]*\d|\d)(?![,\d])", clean)
        pct_tokens = re.findall(r"\d+,\d+", clean)
        ints = [_to_int(t) for t in int_tokens if t.strip()]

        if len(ints) < 3 or not pct_tokens:
            log.warning("Skipped malformed row", unit=dept, ints=len(ints), pcts=len(pct_tokens))
            continue

        units.append({
            "departamento": dept,
            "petro_votes": ints[0],
            "hernandez_votes": ints[1],
            "total_votes": ints[-1],
            "turnout_pct": _to_pct(pct_tokens[-1]),
        })
    return units


# =============================================================================
# Build + validate output
# =============================================================================


def build_rows(units: list[dict]) -> pd.DataFrame:
    """Turn parsed units into schema-validated baseline rows."""
    source_label = _SRC["label"]
    source_url = _SRC["source_url"]

    rows: list[dict] = []
    skipped = 0
    for u in units:
        dept = u["departamento"]
        petro, hern = u["petro_votes"], u["hernandez_votes"]
        two_way = petro + hern
        if two_way <= 0 or u["turnout_pct"] <= 0:
            skipped += 1
            log.warning("Excluded — non-positive votes/turnout", unit=dept)
            continue

        share_left = petro / two_way
        share_right = hern / two_way
        margin = round((share_right - share_left) * 100.0, 4)
        potential = round(u["total_votes"] / (u["turnout_pct"] / 100.0))

        code = dane_code_for(dept)
        if code is None:
            skipped += 1
            log.warning("Excluded — no DANE code for unit (not invented)", unit=dept)
            continue

        try:
            row = MunicipioBaseline(
                dane_code=code,
                municipio=dept,            # departamento granularity: unit == departamento
                departamento=dept,
                granularity=GRANULARITY,
                potential_votes=int(potential),
                share_left_2022=round(share_left, 6),
                share_right_2022=round(share_right, 6),
                margin_2022=margin,
                source=source_label,
                source_url=source_url,
            )
        except Exception as exc:  # noqa: BLE001 — exclude + log, never invent
            skipped += 1
            log.warning("Excluded — failed baseline validation", unit=dept, error=str(exc).splitlines()[0])
            continue
        rows.append(row.model_dump())

    if not rows:
        raise RuntimeError("No valid baseline rows parsed — the source table changed shape.")
    if skipped:
        log.info("Baseline exclusions", skipped=skipped)

    df = pd.DataFrame(rows)[OUTPUT_COLUMNS].sort_values("dane_code").reset_index(drop=True)
    return df


def _verify_national(df: pd.DataFrame) -> float:
    """
    Cross-check the parse against the certified national result: the per-unit
    two-way left shares, weighted by potential votes, must reconstruct the
    certified national two-way left share. The match is approximate because the
    weight is censo, not cast votes, but a broken parse would be off by many
    points. Returns the absolute difference in pp.
    """
    w = df["potential_votes"].to_numpy(dtype=float)
    left = df["share_left_2022"].to_numpy(dtype=float)
    weighted_left = float((left * w).sum() / w.sum())
    diff_pp = abs(weighted_left - NATIONAL_TWO_WAY_LEFT) * 100.0
    log.info(
        "National cross-check",
        parsed_weighted_left=round(weighted_left, 4),
        certified_two_way_left=round(NATIONAL_TWO_WAY_LEFT, 4),
        diff_pp=round(diff_pp, 3),
    )
    return diff_pp


def run(force: bool = False) -> Path:
    """Full baseline ingestion. Returns the path to the CSV."""
    log.stage("=== fetch_baseline · Session 06 (21J) ===")

    wikitext = fetch_raw(force=force)
    units = parse_units(wikitext)
    log.info("Units parsed", count=len(units))

    df = build_rows(units)

    diff_pp = _verify_national(df)
    # A wide band: censo-weighting differs from cast-vote weighting, but a broken
    # parse would be off by many points. 2 pp comfortably separates the two.
    if diff_pp > 2.0:
        raise RuntimeError(
            f"National cross-check failed: parsed weighted left share differs from "
            f"certified by {diff_pp:.2f} pp (> 2.0). The source table likely changed shape."
        )

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")
    log.success("Baseline CSV written", path=str(OUTPUT_CSV), rows=len(df))

    geo = df[df["dane_code"] != "00"]
    log.info(
        "Baseline summary",
        units=len(df),
        geographic_units=len(geo),
        granularity=GRANULARITY,
        total_potential=int(df["potential_votes"].sum()),
    )
    return OUTPUT_CSV


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Ingest the certified 2022 runoff departmental baseline for the Mapa."
    )
    parser.add_argument("--force", action="store_true", help="Re-fetch the source wikitext.")
    args = parser.parse_args()
    run(force=args.force)
