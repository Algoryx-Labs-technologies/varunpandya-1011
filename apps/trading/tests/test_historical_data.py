"""
Tests that run on real historical OHLC data (fetched and saved under data/historical/index_ohlc).
Run after fetching data (e.g. python tests/run_e2e_with_logs.py) so that tests use live-fetched data.
If no historical data exists, tests are skipped. Run from apps/trading: pytest tests/test_historical_data.py -v
"""
import pytest
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP_ROOT))


@pytest.fixture
def require_historical_ohlc(historical_ohlc_df):
    """Skip test when no fetched historical OHLC is available."""
    if historical_ohlc_df is None or len(historical_ohlc_df) < 20:
        pytest.skip(
            "No historical OHLC in data/historical/index_ohlc. "
            "Run tests/run_e2e_with_logs.py (or fetch data via broker) first to populate."
        )
    return historical_ohlc_df


class TestIndicatorsOnHistorical:
    """Indicator computation on real fetched OHLC."""

    def test_compute_all_indicators_on_historical(self, require_historical_ohlc):
        from indicators.advanced_indicators import AdvancedIndicators
        df = require_historical_ohlc
        result = AdvancedIndicators.compute_all_indicators(df)
        assert result is not None and not result.empty
        assert len(result) == len(df)
        assert "open" in result.columns and "close" in result.columns

    def test_atr_and_bollinger_on_historical(self, require_historical_ohlc):
        from indicators.advanced_indicators import AdvancedIndicators
        df = require_historical_ohlc
        atr = AdvancedIndicators.atr_bands(df, period=14)
        bb = AdvancedIndicators.bollinger_bands(df, period=20)
        assert atr is not None and (atr.empty or "atr_upper" in atr.columns)
        assert bb is not None and (bb.empty or "bb_upper" in bb.columns)


class TestPatternsOnHistorical:
    """Candlestick pattern detection on real fetched OHLC."""

    def test_detect_patterns_on_historical(self, require_historical_ohlc):
        from patterns.candlestick_patterns import CandlestickPatternDetector
        df = require_historical_ohlc
        detector = CandlestickPatternDetector()
        out = detector.detect_patterns(df)
        assert out is not None and len(out) == len(df)
        assert "bullish_pattern" in out.columns and "bearish_pattern" in out.columns


class TestLevelsOnHistorical:
    """Level computation (auto + optional ML) on real fetched OHLC."""

    def test_compute_auto_levels_on_historical(self, require_historical_ohlc):
        from levels.level_manager import LevelManager
        df = require_historical_ohlc
        lm = LevelManager(use_ai=False)
        levels = lm.compute_auto_levels(df, "5m", num_levels=20)
        assert isinstance(levels, list)
        assert len(levels) >= 1
        for lev in levels:
            assert hasattr(lev, "price") and hasattr(lev, "level_type")

    def test_ml_detect_levels_on_historical(self, require_historical_ohlc):
        from ai.ml_level_detector import MLLevelDetector
        df = require_historical_ohlc
        ml = MLLevelDetector(n_clusters=5)
        result = ml.detect_levels(df)
        assert isinstance(result, list)


class TestStrategyOnHistorical:
    """Signal generation on real fetched OHLC and levels."""

    def test_generate_signals_on_historical(self, require_historical_ohlc):
        from levels.level_manager import LevelManager
        from strategy.trading_strategy import TradingStrategy
        df = require_historical_ohlc
        current_price = float(df["close"].iloc[-1])
        lm = LevelManager(use_ai=False)
        lm.compute_auto_levels(df, "5m", num_levels=15)
        strategy = TradingStrategy(lm)
        signals = strategy.generate_signals(
            index="NIFTY",
            df=df,
            timeframe="5m",
            current_price=current_price,
        )
        assert isinstance(signals, list)
