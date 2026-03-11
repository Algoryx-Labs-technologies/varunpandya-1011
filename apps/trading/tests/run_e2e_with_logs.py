#!/usr/bin/env python3
"""
End-to-end test with step-by-step logging.
Runs: config -> broker connect -> for each index (token, LTP, OHLC 1m/5m/15m, option chain) -> backend health.
Logs every step to console and to logs/e2e_YYYYMMDD_HHMMSS.log.
Run from apps/trading: python tests/run_e2e_with_logs.py   or   venv\Scripts\python tests/run_e2e_with_logs.py
"""
import sys
from pathlib import Path
from datetime import datetime

APP_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP_ROOT))

# Log dir and cleanup previous logs so only this run's logs are "recent"
LOG_DIR = APP_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)


def _cleanup_logs() -> int:
    """Remove previous E2E/system_test/rotated logs; keep only recent (this run)."""
    try:
        from utils.log_cleanup import cleanup_old_logs
        return cleanup_old_logs(LOG_DIR, keep_recent=True, keep_trading_log=True)
    except Exception:
        return 0


# E2E log file for this run (created after cleanup)
E2E_LOG = LOG_DIR / f"e2e_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

def section(name: str) -> None:
    from loguru import logger
    logger.info("=" * 60)
    logger.info(f"  E2E: {name}")
    logger.info("=" * 60)


def run_e2e() -> None:
    from loguru import logger
    logger.info("E2E test started. Log file: {}", E2E_LOG)

    # 1) Config
    section("CONFIG")
    from config import Config
    logger.info("[config] PAPER_TRADING={}", Config.PAPER_TRADING)
    logger.info("[config] INDEX_SYMBOLS={}", list(Config.INDEX_SYMBOLS.keys()))
    logger.info("[config] TIMEFRAMES={}", Config.TIMEFRAMES)
    logger.info("[config] EXCHANGE={}", Config.EXCHANGE)
    logger.info("[config] BACKEND_API_URL={}", getattr(Config, "BACKEND_API_URL", ""))

    # 2) Broker connect
    section("BROKER CONNECT")
    from broker.angel_one import AngelOneBroker
    broker = AngelOneBroker()
    has_totp = bool((getattr(broker, "totp_secret") or "").strip())
    logger.info("[e2e] broker credentials: api_key={} client_id={} totp={}", 
                bool((getattr(broker, "api_key") or "").strip()),
                bool((getattr(broker, "client_id") or "").strip()), has_totp)
    if not has_totp:
        logger.warning("[e2e] SKIP broker connect: ANGEL_ONE_TOTP_SECRET not set")
        section("DATA FETCHER (tokens only)")
        from data.data_fetcher import DataFetcher
        fetcher = DataFetcher(broker)
        for idx in list(Config.INDEX_SYMBOLS.keys()):
            token = fetcher.get_index_token(idx)
            ts = fetcher.get_index_tradingsymbol(idx)
            logger.info("[e2e] index={} token={} tradingsymbol={}", idx, token, ts)
        section("DONE (no broker)")
        logger.info("E2E finished (no live broker). Log: {}", E2E_LOG)
        return

    ok = broker.connect()
    if not ok:
        err = getattr(broker, "last_error", (None, None))
        msg, code = err if isinstance(err, (tuple, list)) else (err, "")
        logger.error("[e2e] Broker connect failed: {} (code={})", msg or "check credentials/TOTP", code or "—")
        section("DONE (broker failed)")
        return
    logger.info("[e2e] Broker connected")

    # 3) Data fetcher: for each index get LTP, OHLC, option chain
    section("DATA FLOW (per index)")
    from data.data_fetcher import DataFetcher
    fetcher = DataFetcher(broker)
    indices = list(Config.INDEX_SYMBOLS.keys())
    timeframes = getattr(Config, "TIMEFRAMES", ["1m", "5m", "15m"]) or ["1m", "5m", "15m"]

    for index in indices:
        logger.info("[e2e] --- Index: {} ---", index)
        token = fetcher.get_index_token(index)
        tradingsymbol = fetcher.get_index_tradingsymbol(index)
        logger.info("[e2e] token={} tradingsymbol={}", token, tradingsymbol)

        # LTP (broker)
        price = fetcher.get_current_price(index)
        if price is not None:
            logger.info("[e2e] get_current_price({}) = {}", index, price)
        else:
            logger.warning("[e2e] get_current_price({}) = None", index)

        # OHLC each timeframe (broker)
        for tf in timeframes:
            df = fetcher.fetch_ohlc_data(index, tf, days_back=1)
            if df is not None and len(df) > 0:
                logger.info("[e2e] fetch_ohlc_data({}, {}) = {} rows", index, tf, len(df))
            else:
                logger.warning("[e2e] fetch_ohlc_data({}, {}) = None or empty", index, tf)

        # Option chain (NSE)
        chain = fetcher.fetch_option_chain(index)
        if chain:
            nc = len(chain.get("calls") or []) if hasattr(chain.get("calls"), "__len__") else (len(chain["calls"]) if isinstance(chain.get("calls"), list) else 0)
            np_ = len(chain.get("puts") or []) if hasattr(chain.get("puts"), "__len__") else (len(chain["puts"]) if isinstance(chain.get("puts"), list) else 0)
            if hasattr(chain.get("calls"), "shape"):
                nc = chain["calls"].shape[0]
            if hasattr(chain.get("puts"), "shape"):
                np_ = chain["puts"].shape[0]
            logger.info("[e2e] fetch_option_chain({}) = calls={} puts={} underlying={}", 
                        index, nc, np_, chain.get("underlying_value"))

        else:
            logger.warning("[e2e] fetch_option_chain({}) = None", index)

    # 4) Backend
    section("BACKEND API")
    from api.integration import BackendAPI
    api = BackendAPI()
    if api.base_url:
        health = api.health_check()
        logger.info("[e2e] backend health_check = {}", health)
    else:
        logger.info("[e2e] BACKEND_API_URL not set, skip health check")

    section("DONE")
    logger.info("E2E test finished. Full log: {}", E2E_LOG)


def main() -> None:
    from loguru import logger
    n = _cleanup_logs()
    if n:
        logger.info("Cleaned {} previous log file(s); keeping recent logs only", n)
    logger.remove()
    logger.add(sys.stderr, level="INFO", format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}")
    logger.add(E2E_LOG, level="DEBUG", format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}")
    try:
        run_e2e()
    except Exception as e:
        logger.exception("E2E failed: {}", e)
        raise


if __name__ == "__main__":
    main()
