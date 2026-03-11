"""
Tests for levels (manual CSV + level manager). Uses dummy CSV.
Run from apps/trading: pytest tests/test_levels.py -v
"""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from levels.level_manager import LevelManager, Level


class TestLevelManager:
    def test_add_manual_level(self):
        lm = LevelManager()
        lm.add_manual_level(24100.0, "ED", "5m")
        assert "5m" in lm.manual_levels
        assert len(lm.manual_levels["5m"]) == 1
        assert lm.manual_levels["5m"][0].price == 24100.0
        assert lm.manual_levels["5m"][0].level_type == "ED"

    def test_load_manual_levels_from_csv(self, dummy_levels_csv):
        lm = LevelManager()
        ok = lm.load_manual_levels_from_csv(dummy_levels_csv)
        assert ok is True
        levels_5m = lm.get_levels("5m")
        assert len(levels_5m) >= 2

    def test_get_levels_by_type(self):
        lm = LevelManager()
        lm.add_manual_level(24100.0, "ED", "5m")
        lm.add_manual_level(24150.0, "EU", "5m")
        ed_levels = lm.get_levels_by_type("5m", "ED")
        assert len(ed_levels) == 1
        assert ed_levels[0].price == 24100.0

    def test_compute_auto_levels_returns_list(self, real_ohlc_df):
        """LevelManager.compute_auto_levels returns a list of Level (manual + pivot/KMeans/ATR/BB/SAR + optional ML). Uses real historical OHLC when available."""
        lm = LevelManager(use_ai=False)
        levels = lm.compute_auto_levels(real_ohlc_df, "5m", num_levels=20)
        assert isinstance(levels, list)
        assert len(levels) >= 1
        for lev in levels:
            assert hasattr(lev, "price") and hasattr(lev, "level_type") and hasattr(lev, "timeframe")

    def test_get_levels_merges_manual_and_auto(self, real_ohlc_df):
        """get_levels(timeframe) returns manual + auto levels combined and sorted by price. Uses real historical OHLC when available."""
        lm = LevelManager(use_ai=False)
        lm.add_manual_level(24100.0, "ED", "5m")
        lm.compute_auto_levels(real_ohlc_df, "5m", num_levels=5)
        all_levels = lm.get_levels("5m")
        assert len(all_levels) >= 2
        prices = [l.price for l in all_levels]
        assert prices == sorted(prices)
        # Manual ED @ 24100 must be present among levels
        assert any(l.price == 24100.0 and l.level_type == "ED" for l in all_levels)

    def test_add_manual_level_invalid_rejected(self):
        """Invalid price or level_type is rejected."""
        lm = LevelManager()
        assert lm.add_manual_level(0, "ED", "5m") is False
        assert lm.add_manual_level(-100, "ED", "5m") is False
        assert lm.add_manual_level(24100, "INVALID", "5m") is False
        assert lm.add_manual_level(24100, "ED", "5m") is True
