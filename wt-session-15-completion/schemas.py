"""
schemas.py
==========
Pydantic v2 data models for The 45% Problem.

Every record that flows through the pipeline — raw data in, forecasts out,
market observations, and the append-only event log — is validated against
one of these schemas. This guarantees type safety, catches upstream data
quality issues early, and ensures the academic forecast log is self-describing.

Usage:
    from schemas import Match, Team, OddsSnapshot, ForecastRecord, EventLog
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# =============================================================================
# Enumerations
# =============================================================================


class Tournament(str, Enum):
    WC_2010   = "FIFA World Cup 2010"
    WC_2014   = "FIFA World Cup 2014"
    WC_2018   = "FIFA World Cup 2018"
    WC_2022   = "FIFA World Cup 2022"
    WC_2026   = "FIFA World Cup 2026"
    EURO_2020 = "UEFA Euro 2020"
    EURO_2024 = "UEFA Euro 2024"
    COPA_2021 = "Copa America 2021"
    COPA_2024 = "Copa America 2024"
    AFCON_2021 = "Africa Cup of Nations 2021"
    AFCON_2023 = "Africa Cup of Nations 2023"
    AFC_2023   = "AFC Asian Cup 2023"
    FRIENDLY   = "International Friendly"
    OTHER      = "Other"


class Stage(str, Enum):
    GROUP        = "Group Stage"
    ROUND_OF_32  = "Round of 32"
    ROUND_OF_16  = "Round of 16"
    QUARTER_FINAL = "Quarter-final"
    SEMI_FINAL   = "Semi-final"
    THIRD_PLACE  = "Third Place"
    FINAL        = "Final"
    OTHER        = "Other"


class Confederation(str, Enum):
    UEFA     = "UEFA"
    CONMEBOL = "CONMEBOL"
    CONCACAF = "CONCACAF"
    CAF      = "CAF"
    AFC      = "AFC"
    OFC      = "OFC"


class ModelVariant(str, Enum):
    M0     = "M0"    # Pure Elo (null baseline)
    M1     = "M1"    # Elo + Decayed Form
    M2     = "M2"    # Elo + FIFA Rank blend
    M3     = "M3"    # Macro-Prior + Elo (Klement replication)
    M_STAR = "M*"    # Production champion


class Bookmaker(str, Enum):
    PINNACLE   = "pinnacle"
    BETFAIR    = "betfair"
    POLYMARKET = "polymarket"


class MarketType(str, Enum):
    MATCH_WINNER      = "match_winner"
    TOURNAMENT_WINNER = "tournament_winner"
    GROUP_WINNER      = "group_winner"
    ROUND_ADVANCEMENT = "round_advancement"
    BOTH_TEAMS_SCORE  = "both_teams_score"
    OVER_UNDER        = "over_under"
    OTHER             = "other"


class EventType(str, Enum):
    NAMED_EVENT_SUPPRESSION    = "named_event_suppression"
    PRICE_DISCOVERY_SUPPRESSION = "price_discovery_suppression"
    LIQUIDITY_SUPPRESSION      = "liquidity_suppression"
    BET_RECOMMENDATION         = "bet_recommendation"
    BET_SUPPRESSED             = "bet_suppressed"
    DRAWDOWN_STOP_TRIGGERED    = "drawdown_stop_triggered"
    DRAWDOWN_STOP_LIFTED       = "drawdown_stop_lifted"
    KILL_CRITERION_TRIGGERED   = "kill_criterion_triggered"
    DATA_SNAPSHOT              = "data_snapshot"
    MODEL_UPDATE               = "model_update"
    NEWS_INGESTED              = "news_ingested"


# =============================================================================
# Match
# =============================================================================


class Match(BaseModel):
    """
    A single international football match — historical result or 2026 fixture.

    The data_hash is computed automatically from canonical fields and flows
    into ForecastRecord.data_snapshot_sha for full paper reproducibility.
    """
    model_config = ConfigDict(frozen=True, str_strip_whitespace=True)

    match_id: str = Field(
        description="Unique ID: '{date}_{home}_{away}', e.g. '2026-06-14_USA_MEX'"
    )
    date: datetime = Field(description="Kickoff time in UTC")
    tournament: str
    stage: Stage = Field(default=Stage.OTHER)
    team_home: str = Field(description="ISO-3166 alpha-3, e.g. 'USA'")
    team_away: str = Field(description="ISO-3166 alpha-3, e.g. 'MEX'")
    score_home: int | None = Field(default=None, ge=0)
    score_away: int | None = Field(default=None, ge=0)
    neutral_venue: bool = Field(default=False)
    host_country: str | None = Field(default=None)
    extra_time: bool | None = Field(default=None)
    penalties: bool | None = Field(default=None)
    penalty_winner: str | None = Field(default=None)
    is_holdout: bool = Field(
        default=False,
        description="True for 2022 WC hold-out set used in M★ selection"
    )
    data_hash: str = Field(default="", description="SHA-256 of canonical fields (auto-computed)")

    @field_validator("team_home", "team_away", "host_country", "penalty_winner", mode="before")
    @classmethod
    def upper_code(cls, v: str | None) -> str | None:
        return v.upper().strip() if v else v

    @model_validator(mode="after")
    def compute_data_hash(self) -> "Match":
        canonical = {
            "match_id":   self.match_id,
            "date":       self.date.isoformat(),
            "team_home":  self.team_home,
            "team_away":  self.team_away,
            "score_home": self.score_home,
            "score_away": self.score_away,
            "tournament": self.tournament,
            "stage":      self.stage.value,
        }
        digest = hashlib.sha256(
            json.dumps(canonical, sort_keys=True).encode()
        ).hexdigest()[:16]
        object.__setattr__(self, "data_hash", digest)
        return self

    @property
    def is_played(self) -> bool:
        return self.score_home is not None and self.score_away is not None

    @property
    def result_home(self) -> str | None:
        """'W', 'D', or 'L' from home team perspective."""
        if not self.is_played:
            return None
        if self.score_home > self.score_away:       # type: ignore[operator]
            return "W"
        elif self.score_home == self.score_away:    # type: ignore[operator]
            return "D"
        return "L"


# =============================================================================
# Team
# =============================================================================


class Team(BaseModel):
    """
    A national team. Aggregates all signals consumed by M0–M3.
    """
    model_config = ConfigDict(frozen=True, str_strip_whitespace=True)

    team_id: str = Field(description="ISO-3166 alpha-3, e.g. 'BRA'")
    name: str
    confederation: Confederation
    group: str | None = Field(default=None, description="2026 WC group, e.g. 'A'")
    is_host: bool = Field(default=False)

    # Elo (used by M0, M1, M2, M3)
    elo_rating: float = Field(ge=800.0, le=2500.0)
    elo_snapshot_date: datetime | None = Field(default=None)

    # FIFA ranking (used by M2)
    fifa_points: float | None = Field(default=None, ge=0.0)
    fifa_rank: int | None = Field(default=None, ge=1)
    fifa_snapshot_date: datetime | None = Field(default=None)

    # Decayed form score (used by M1)
    form_score: float | None = Field(
        default=None,
        description="Exponential-decay weighted form over last 8 matches"
    )

    # Macro variables (used by M3)
    log_gdp_per_capita: float | None = Field(default=None)
    log_population: float | None = Field(default=None)
    mean_temp_celsius: float | None = Field(default=None)
    football_culture_index: float | None = Field(
        default=None,
        description="Decay-weighted WC appearances since 1960"
    )
    wc_appearances: int = Field(default=0, ge=0)

    @field_validator("team_id", mode="before")
    @classmethod
    def upper_team_id(cls, v: str) -> str:
        return v.upper().strip()


# =============================================================================
# OddsSnapshot
# =============================================================================


class OddsSnapshot(BaseModel):
    """
    One price observation from a bookmaker or prediction market.

    Captured at opening line (is_opening=True) and closing line (is_closing=True).
    The gap between those two de-vigged probabilities is the raw material for CLV.
    """
    model_config = ConfigDict(frozen=True)

    snapshot_id: str
    timestamp: datetime
    match_id: str
    bookmaker: Bookmaker
    market_type: MarketType
    outcome: str = Field(
        description="'home_win' | 'draw' | 'away_win' | ISO team code for outrights"
    )
    decimal_odds: float = Field(gt=1.0)
    devigged_prob: float | None = Field(default=None, ge=0.0, le=1.0)
    volume_24h_usd: float | None = Field(default=None, ge=0.0)
    is_opening: bool = Field(default=False)
    is_closing: bool = Field(default=False)
    last_refreshed: datetime | None = Field(default=None)
    data_hash: str = Field(default="")

    @model_validator(mode="after")
    def compute_snapshot_hash(self) -> "OddsSnapshot":
        canonical = {
            "snapshot_id":  self.snapshot_id,
            "timestamp":    self.timestamp.isoformat(),
            "match_id":     self.match_id,
            "bookmaker":    self.bookmaker.value,
            "market_type":  self.market_type.value,
            "outcome":      self.outcome,
            "decimal_odds": self.decimal_odds,
        }
        digest = hashlib.sha256(
            json.dumps(canonical, sort_keys=True).encode()
        ).hexdigest()[:16]
        object.__setattr__(self, "data_hash", digest)
        return self


# =============================================================================
# ForecastRecord
# =============================================================================


class ForecastRecord(BaseModel):
    """
    An immutable forecast record written to the append-only JSONL forecast log.

    One record per (match × model_variant) at Pinnacle opening line time.
    No records are ever deleted or overwritten — news-shock updates produce
    new rows, preserving the full belief time-series.

    Any paper figure can be reproduced by checking out code_sha and loading
    the data_snapshot_sha data file.
    """
    model_config = ConfigDict(frozen=True)

    record_id: str
    timestamp: datetime                  # UTC, millisecond precision
    match_id: str
    kickoff_time: datetime
    model_variant: ModelVariant

    # Reproducibility SHAs
    code_sha: str = Field(min_length=7, max_length=64)
    data_snapshot_sha: str = Field(min_length=16, max_length=64)

    # Match outcome probabilities — must sum to 1.0 ± 0.001
    prob_home_win: float = Field(ge=0.0, le=1.0)
    prob_draw: float = Field(ge=0.0, le=1.0)
    prob_away_win: float = Field(ge=0.0, le=1.0)

    # Tournament progression probabilities (ISO code → probability)
    tournament_win_probs: dict[str, float] = Field(default_factory=dict)
    tournament_sf_probs: dict[str, float] = Field(default_factory=dict)

    # Monte Carlo metadata
    mc_seed: int
    mc_run_count: int

    # CLV fields (populated after closing line is observed)
    clv_raw: float | None = Field(default=None)
    q_open_devigged: float | None = Field(default=None, ge=0.0, le=1.0)
    q_close_devigged: float | None = Field(default=None, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_prob_sum(self) -> "ForecastRecord":
        total = self.prob_home_win + self.prob_draw + self.prob_away_win
        if abs(total - 1.0) > 0.001:
            raise ValueError(
                f"Match probabilities must sum to 1.0 ± 0.001, got {total:.6f}"
            )
        return self

    def to_jsonl_row(self) -> str:
        return self.model_dump_json() + "\n"


# =============================================================================
# EventLog
# =============================================================================


class EventLog(BaseModel):
    """
    Append-only record of every significant pipeline event.

    Captures all Volatility Gate suppression decisions with trigger reason
    and timestamp. The suppressed-bet subset becomes a secondary dataset
    for the paper: 'what fraction of positive-EV bets were filtered, and
    what was the realised performance of the filtered-out set?'
    """
    model_config = ConfigDict(frozen=True)

    event_id: str
    timestamp: datetime
    event_type: EventType
    match_id: str | None = Field(default=None)
    team_id: str | None = Field(default=None)
    market_id: str | None = Field(default=None)
    model_variant: ModelVariant | None = Field(default=None)
    trigger_reason: str | None = Field(default=None)
    edge_at_trigger: float | None = Field(default=None)
    market_volume_usd: float | None = Field(default=None)
    price_swing_pct: float | None = Field(default=None)
    details: dict[str, Any] = Field(default_factory=dict)

    def to_jsonl_row(self) -> str:
        return self.model_dump_json() + "\n"


# =============================================================================
# Convenience helpers
# =============================================================================


def validate_match_list(records: list[dict[str, Any]]) -> list[Match]:
    return [Match.model_validate(r) for r in records]


def validate_team_list(records: list[dict[str, Any]]) -> list[Team]:
    return [Team.model_validate(r) for r in records]
