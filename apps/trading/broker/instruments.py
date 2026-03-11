"""
Angel One instrument list (Scrip Master) for resolving option symbol -> NFO token.
Used for placing option orders and for WebSocket/historical option data.
Ref: https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json
"""
import os
import time
from typing import Dict, List, Optional, Tuple
from loguru import logger
import requests

try:
    from utils.logging_config import step_log as _step
except ImportError:
    def _step(m, s, d="", **k): logger.info(f"[{m}] {s} | {d}" + (" | " + str(k) if k else ""))

INSTRUMENT_URL = "https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json"
CACHE_TTL_SEC = 3600  # 1 hour; NFO symbols update weekly
_nfo_symbol_to_token: Dict[str, str] = {}
_nfo_token_to_symbol: Dict[str, str] = {}
_last_fetch_time: float = 0


def _fetch_master() -> List[dict]:
    """Download OpenAPIScripMaster JSON. Returns list of instrument dicts."""
    timeout = max(15, int(os.getenv("INSTRUMENT_FETCH_TIMEOUT", "30")))
    try:
        resp = requests.get(INSTRUMENT_URL, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "data" in data:
            return data["data"] if isinstance(data["data"], list) else []
        return []
    except Exception as e:
        logger.exception("Failed to fetch instrument master: %s", e)
        return []


def refresh_instruments(force: bool = False) -> bool:
    """
    Load NFO option symbols and tokens from Angel One Scrip Master.
    Returns True if cache was populated (even partially).
    """
    global _nfo_symbol_to_token, _nfo_token_to_symbol, _last_fetch_time
    now = time.time()
    if not force and _nfo_symbol_to_token and (now - _last_fetch_time) < CACHE_TTL_SEC:
        return True
    _step("broker", "instruments", "fetching Scrip Master")
    rows = _fetch_master()
    if not rows:
        return False
    sym_to_tok: Dict[str, str] = {}
    tok_to_sym: Dict[str, str] = {}
    for r in rows:
        if not isinstance(r, dict):
            continue
        seg = (r.get("exch_seg") or "").strip().upper()
        if seg != "NFO":
            continue
        itype = (r.get("instrumenttype") or "").strip().upper()
        name = (r.get("name") or "").upper()
        sym = (r.get("symbol") or "").strip()
        # NFO options: OPTIDX (index options), or symbol ends with CE/PE
        is_option = (
            "OPTIDX" in itype or "OPT" in itype or itype in ("CE", "PE")
            or "OPT" in name or (len(sym) >= 2 and sym[-2:] in ("CE", "PE"))
        )
        if not is_option:
            continue
        tok = r.get("token")
        if not sym or tok is None:
            continue
        tok_str = str(tok).strip()
        sym_to_tok[sym] = tok_str
        tok_to_sym[tok_str] = sym
    _nfo_symbol_to_token = sym_to_tok
    _nfo_token_to_symbol = tok_to_sym
    _last_fetch_time = now
    _step("broker", "instruments", "NFO options loaded", count=len(sym_to_tok))
    logger.debug("[broker] instruments NFO options count=%s", len(sym_to_tok))
    return len(sym_to_tok) > 0


def get_option_token(option_symbol: str, refresh_if_missing: bool = True) -> Optional[str]:
    """
    Resolve NFO option symbol to Angel One instrument token.
    option_symbol: e.g. NIFTY25JAN29100CE (from NSE option chain identifier).
    Returns token string or None if not found.
    """
    if not option_symbol or not isinstance(option_symbol, str):
        return None
    sym = option_symbol.strip().upper()
    if not sym:
        return None
    refresh_instruments(force=False)
    token = _nfo_symbol_to_token.get(sym)
    if token is not None:
        return token
    # Try without spaces and exact match on normalized
    for k, v in _nfo_symbol_to_token.items():
        if k.replace(" ", "") == sym.replace(" ", ""):
            return v
    if refresh_if_missing and (time.time() - _last_fetch_time) > 60:
        refresh_instruments(force=True)
        token = _nfo_symbol_to_token.get(sym)
        if token is not None:
            return token
    logger.warning("[broker] instruments: no NFO token for symbol %s", option_symbol)
    return None


def get_option_symbol_from_token(token: str) -> Optional[str]:
    """Resolve NFO token to trading symbol."""
    if not token:
        return None
    refresh_instruments(force=False)
    return _nfo_token_to_symbol.get(str(token).strip())


def get_nfo_tokens_for_symbols(option_symbols: List[str], max_tokens: int = 200) -> List[str]:
    """
    Resolve multiple option symbols to tokens. Used for WebSocket subscription.
    Returns list of unique tokens (up to max_tokens).
    """
    if not option_symbols:
        return []
    refresh_instruments(force=False)
    tokens = []
    seen = set()
    for sym in option_symbols:
        if len(tokens) >= max_tokens:
            break
        t = get_option_token(sym, refresh_if_missing=False)
        if t and t not in seen:
            seen.add(t)
            tokens.append(t)
    return tokens
