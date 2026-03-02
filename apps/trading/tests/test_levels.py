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
