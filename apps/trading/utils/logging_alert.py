"""
Central logging and alert system.
- Structured log context (module, action, index, etc.)
- Debug traces when LOG_LEVEL=DEBUG
- Alert callback for critical events (auto-lock, kill switch, order failure, data failure)
"""
import os
import functools
from typing import Optional, Callable, Any, Dict
from loguru import logger

# Alert severity for downstream (e.g. backend, Telegram)
ALERT_CRITICAL = "critical"   # e.g. kill switch, broker disconnect
ALERT_WARNING = "warning"     # e.g. auto-lock, repeated fetch failure
ALERT_INFO = "info"           # e.g. trade executed, level loaded

_alerts_callback: Optional[Callable[[str, str, Dict[str, Any]], None]] = None
_debug_enabled: Optional[bool] = None


def is_debug() -> bool:
    global _debug_enabled
    if _debug_enabled is None:
        _debug_enabled = (os.getenv("LOG_LEVEL", "").upper() == "DEBUG")
    return _debug_enabled


def set_alerts_callback(cb: Callable[[str, str, Dict[str, Any]], None]) -> None:
    """Set callback(severity, message, payload) for critical/warning alerts."""
    global _alerts_callback
    _alerts_callback = cb


def alert(severity: str, message: str, payload: Optional[Dict[str, Any]] = None) -> None:
    """Emit an alert and log. Callback receives severity, message, payload."""
    payload = payload or {}
    if severity == ALERT_CRITICAL:
        logger.error(f"[ALERT] {message} | {payload}")
    elif severity == ALERT_WARNING:
        logger.warning(f"[ALERT] {message} | {payload}")
    else:
        logger.info(f"[ALERT] {message} | {payload}")
    if _alerts_callback:
        try:
            _alerts_callback(severity, message, payload)
        except Exception as e:
            logger.error(f"Alert callback failed: {e}")


def log_module(module: str, action: str, message: str, **kwargs: Any) -> None:
    """Structured log with module/action; include extra only in DEBUG."""
    extra = " | ".join(f"{k}={v}" for k, v in kwargs.items()) if kwargs else ""
    full = f"[{module}] {action}: {message}" + (f" | {extra}" if extra else "")
    logger.info(full)
    if is_debug() and kwargs:
        logger.debug(f"[{module}] DEBUG {action} | {kwargs}")


def log_and_raise(module: str, action: str, message: str, exc: Exception) -> None:
    """Log error with context and re-raise (or use in except)."""
    logger.error(f"[{module}] {action}: {message} | error={exc}")
    raise


def safe_float(value: Any, default: float, label: str = "value") -> float:
    """Parse float safely; log and return default on failure."""
    try:
        if value is None or (isinstance(value, float) and (value != value)):  # NaN
            return default
        return float(value)
    except (TypeError, ValueError):
        logger.debug(f"{label} invalid for float: {value}, using default {default}")
        return default


def safe_int(value: Any, default: int, label: str = "value") -> int:
    """Parse int safely; log and return default on failure."""
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        logger.debug(f"{label} invalid for int: {value}, using default {default}")
        return default


def clamp_int(value: int, low: int, high: int, label: str = "value") -> int:
    """Clamp int to [low, high]; log if clamped in DEBUG."""
    out = max(low, min(high, value))
    if is_debug() and out != value:
        logger.debug(f"{label} clamped {value} -> {out}")
    return out
