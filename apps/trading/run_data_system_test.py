"""
Full data system test: uses trading broker (always runs).
Tests: historical OHLC, option chain, Greeks, WebSocket index LTP (SmartAPI WebSocket2).
Run from apps/trading: py -3 run_data_system_test.py
"""
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger

from config import Config
from broker.angel_one import AngelOneBroker
from data.data_fetcher import DataFetcher


def main():
    logger.info("Data system test (trading broker)")
    broker = AngelOneBroker()
    if not (getattr(broker, "totp_secret") or "").strip():
        logger.warning("ANGEL_ONE_TOTP_SECRET not set; skip broker connect and live data")
        return 1
    if not broker.connect():
        logger.error("Broker connect failed")
        return 2

    fetcher = DataFetcher(broker)
    indices = list(getattr(Config, "INDEX_SYMBOLS", {}).keys() or ["NIFTY", "BANKNIFTY"])
    ok = True

    # 1) Historical OHLC
    for index in indices[:2]:
        df = fetcher.fetch_ohlc_data(index, "1m", days_back=1)
        if df is not None and not df.empty:
            logger.info("OHLC {} 1m: rows={}", index, len(df))
        else:
            logger.warning("OHLC {} failed or empty", index)
            ok = False

    # 2) Option chain (NSE + Greeks enrichment)
    for index in indices[:2]:
        chain = fetcher.fetch_option_chain(index)
        if chain and chain.get("calls") is not None:
            logger.info("Option chain {}: calls={} puts={} underlying={}",
                        index, len(chain["calls"]), len(chain["puts"]), chain.get("underlying_value"))
        else:
            logger.warning("Option chain {}: None (NSE may be empty outside market hours)", index)

    # 3) WebSocket LTP (SmartAPI WebSocket2; LTP in rupees after /100 fix)
    try:
        from broker.feed_websocket import AngelOneFeed, get_ltp_from_feed
        feed = AngelOneFeed()
        if feed.start(broker):
            time.sleep(2.5)
            for index in indices[:2]:
                token = fetcher.get_index_token(index)
                if token:
                    ltp = get_ltp_from_feed(token)
                    if ltp is not None and ltp > 0:
                        logger.info("WebSocket LTP {}: {} (rupees)", index, ltp)
                    else:
                        logger.info("WebSocket {}: no LTP yet", index)
            feed.stop()
        else:
            logger.warning("WebSocket feed did not start")
    except Exception as e:
        logger.exception("WebSocket step failed: %s", e)

    logger.info("Data system test done.")
    return 0 if ok else 3


if __name__ == "__main__":
    sys.exit(main())
