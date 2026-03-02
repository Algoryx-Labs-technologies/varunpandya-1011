"""
Tests for trade journal (in-memory + export). Uses dummy trade.
Run from apps/trading: pytest tests/test_journal.py -v
"""
import pytest
import sys
import tempfile
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from journal.trade_journal import TradeJournal, Trade


class TestTradeJournal:
    @pytest.fixture
    def journal(self):
        j = TradeJournal()
        j.trades.clear()  # isolate tests from persistent journal file
        return j

    @pytest.fixture
    def sample_trade(self):
        return Trade(
            trade_id="test-1",
            index="NIFTY",
            symbol="NIFTY25JAN24100PE",
            direction="put",
            entry_price=65.0,
            exit_price=45.0,
            quantity=50,
            entry_time=datetime.now(),
            exit_time=datetime.now(),
            exit_reason="target",
            pnl=1000.0,
            level_type="ED",
            pattern="Shooting Star",
        )

    def test_add_trade(self, journal, sample_trade):
        journal.add_trade(sample_trade)
        assert len(journal.trades) >= 1

    def test_get_statistics_empty(self, journal):
        stats = journal.get_statistics()
        assert stats["total_trades"] == 0
        assert stats["total_pnl"] == 0

    def test_get_statistics_with_trade(self, journal, sample_trade):
        journal.add_trade(sample_trade)
        stats = journal.get_statistics()
        assert stats["total_trades"] >= 1
        assert stats["total_pnl"] == 1000.0

    def test_export_csv(self, journal, sample_trade):
        journal.add_trade(sample_trade)
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
            path = f.name
        try:
            journal.export_to_csv(path)
            assert Path(path).exists()
        finally:
            Path(path).unlink(missing_ok=True)
