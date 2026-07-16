"""
evaluation/evaluation_dashboard.py
=====================================
Ablation table compiler.  Phase 7, Module 5.

Produces:
  ablation.json   — consumed by the live website
  ablation.tex    — drop-in LaTeX fragment for the paper (booktabs + siunitx)
  ablation_caption.tex — auto-generated caption with sample size, date, code_sha

This module computes nothing novel.  It is a compiler over the prior four
modules.  All numeric values are read from:
  - accuracy_metrics.MetricsTable
  - clv_tracker.CLVReport    (M★)
  - pseudo_clv.ShadowCLVResult (M0–M3)

Invariants:
  - pre_reg_constants_sha field must match SHA of frozen YAML; mismatch aborts.
  - Numeric values in JSON and LaTeX agree to 4 decimal places.
  - Regeneration from identical inputs is byte-identical in both outputs.
  - diff_against() returns a DiffReport indicating meaningful changes.
"""

from __future__ import annotations

import hashlib
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger
from evaluation.accuracy_metrics import MetricsTable, ModelMetrics
from evaluation.clv_tracker import CLVReport
from evaluation.pseudo_clv import ShadowCLVResult

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Load pre-registered constants  (abort if SHA mismatch)
# ---------------------------------------------------------------------------

_YAML_PATH = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_constants(expected_sha: Optional[str] = None) -> dict[str, Any]:
    with open(_YAML_PATH, encoding="utf-8") as fh:
        constants = yaml.safe_load(fh)
    actual_sha = _sha256_file(_YAML_PATH)
    if expected_sha is not None and actual_sha != expected_sha:
        raise ValueError(
            f"pre_reg_constants.yaml SHA mismatch!\n"
            f"  expected: {expected_sha}\n"
            f"  actual:   {actual_sha}\n"
            "Aborting: frozen constants have been modified without an OSF amendment."
        )
    return constants, actual_sha  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------


@dataclass
class DiffReport:
    """Comparison of two ablation.json snapshots."""
    changed: bool
    changed_fields: list[str] = field(default_factory=list)
    summary: str = ""


# ---------------------------------------------------------------------------
# Rounding helper  (4 decimal places; consistent JSON ↔ LaTeX)
# ---------------------------------------------------------------------------

_DP = 4


def _r(x: float) -> float:
    return round(float(x), _DP)


def _fmt(x: float) -> str:
    return f"{x:.{_DP}f}"


def _latex_escape(s: str) -> str:
    """Escape the LaTeX-special characters that can appear in prose disclosures
    (underscore, percent, ampersand, hash, dollar, braces, tilde, caret). Kept
    small: the disclosure strings are plain ASCII sentences."""
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    out = []
    for ch in s:
        out.append(replacements.get(ch, ch))
    return "".join(out)


# ---------------------------------------------------------------------------
# JSON builder
# ---------------------------------------------------------------------------


def _model_trading_block(
    clv_report: Optional[CLVReport],
) -> Optional[dict[str, Any]]:
    if clv_report is None or clv_report.n_bets == 0:
        return None
    hm = clv_report.hm_result
    return {
        "n_bets": clv_report.n_bets,
        "clv_mean": _r(clv_report.clv_mean),
        "clv_std": _r(clv_report.clv_std),
        "sharpe": _r(clv_report.sharpe),
        "hm_ci_90": [_r(hm.ci_90[0]), _r(hm.ci_90[1])],
        "hm_ci_95": [_r(hm.ci_95[0]), _r(hm.ci_95[1])],
        "hm_ci_low": _r(hm.ci_95[0]),
        "decision": hm.decision,
        "block_length": hm.block_length,
        "z_stat": _r(clv_report.z_stat),
        "z_reject": clv_report.z_reject,
    }


def _model_accuracy_block(mm: ModelMetrics) -> dict[str, Any]:
    return {
        "n_forecasts": mm.n,
        "brier_mean": _r(mm.brier_mean),
        "brier_ci": [_r(mm.brier_ci[0]), _r(mm.brier_ci[1])],
        "rps_mean": _r(mm.rps_mean),
        "rps_median": _r(mm.rps_median),
        "rps_ci": [_r(mm.rps_ci[0]), _r(mm.rps_ci[1])],
        "log_loss_mean": _r(mm.log_loss_mean),
        "log_loss_ci": [_r(mm.log_loss_ci[0]), _r(mm.log_loss_ci[1])],
    }


def _build_json(
    metrics: MetricsTable,
    mstar_report: Optional[CLVReport],
    shadow_results: dict[str, ShadowCLVResult],
    constants: dict[str, Any],
    constants_sha: str,
    tournament: str = "FIFA2026",
    generated_at_utc: Optional[str] = None,
    meta: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    models_block: dict[str, Any] = {}

    all_models = constants["models"]["all"]

    for model_id in all_models:
        mm = metrics.model_metrics.get(model_id)

        # Accuracy block
        acc = _model_accuracy_block(mm) if mm is not None else None

        # DM vs M0
        dm_m0 = None
        for dm in metrics.dm_results:
            if dm.model_a == model_id and dm.model_b == "M0" and dm.loss_type == "brier":
                dm_m0 = {
                    "stat": _r(dm.dm_star),
                    "pvalue": _r(dm.pvalue),
                    "reject": dm.reject_at_alpha.get("mstar_vs_m0", False),
                    "hln_applied": dm.hln_applied,
                }
                break

        # DM vs Market
        dm_mkt = None
        for dm in metrics.dm_results:
            if dm.model_a == model_id and dm.model_b == "MARKET_DEVIGGED" and dm.loss_type == "brier":
                dm_mkt = {
                    "stat": _r(dm.dm_star),
                    "pvalue": _r(dm.pvalue),
                    "reject": dm.reject_at_alpha.get("mstar_vs_market", False),
                    "hln_applied": dm.hln_applied,
                }
                break

        # Nyberg
        nyb_block = None
        for nr in metrics.nyberg_results:
            if nr.model_id == model_id:
                nyb_block = {
                    "lr": _r(nr.lr_stat),
                    "pvalue": _r(nr.pvalue),
                    "reject_primary": nr.reject_primary,
                    "reject_bonferroni": nr.reject_bonferroni,
                    "wald_hc3_stat": _r(nr.wald_hc3_stat) if nr.wald_hc3_stat is not None else None,
                    "wald_hc3_pvalue": _r(nr.wald_hc3_pvalue) if nr.wald_hc3_pvalue is not None else None,
                }
                break

        # Trading block
        trading = None
        if model_id == "M_STAR":
            trading = _model_trading_block(mstar_report)
        elif model_id in shadow_results:
            trading = _model_trading_block(shadow_results[model_id].report)

        # By-stage breakdown
        by_stage: dict[str, Any] = {}
        if mm is not None:
            for stage_key, sm in mm.by_stage.items():
                by_stage[stage_key] = {
                    "n": sm.n,
                    "brier_mean": _r(sm.brier_mean),
                    "rps_mean": _r(sm.rps_mean),
                    "log_loss_mean": _r(sm.log_loss_mean),
                }

        models_block[model_id] = {
            "accuracy": acc,
            "dm_vs_m0": dm_m0,
            "dm_vs_market": dm_mkt,
            "nyberg": nyb_block,
            "trading": trading,
            "by_stage": by_stage,
        }

    ts = generated_at_utc or (
        datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:23] + "Z"
    )
    payload = {
        "schema_version": "7.0",
        "generated_at_utc": ts,
        "tournament": tournament,
        "pre_reg_constants_sha": constants_sha,
        "kill_criterion_tripped": metrics.kill_criterion_tripped,
        "kill_criterion_detail": metrics.kill_criterion_detail,
        "models": models_block,
    }
    # Optional additive block. When present, it carries report-level provenance
    # and honesty disclosures (timing, null-cell inventory, cross-check). It is
    # an extra top-level key the ablation_v7 schema tolerates (no
    # additionalProperties restriction); absent by default, so existing callers
    # are byte-identical.
    if meta is not None:
        payload["meta"] = meta
    return payload


# ---------------------------------------------------------------------------
# LaTeX builder
# ---------------------------------------------------------------------------


def _build_latex(ablation: dict[str, Any]) -> tuple[str, str]:
    """
    Return (ablation.tex, ablation_caption.tex).

    Produces a ``table*`` environment with booktabs + siunitx.
    M★ row is highlighted with \\rowcolor.
    """
    models_order = ["M0", "M1", "M2", "M3", "M_STAR", "MARKET_DEVIGGED"]
    model_labels = {
        "M0": r"$M_0$ (Elo baseline)",
        "M1": r"$M_1$ (Elo + Form)",
        "M2": r"$M_2$ (Elo + FIFA)",
        "M3": r"$M_3$ (Macro-prior)",
        "M_STAR": r"$M^\star$ (Champion)",
        "MARKET_DEVIGGED": r"Market (de-vigged)",
    }
    na = "---"

    def _cell(val: Any, dp: int = 4) -> str:
        if val is None:
            return na
        return f"{float(val):.{dp}f}"

    def _ci_cell(ci: Any) -> str:
        if ci is None:
            return na
        lo, hi = ci[0], ci[1]
        return f"$[{float(lo):.{_DP}f},\\ {float(hi):.{_DP}f}]$"

    def _reject_cell(v: Any) -> str:
        if v is None:
            return na
        return r"\checkmark" if v else r"$\times$"

    rows = []
    for mid in models_order:
        mdata = ablation["models"].get(mid, {})
        acc = mdata.get("accuracy") or {}
        dm0 = mdata.get("dm_vs_m0") or {}
        nyb = mdata.get("nyberg") or {}
        tr = mdata.get("trading") or {}

        label = model_labels.get(mid, mid)
        is_champ = mid == "M_STAR"

        row_parts = [
            label,
            _cell(acc.get("brier_mean")),
            _cell(acc.get("rps_mean")),
            _cell(acc.get("log_loss_mean")),
            _cell(dm0.get("stat")),
            _reject_cell(dm0.get("reject")),
            _cell(nyb.get("lr")),
            _reject_cell(nyb.get("reject_primary")),
            str(tr.get("n_bets", na) if tr else na),
            _cell(tr.get("clv_mean") if tr else None),
            _cell(tr.get("sharpe") if tr else None),
            _cell(tr.get("hm_ci_low") if tr else None),
            str(tr.get("decision", na) if tr else na).replace("_", r"\_"),
        ]

        row_str = " & ".join(row_parts) + r" \\"
        if is_champ:
            row_str = r"\rowcolor{yellow!25}" + "\n" + row_str
        rows.append(row_str)

    col_spec = "l" + "S[table-format=1.4]" * 3 + "S[table-format=2.4]r" + "S[table-format=2.4]r" + "rS[table-format=1.4]S[table-format=1.4]S[table-format=2.4]l"

    gen_utc = ablation.get("generated_at_utc", "")
    sha = ablation.get("pre_reg_constants_sha", "unknown")[:16]

    body = "\n".join(rows)
    tex = rf"""\begin{{table*}}[ht]
\centering
\setlength{{\tabcolsep}}{{4pt}}
\begin{{tabular}}{{{col_spec}}}
\toprule
\multirow{{2}}{{*}}{{Model}} &
\multicolumn{{3}}{{c}}{{Accuracy}} &
\multicolumn{{2}}{{c}}{{DM vs $M_0$}} &
\multicolumn{{2}}{{c}}{{Nyberg}} &
\multicolumn{{5}}{{c}}{{Trading (CLV)}} \\
\cmidrule(lr){{2-4}}\cmidrule(lr){{5-6}}\cmidrule(lr){{7-8}}\cmidrule(lr){{9-13}}
 & {{\footnotesize$\overline{{\text{{BS}}}}$}} & {{\footnotesize$\overline{{\text{{RPS}}}}$}} & {{\footnotesize$\overline{{\text{{LL}}}}$}} &
   {{\footnotesize DM$^*$}} & Rej. &
   {{\footnotesize LR}} & Rej. &
   $N_{{\text{{bets}}}}$ & $\overline{{\text{{CLV}}}}$ & $\widehat{{SR}}$ & HM 95\% LB & Decision \\
\midrule
{body}
\bottomrule
\end{{tabular}}
\label{{tab:ablation}}
\end{{table*}}
"""

    caption = (
        r"\caption{" + "\n"
        r"  Ablation results for M0--M3 and Champion $M^\star$ on the "
        r"2026 FIFA World Cup. " + "\n"
        r"  Accuracy metrics (Brier, RPS, log-loss) computed on all tournament matches "
        r"with realized outcomes. " + "\n"
        r"  DM$^*$ = Harvey-Leybourne-Newbold corrected Diebold-Mariano statistic (Brier loss, "
        r"two-sided $\alpha=0.05$). " + "\n"
        r"  Nyberg LR = likelihood-ratio test of market efficiency at $\alpha=0.05$ ($\chi^2_2$). " + "\n"
        r"  CLV computed on M$^\star$ bets; pseudo-CLV for shadow models. " + "\n"
        r"  HM 95\% LB = lower bound of Hall-Mueller bootstrap Sharpe 95\% CI. " + "\n"
        r"  Pre-registration constants SHA (first 16 chars): \texttt{" + sha + r"}." + "\n"
        r"  Generated: \texttt{" + gen_utc + r"}."
        "\n}"
    )

    # When a report-level meta block is present (cp-36), append its timing
    # disclosure and gaps note to the caption so the paper fragment carries the
    # same honesty statements the JSON meta does. LaTeX-escape the prose.
    meta = ablation.get("meta") or {}
    disclosures = [meta.get("timing_disclosure"), meta.get("gaps_note")]
    disclosure_text = " ".join(_latex_escape(d) for d in disclosures if d)
    if disclosure_text:
        caption = caption[: -len("\n}")] + "\n  " + disclosure_text + "\n}"

    return tex, caption


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def compile_ablation(
    metrics: MetricsTable,
    mstar_report: Optional[CLVReport],
    shadow_results: dict[str, ShadowCLVResult],
    output_dir: Path,
    tournament: str = "FIFA2026",
    expected_constants_sha: Optional[str] = None,
    generated_at_utc: Optional[str] = None,
    meta: Optional[dict[str, Any]] = None,
) -> None:
    """
    Compile ablation.json and ablation.tex from pre-computed results.

    Idempotent.  Never mutates inputs.  Aborts if ``pre_reg_constants.yaml``
    SHA does not match ``expected_constants_sha`` (when provided).

    Parameters
    ----------
    metrics
        Output of :func:`accuracy_metrics.compute_all_metrics`.
    mstar_report
        Output of :func:`clv_tracker.emit_clv_report`.
    shadow_results
        Output of :func:`pseudo_clv.ablation_sweep`.
    output_dir
        Directory where ablation.json, ablation.tex, ablation_caption.tex
        will be written.
    expected_constants_sha
        Optional SHA-256 to verify pre_reg_constants.yaml is unchanged.
    """
    constants, constants_sha = _load_constants(expected_sha=expected_constants_sha)

    ablation = _build_json(
        metrics=metrics,
        mstar_report=mstar_report,
        shadow_results=shadow_results,
        constants=constants,
        constants_sha=constants_sha,
        tournament=tournament,
        generated_at_utc=generated_at_utc,
        meta=meta,
    )

    tex_body, tex_caption = _build_latex(ablation)

    output_dir.mkdir(parents=True, exist_ok=True)

    # Write ablation.json  (deterministic: sorted keys + no trailing space)
    json_path = output_dir / constants["dashboard"]["output_files"]["json"]
    json_str = json.dumps(ablation, indent=2, sort_keys=True, ensure_ascii=False)
    with open(json_path, "w", encoding="utf-8") as fh:
        fh.write(json_str + "\n")

    # Write ablation.tex
    tex_path = output_dir / constants["dashboard"]["output_files"]["tex"]
    with open(tex_path, "w", encoding="utf-8") as fh:
        fh.write(tex_body)

    # Write ablation_caption.tex
    cap_path = output_dir / constants["dashboard"]["output_files"]["caption_tex"]
    with open(cap_path, "w", encoding="utf-8") as fh:
        fh.write(tex_caption)

    if metrics.kill_criterion_tripped:
        log.warning(
            "KILL_CRITERION_TRIPPED",
            detail=metrics.kill_criterion_detail,
        )

    log.success(
        "compile_ablation",
        json=str(json_path),
        tex=str(tex_path),
        constants_sha=constants_sha[:16],
        kill_criterion=metrics.kill_criterion_tripped,
    )


def diff_against(current_path: Path, previous_path: Path) -> DiffReport:
    """
    Compare current ablation.json to a prior snapshot.

    Returns a :class:`DiffReport` indicating whether nightly regeneration
    produced meaningful changes worth re-publishing to the website.
    """
    if not previous_path.exists():
        return DiffReport(changed=True, summary="No previous snapshot found — treating as new.")

    with open(current_path, encoding="utf-8") as fh:
        current = json.load(fh)
    with open(previous_path, encoding="utf-8") as fh:
        previous = json.load(fh)

    changed_fields: list[str] = []
    tolerance = 10 ** (-_DP)

    def _compare(path: str, a: Any, b: Any) -> None:
        if isinstance(a, dict) and isinstance(b, dict):
            for k in set(a) | set(b):
                _compare(f"{path}.{k}", a.get(k), b.get(k))
        elif isinstance(a, list) and isinstance(b, list):
            if len(a) != len(b):
                changed_fields.append(f"{path}[len:{len(a)}→{len(b)}]")
            else:
                for i, (ai, bi) in enumerate(zip(a, b)):
                    _compare(f"{path}[{i}]", ai, bi)
        elif isinstance(a, float) and isinstance(b, float):
            if abs(a - b) > tolerance:
                changed_fields.append(f"{path}:{b:.6f}→{a:.6f}")
        elif a != b and path not in ("generated_at_utc",):
            changed_fields.append(f"{path}:{b!r}→{a!r}")

    # Skip generated_at_utc when comparing
    curr_models = current.get("models", {})
    prev_models = previous.get("models", {})
    _compare("models", curr_models, prev_models)

    changed = len(changed_fields) > 0
    summary = (
        f"{len(changed_fields)} field(s) changed: {changed_fields[:5]}"
        + ("…" if len(changed_fields) > 5 else "")
        if changed
        else "No meaningful changes."
    )
    return DiffReport(changed=changed, changed_fields=changed_fields, summary=summary)
