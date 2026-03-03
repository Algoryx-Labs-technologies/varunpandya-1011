"""
Tests for risk (autolock, kill switch). Uses dummy broker.
Run from apps/trading: pytest tests/test_risk.py -v
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import MagicMock

pytest.importorskip("SmartApi")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from risk.risk_manager import RiskManager


class TestRiskManager:
    @pytest.fixture
    def mock_broker(self):
        b = MagicMock()
        b.get_all_open_orders.return_value = []
        b.get_position.return_value = []
        return b

    def test_can_trade_initially(self, mock_broker):
        rm = RiskManager(mock_broker)
        can, reason = rm.can_trade()
        assert can is True

    def test_auto_lock_after_two_trades(self, mock_broker):
        rm = RiskManager(mock_broker)
        rm.max_trades = 2
        rm.record_trade()
        rm.record_trade()
        can, reason = rm.can_trade()
        assert can is False
        assert "lock" in reason.lower() or "max" in reason.lower()

    def test_unlock_trading(self, mock_broker):
        rm = RiskManager(mock_broker)
        rm.auto_locked = True
        rm.unlock_trading()
        assert rm.auto_locked is False
