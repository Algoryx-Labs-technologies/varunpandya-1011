#!/usr/bin/env python3
"""
Full system test: config, indicators, patterns, levels, strike selection, ML, broker, backend.
Logs everything to logs/system_test_YYYYMMDD_HHMMSS.log and prints to console.
Run from apps/trading: python run_system_test.py   or   venv\Scripts\python run_system_test.py
"""
import sys
from pathlib import Path
from datetime import datetime

# Ensure app root is on path
APP_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(APP_ROOT))

# Log dir: cleanup previous logs so only this run's logs are recent
LOG_DIR = APP_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)


def _cleanup_logs():
    try:
        from utils.log_cleanup import cleanup_old_logs
        return cleanup_old_logs(LOG_DIR, keep_recent=True, keep_trading_log=True)
    except Exception:
        return 0


# This run's log file (after cleanup)
LOG_FILE = LOG_DIR / f"system_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

import os
import logging
# Use INFO so DEBUG lines (urllib3, SmartApi, etc.) don't clutter logs; set LOG_LEVEL=DEBUG in .env for troubleshooting
_log_level = os.getenv("LOG_LEVEL", "INFO").upper()
_level = getattr(logging, _log_level, logging.INFO)
logging.basicConfig(
    level=_level,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("system_test")
# Suppress noisy third-party DEBUG in system test logs
for _name in ("urllib3", "SmartApi", "logzero", "requests"):
    logging.getLogger(_name).setLevel(logging.WARNING)

def section(name: str) -> None:
    log.info("=" * 60)
    log.info(f"  {name}")
    log.info("=" * 60)

def test_config() -> None:
    section("CONFIG")
    from config import Config
    log.info("PAPER_TRADING = %s", Config.PAPER_TRADING)
    log.info("BACKEND_API_URL = %s", Config.BACKEND_API_URL)
    log.info("TRADING_CAPITAL = %s", Config.TRADING_CAPITAL)
    log.info("NIFTY_ALLOCATION = %s", Config.NIFTY_ALLOCATION)
    log.info("STRIKE_PREFERENCE = %s", Config.STRIKE_PREFERENCE)
    log.info("INDEX_SYMBOLS = %s", list(Config.INDEX_SYMBOLS.keys()))
    log.info("TIMEFRAMES = %s", Config.TIMEFRAMES)
    for idx in ["NIFTY", "BANKNIFTY"]:
        log.info("  get_allocation(%s) = %s", idx, Config.get_allocation(idx))
    log.info("Config OK")

def test_indicators() -> None:
    section("INDICATORS (advanced_indicators)")
    import pandas as pd
    import numpy as np
    from indicators.advanced_indicators import AdvancedIndicators
    # Dummy OHLC
    n = 50
    np.random.seed(42)
    close = 24000 + np.cumsum(np.random.randn(n) * 20)
    high = close + np.abs(np.random.randn(n) * 15)
    low = close - np.abs(np.random.randn(n) * 15)
    open_ = np.roll(close, 1)
    open_[0] = close[0]
    df = pd.DataFrame({"open": open_, "high": high, "low": low, "close": close})
    out_atr = AdvancedIndicators.atr_bands(df, period=14, multiplier=2.0)
    log.info("  atr_bands: columns=%s, rows=%s", list(out_atr.columns), len(out_atr))
    out_bb = AdvancedIndicators.bollinger_bands(df, period=20, std_dev=2.0)
    log.info("  bollinger_bands: columns=%s", list(out_bb.columns))
    out_rsi = AdvancedIndicators.rsi_zones(df, period=14)
    log.info("  rsi_zones: columns=%s", list(out_rsi.columns) if hasattr(out_rsi, "columns") else "Series")
    log.info("Indicators OK")

def test_patterns() -> None:
    section("CANDLESTICK PATTERNS")
    from patterns.candlestick_patterns import HAS_TALIB, CandlestickPatternDetector
    import pandas as pd
    import numpy as np
    log.info("HAS_TALIB = %s", HAS_TALIB)
    n = 30
    np.random.seed(123)
    c = 24000 + np.cumsum(np.random.randn(n) * 10)
    h = c + np.abs(np.random.randn(n) * 8)
    l = c - np.abs(np.random.randn(n) * 8)
    o = np.roll(c, 1)
    o[0] = c[0]
    df = pd.DataFrame({"open": o, "high": h, "low": l, "close": c})
    det = CandlestickPatternDetector()
    out = det.detect_patterns(df)
    log.info("  detect_patterns: shape=%s, extra columns=%s", out.shape, [c for c in out.columns if c not in ("open","high","low","close")])
    log.info("Patterns OK")

def test_levels() -> None:
    section("LEVEL MANAGER (manual + sample)")
    from levels.level_manager import LevelManager
    lm = LevelManager()
    csv_path = APP_ROOT / "levels" / "levels_sample.csv"
    if csv_path.exists():
        lm.load_manual_levels_from_csv(str(csv_path))
        log.info("  Loaded levels from levels_sample.csv")
    else:
        log.info("  levels_sample.csv not found, skip manual load")
    log.info("  Levels state: %s", getattr(lm, "levels", {}))
    log.info("Level manager OK")

def test_strike_selection() -> None:
    section("STRIKE SELECTION (position_sizing)")
    from money.position_sizing import PositionSizer
    ps = PositionSizer()
    underlying = 24500.0
    strikes = [24400.0, 24500.0, 24600.0, 24700.0]
    option_prices = [180.0, 120.0, 80.0, 50.0]
    result = ps.select_strike_best_return(underlying, strikes, option_prices, "NIFTY", "call")
    log.info("  underlying=%s, strikes=%s, option_prices=%s", underlying, strikes, option_prices)
    log.info("  select_strike_best_return result = %s", result)
    if result:
        log.info("  -> strike=%s, qty=%s, capital_used=%s, moneyness=%s", result[0], result[1], result[2], result[3])
    log.info("Strike selection OK")

def test_ml_levels() -> None:
    section("ML LEVEL DETECTOR")
    import pandas as pd
    import numpy as np
    from ai.ml_level_detector import MLLevelDetector
    n = 60
    np.random.seed(99)
    c = 24000 + np.cumsum(np.random.randn(n) * 15)
    h = c + np.abs(np.random.randn(n) * 10)
    l = c - np.abs(np.random.randn(n) * 10)
    o = np.roll(c, 1)
    o[0] = c[0]
    df = pd.DataFrame({"open": o, "high": h, "low": l, "close": c})
    ml = MLLevelDetector(n_clusters=5)
    swing_highs, swing_lows = ml.detect_swing_points(df, window=5)
    log.info("  swing_highs count=%s, swing_lows count=%s", len(swing_highs), len(swing_lows))
    if swing_highs:
        log.info("  sample swing_highs=%s", swing_highs[:5])
    levels = ml.detect_levels(df)
    log.info("  detect_levels: count=%s (price, confidence) pairs", len(levels))
    if levels:
        log.info("  sample levels=%s", levels[:5])
    log.info("ML level detector OK")

def test_broker() -> None:
    section("BROKER API (Angel One connect)")
    from broker.angel_one import AngelOneBroker
    from config import Config
    broker = AngelOneBroker()
    log.info("  api_key set = %s", bool((broker.api_key or "").strip()))
    log.info("  client_id set = %s", bool((broker.client_id or "").strip()))
    log.info("  totp_secret set = %s", bool((broker.totp_secret or "").strip()))
    if not (broker.totp_secret or "").strip():
        log.warning("  SKIP broker connect: ANGEL_ONE_TOTP_SECRET not set (required for login)")
        return
    ok = broker.connect()
    if ok:
        log.info("  Broker connected successfully")
        try:
            profile = broker.get_profile()
            if profile:
                log.info("  get_profile: %s", type(profile).__name__)
            else:
                log.info("  get_profile returned None")
        except Exception as e:
            log.warning("  get_profile error: %s", e)
    else:
        err = getattr(broker, "last_error", (None, None))
        msg, code = err if isinstance(err, (tuple, list)) else (err, "")
        log.warning("  Broker connect failed: %s (errorcode=%s)", msg or "check credentials/TOTP", code or "—")

def test_backend_api() -> None:
    section("BACKEND API (health)")
    from api.integration import BackendAPI
    api = BackendAPI()
    log.info("  base_url = %s", api.base_url)
    if not api.base_url:
        log.warning("  SKIP: BACKEND_API_URL not set")
        return
    ok = api.health_check()
    log.info("  health_check = %s", ok)
    if ok:
        log.info("  Backend is reachable")
    else:
        log.warning("  Backend not reachable (start with node run-all.js)")

def test_data_fetcher_no_broker() -> None:
    section("DATA FETCHER (tokens only, no live fetch)")
    from data.data_fetcher import DataFetcher
    from broker.angel_one import AngelOneBroker
    broker = AngelOneBroker()
    fetcher = DataFetcher(broker)
    for idx in ["NIFTY", "BANKNIFTY", "FINNIFTY"]:
        token = fetcher.get_index_token(idx)
        ts = fetcher.get_index_tradingsymbol(idx)
        log.info("  get_index_token(%s) = %s  tradingsymbol = %s", idx, token, ts)
    log.info("DataFetcher token lookup OK (live OHLC requires broker connect)")


def test_data_flow_live() -> None:
    """Full data flow: broker connect -> LTP -> OHLC -> option chain per index. Logs each step."""
    section("DATA FLOW (live broker + NSE)")
    from config import Config
    from broker.angel_one import AngelOneBroker
    from data.data_fetcher import DataFetcher
    broker = AngelOneBroker()
    if not (getattr(broker, "totp_secret") or "").strip():
        log.warning("  SKIP data flow: ANGEL_ONE_TOTP_SECRET not set")
        return
    if not broker.connect():
        log.warning("  SKIP data flow: broker connect failed")
        return
    fetcher = DataFetcher(broker)
    indices = list(getattr(Config, "INDEX_SYMBOLS", {}).keys()) or ["NIFTY", "BANKNIFTY", "FINNIFTY"]
    timeframes = getattr(Config, "TIMEFRAMES", []) or ["1m", "5m", "15m"]
    for index in indices:
        log.info("  --- %s ---", index)
        price = fetcher.get_current_price(index)
        log.info("    get_current_price = %s", price)
        for tf in timeframes:
            df = fetcher.fetch_ohlc_data(index, tf, days_back=1)
            log.info("    fetch_ohlc(%s) = %s rows", tf, len(df) if df is not None else 0)
        chain = fetcher.fetch_option_chain(index)
        if chain:
            nc = getattr(chain.get("calls"), "shape", (0,))[0] if hasattr(chain.get("calls"), "shape") else len(chain.get("calls") or [])
            np_ = getattr(chain.get("puts"), "shape", (0,))[0] if hasattr(chain.get("puts"), "shape") else len(chain.get("puts") or [])
            log.info("    option_chain: calls=%s puts=%s underlying=%s", nc, np_, chain.get("underlying_value"))
        else:
            log.info("    option_chain = None")
    log.info("Data flow (live) OK")

def main() -> None:
    n = _cleanup_logs()
    if n:
        log.info("Cleaned %s previous log file(s); keeping recent logs only", n)
    log.info("System test started. Log file: %s", LOG_FILE)
    try:
        test_config()
        test_indicators()
        test_patterns()
        test_levels()
        test_strike_selection()
        test_ml_levels()
        test_data_fetcher_no_broker()
        test_broker()
        test_data_flow_live()
        test_backend_api()
    except Exception as e:
        log.exception("System test failed: %s", e)
        raise
    section("DONE")
    log.info("All checks completed. Full log saved to: %s", LOG_FILE)

if __name__ == "__main__":
    main()
