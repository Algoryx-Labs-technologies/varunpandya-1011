"""
Option chain: edge cases, fallback, validation, and real-time handling.
Run from apps/trading: pytest tests/test_option_chain.py -v
"""
import pytest
import sys
from pathlib import Path
import pandas as pd
import json
import os

APP_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP_ROOT))


class TestOptionChainValidation:
    """Validate option chain structure and columns."""

    def test_option_chain_requires_strike_ltp(self):
        from money.position_sizing import PositionSizer
        sizer = PositionSizer()
        # No underlying
        assert sizer.select_strike_from_option_chain(
            {"underlying_value": 0, "calls": pd.DataFrame({"strike": [24000], "ltp": [100]})},
            "NIFTY", "call"
        ) is None
        # Empty chain
        assert sizer.select_strike_from_option_chain(None, "NIFTY", "call") is None
        assert sizer.select_strike_from_option_chain({}, "NIFTY", "call") is None
        # Valid minimal chain
        chain = {
            "underlying_value": 24100,
            "calls": pd.DataFrame({"strike": [24050, 24100, 24150], "ltp": [120, 85, 55], "symbol": ["A", "B", "C"]}),
            "puts": pd.DataFrame({"strike": [24050, 24100, 24150], "ltp": [80, 95, 110], "symbol": ["A", "B", "C"]}),
        }
        result = sizer.select_strike_from_option_chain(chain, "NIFTY", "call")
        assert result is not None
        strike, qty, capital, moneyness, symbol = result
        assert strike > 0 and qty >= 0

    def test_option_chain_with_nan_strikes_dropped(self):
        """data_fetcher drops rows with NaN/zero strike; position_sizer should still work."""
        from money.position_sizing import PositionSizer
        df = pd.DataFrame({
            "strike": [24000.0, 24100.0],
            "ltp": [100.0, 80.0],
            "symbol": ["CE1", "CE2"],
        })
        chain = {"underlying_value": 24050, "calls": df, "puts": df.copy()}
        result = PositionSizer().select_strike_from_option_chain(chain, "NIFTY", "call")
        assert result is not None


class TestOptionChainFallback:
    """Fallback from historical when NSE is empty or fails."""

    def test_load_latest_option_snapshot_missing_dir(self):
        from data.historical_storage import load_latest_option_snapshot
        assert load_latest_option_snapshot("INVALID_IDX") is None

    def test_load_latest_option_snapshot_valid(self, tmp_path):
        """When historical dir has a snapshot file, load returns valid chain."""
        from data import historical_storage
        import importlib
        # Temporarily point OPTION_CHAIN_DIR to tmp_path
        orig = historical_storage.OPTION_CHAIN_DIR
        try:
            historical_storage.OPTION_CHAIN_DIR = str(tmp_path)
            (tmp_path / "NIFTY").mkdir(parents=True, exist_ok=True)
            snap = [{
                "timestamp": "2026-03-11T10:00:00",
                "index": "NIFTY",
                "underlying_value": 24100,
                "calls": [{"strike": 24100, "ltp": 85, "oi": 0, "volume": 0, "bid": 84, "ask": 86, "symbol": "NIFTY24MAR24100CE"}],
                "puts": [{"strike": 24100, "ltp": 90, "oi": 0, "volume": 0, "bid": 89, "ask": 91, "symbol": "NIFTY24MAR24100PE"}],
            }]
            (tmp_path / "NIFTY" / "snapshots_2026-03-11.json").write_text(json.dumps(snap), encoding="utf-8")
            out = historical_storage.load_latest_option_snapshot("NIFTY")
            assert out is not None
            assert out["index"] == "NIFTY"
            assert out["underlying_value"] == 24100
            assert len(out["calls"]) == 1
            assert len(out["puts"]) == 1
        finally:
            historical_storage.OPTION_CHAIN_DIR = orig


class TestLogCleanup:
    """Log cleanup utility."""

    def test_cleanup_old_logs_removes_e2e_and_system_test(self, tmp_path):
        from utils.log_cleanup import cleanup_old_logs
        (tmp_path / "e2e_20260301_120000.log").write_text("old")
        (tmp_path / "system_test_20260301_120001.log").write_text("old")
        (tmp_path / "trading.2026-03-01_02-00-00_1.log").write_text("rotated")
        n = cleanup_old_logs(tmp_path, keep_recent=True, keep_trading_log=False)
        assert n >= 3
        assert not (tmp_path / "e2e_20260301_120000.log").exists()
        assert not (tmp_path / "system_test_20260301_120001.log").exists()

    def test_cleanup_keeps_trading_log_when_requested(self, tmp_path):
        from utils.log_cleanup import cleanup_old_logs
        (tmp_path / "trading.log").write_text("current")
        (tmp_path / "e2e_20260301_120000.log").write_text("old")
        n = cleanup_old_logs(tmp_path, keep_recent=True, keep_trading_log=True)
        assert (tmp_path / "trading.log").exists()
        assert not (tmp_path / "e2e_20260301_120000.log").exists()
