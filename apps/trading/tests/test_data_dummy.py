"""
Tests for data layer with dummy/mock (no live API). Uses small DataFrame.
Run from apps/trading: pytest tests/test_data_dummy.py -v
"""
import pytest
import pandas as pd
import numpy as np
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class TestDataFormats:
    """Validate expected OHLC and option chain formats."""

    def test_ohlc_columns(self, dummy_ohlc_df):
        required = ["open", "high", "low", "close", "volume"]
        for c in required:
            assert c in dummy_ohlc_df.columns

    def test_ohlc_index_datetime(self, dummy_ohlc_df):
        assert hasattr(dummy_ohlc_df.index, "to_pydatetime") or isinstance(
            dummy_ohlc_df.index, pd.DatetimeIndex
        )

    def test_option_chain_like_dict(self):
        # Dummy option chain structure expected by strike selection
        chain = {
            "underlying_value": 24100.0,
            "calls": pd.DataFrame({"strike": [24100, 24150], "ltp": [85, 55]}),
            "puts": pd.DataFrame({"strike": [24100, 24050], "ltp": [80, 120]}),
        }
        assert chain["underlying_value"] == 24100.0
        assert len(chain["calls"]) >= 1
        assert "strike" in chain["calls"].columns and "ltp" in chain["calls"].columns
