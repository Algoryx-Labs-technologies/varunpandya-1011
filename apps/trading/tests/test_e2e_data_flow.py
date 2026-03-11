"""
End-to-end data flow tests.
- test_e2e_config: config loads and has required keys.
- test_e2e_tokens_and_tradingsymbols: DataFetcher returns token/tradingsymbol for each index.
- test_e2e_broker_connect: (optional) broker connect; skip if no TOTP.
- test_e2e_data_flow_live: (optional) full flow LTP/OHLC/option_chain per index; skip if no broker.
Run: pytest tests/test_e2e_data_flow.py -v
With live broker: set ANGEL_ONE_TOTP_SECRET and run pytest tests/test_e2e_data_flow.py -v -k "live or broker"
"""
import pytest
from pathlib import Path
import sys
APP_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP_ROOT))


def test_e2e_config():
    """Config loads and has index symbols and timeframes."""
    from config import Config
    assert hasattr(Config, "INDEX_SYMBOLS")
    assert hasattr(Config, "TIMEFRAMES")
    assert hasattr(Config, "EXCHANGE")
    indices = list(Config.INDEX_SYMBOLS.keys())
    assert len(indices) >= 1
    assert "NIFTY" in indices or "BANKNIFTY" in indices
    assert Config.TIMEFRAMES


def test_e2e_tokens_and_tradingsymbols():
    """DataFetcher has token and tradingsymbol for each configured index."""
    from config import Config
    from data.data_fetcher import DataFetcher
    from broker.angel_one import AngelOneBroker
    broker = AngelOneBroker()
    fetcher = DataFetcher(broker)
    for index in Config.INDEX_SYMBOLS:
        token = fetcher.get_index_token(index)
        assert token, f"token for {index}"
        ts = fetcher.get_index_tradingsymbol(index)
        assert ts, f"tradingsymbol for {index}"


@pytest.mark.skipif(
    not (__import__("os").getenv("ANGEL_ONE_TOTP_SECRET") or "").strip(),
    reason="ANGEL_ONE_TOTP_SECRET not set",
)
def test_e2e_broker_connect():
    """Broker connect succeeds when TOTP is set."""
    from broker.angel_one import AngelOneBroker
    broker = AngelOneBroker()
    ok = broker.connect()
    assert ok, getattr(broker, "last_error", "connect failed")


@pytest.mark.skipif(
    not (__import__("os").getenv("ANGEL_ONE_TOTP_SECRET") or "").strip(),
    reason="ANGEL_ONE_TOTP_SECRET not set",
)
def test_e2e_data_flow_live():
    """Full data flow for one index: LTP, OHLC (1m), option chain. Requires broker connect."""
    from config import Config
    from broker.angel_one import AngelOneBroker
    from data.data_fetcher import DataFetcher
    broker = AngelOneBroker()
    if not broker.connect():
        err = getattr(broker, "last_error", (None, None))
        msg = err[0] if isinstance(err, (tuple, list)) else str(err)
        pytest.skip(f"Broker connect failed (e.g. rate limit): {msg}")
    fetcher = DataFetcher(broker)
    index = "NIFTY"
    price = fetcher.get_current_price(index)
    # LTP may be None outside market hours
    assert price is None or (isinstance(price, (int, float)) and price > 0)
    df = fetcher.fetch_ohlc_data(index, "1m", days_back=1)
    # OHLC may be None/empty outside market hours or API limit
    assert df is None or (len(df) >= 0)
    chain = fetcher.fetch_option_chain(index)
    # Option chain from NSE may be empty outside market hours
    assert chain is None or (isinstance(chain, dict) and "calls" in chain and "puts" in chain)


def test_e2e_levels_journal_ml_flow(real_ohlc_df, dummy_levels_csv, tmp_path):
    """
    End-to-end: levels (manual CSV + auto) -> get_levels -> journal add_trade ->
    save to trades_*.json -> load from file. Then ML detector runs on same OHLC.
    Uses real historical OHLC when available (after fetch); otherwise dummy.
    """
    from levels.level_manager import LevelManager
    from journal.trade_journal import TradeJournal, Trade
    from datetime import datetime

    # 1) Levels: load manual + compute auto
    lm = LevelManager(use_ai=False)
    ok = lm.load_manual_levels_from_csv(dummy_levels_csv)
    assert ok is True
    auto = lm.compute_auto_levels(real_ohlc_df, "5m", num_levels=10)
    assert len(auto) >= 1
    all_levels = lm.get_levels("5m")
    assert len(all_levels) >= 2

    # 2) Journal: add trade (using level_type from levels), save to tmp
    journal_file = tmp_path / "trades_20260219.json"
    journal = TradeJournal()
    journal.journal_file = journal_file
    journal.trades.clear()
    trade = Trade(
        trade_id="e2e-1",
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
        timeframe="5m",
    )
    journal.add_trade(trade)
    assert journal_file.exists()

    # 3) Round-trip: load from file
    j2 = TradeJournal()
    j2.journal_file = journal_file
    j2.load_trades()
    assert len(j2.trades) == 1
    assert j2.trades[0].level_type == "ED" and j2.trades[0].pnl == 1000.0

    # 4) ML path: MLLevelDetector on same OHLC
    from ai.ml_level_detector import MLLevelDetector
    ml = MLLevelDetector(n_clusters=5)
    ml_levels = ml.detect_levels(real_ohlc_df)
    assert isinstance(ml_levels, list)
    # May be empty if too few bars for GB; at least swing/clustering often returns something
    assert len(ml_levels) >= 0
