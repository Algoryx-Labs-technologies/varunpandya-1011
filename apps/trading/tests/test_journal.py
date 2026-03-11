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

    def test_saved_json_has_schema_version_and_trades(self, journal, sample_trade, tmp_path):
        """Saved trades_*.json must have schema_version, exported_at, and trades list."""
        journal.journal_file = tmp_path / "trades_20260219.json"
        journal.add_trade(sample_trade)
        assert journal.journal_file.exists()
        import json
        with open(journal.journal_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data.get("schema_version") == "1.0"
        assert "exported_at" in data
        assert isinstance(data.get("trades"), list)
        assert len(data["trades"]) >= 1
        t = data["trades"][0]
        assert t.get("trade_id") == sample_trade.trade_id
        assert t.get("index") == "NIFTY" and t.get("level_type") == "ED"

    def test_load_trades_from_json_file(self, dummy_trades_json, tmp_path):
        """Journal loads from existing trades_YYYYMMDD.json (schema_version + trades)."""
        from journal.trade_journal import TradeJournal
        j = TradeJournal()
        j.journal_file = dummy_trades_json
        j.load_trades()
        assert len(j.trades) == 1
        t = j.trades[0]
        assert t.index == "NIFTY"
        assert t.symbol == "NIFTY25JAN24100PE"
        assert t.direction == "put"
        assert t.pnl == 1000.0
        assert t.level_type == "ED"
        assert t.pattern == "Shooting Star"

    def test_add_trade_then_save_and_load_roundtrip(self, sample_trade, tmp_path):
        """Add trade -> save -> new journal load -> same trade present."""
        from journal.trade_journal import TradeJournal
        path = tmp_path / "trades_20260219.json"
        j1 = TradeJournal()
        j1.journal_file = path
        j1.trades.clear()
        j1.add_trade(sample_trade)
        assert path.exists()
        j2 = TradeJournal()
        j2.journal_file = path
        j2.load_trades()
        assert len(j2.trades) == 1
        assert j2.trades[0].trade_id == sample_trade.trade_id
        assert j2.trades[0].pnl == sample_trade.pnl
