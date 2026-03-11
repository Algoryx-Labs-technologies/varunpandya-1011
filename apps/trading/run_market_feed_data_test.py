"""
Market feed data test: historical index OHLC, option chain, Greeks, and (optional) WebSocket LTP.
Uses only the market-feed broker when USE_MARKET_FEED is set (separate .env credentials).
Run from apps/trading: python run_market_feed_data_test.py
"""
import sys
import os

# Ensure app root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger

from config import Config
from broker.angel_one import AngelOneBroker
from data.data_fetcher import DataFetcher


def main():
    use_market_feed = getattr(Config, "USE_MARKET_FEED", False)
    if not use_market_feed:
        logger.warning(
            "USE_MARKET_FEED is not set. Set ANGEL_ONE_MARKET_FEED_API_KEY and "
            "ANGEL_ONE_MARKET_FEED_CLIENT_ID in .env (and password/TOTP/MPIN if needed), then rerun."
        )
        return 1

    logger.info("Market feed data test (broker = market-feed credentials only)")
    broker = AngelOneBroker(use_market_feed=True)
    if not broker.connect():
        logger.error("Market feed broker failed to connect. Check credentials and .env.")
        return 2

    fetcher = DataFetcher(broker)
    index = "NIFTY"
    ok = True

    # 1) Historical index OHLC
    logger.info("1) Fetching historical index OHLC ({} 1m, 1 day)...", index)
    df = fetcher.fetch_ohlc_data(index, "1m", days_back=1)
    if df is not None and not df.empty:
        logger.info("   OHLC OK: rows={}, columns={}", len(df), list(df.columns))
    else:
        logger.warning("   OHLC failed or empty")
        ok = False

    # 2) Option chain (NSE + broker LTP/Greeks enrichment)
    logger.info("2) Fetching option chain ({})...", index)
    chain = fetcher.fetch_option_chain(index)
    if chain and chain.get("calls") is not None and chain.get("puts") is not None:
        calls = chain["calls"]
        puts = chain["puts"]
        uv = chain.get("underlying_value", 0)
        logger.info("   Option chain OK: calls={}, puts={}, underlying={}", len(calls), len(puts), uv)
        # Check Greeks enrichment (broker get_option_greeks)
        if not calls.empty and "delta" in calls.columns and calls["delta"].notna().any():
            logger.info("   Greeks enriched (sample delta present)")
        else:
            logger.info("   Greeks not enriched (market may be closed or API no data)")
    else:
        logger.warning("   Option chain failed or empty")
        ok = False

    # 3) Direct broker Greeks (same as used inside fetch_option_chain)
    expiry = None
    if chain and chain.get("calls") is not None and not chain["calls"].empty and "symbol" in chain["calls"].columns:
        from data.data_fetcher import _expiry_from_nse_symbol
        first_sym = chain["calls"].iloc[0].get("symbol")
        if first_sym:
            expiry = _expiry_from_nse_symbol(str(first_sym), index)
    if not expiry:
        expiry = "08FEB2024"  # fallback sample
    logger.info("3) Broker get_option_greeks({}, {})...", index, expiry)
    greeks_list = broker.get_option_greeks(index, expiry)
    if greeks_list and len(greeks_list) > 0:
        logger.info("   Greeks OK: rows={}", len(greeks_list))
    else:
        logger.info("   Greeks empty (expected if market closed or expiry not active)")

    # 4) Optional: WebSocket LTP (start feed with market-feed broker, one LTP check)
    try:
        from broker.feed_websocket import AngelOneFeed, get_ltp_from_feed
        token = fetcher.get_index_token(index)
        if token:
            feed = AngelOneFeed()
            if feed.start(broker):
                import time
                time.sleep(2)
                ltp = get_ltp_from_feed(token)
                if ltp is not None and ltp > 0:
                    logger.info("4) WebSocket LTP for {}: {}", index, ltp)
                else:
                    logger.info("4) WebSocket started but LTP not yet available")
                feed.stop()
            else:
                logger.info("4) WebSocket feed did not start (skip)")
        else:
            logger.info("4) No index token, skip WebSocket")
    except Exception as e:
        logger.debug("4) WebSocket step skipped: {}", e)

    if ok:
        logger.info("Market feed data test completed successfully.")
        return 0
    return 3


if __name__ == "__main__":
    sys.exit(main())
