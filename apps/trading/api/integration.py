"""
API Integration Module
Communicates with backend API and React frontend.
Edge cases: empty base_url, timeout, 5xx retry once, invalid payload.
"""
import requests
from typing import Dict, List, Optional
from loguru import logger
from config import Config

try:
    _t = getattr(Config, "BACKEND_TIMEOUT", None)
    TIMEOUT = max(2, min(30, int(_t))) if _t is not None else 5
except (TypeError, ValueError):
    TIMEOUT = 5


class BackendAPI:
    """Handles communication with backend API."""

    def __init__(self):
        self.base_url = (getattr(Config, "BACKEND_API_URL", None) or "").strip().rstrip("/")
        self.api_key = (getattr(Config, "BACKEND_API_KEY", None) or "").strip()
        self.session = requests.Session()
        self.session.headers["Content-Type"] = "application/json"
        if self.api_key:
            self.session.headers["Authorization"] = f"Bearer {self.api_key}"

    def _post(self, path: str, json_data: Dict, retry: bool = True) -> bool:
        if not self.base_url:
            logger.debug("Backend base_url empty; skip POST")
            return False
        url = f"{self.base_url}{path}"
        try:
            r = self.session.post(url, json=json_data, timeout=TIMEOUT)
            if r.status_code >= 500 and retry:
                r2 = self.session.post(url, json=json_data, timeout=TIMEOUT)
                r2.raise_for_status()
                return True
            r.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Backend POST {path}: {e}")
            return False

    def send_trade_signal(self, signal_data: Dict) -> bool:
        """Send trade signal to backend."""
        if not signal_data or not isinstance(signal_data, dict):
            logger.warning("send_trade_signal: empty or invalid payload")
            return False
        ok = self._post("/api/trading/signals", signal_data)
        if ok:
            logger.info("Trade signal sent to backend")
        return ok
    
    def send_trade_execution(self, trade_data: Dict) -> bool:
        if not trade_data or not isinstance(trade_data, dict):
            return False
        ok = self._post("/api/trading/trades", trade_data)
        if ok:
            logger.info("Trade execution sent to backend")
        return ok

    def send_levels_update(self, levels_data: Dict) -> bool:
        if not levels_data or not isinstance(levels_data, dict):
            return False
        return self._post("/api/trading/levels", levels_data)

    def send_market_data(self, market_data: Dict) -> bool:
        if not market_data or not isinstance(market_data, dict):
            return False
        return self._post("/api/trading/market-data", market_data)

    def send_ohlc(self, index: str, timeframe: str, candles: List[Dict]) -> bool:
        """Send OHLC candles for chart and DB persistence."""
        if not index or not timeframe or not candles or not isinstance(candles, list):
            return False
        ok = self._post("/api/trading/ohlc", {"index": index, "timeframe": timeframe, "candles": candles})
        if ok:
            logger.debug(f"OHLC sent: {index} {timeframe} {len(candles)} candles")
        return ok

    def send_option_chain(self, payload: Dict) -> bool:
        """Send option chain (calls/puts) for real-time UI and DB."""
        if not payload or not isinstance(payload, dict):
            return False
        ok = self._post("/api/trading/option-chain", payload)
        if ok:
            logger.debug("Option chain sent to backend")
        return ok

    def get_config(self) -> Optional[Dict]:
        if not self.base_url:
            return None
        try:
            r = self.session.get(f"{self.base_url}/api/trading/config", timeout=TIMEOUT)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"get_config: {e}")
            return None

    def health_check(self) -> bool:
        if not self.base_url:
            return False
        try:
            r = self.session.get(f"{self.base_url}/health", timeout=TIMEOUT)
            return r.status_code == 200
        except Exception as e:
            logger.debug(f"Backend health check failed: {e}")
            return False

    def send_pattern_detection(self, payload: Dict) -> bool:
        """Notify backend that a candlestick pattern was detected (for portal pattern alerts)."""
        if not payload or not isinstance(payload, dict):
            return False
        ok = self._post("/api/trading/pattern-detection", payload)
        if ok:
            logger.debug("Pattern detection sent to backend")
        return ok

    def send_alert(self, severity: str, message: str, payload: Optional[Dict] = None) -> bool:
        """Send alert to backend (for logging/UI). No-op if base_url empty or request fails."""
        if not self.base_url:
            return False
        try:
            r = self.session.post(
                f"{self.base_url}/api/trading/alert",
                json={"severity": severity, "message": message, "payload": payload or {}},
                timeout=TIMEOUT,
            )
            return r.status_code in (200, 201, 204)
        except Exception as e:
            logger.debug(f"send_alert failed: {e}")
            return False

    def get_unlock_request(self) -> bool:
        """Check if user requested manual unlock (from portal). Bot should call unlock_trading() and clear."""
        if not self.base_url:
            return False
        try:
            r = self.session.get(f"{self.base_url}/api/trading/unlock-request", timeout=TIMEOUT)
            if r.status_code != 200:
                return False
            data = r.json()
            return bool(data.get("data", {}).get("unlock_requested"))
        except Exception as e:
            logger.debug(f"get_unlock_request: {e}")
            return False

    def clear_unlock_request(self) -> bool:
        """Clear unlock request after bot has acted."""
        if not self.base_url:
            return False
        try:
            r = self.session.post(f"{self.base_url}/api/trading/clear-unlock-request", json={}, timeout=TIMEOUT)
            return r.status_code in (200, 201, 204)
        except Exception as e:
            logger.debug(f"clear_unlock_request: {e}")
            return False

    def send_trading_log(self, level: str, message: str, payload: Optional[Dict] = None) -> bool:
        """Send a trading log entry to backend (stored in DB, shown in web per day)."""
        if not self.base_url:
            return False
        try:
            r = self.session.post(
                f"{self.base_url}/api/trading/logs",
                json={"level": level or "info", "message": message or "", "payload": payload or {}},
                timeout=TIMEOUT,
            )
            return r.status_code in (200, 201, 204)
        except Exception as e:
            logger.debug(f"send_trading_log failed: {e}")
            return False
