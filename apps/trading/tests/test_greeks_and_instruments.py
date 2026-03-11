"""
Tests for option Greeks, instrument token resolution, expiry parsing, and Greeks-based strike selection.
Run from apps/trading: pytest tests/test_greeks_and_instruments.py -v
"""
import pytest
import sys
from pathlib import Path
import pandas as pd
from unittest.mock import patch, MagicMock

APP_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP_ROOT))

# Mock SmartApi so tests run without SDK installed (broker/angel_one imports SmartConnect)
if "SmartApi" not in sys.modules:
    _mock_smart = MagicMock()
    sys.modules["SmartApi"] = _mock_smart
    sys.modules["SmartApi"].SmartConnect = MagicMock()


class TestExpiryFromNseSymbol:
    """Test _expiry_from_nse_symbol used for Greeks API."""

    def test_expiry_nifty(self):
        from data.data_fetcher import _expiry_from_nse_symbol
        assert _expiry_from_nse_symbol("NIFTY08FEB2424500CE", "NIFTY") == "08FEB2024"
        assert _expiry_from_nse_symbol("NIFTY24MAR24100PE", "NIFTY") == "24MAR2024"

    def test_expiry_banknifty(self):
        from data.data_fetcher import _expiry_from_nse_symbol
        # BANKNIFTY prefix length 10, then DDMMMYY (7)
        s = "BANKNIFTY13FEB2448000CE"
        assert _expiry_from_nse_symbol(s, "BANKNIFTY") == "13FEB2024"

    def test_expiry_invalid(self):
        from data.data_fetcher import _expiry_from_nse_symbol
        assert _expiry_from_nse_symbol("", "NIFTY") is None
        assert _expiry_from_nse_symbol("NIFTY08FE", "NIFTY") is None  # too short (need DDMMMYY = 7 chars after prefix)
        assert _expiry_from_nse_symbol("INVALID08FEB2424500CE", "NIFTY") is None
        assert _expiry_from_nse_symbol(None, "NIFTY") is None


class TestInstruments:
    """Test broker/instruments (NFO symbol -> token)."""

    def test_get_option_token_empty_symbol(self):
        from broker.instruments import get_option_token
        assert get_option_token("") is None
        assert get_option_token(None) is None

    def test_refresh_instruments_mock(self):
        """Mock Scrip Master response; refresh should populate cache."""
        from broker import instruments as inst
        mock_data = [
            {"exch_seg": "NFO", "symbol": "NIFTY08FEB2424500CE", "token": "12345", "instrumenttype": "CE", "name": "NIFTY"},
            {"exch_seg": "NSE", "symbol": "RELIANCE-EQ", "token": "9999", "instrumenttype": "EQ", "name": "Reliance"},
        ]
        with patch.object(inst, "_fetch_master", return_value=mock_data):
            ok = inst.refresh_instruments(force=True)
        assert ok is True
        assert inst.get_option_token("NIFTY08FEB2424500CE") == "12345"
        assert inst.get_option_token("RELIANCE-EQ") is None  # NSE not NFO

    def test_get_nfo_tokens_for_symbols(self):
        from broker import instruments as inst
        with patch.object(inst, "get_option_token", side_effect=lambda s, refresh_if_missing=False: {"SYM1": "1", "SYM2": "2"}.get(s)):
            tokens = inst.get_nfo_tokens_for_symbols(["SYM1", "SYM2"], max_tokens=10)
        assert tokens == ["1", "2"]
        with patch.object(inst, "get_option_token", side_effect=lambda s, refresh_if_missing=False: {"SYM1": "1", "SYM2": "2"}.get(s)):
            tokens_limited = inst.get_nfo_tokens_for_symbols(["SYM1", "SYM2"], max_tokens=1)
        assert len(tokens_limited) == 1


class TestBrokerOptionGreeks:
    """Test broker get_option_greeks (mocked)."""

    def test_get_option_greeks_not_connected(self):
        from broker.angel_one import AngelOneBroker
        b = AngelOneBroker()
        b.obj = None
        b.jwt_token = None
        assert b.get_option_greeks("NIFTY", "08FEB2024") is None

    def test_get_option_greeks_empty_name(self):
        from broker.angel_one import AngelOneBroker
        b = AngelOneBroker()
        b.obj = MagicMock()
        b.jwt_token = "x"
        assert b.get_option_greeks("", "08FEB2024") is None
        assert b.get_option_greeks("NIFTY", "") is None


class TestEnrichOptionChainGreeks:
    """Test _enrich_option_chain_greeks (mocked broker)."""

    def test_enrich_no_broker(self):
        from data.data_fetcher import DataFetcher
        from broker.angel_one import AngelOneBroker
        broker = AngelOneBroker()
        broker.obj = None
        fetcher = DataFetcher(broker)
        chain = {
            "index": "NIFTY",
            "calls": pd.DataFrame({"strike": [24100], "ltp": [85], "symbol": ["NIFTY08FEB2424100CE"]}),
            "puts": pd.DataFrame({"strike": [24100], "ltp": [90], "symbol": ["NIFTY08FEB2424100PE"]}),
        }
        fetcher._enrich_option_chain_greeks(chain)
        assert "delta" not in chain["calls"].columns or chain["calls"]["delta"].isna().all()

    def test_enrich_with_mock_greeks(self):
        from data.data_fetcher import DataFetcher
        from broker.angel_one import AngelOneBroker
        broker = AngelOneBroker()
        broker.obj = MagicMock()
        broker.get_option_greeks = MagicMock(return_value=[
            {"strikePrice": "24100", "optionType": "CE", "delta": "0.48", "gamma": "0.002", "theta": "-4.0", "vega": "2.0", "impliedVolatility": "15.0"},
            {"strikePrice": "24100", "optionType": "PE", "delta": "-0.52", "gamma": "0.002", "theta": "-3.8", "vega": "2.0", "impliedVolatility": "16.0"},
        ])
        fetcher = DataFetcher(broker)
        chain = {
            "index": "NIFTY",
            "calls": pd.DataFrame({"strike": [24100.0], "ltp": [85.0], "symbol": ["NIFTY08FEB2424100CE"]}),
            "puts": pd.DataFrame({"strike": [24100.0], "ltp": [90.0], "symbol": ["NIFTY08FEB2424100PE"]}),
        }
        fetcher._enrich_option_chain_greeks(chain)
        assert "delta" in chain["calls"].columns
        assert chain["calls"].iloc[0]["delta"] == pytest.approx(0.48)
        assert chain["calls"].iloc[0]["iv"] == pytest.approx(15.0)
        assert "delta" in chain["puts"].columns
        assert chain["puts"].iloc[0]["delta"] == pytest.approx(-0.52)


class TestSelectStrikeWithGreeks:
    """Test Greeks-based strike selection."""

    @pytest.fixture
    def chain_with_greeks(self):
        return {
            "underlying_value": 24100.0,
            "calls": pd.DataFrame({
                "strike": [24050.0, 24100.0, 24150.0],
                "ltp": [120.0, 85.0, 55.0],
                "symbol": ["NIFTY08FEB2424050CE", "NIFTY08FEB2424100CE", "NIFTY08FEB2424150CE"],
                "delta": [0.58, 0.48, 0.38],
                "theta": [-5.0, -4.0, -3.0],
                "iv": [18.0, 15.0, 17.0],
            }),
            "puts": pd.DataFrame({
                "strike": [24050.0, 24100.0, 24150.0],
                "ltp": [80.0, 95.0, 110.0],
                "symbol": ["NIFTY08FEB2424050PE", "NIFTY08FEB2424100PE", "NIFTY08FEB2424150PE"],
                "delta": [-0.42, -0.52, -0.62],
                "theta": [-4.0, -4.2, -4.5],
                "iv": [17.0, 16.0, 18.0],
            }),
        }

    def test_select_strike_greeks_delta(self, chain_with_greeks):
        from money.position_sizing import PositionSizer, GREEKS_PREFERENCES
        sizer = PositionSizer()
        sizer.allocations["NIFTY"] = 20000.0
        result = sizer.select_strike_with_greeks(chain_with_greeks, "NIFTY", "call", preference="greeks_delta")
        assert result is not None
        strike, qty, capital_used, moneyness, symbol = result
        assert strike in [24050.0, 24100.0, 24150.0]
        assert qty >= 50
        assert "CE" in symbol or symbol == ""

    def test_select_strike_greeks_theta(self, chain_with_greeks):
        from money.position_sizing import PositionSizer
        sizer = PositionSizer()
        sizer.allocations["NIFTY"] = 20000.0
        result = sizer.select_strike_with_greeks(chain_with_greeks, "NIFTY", "call", preference="greeks_theta")
        assert result is not None
        strike, qty, capital_used, moneyness, symbol = result
        assert qty >= 50

    def test_select_strike_greeks_iv(self, chain_with_greeks):
        from money.position_sizing import PositionSizer
        sizer = PositionSizer()
        sizer.allocations["NIFTY"] = 20000.0
        result = sizer.select_strike_with_greeks(chain_with_greeks, "NIFTY", "put", preference="greeks_iv")
        assert result is not None

    def test_select_strike_with_greeks_no_delta_column(self):
        from money.position_sizing import PositionSizer
        sizer = PositionSizer()
        sizer.allocations["NIFTY"] = 20000.0
        chain = {
            "underlying_value": 24100.0,
            "calls": pd.DataFrame({"strike": [24100.0], "ltp": [85.0]}),  # no delta
        }
        assert sizer.select_strike_with_greeks(chain, "NIFTY", "call", preference="greeks_delta") is None

    def test_select_strike_with_greeks_theta_missing_column(self):
        from money.position_sizing import PositionSizer
        sizer = PositionSizer()
        sizer.allocations["NIFTY"] = 20000.0
        chain = {
            "underlying_value": 24100.0,
            "calls": pd.DataFrame({
                "strike": [24100.0], "ltp": [85.0], "delta": [0.48],
                # no theta
            }),
        }
        assert sizer.select_strike_with_greeks(chain, "NIFTY", "call", preference="greeks_theta") is None

    def test_select_strike_from_chain_falls_back_when_greeks_preference_but_no_delta(self):
        from money.position_sizing import PositionSizer
        sizer = PositionSizer()
        sizer.allocations["NIFTY"] = 20000.0
        chain = {
            "underlying_value": 24100.0,
            "calls": pd.DataFrame({
                "strike": [24050.0, 24100.0, 24150.0],
                "ltp": [120.0, 85.0, 55.0],
                "symbol": ["A", "B", "C"],
            }),
            "puts": pd.DataFrame({
                "strike": [24050.0, 24100.0, 24150.0],
                "ltp": [80.0, 95.0, 110.0],
                "symbol": ["A", "B", "C"],
            }),
        }
        # greeks_delta but no delta column -> should fall back to best_return
        result = sizer.select_strike_from_option_chain(chain, "NIFTY", "call", preference="greeks_delta")
        assert result is not None
        strike, qty, capital_used, moneyness, symbol = result
        assert strike in [24050.0, 24100.0, 24150.0]
        assert qty >= 50
