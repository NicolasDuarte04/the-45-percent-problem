"""
model/eligibility.py
====================
Session 10 · El Voto del 21 de Junio — calibrated-cycle inclusion gate

The guardrail that decides which pollsters may feed the runoff posterior. It
encodes, as an active and tested rule, the content-neutral judgement made by
hand in Session 09 (PR #91): a pollster may drive the public number ONLY IF its
bias is estimable, and a bias is estimable only if the firm has at least one
calibrated cycle (2018 / 2022) in the house-effects corpus.

The rule (encode exactly this)
------------------------------
- A pollster is **corpus-eligible** iff it has a house-effect estimate in
  ``data/calibration/co_house_effects.json`` — i.e. it appears as a key under
  ``house_effects``. Such a firm has an estimable, correctable bias.
- **Only eligible pollsters feed the posterior.** An ineligible real poll is NOT
  deleted; it is recorded in the snapshot as excluded, with the reason
  ``NOT_CALIBRATED_REASON``. Transparency, not suppression.
- The rule is **content-neutral**: eligibility depends only on corpus membership,
  never on which candidate the poll favours. The motivating case is CB Global
  Data (a real 2026 runoff poll, Espriella +6pp): no 2018/2022 cycle exists for
  it, so it is not bias-correctable and is excluded — even though excluding it
  removes a data point that would have moved the public number.

Where this runs
---------------
At the **aggregator boundary**, not in ingestion. Ingestion keeps recording every
real poll it finds; the aggregator decides eligibility when it builds the
posterior. The full poll record therefore stays intact while only
bias-correctable firms drive the number. ``simulate_runoff.py`` calls
``partition_polls`` once per run on the loaded polls and feeds only the eligible
subset to ``aggregate`` / the Monte Carlo / the input hash, recording the split
in the snapshot.

Self-contained inside the-21j-problem/. Reads only; writes nothing.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

# ── Project root on sys.path so we can import schemas ─────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas import standardise_pollster  # noqa: E402

# Documented exclusion reason for the calibrated-cycle gate (PR #91 / Session 10).
# Kept as a module constant so the runtime gate, the snapshot record, and the
# unit tests all assert the same string.
NOT_CALIBRATED_REASON = "no calibrated cycle in house-effects corpus"


@dataclass
class EligibilityResult:
    """
    The outcome of applying the calibrated-cycle gate to a set of polls.

    ``used`` is the eligible subset that feeds the posterior; ``excluded_polls``
    is the per-poll exclusion record (poll_id + pollster + reason) kept for the
    snapshot. The counts let the methodology page and the UI later show
    "N encuestas consideradas, M excluidas (sin trayectoria calibrada)".
    """

    used: pd.DataFrame
    eligible_firms: frozenset[str]                  # the corpus set the gate resolved
    pollsters_included: list[str] = field(default_factory=list)   # sorted firm labels feeding the posterior
    pollsters_excluded: list[dict] = field(default_factory=list)  # [{pollster, n_polls, reason}], grouped by firm
    excluded_polls: list[dict] = field(default_factory=list)      # [{poll_id, pollster, reason}], one per poll
    n_polls_considered: int = 0
    n_polls_used: int = 0


def load_corpus_pollsters(house_effects_json: str | Path) -> frozenset[str]:
    """
    The set of pollsters with >= 1 calibrated cycle (2018/2022) in the
    house-effects corpus: the keys of ``house_effects`` in co_house_effects.json.

    These are exactly the firms whose bias is estimable and therefore correctable
    — the content-neutral basis for the calibrated-cycle inclusion rule.

    Raises FileNotFoundError if the corpus is absent, and ValueError/KeyError if
    it is present but unreadable / malformed. (Read at call time, never at import:
    this module stays free of import-time filesystem I/O.)
    """
    record = json.loads(Path(house_effects_json).read_text(encoding="utf-8"))
    return corpus_pollsters_from_record(record)


def corpus_pollsters_from_record(record: dict) -> frozenset[str]:
    """
    The eligible set derived from an already-loaded house-effects record (the
    parsed co_house_effects.json). Same source of truth as
    ``load_corpus_pollsters``; used by callers that have already read the file.
    """
    return frozenset(record["house_effects"].keys())


def is_eligible(pollster: str, eligible_firms: frozenset[str]) -> bool:
    """
    True iff ``pollster`` has a calibrated cycle in the corpus. Checks the raw
    label and its standardised form, mirroring ``aggregate_polls._firm_house_effect``
    so the gate and the house-effect lookup agree on what counts as a match. The
    verdict depends only on corpus membership, never on the poll's content.
    """
    return pollster in eligible_firms or standardise_pollster(pollster) in eligible_firms


def partition_polls(
    polls: pd.DataFrame,
    eligible_firms: frozenset[str],
    *,
    reason: str = NOT_CALIBRATED_REASON,
) -> EligibilityResult:
    """
    Split ``polls`` into the eligible subset that feeds the posterior and the
    excluded record, by the content-neutral calibrated-cycle rule.

    No row is mutated or deleted from the input; the excluded polls are returned
    in the record (for the snapshot) rather than dropped silently. Order of the
    eligible subset is preserved.
    """
    mask = polls["pollster"].apply(lambda p: is_eligible(str(p), eligible_firms))
    used = polls[mask].copy()
    excluded = polls[~mask]

    excluded_polls = [
        {"poll_id": str(row["poll_id"]), "pollster": str(row["pollster"]), "reason": reason}
        for _, row in excluded.iterrows()
    ]

    # Group the excluded record by firm so the snapshot carries one line per
    # excluded pollster (with how many of its polls were dropped) and the reason.
    pollsters_excluded: list[dict] = []
    for firm in sorted(excluded["pollster"].astype(str).unique().tolist()):
        pollsters_excluded.append(
            {
                "pollster": firm,
                "n_polls": int((excluded["pollster"].astype(str) == firm).sum()),
                "reason": reason,
            }
        )

    return EligibilityResult(
        used=used,
        eligible_firms=eligible_firms,
        pollsters_included=sorted(used["pollster"].astype(str).unique().tolist()),
        pollsters_excluded=pollsters_excluded,
        excluded_polls=excluded_polls,
        n_polls_considered=int(len(polls)),
        n_polls_used=int(len(used)),
    )
