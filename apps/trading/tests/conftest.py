"""
Pytest fixtures for trading tests.
Uses real historical OHLC from data/historical/index_ohlc when available (after fetch);
otherwise falls back to dummy data. Add app root to path so imports work when running pytest from apps/trading.
Mocks SmartApi so broker module can be imported when SDK is not installed.
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import MagicMock
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

APP_ROOT = Path(__file__).resolve().parent.parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

# Allow tests to run without Angel One SmartApi SDK installed
if "SmartApi" not in sys.modules:
    _mock_smart = MagicMock()
    sys.modules["SmartApi"] = _mock_smart
    sys.modules["SmartApi"].SmartConnect = MagicMock()
try:
    if "SmartApi.smartWebSocketV2" not in sys.modules:
        sys.modules["SmartApi.smartWebSocketV2"] = MagicMock()
        sys.modules["SmartApi.smartWebSocketV2"].SmartWebSocketV2 = MagicMock()
except Exception:
    pass

# Indices and timeframes to try when loading real historical data (same as config)
_HISTORICAL_INDICES = ["NIFTY", "BANKNIFTY", "FINNIFTY"]
_HISTORICAL_TIMEFRAMES = ["1m", "5m", "15m"]
_MIN_BARS_FOR_REAL = 20


def _load_historical_ohlc(limit: int = 500):
    """Load OHLC from data/historical/index_ohlc (fetched data). Returns None if no file or invalid data."""
    try:
        from data.historical_storage import load_index_ohlc
    except Exception:
        return None
    limit = max(_MIN_BARS_FOR_REAL, min(5000, int(limit) if limit is not None else 500))
    for index in _HISTORICAL_INDICES:
        for tf in _HISTORICAL_TIMEFRAMES:
            try:
                df = load_index_ohlc(index, tf, limit=limit)
            except Exception:
                continue
            if df is None or df.empty or len(df) < _MIN_BARS_FOR_REAL:
                continue
            try:
                if "timestamp" in df.columns:
                    df = df.set_index("timestamp")
                df.index = pd.to_datetime(df.index, utc=True, errors="coerce")
                for col in ["open", "high", "low", "close", "volume"]:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors="coerce")
                df = df.dropna(subset=["open", "high", "low", "close"])
                if len(df) >= _MIN_BARS_FOR_REAL:
                    return df
            except (KeyError, TypeError, ValueError):
                continue
    return None


@pytest.fixture
def historical_ohlc_df():
    """Real OHLC from data/historical (fetched by E2E or broker). None if no data saved yet."""
    return _load_historical_ohlc(limit=400)


@pytest.fixture
def real_ohlc_df(dummy_ohlc_df, historical_ohlc_df):
    """Prefer real historical OHLC when available; otherwise use dummy. Use this in tests that should run on fetched data."""
    if historical_ohlc_df is not None and len(historical_ohlc_df) >= _MIN_BARS_FOR_REAL:
        return historical_ohlc_df
    return dummy_ohlc_df


@pytest.fixture
def dummy_ohlc_df():
    """Dummy OHLC DataFrame (1m, 50 candles). Used when no historical data is available."""
    n = 50
    base = datetime(2025, 1, 15, 9, 15, 0)
    idx = pd.date_range(base, periods=n, freq="1min")
    np.random.seed(42)
    close = 24100 + np.cumsum(np.random.randn(n) * 5)
    high = close + np.abs(np.random.randn(n) * 3)
    low = close - np.abs(np.random.randn(n) * 3)
    open_ = np.roll(close, 1)
    open_[0] = 24100
    return pd.DataFrame(
        {
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": np.random.randint(1000, 5000, n),
        },
        index=idx,
    )


@pytest.fixture
def dummy_strikes_and_prices():
    """Dummy strikes and LTP for NIFTY around 24100."""
    return {
        "strikes": [24050.0, 24100.0, 24150.0, 24200.0],
        "prices": [120.0, 85.0, 55.0, 35.0],
        "underlying": 24100.0,
    }


@pytest.fixture
def dummy_levels_csv(tmp_path):
    """Dummy levels CSV path and content (columns: price, type, timeframe)."""
    path = tmp_path / "levels.csv"
    path.write_text(
        "index,timeframe,type,price,stoploss,target\n"
        "NIFTY,5m,ED,24100,24150,24050\n"
        "NIFTY,5m,EU,24150,24100,24200\n"
    )
    return str(path)


@pytest.fixture
def dummy_trades_json(tmp_path):
    """Valid trades_YYYYMMDD.json content (schema_version, exported_at, trades)."""
    path = tmp_path / "trades_20260219.json"
    path.write_text(
        '{"schema_version": "1.0", "exported_at": "2026-02-19T11:01:10", "trades": ['
        '{"trade_id": "test-1", "index": "NIFTY", "symbol": "NIFTY25JAN24100PE", "direction": "put", '
        '"entry_price": 65.0, "exit_price": 45.0, "quantity": 50, '
        '"entry_time": "2026-02-19T11:01:10", "exit_time": "2026-02-19T11:01:10", '
        '"exit_reason": "target", "pnl": 1000.0, "level_type": "ED", "pattern": "Shooting Star", "timeframe": "5m"}]}'
    )
    return path
