"""
Smoke tests for each folder in the Python trading system.
Ensures every module can be imported and key entry points exist.
Run from apps/trading: pytest tests/test_all_folders.py -v
"""
import pytest
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP_ROOT))


def test_config_folder():
    from config import Config
    assert hasattr(Config, "PAPER_TRADING")
    assert hasattr(Config, "INDEX_SYMBOLS")
    assert hasattr(Config, "TIMEFRAMES")
    assert hasattr(Config, "get_allocation")


def test_broker_folder():
    from broker.angel_one import AngelOneBroker
    b = AngelOneBroker()
    assert hasattr(b, "connect")
    assert hasattr(b, "get_ltp")
    assert hasattr(b, "get_historical_data")
    assert hasattr(b, "get_option_greeks")


def test_broker_instruments():
    from broker.instruments import get_option_token, refresh_instruments, get_nfo_tokens_for_symbols
    assert callable(get_option_token)
    assert callable(refresh_instruments)
    assert callable(get_nfo_tokens_for_symbols)
    assert get_option_token("") is None


def test_broker_feed_websocket():
    from broker.feed_websocket import get_ltp_from_feed, AngelOneFeed, INDEX_TOKENS
    assert get_ltp_from_feed("99926000") is None  # no feed running
    assert "99926000" in INDEX_TOKENS


def test_data_fetcher():
    from data.data_fetcher import DataFetcher, VALID_INDICES, VALID_TIMEFRAMES
    from broker.angel_one import AngelOneBroker
    f = DataFetcher(AngelOneBroker())
    assert f.get_index_token("NIFTY") == "99926000"
    assert f.get_index_tradingsymbol("NIFTY") == "Nifty 50"
    assert "NIFTY" in VALID_INDICES
    assert "1m" in VALID_TIMEFRAMES


def test_data_historical_storage():
    from data.historical_storage import save_index_ohlc, load_index_ohlc, load_latest_option_snapshot
    assert callable(save_index_ohlc)
    assert callable(load_index_ohlc)
    assert callable(load_latest_option_snapshot)


def test_strategy_folder():
    from strategy.trading_strategy import TradingStrategy, TradeSignal
    from levels.level_manager import LevelManager
    lm = LevelManager()
    s = TradingStrategy(lm)
    assert hasattr(s, "generate_signals")
    assert hasattr(s, "check_exit_conditions")


def test_patterns_folder():
    from patterns.candlestick_patterns import CandlestickPatternDetector, HAS_TALIB
    d = CandlestickPatternDetector()
    assert hasattr(d, "detect_patterns")
    assert hasattr(d, "check_level_break_with_pattern")


def test_levels_folder():
    from levels.level_manager import LevelManager, Level
    lm = LevelManager()
    assert hasattr(lm, "get_levels")
    assert hasattr(lm, "compute_auto_levels")


def test_money_folder():
    from money.position_sizing import PositionSizer
    ps = PositionSizer()
    assert hasattr(ps, "select_strike_from_option_chain")
    assert hasattr(ps, "select_strike_best_return")


def test_risk_folder():
    from risk.risk_manager import RiskManager
    from unittest.mock import MagicMock
    rm = RiskManager(MagicMock())
    assert hasattr(rm, "can_trade")
    assert hasattr(rm, "record_trade")


def test_journal_folder():
    from journal.trade_journal import TradeJournal, Trade
    j = TradeJournal()
    assert hasattr(j, "add_trade")
    assert hasattr(j, "export_to_csv")
    assert hasattr(j, "get_statistics")


def test_analytics_folder():
    from analytics.analytics_engine import AnalyticsEngine
    from journal.trade_journal import TradeJournal
    a = AnalyticsEngine(TradeJournal())
    assert hasattr(a, "compute_statistics")


def test_execution_folder():
    from execution.execution_engine import ExecutionEngine
    from unittest.mock import MagicMock
    e = ExecutionEngine(MagicMock(), MagicMock())
    assert hasattr(e, "start")
    assert hasattr(e, "stop")


def test_api_folder():
    from api.integration import BackendAPI
    api = BackendAPI()
    assert hasattr(api, "health_check")
    assert hasattr(api, "send_option_chain")
    assert hasattr(api, "send_ohlc")


def test_indicators_folder():
    from indicators.advanced_indicators import AdvancedIndicators
    assert hasattr(AdvancedIndicators, "atr_bands")
    assert hasattr(AdvancedIndicators, "bollinger_bands")


def test_intelligence_folder():
    from intelligence.market_intelligence import MarketIntelligence
    assert hasattr(MarketIntelligence, "put_call_ratio")


def test_utils_folder():
    from utils.logging_config import step_log, MODULE_TAGS
    assert callable(step_log)
    assert "broker" in MODULE_TAGS
    from utils.log_cleanup import cleanup_old_logs
    assert callable(cleanup_old_logs)


def test_ai_folder():
    from ai.ml_level_detector import MLLevelDetector
    ml = MLLevelDetector(n_clusters=5)
    assert hasattr(ml, "detect_levels")
    assert hasattr(ml, "detect_swing_points")
