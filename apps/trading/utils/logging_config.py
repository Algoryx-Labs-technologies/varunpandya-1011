"""
Structured logging: per-folder/module tags for E2E tracing.
Use step_log(module, step, detail) for clear step-by-step logs.
"""
from typing import Any, Optional
from loguru import logger

# Short tags for each top-level folder (used in logs and E2E)
MODULE_TAGS = {
    "broker": "broker",
    "data": "data",
    "strategy": "strategy",
    "main": "main",
    "api": "api",
    "risk": "risk",
    "levels": "levels",
    "journal": "journal",
    "money": "money",
    "patterns": "patterns",
    "indicators": "indicators",
    "analytics": "analytics",
    "execution": "execution",
    "historical_storage": "data",
}


def tag_for_module(module_name: str) -> str:
    """Return short tag from __name__, e.g. broker.angel_one -> broker."""
    if not module_name:
        return "app"
    top = module_name.split(".")[0]
    return MODULE_TAGS.get(top, top)


def step_log(module: str, step: str, detail: str = "", **kwargs: Any) -> None:
    """Log one E2E step with [module] prefix. Use for broker/data/strategy/main steps."""
    tag = MODULE_TAGS.get(module, module)
    extra = " | ".join(f"{k}={v}" for k, v in kwargs.items()) if kwargs else ""
    msg = f"[{tag}] {step}"
    if detail:
        msg += f" | {detail}"
    if extra:
        msg += f" | {extra}"
    logger.info(msg)


def step_debug(module: str, step: str, detail: str = "", **kwargs: Any) -> None:
    """Debug-level step log."""
    tag = MODULE_TAGS.get(module, module)
    extra = " | ".join(f"{k}={v}" for k, v in kwargs.items()) if kwargs else ""
    msg = f"[{tag}] {step}"
    if detail:
        msg += f" | {detail}"
    if extra:
        msg += f" | {extra}"
    logger.debug(msg)
