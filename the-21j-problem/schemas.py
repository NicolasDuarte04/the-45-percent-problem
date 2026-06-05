"""
schemas.py
==========
Pydantic v2 data models for El Voto del 21 de Junio (the 21J data pipeline).

Self-contained: this module does NOT import from the sibling
`the-45-percent-problem` project. It mirrors that project's conventions
(Pydantic v2, deterministic IDs, a name-standardisation map) without sharing
its data lineage.

The single model here is `Poll`: one published, sourced voting-intention poll
for the 21 de junio de 2026 presidential runoff (Cepeda vs De la Espriella).

Usage:
    from schemas import Poll, standardise_pollster, make_poll_id
"""

from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# =============================================================================
# Pollster standardisation
# =============================================================================
#
# Mirrors the TEAM_NAME_MAP pattern in
# ../the-45-percent-problem/ingestion/fetch_historical_matches.py.
#
# Canonical labels are the five recognised firms that actually published
# second-round (Cepeda vs De la Espriella) polls inside the 60-day window:
# AtlasIntel, CNC, GAD3, Guarumo, Invamer.
#
# NOTE: execution_plan.md (Day 2) named a *planned* set of five pollsters
# (Invamer, Datexco, Yanhaas, Guarumo, Cifras y Conceptos). That list predates
# the actual runoff and is partly stale: only Invamer and Guarumo from it
# published in-window runoff polls. The map keeps the planned names so that if
# Datexco / Yanhaas / Cifras y Conceptos publish later they collapse cleanly,
# but the real in-window field is the five canonical labels above.

POLLSTER_NAME_MAP: dict[str, str] = {
    # AtlasIntel
    "AtlasIntel":                       "AtlasIntel",
    "Atlas Intel":                      "AtlasIntel",
    "Atlas-Intel":                      "AtlasIntel",
    "Atlas":                            "AtlasIntel",
    # Centro Nacional de Consultoría
    "CNC":                              "CNC",
    "Centro Nacional de Consultoría":   "CNC",
    "Centro Nacional de Consultoria":   "CNC",
    # GAD3
    "GAD3":                             "GAD3",
    "GAD 3":                            "GAD3",
    # Guarumo (published jointly with EcoAnalítica)
    "Guarumo":                          "Guarumo",
    "Guarumo/EcoAnalítica":             "Guarumo",
    "Guarumo / EcoAnalítica":           "Guarumo",
    "Guarumo & EcoAnalítica":           "Guarumo",
    "Guarumo y EcoAnalítica":           "Guarumo",
    "EcoAnalítica":                     "Guarumo",
    # Invamer
    "Invamer":                          "Invamer",
    "Invamer Gallup":                   "Invamer",
    "Gallup":                           "Invamer",
    # Planned-but-not-yet-seen (execution_plan.md Day 2); kept for forward use
    "Datexco":                          "Datexco",
    "Datexco / W Radio":                "Datexco",
    "Yanhaas":                          "Yanhaas",
    "YanHass":                          "Yanhaas",
    "Cifras y Conceptos":               "Cifras y Conceptos",
    "Cifras & Conceptos":               "Cifras y Conceptos",
    # Historical-corpus firms (Session 03; 2018/2022 calibration only)
    "CELAG":                            "CELAG",
    "Mosqueteros":                      "Mosqueteros",
}

# The five recognised firms with in-window runoff polls. fetch_polls.py filters
# the seed to this set; anything else is logged and excluded.
CANONICAL_POLLSTERS: frozenset[str] = frozenset(
    {"AtlasIntel", "CNC", "GAD3", "Guarumo", "Invamer"}
)

# Share-sum validation band (cepeda + espriella + other + undecided).
SHARE_SUM_TARGET: float = 100.0
SHARE_SUM_TOLERANCE: float = 2.0

# The two named runoff candidates. A poll that does not parse to these two plus
# residual buckets does not belong in this dataset.
RUNOFF_CANDIDATES: tuple[str, str] = ("cepeda", "espriella")


def standardise_pollster(name: str) -> str:
    """Return the canonical pollster label for a raw name (trimmed)."""
    return POLLSTER_NAME_MAP.get(name.strip(), name.strip())


def slugify(value: str) -> str:
    """ASCII, lowercase, hyphen-separated slug (accents stripped)."""
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value


def make_poll_id(pollster: str, fieldwork_end: date) -> str:
    """Deterministic poll_id: '{pollster-slug}_{fieldwork_end ISO}'."""
    return f"{slugify(pollster)}_{fieldwork_end.isoformat()}"


def shares_sum(
    cepeda_pct: float, espriella_pct: float, other_pct: float, undecided_pct: float
) -> float:
    """The four-bucket total checked by the tolerance validator."""
    return cepeda_pct + espriella_pct + other_pct + undecided_pct


# =============================================================================
# Poll
# =============================================================================


class Poll(BaseModel):
    """
    A single published voting-intention poll for the 21 de junio de 2026 runoff.

    Validation rejects (raises) any poll that:
      - has an empty / non-http source_url,
      - has a non-positive sample size,
      - has fieldwork_end before fieldwork_start,
      - whose reported shares (cepeda + espriella + other + undecided) fall
        outside SHARE_SUM_TARGET +/- SHARE_SUM_TOLERANCE.

    `abstention_pct` is nullable and intentionally excluded from the share-sum
    check: several pollsters (e.g. Invamer) report undecided "sobre el total"
    on a different base than the renormalised candidate shares.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    poll_id: str = Field(description="Deterministic '{pollster-slug}_{fieldwork_end}'")
    pollster: str = Field(description="Canonical pollster label")
    fieldwork_start: date
    fieldwork_end: date
    publication_date: date = Field(
        description="When the poll was published; gates the electoral-silence boundary downstream"
    )
    sample_size: int = Field(gt=0, description="Reported sample size (> 0)")
    cepeda_pct: float = Field(ge=0, le=100)
    espriella_pct: float = Field(ge=0, le=100)
    other_pct: float = Field(ge=0, le=100, description="Voto en blanco + ninguno / otros")
    undecided_pct: float = Field(ge=0, le=100, description="No sabe / no responde")
    abstention_pct: float | None = Field(default=None, ge=0, le=100)
    margin_error: float | None = Field(default=None, ge=0)
    source_url: str = Field(min_length=1, description="Required, non-empty, http(s)")
    ingested_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC ingestion timestamp",
    )

    # ── Field validators ──────────────────────────────────────────────────────

    @field_validator("pollster", mode="before")
    @classmethod
    def _standardise_pollster(cls, v: str) -> str:
        return standardise_pollster(v) if isinstance(v, str) else v

    @field_validator("source_url")
    @classmethod
    def _validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("source_url must be non-empty")
        if not v.lower().startswith(("http://", "https://")):
            raise ValueError(f"source_url must be an http(s) URL, got: {v!r}")
        return v

    # ── Model validators ──────────────────────────────────────────────────────

    @model_validator(mode="after")
    def _check_dates(self) -> "Poll":
        if self.fieldwork_end < self.fieldwork_start:
            raise ValueError(
                f"fieldwork_end ({self.fieldwork_end}) precedes "
                f"fieldwork_start ({self.fieldwork_start})"
            )
        if self.publication_date < self.fieldwork_end:
            raise ValueError(
                f"publication_date ({self.publication_date}) precedes "
                f"fieldwork_end ({self.fieldwork_end})"
            )
        return self

    @model_validator(mode="after")
    def _check_share_sum(self) -> "Poll":
        total = shares_sum(
            self.cepeda_pct, self.espriella_pct, self.other_pct, self.undecided_pct
        )
        if abs(total - SHARE_SUM_TARGET) > SHARE_SUM_TOLERANCE:
            raise ValueError(
                f"reported shares sum to {total:.2f}, outside "
                f"{SHARE_SUM_TARGET} +/- {SHARE_SUM_TOLERANCE}"
            )
        return self

    # ── Convenience ───────────────────────────────────────────────────────────

    @property
    def share_sum(self) -> float:
        return shares_sum(
            self.cepeda_pct, self.espriella_pct, self.other_pct, self.undecided_pct
        )

    @property
    def margin(self) -> float:
        """De la Espriella minus Cepeda (positive => De la Espriella leads)."""
        return self.espriella_pct - self.cepeda_pct
