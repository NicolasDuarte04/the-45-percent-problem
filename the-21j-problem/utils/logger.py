"""
utils/logger.py
===============
Centralised logging for The 45% Problem pipeline.

Two output channels:
  1. Rich console  — coloured, human-readable output during development
  2. JSON file     — structured, append-only log for the audit trail

Usage:
    from utils.logger import get_logger

    log = get_logger(__name__)
    log.info("Fetching historical matches", source="martj42/international_results")
    log.warning("Missing score", match_id="2022-12-18_ARG_FRA")
    log.success("Wrote parquet", rows=48_000, path="data/raw/historical_matches.parquet")
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from rich.console import Console
    from rich.logging import RichHandler
    _RICH_AVAILABLE = True
except ImportError:
    _RICH_AVAILABLE = False


# ─── Config from environment ──────────────────────────────────────────────────
_LOG_DIR   = Path(os.environ.get("LOG_DIR", "logs"))
_LOG_FILE  = _LOG_DIR / "pipeline.log"
_LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
_USE_JSON  = os.environ.get("LOG_FORMAT", "console").lower() == "json"

_initialized: bool = False


# ─── JSON formatter ───────────────────────────────────────────────────────────

class _JsonFormatter(logging.Formatter):
    """One JSON object per log line — machine-readable production output."""

    _SKIP = {
        "args", "asctime", "created", "exc_info", "exc_text", "filename",
        "funcName", "levelname", "levelno", "lineno", "message", "module",
        "msecs", "msg", "name", "pathname", "process", "processName",
        "relativeCreated", "stack_info", "thread", "threadName",
    }

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level":     record.levelname,
            "logger":    record.name,
            "message":   record.getMessage(),
        }
        for k, v in record.__dict__.items():
            if k not in self._SKIP and not k.startswith("_"):
                payload[k] = v
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


# ─── Init ─────────────────────────────────────────────────────────────────────

def _init_logging() -> None:
    global _initialized
    if _initialized:
        return

    _LOG_DIR.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger()
    root.setLevel(getattr(logging, _LOG_LEVEL, logging.INFO))

    # Console handler
    if _RICH_AVAILABLE and not _USE_JSON:
        console_handler = RichHandler(
            console=Console(stderr=True),
            show_time=True,
            show_path=True,
            rich_tracebacks=True,
            markup=True,
        )
    else:
        console_handler = logging.StreamHandler(sys.stderr)
        console_handler.setFormatter(
            logging.Formatter("%(asctime)s  %(levelname)-8s  %(name)s  %(message)s")
        )
    console_handler.setLevel(getattr(logging, _LOG_LEVEL, logging.INFO))
    root.addHandler(console_handler)

    # File handler (always JSON, always DEBUG level)
    file_handler = logging.FileHandler(_LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(_JsonFormatter())
    file_handler.setLevel(logging.DEBUG)
    root.addHandler(file_handler)

    _initialized = True


# ─── Public API ───────────────────────────────────────────────────────────────

def get_logger(name: str) -> "PipelineLogger":
    """
    Return a structured logger for the given module.

    Example:
        log = get_logger(__name__)
        log.info("Stage complete", rows=48_000, path="data/raw/matches.parquet")
    """
    _init_logging()
    return PipelineLogger(logging.getLogger(name))


class PipelineLogger:
    """
    Thin wrapper that supports structured keyword arguments.

    log.info("Fetched rows", count=100, source="Pinnacle")
    → console: coloured Rich line
    → file:    {"timestamp": "...", "level": "INFO", "message": "Fetched rows",
                "count": 100, "source": "Pinnacle"}
    """

    def __init__(self, logger: logging.Logger) -> None:
        self._logger = logger

    def _log(self, level: int, message: str, **kwargs: Any) -> None:
        if not self._logger.isEnabledFor(level):
            return
        if kwargs and not _USE_JSON:
            ctx = "  ".join(
                f"[dim]{k}[/dim]=[cyan]{v}[/cyan]" for k, v in kwargs.items()
            )
            message = f"{message}  {ctx}"
        self._logger.log(level, message, extra=kwargs, stacklevel=3)

    def debug(self, msg: str, **kw: Any) -> None:
        self._log(logging.DEBUG, msg, **kw)

    def info(self, msg: str, **kw: Any) -> None:
        self._log(logging.INFO, msg, **kw)

    def warning(self, msg: str, **kw: Any) -> None:
        self._log(logging.WARNING, msg, **kw)

    def error(self, msg: str, **kw: Any) -> None:
        self._log(logging.ERROR, msg, **kw)

    def critical(self, msg: str, **kw: Any) -> None:
        self._log(logging.CRITICAL, msg, **kw)

    def success(self, msg: str, **kw: Any) -> None:
        """INFO-level milestone log with a ✅ prefix."""
        self._log(logging.INFO, f"✅ {msg}", **kw)

    def stage(self, msg: str, **kw: Any) -> None:
        """INFO-level pipeline stage transition with a 🔵 prefix."""
        self._log(logging.INFO, f"🔵 {msg}", **kw)
