"""
Tests for AI module: MLLevelDetector and MissedTradeDetector.
Run from apps/trading: pytest tests/test_ml_and_missed_trade.py -v
"""
import pytest
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class TestMLLevelDetector:
    def test_detect_swing_points_empty_or_tiny(self):
        from ai.ml_level_detector import MLLevelDetector
        import pandas as pd
        ml = MLLevelDetector(n_clusters=5)
        high, low = ml.detect_swing_points(None, window=5)
        assert high == [] and low == []
        df = pd.DataFrame({"high": [1.0], "low": [0.5]})
        high, low = ml.detect_swing_points(df, window=5)
        assert high == [] and low == []

    def test_detect_swing_points_returns_lists(self, real_ohlc_df):
        from ai.ml_level_detector import MLLevelDetector
        ml = MLLevelDetector(n_clusters=5)
        high, low = ml.detect_swing_points(real_ohlc_df, window=5)
        assert isinstance(high, list) and isinstance(low, list)
        assert all(isinstance(x, float) for x in high)
        assert all(isinstance(x, float) for x in low)

    def test_kmeans_clustering(self):
        from ai.ml_level_detector import MLLevelDetector
        ml = MLLevelDetector(n_clusters=3)
        prices = [100.0, 101.0, 102.0, 200.0, 201.0, 202.0, 300.0, 301.0]
        centers = ml.kmeans_clustering(prices, n_clusters=3)
        assert isinstance(centers, list)
        assert len(centers) == 3
        assert centers == sorted(centers)

    def test_detect_levels_returns_list_of_tuples(self, real_ohlc_df):
        from ai.ml_level_detector import MLLevelDetector
        ml = MLLevelDetector(n_clusters=5)
        result = ml.detect_levels(real_ohlc_df)
        assert isinstance(result, list)
        for item in result[:5]:
            assert isinstance(item, tuple) and len(item) == 2
            price, conf = item
            assert isinstance(price, (int, float)) and isinstance(conf, (int, float))

    def test_detect_levels_empty_or_tiny_returns_empty(self):
        from ai.ml_level_detector import MLLevelDetector
        import pandas as pd
        ml = MLLevelDetector()
        assert ml.detect_levels(None) == []
        small = pd.DataFrame({"high": [1.0] * 3, "low": [0.5] * 3, "close": [0.8] * 3})
        assert ml.detect_levels(small) == []


class TestMissedTradeDetector:
    @pytest.fixture
    def journal(self):
        from journal.trade_journal import TradeJournal
        j = TradeJournal()
        j.trades.clear()
        return j

    def test_detect_missed_trades_empty_signals(self, journal):
        from ai.missed_trade_detector import MissedTradeDetector
        det = MissedTradeDetector(journal)
        out = det.detect_missed_trades([])
        assert out == []

    def test_detect_missed_trades_marks_unexecuted(self, journal):
        from ai.missed_trade_detector import MissedTradeDetector
        from strategy.trading_strategy import TradeSignal
        det = MissedTradeDetector(journal)
        ts = datetime(2026, 2, 19, 11, 0, 0)
        signal = TradeSignal(
            index="NIFTY", direction="call", entry_price=100.0, target_price=102.0,
            stop_loss=99.0, level_price=100.0, level_type="ED", pattern="", timeframe="5m", timestamp=ts,
        )
        missed = det.detect_missed_trades([signal], executed_trades=[])
        assert len(missed) == 1
        assert missed[0]["index"] == "NIFTY" and missed[0]["direction"] == "call"
        assert "potential_pnl" in missed[0] and "reason" in missed[0]

    def test_get_missed_trades_summary_empty(self, journal):
        from ai.missed_trade_detector import MissedTradeDetector
        det = MissedTradeDetector(journal)
        summary = det.get_missed_trades_summary()
        assert summary["total_missed"] == 0
        assert summary["potential_pnl"] == 0
        assert summary["top_missed"] == []

    def test_export_missed_trades(self, journal, tmp_path):
        from ai.missed_trade_detector import MissedTradeDetector
        from strategy.trading_strategy import TradeSignal
        det = MissedTradeDetector(journal)
        ts = datetime(2026, 2, 19, 11, 0, 0)
        signal = TradeSignal(
            index="NIFTY", direction="put", entry_price=100.0, target_price=98.0,
            stop_loss=101.0, level_price=100.0, level_type="ED", pattern="", timeframe="5m", timestamp=ts,
        )
        det.detect_missed_trades([signal], executed_trades=[])
        path = tmp_path / "missed.json"
        ok = det.export_missed_trades(str(path))
        assert ok is True
        assert path.exists()
        import json
        data = json.loads(path.read_text(encoding="utf-8"))
        assert "missed_trades" in data and "summary" in data
        assert data["summary"]["total_missed"] == 1
