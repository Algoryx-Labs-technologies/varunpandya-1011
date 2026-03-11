"""
Tests for config (.env only; no real secrets).
Run from apps/trading: pytest tests/test_config.py -v
"""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import Config


class TestConfig:
    def test_get_allocation(self):
        n = Config.get_allocation("NIFTY")
        b = Config.get_allocation("BANKNIFTY")
        f = Config.get_allocation("FINNIFTY")
        assert n >= 0 and b >= 0 and f >= 0

    def test_lot_sizes(self):
        lot = getattr(Config, "LOT_SIZES", None)
        if lot:
            assert "NIFTY" in lot
            assert lot["NIFTY"] >= 1

    def test_strike_preference(self):
        pref = getattr(Config, "STRIKE_PREFERENCE", "best_return")
        assert pref in ("best_return", "atm", "itm", "otm", "greeks_delta", "greeks_theta", "greeks_iv")

    def test_key_secret_tuple(self):
        key_secret = getattr(Config, "KEY_SECRET", None)
        assert key_secret is not None
        assert isinstance(key_secret, (tuple, list)) and len(key_secret) >= 5
