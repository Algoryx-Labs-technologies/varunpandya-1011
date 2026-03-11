"""
Real-time market data feed via Angel One SmartAPI WebSocket V2.
Subscribes to index tokens (NSE_CM) for LTP; optional NSE_FO tokens for options.
Run start() after broker.connect(); use get_ltp(token) for real-time LTP from cache.
"""
import threading
import time
from typing import Dict, Optional, Any
from loguru import logger

try:
    from utils.logging_config import step_log as _step
except ImportError:
    def _step(m, s, d="", **k): logger.info(f"[{m}] {s} | {d}" + (" | " + str(k) if k else ""))

# Index token -> last LTP (float)
_ltp_cache: Dict[str, float] = {}
_cache_lock = threading.Lock()

# Default index tokens (NSE CM)
INDEX_TOKENS = {
    "99926000": "NIFTY",
    "99926009": "BANKNIFTY",
    "99926037": "FINNIFTY",
}


def get_ltp_from_feed(token: str) -> Optional[float]:
    """Return cached LTP for token if feed is running and has data."""
    with _cache_lock:
        return _ltp_cache.get(str(token))


def get_all_ltp() -> Dict[str, float]:
    """Return copy of token -> LTP cache."""
    with _cache_lock:
        return dict(_ltp_cache)


class AngelOneFeed:
    """
    WebSocket feed for real-time LTP. Subscribe to index (and optionally option) tokens.
    Call start(broker) after broker.connect(); then get_ltp(token) returns cached LTP.
    """

    def __init__(self):
        self.ws = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._correlation_id = "feed001"

    def start(self, broker: Any) -> bool:
        """Start WebSocket and subscribe to index tokens. broker must be connected."""
        if self._running:
            _step("broker", "feed", "already running")
            return True
        auth_token = getattr(broker, "jwt_token", None) or ""
        feed_token = getattr(broker, "feed_token", None) or ""
        api_key = getattr(broker, "api_key", None) or ""
        client_code = getattr(broker, "client_id", None) or ""
        if not all([auth_token, feed_token, api_key, client_code]):
            logger.warning("[broker] feed: missing jwt/feed_token/api_key/client_code; skip WebSocket")
            return False
        try:
            from SmartApi.smartWebSocketV2 import SmartWebSocketV2
        except ImportError:
            logger.warning("[broker] feed: SmartWebSocketV2 not found; skip WebSocket")
            return False

        self._running = True
        self.ws = SmartWebSocketV2(
            auth_token=auth_token,
            api_key=api_key,
            client_code=client_code,
            feed_token=feed_token,
            max_retry_attempt=2,
            retry_delay=5,
        )

        def on_data(wsapp, data: dict):
            token = (data.get("token") or "").strip()
            ltp_val = data.get("last_traded_price")
            if token and ltp_val is not None:
                try:
                    ltp = float(ltp_val)
                    with _cache_lock:
                        _ltp_cache[token] = ltp
                    logger.debug("[broker] feed LTP update token=%s ltp=%s", token, ltp)
                except (TypeError, ValueError) as e:
                    logger.debug("[broker] feed LTP parse skip token=%s value=%s err=%s", token, ltp_val, e)

        def on_open(wsapp):
            tokens_sub = list(INDEX_TOKENS.keys())
            logger.info("[broker] feed WebSocket connected, subscribing index tokens: %s", tokens_sub)
            _step("broker", "feed", "WebSocket connected, subscribing index tokens", tokens=tokens_sub)
            token_list = [{"exchangeType": SmartWebSocketV2.NSE_CM, "tokens": tokens_sub}]
            try:
                self.ws.subscribe(self._correlation_id, SmartWebSocketV2.LTP_MODE, token_list)
                logger.debug("[broker] feed subscribe sent correlation_id=%s mode=LTP", self._correlation_id)
            except Exception as e:
                logger.exception("[broker] feed subscribe error: %s", e)

        def on_close(wsapp):
            _step("broker", "feed", "WebSocket closed")

        def on_error(wsapp, err):
            logger.warning("[broker] feed WebSocket error: %s", err)

        self.ws.on_data = on_data
        self.ws.on_open = on_open
        self.ws.on_close = on_close
        self.ws.on_error = on_error
        self._thread = threading.Thread(target=self._run_ws, daemon=True)
        self._thread.start()
        time.sleep(1.5)
        _step("broker", "feed", "started")
        return True

    def _run_ws(self):
        try:
            logger.debug("[broker] feed WebSocket connect() starting")
            self.ws.connect()
        except Exception as e:
            logger.exception("[broker] feed WebSocket connect failed: %s", e)
        finally:
            self._running = False
            logger.debug("[broker] feed WebSocket thread exiting")

    def stop(self):
        """Stop WebSocket connection."""
        self._running = False
        if self.ws and hasattr(self.ws, "close_connection"):
            try:
                self.ws.close_connection()
            except Exception:
                pass
        _step("broker", "feed", "stopped")
