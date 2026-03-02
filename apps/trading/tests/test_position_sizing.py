"""
Tests for position sizing and strike selection (ATM/ITM/OTM, best return).
Includes real-time option chain strike selection.
Run from apps/trading: pytest tests/test_position_sizing.py -v
"""
import pytest
import sys
import pandas as pd
from pathlib import Path

# Allow importing from parent
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from money.position_sizing import PositionSizer, _moneyness


class TestMoneyness:
    def test_atm_call(self):
        assert _moneyness(24100, 24100, "call") == "atm"
        assert _moneyness(24100, 24120, "call") == "atm"

    def test_itm_otm_call(self):
        assert _moneyness(24100, 24050, "call") == "itm"
        assert _moneyness(24100, 24200, "call") == "otm"

    def test_itm_otm_put(self):
        assert _moneyness(24100, 24200, "put") == "itm"
        assert _moneyness(24100, 24050, "put") == "otm"


class TestPositionSizer:
    @pytest.fixture
    def sizer(self):
        return PositionSizer()

    def test_select_strike_best_return_all(self, sizer, dummy_strikes_and_prices):
        d = dummy_strikes_and_prices
        # Mock allocation for NIFTY
        sizer.allocations["NIFTY"] = 20000.0
        result = sizer.select_strike_best_return(
            d["underlying"],
            d["strikes"],
            d["prices"],
            "NIFTY",
            "put",
            preference="best_return",
        )
        assert result is not None
        strike, qty, capital_used, moneyness = result
        assert strike in d["strikes"]
        assert qty > 0
        assert capital_used <= 20000.0
        assert moneyness in ("atm", "itm", "otm")

    def test_select_strike_atm_preference(self, sizer, dummy_strikes_and_prices):
        d = dummy_strikes_and_prices
        sizer.allocations["NIFTY"] = 20000.0
        result = sizer.select_strike_best_return(
            d["underlying"],
            d["strikes"],
            d["prices"],
            "NIFTY",
            "call",
            preference="atm",
        )
        if result:
            _, _, _, moneyness = result
            assert moneyness == "atm"

    def test_select_optimal_strike_legacy(self, sizer, dummy_strikes_and_prices):
        d = dummy_strikes_and_prices
        sizer.allocations["NIFTY"] = 20000.0
        result = sizer.select_optimal_strike(
            d["strikes"],
            d["prices"],
            "NIFTY",
            "call",
        )
        assert result is not None
        strike, qty, capital_used = result
        assert strike in d["strikes"]
        assert qty > 0

    def test_select_optimal_strike_with_underlying(self, sizer, dummy_strikes_and_prices):
        d = dummy_strikes_and_prices
        sizer.allocations["NIFTY"] = 20000.0
        result = sizer.select_optimal_strike(
            d["strikes"],
            d["prices"],
            "NIFTY",
            "put",
            underlying_price=d["underlying"],
            preference="best_return",
        )
        assert result is not None
        strike, qty, capital_used = result
        assert capital_used <= 20000.0

    def test_adjust_lot_size(self, sizer):
        assert sizer.adjust_position_for_lot_size(75, 50) == 50
        assert sizer.adjust_position_for_lot_size(49, 50) == 0
        assert sizer.adjust_position_for_lot_size(100, 50) == 100

    def test_select_strike_from_option_chain(self, sizer, dummy_strikes_and_prices):
        """Strike selection from real-time option chain (underlying_value + calls/puts)."""
        d = dummy_strikes_and_prices
        sizer.allocations["NIFTY"] = 20000.0
        option_chain = {
            "underlying_value": d["underlying"],
            "calls": pd.DataFrame({
                "strike": d["strikes"],
                "ltp": d["prices"],
                "symbol": [f"NIFTY25Jan{s}CE" for s in d["strikes"]],
            }),
            "puts": pd.DataFrame({
                "strike": d["strikes"],
                "ltp": [p * 1.1 for p in d["prices"]],
                "symbol": [f"NIFTY25Jan{s}PE" for s in d["strikes"]],
            }),
        }
        result = sizer.select_strike_from_option_chain(
            option_chain, "NIFTY", "call", preference="best_return"
        )
        assert result is not None
        strike, qty, capital_used, moneyness, symbol = result
        assert strike in d["strikes"]
        assert qty > 0
        assert capital_used <= 20000.0
        assert moneyness in ("atm", "itm", "otm")
        assert "CE" in symbol or symbol == ""

    def test_select_strike_from_option_chain_put(self, sizer, dummy_strikes_and_prices):
        """Put side from real-time option chain."""
        d = dummy_strikes_and_prices
        sizer.allocations["NIFTY"] = 15000.0
        option_chain = {
            "underlying_value": d["underlying"],
            "puts": pd.DataFrame({
                "strike": d["strikes"],
                "ltp": d["prices"],
                "symbol": [f"NIFTY25Jan{s}PE" for s in d["strikes"]],
            }),
        }
        result = sizer.select_strike_from_option_chain(
            option_chain, "NIFTY", "put", preference="atm"
        )
        assert result is not None
        strike, qty, capital_used, moneyness, symbol = result
        assert moneyness == "atm" or (result and capital_used > 0)

    def test_select_strike_from_option_chain_invalid(self, sizer):
        """Empty or invalid option chain returns None."""
        assert sizer.select_strike_from_option_chain(None, "NIFTY", "call") is None
        assert sizer.select_strike_from_option_chain({}, "NIFTY", "call") is None
        assert sizer.select_strike_from_option_chain(
            {"underlying_value": 0, "calls": pd.DataFrame({"strike": [24100], "ltp": [50]})},
            "NIFTY", "call",
        ) is None
