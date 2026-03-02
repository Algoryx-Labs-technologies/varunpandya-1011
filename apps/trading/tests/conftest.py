"""
Pytest fixtures and dummy data for trading tests.
"""
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


@pytest.fixture
def dummy_ohlc_df():
    """Dummy OHLC DataFrame (1m, 50 candles)."""
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
