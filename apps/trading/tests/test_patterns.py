"""
Tests for candlestick pattern detection (vectorized). Uses dummy OHLC.
Run from apps/trading: pytest tests/test_patterns.py -v
"""
import pytest
import sys
from pathlib import Path

pytest.importorskip("talib")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from patterns.candlestick_patterns import CandlestickPatternDetector


class TestCandlestickPatternDetector:
    @pytest.fixture
    def detector(self):
        return CandlestickPatternDetector()

    def test_detect_patterns_returns_df(self, detector, real_ohlc_df):
        df = detector.detect_patterns(real_ohlc_df)
        assert df is not None
        assert len(df) == len(real_ohlc_df)

    def test_get_latest_pattern(self, detector, real_ohlc_df):
        df = detector.detect_patterns(real_ohlc_df)
        latest = detector.get_latest_pattern(df)
        # May be None if no pattern at last candle
        if latest is not None:
            assert "type" in latest
            assert latest["type"] in ("bullish", "bearish")
            assert "pattern" in latest
