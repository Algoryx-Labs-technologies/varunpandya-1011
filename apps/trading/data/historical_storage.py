"""
Historical data storage: index OHLC and option chain in separate folders.
Uses Angel One limits: 500 candles/request; 30 days (1m), 100 days (5m/15m) max retention.
"""
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import pandas as pd
from loguru import logger
try:
    from utils.logging_config import step_log as _step
except ImportError:
    def _step(m, s, d="", **k): logger.info(f"[{m}] {s} | {d}")

# Base directory: apps/trading/data/historical/
_BASE = os.path.join(os.path.dirname(__file__), "historical")
INDEX_OHLC_DIR = os.path.join(_BASE, "index_ohlc")
OPTION_CHAIN_DIR = os.path.join(_BASE, "option_chain")

# Max candles to keep per index/timeframe (Angel One: 500/request; 30d 1m ~11250, 100d 5m ~7500)
MAX_CANDLES = {
    "1m": 12000,   # ~30 trading days
    "5m": 8000,    # ~100 days
    "15m": 3000,   # ~100 days
}
# Option chain: keep last N snapshots per index per day; keep 7 days of files
MAX_OPTION_SNAPSHOTS_PER_DAY = 500
MAX_OPTION_DAYS = 7


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def save_index_ohlc(index: str, timeframe: str, df: pd.DataFrame) -> None:
    """
    Append index OHLC to CSV in index_ohlc/{index}/{timeframe}/.
    Trim to max candles for this timeframe. Skips if required OHLC columns missing.
    """
    if df is None or df.empty:
        return
    try:
        for col in ("open", "high", "low", "close"):
            if col not in df.columns:
                logger.warning("save_index_ohlc: missing required column %s", col)
                return
        index = (index or "").strip().upper()
        timeframe = (timeframe or "1m").strip().lower()
        max_rows = MAX_CANDLES.get(timeframe, 5000)
        dir_path = os.path.join(INDEX_OHLC_DIR, index, timeframe)
        _ensure_dir(dir_path)
        file_path = os.path.join(dir_path, "ohlc.csv")
        # Ensure we have timestamp index or column
        if "timestamp" not in df.columns and getattr(df.index, "name", None) == "timestamp":
            df = df.reset_index()
        if "timestamp" not in df.columns and len(df.columns) >= 1:
            df = df.reset_index().rename(columns={df.columns[0]: "timestamp"})
        # Append: load existing, concat, drop dupes, sort, trim
        if os.path.isfile(file_path):
            try:
                existing = pd.read_csv(file_path, parse_dates=["timestamp"], nrows=max_rows * 2)
                df = pd.concat([existing, df], ignore_index=True)
            except Exception:
                pass
        df = df.drop_duplicates(subset=["timestamp"], keep="last")
        df = df.sort_values("timestamp")
        df = df.tail(max_rows)
        df.to_csv(file_path, index=False)
        logger.debug(f"Saved index OHLC: {index} {timeframe} -> {len(df)} rows")
        _step("data", "historical_storage", "index_ohlc saved", index=index, timeframe=timeframe, rows=len(df), path=file_path)
    except Exception as e:
        logger.exception("save_index_ohlc failed: %s", e)


def save_option_chain_snapshot(index: str, payload: Dict[str, Any]) -> None:
    """
    Append one option chain snapshot to option_chain/{index}/ for today.
    Each day one JSON file; file contains list of snapshots, trimmed to MAX_OPTION_SNAPSHOTS_PER_DAY.
    Old day files beyond MAX_OPTION_DAYS are removed.
    """
    if not payload or not isinstance(payload, dict):
        return
    try:
        index = (index or payload.get("index") or "NIFTY").strip().upper()
        dir_path = os.path.join(OPTION_CHAIN_DIR, index)
        _ensure_dir(dir_path)
        today = datetime.now().strftime("%Y-%m-%d")
        file_path = os.path.join(dir_path, f"snapshots_{today}.json")
        # Normalize for JSON (DataFrames -> list of dicts)
        def _to_list(v):
            if v is None: return []
            if isinstance(v, list): return v
            if hasattr(v, "to_dict"): return v.to_dict("records")
            return []
        snap = {
            "timestamp": payload.get("timestamp", datetime.now().isoformat()),
            "index": index,
            "underlying_value": payload.get("underlying_value") or payload.get("underlyingValue"),
            "calls": _to_list(payload.get("calls")),
            "puts": _to_list(payload.get("puts")),
        }
        list_snapshots = []
        if os.path.isfile(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    list_snapshots = json.load(f)
            except Exception:
                pass
        if not isinstance(list_snapshots, list):
            list_snapshots = []
        list_snapshots.append(snap)
        list_snapshots = list_snapshots[-MAX_OPTION_SNAPSHOTS_PER_DAY:]
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(list_snapshots, f, indent=0)
        _step("data", "historical_storage", "option_chain snapshot saved", index=index, file=file_path, count=len(list_snapshots))
        # Prune old day files
        try:
            for name in os.listdir(dir_path):
                if name.startswith("snapshots_") and name.endswith(".json"):
                    date_str = name.replace("snapshots_", "").replace(".json", "")
                    try:
                        d = datetime.strptime(date_str, "%Y-%m-%d").date()
                        if (datetime.now().date() - d).days > MAX_OPTION_DAYS:
                            os.remove(os.path.join(dir_path, name))
                    except ValueError:
                        pass
        except Exception:
            pass
        logger.debug(f"Saved option chain snapshot: {index} @ {snap['timestamp'][:19]}")
    except Exception as e:
        logger.exception("save_option_chain_snapshot failed: %s", e)


def load_index_ohlc(index: str, timeframe: str, limit: int = 500) -> Optional[pd.DataFrame]:
    """Load last `limit` candles from historical index OHLC. Returns None if file missing or required columns absent."""
    try:
        index = (index or "").strip().upper()
        timeframe = (timeframe or "1m").strip().lower()
        limit = max(1, min(10000, int(limit) if limit is not None else 500))
        file_path = os.path.join(INDEX_OHLC_DIR, index, timeframe, "ohlc.csv")
        if not os.path.isfile(file_path):
            return None
        df = pd.read_csv(file_path, parse_dates=["timestamp"], nrows=limit * 2)
        for col in ("open", "high", "low", "close"):
            if col not in df.columns:
                logger.debug("load_index_ohlc: missing column %s in %s", col, file_path)
                return None
        df = df.tail(limit)
        return df
    except Exception as e:
        logger.debug("load_index_ohlc: %s", e)
        return None


def load_latest_option_snapshot(index: str) -> Optional[Dict[str, Any]]:
    """Load latest option chain snapshot from historical (today or latest day). Returns chain dict with calls/puts DataFrames."""
    try:
        index = (index or "").strip().upper()
        dir_path = os.path.join(OPTION_CHAIN_DIR, index)
        if not os.path.isdir(dir_path):
            return None
        best_file = None
        best_ts = None
        for name in os.listdir(dir_path):
            if name.startswith("snapshots_") and name.endswith(".json"):
                try:
                    with open(os.path.join(dir_path, name), "r", encoding="utf-8") as f:
                        snapshots = json.load(f)
                    if not snapshots:
                        continue
                    last = snapshots[-1]
                    ts = last.get("timestamp") or ""
                    if ts and (best_ts is None or ts > best_ts):
                        best_ts = ts
                        best_file = (os.path.join(dir_path, name), snapshots)
                except Exception:
                    pass
        if not best_file:
            return None
        _, snapshots = best_file
        last = snapshots[-1]
        calls = last.get("calls") or []
        puts = last.get("puts") or []
        return {
            "index": index,
            "timestamp": last.get("timestamp", ""),
            "underlying_value": last.get("underlying_value") or 0,
            "calls": pd.DataFrame(calls) if calls else pd.DataFrame(columns=["strike", "ltp", "oi", "volume", "bid", "ask", "symbol"]),
            "puts": pd.DataFrame(puts) if puts else pd.DataFrame(columns=["strike", "ltp", "oi", "volume", "bid", "ask", "symbol"]),
        }
    except Exception as e:
        logger.debug(f"load_latest_option_snapshot: {e}")
        return None
