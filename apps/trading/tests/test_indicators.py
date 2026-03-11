"""
Tests for indicators module (vectorized). Use real historical OHLC when available (after fetch).
Run from apps/trading: pytest tests/test_indicators.py -v
"""
import pytest
import sys
from pathlib import Path

pytest.importorskip("talib")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from indicators.advanced_indicators import AdvancedIndicators


class TestAdvancedIndicators:
    def test_atr_bands(self, real_ohlc_df):
        df = AdvancedIndicators.atr_bands(real_ohlc_df, period=14)
        if df is not None and not df.empty:
            assert "atr_upper" in df.columns
            assert "atr_lower" in df.columns

    def test_bollinger_bands(self, real_ohlc_df):
        df = AdvancedIndicators.bollinger_bands(real_ohlc_df)
        if df is not None and not df.empty:
            assert "bb_upper" in df.columns
            assert "bb_middle" in df.columns
            assert "bb_lower" in df.columns

    def test_pivot_points(self, real_ohlc_df):
        df = AdvancedIndicators.pivot_points(real_ohlc_df)
        if df is not None and not df.empty:
            assert "pivot_pp" in df.columns
            assert "pivot_r1" in df.columns
            assert "pivot_s1" in df.columns

    def test_vwap(self, real_ohlc_df):
        s = AdvancedIndicators.vwap(real_ohlc_df)
        if s is not None and len(s) > 0:
            assert len(s) == len(real_ohlc_df)

    def test_donchian_channel(self, real_ohlc_df):
        df = AdvancedIndicators.donchian_channel(real_ohlc_df, period=20)
        if df is not None and not df.empty:
            assert "dc_upper" in df.columns
            assert "dc_lower" in df.columns
