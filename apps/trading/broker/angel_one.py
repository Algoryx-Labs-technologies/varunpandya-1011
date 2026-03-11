"""
Angel One SmartAPI Integration Module.
Ref: https://smartapi.angelbroking.com/docs (Login = clientcode, password/pin, totp).
Credentials from .env only: ANGEL_ONE_API_KEY, ANGEL_ONE_CLIENT_ID, ANGEL_ONE_PASSWORD or ANGEL_ONE_MPIN, ANGEL_ONE_TOTP_SECRET.
"""
import time
import pyotp
from pyotp import TOTP
from SmartApi import SmartConnect
from typing import Dict, List, Optional, Any
from loguru import logger
import json
from datetime import datetime
from config import Config
try:
    from utils.logging_config import step_log as _step
except ImportError:
    def _step(m, s, d="", **k): logger.info(f"[{m}] {s} | {d}" + (" | " + str(k) if k else ""))


def _totp_code(secret: str) -> str:
    """Generate 6-digit TOTP for Angel One (30s interval, base32 secret). Supports raw secret or otpauth:// URI."""
    secret = (secret or "").strip()
    if not secret:
        return ""
    if secret.lower().startswith("otpauth://"):
        t = pyotp.parse_uri(secret)
        return t.now()
    return TOTP(secret, interval=30, digits=6).now()


class AngelOneBroker:
    """Wrapper class for Angel One SmartAPI"""

    def __init__(self):
        self.api_key = Config.ANGEL_ONE_API_KEY
        self.client_id = Config.ANGEL_ONE_CLIENT_ID
        self.password = Config.ANGEL_ONE_PASSWORD
        self.totp_secret = Config.ANGEL_ONE_TOTP_SECRET
        self.obj = None
        self.feed_token = None
        self.jwt_token = None
        self.refresh_token = None  # Required by SmartAPI for getProfile and generateToken
        self.last_error = None  # (message, errorcode) after failed connect

    def connect(self) -> bool:
        """Authenticate with Angel One API per SmartAPI: clientcode, password (pin), totp. Session active till midnight."""
        self.last_error = None
        try:
            key_secret = getattr(Config, "KEY_SECRET", None) or (self.api_key, "", self.client_id, self.password, self.totp_secret or "")
            api_key = (key_secret[0] or "").strip()
            client_code = (key_secret[2] or "").strip()
            totp_secret = (key_secret[4] or "").strip()
            if not api_key or not client_code or not totp_secret:
                self.last_error = ("Missing api_key, client_code or totp_secret", "")
                logger.error("Missing credentials in .env: ANGEL_ONE_API_KEY, ANGEL_ONE_CLIENT_ID, ANGEL_ONE_TOTP_SECRET")
                return False
            login_pin = (getattr(Config, "ANGEL_ONE_MPIN", None) or "").strip() or (key_secret[3] or "").strip()
            if not login_pin:
                self.last_error = ("Missing password/mPIN", "")
                logger.error("Set ANGEL_ONE_PASSWORD or ANGEL_ONE_MPIN in .env")
                return False
            auth_type = "MPIN" if (getattr(Config, "ANGEL_ONE_MPIN", None) or "").strip() else "password"
            logger.info(f"Angel One login attempt (client_code={client_code}, auth={auth_type})")
            self.obj = SmartConnect(api_key=api_key)
            for attempt in range(3):
                totp_code = _totp_code(totp_secret)
                if not totp_code:
                    self.last_error = ("TOTP generation failed (check ANGEL_ONE_TOTP_SECRET)", "")
                    logger.error("TOTP generation failed. Use base32 secret from https://smartapi.angelone.in/enable-totp")
                    return False
                data = self.obj.generateSession(client_code, login_pin, totp_code)
                if data.get("status") in (True, "true"):
                    self.jwt_token = data["data"]["jwtToken"]
                    self.feed_token = data["data"]["feedToken"]
                    self.refresh_token = data["data"].get("refreshToken", "")
                    if not self.refresh_token:
                        logger.warning("Login response missing refreshToken; getProfile/token refresh may fail")
                    mode = "PAPER" if getattr(Config, "PAPER_TRADING", True) else "LIVE"
                    logger.info(f"Angel One connected (mode={mode})")
                    _step("broker", "connect", "OK", mode=mode)
                    return True
                msg = data.get("message") or "Unknown error"
                errcode = data.get("errorcode") or ""
                self.last_error = (msg, errcode)
                if "invalid totp" in msg.lower() and attempt < 2:
                    delay = 2 if attempt == 0 else 5
                    logger.warning(f"TOTP rejected (errorcode={errcode or 'AB1050'}), retrying with fresh code in {delay}s...")
                    time.sleep(delay)
                    continue
                logger.error(f"Angel One login failed: {msg} (errorcode={errcode})")
                return False
            return False
        except Exception as e:
            self.last_error = (str(e), "")
            logger.exception("Angel One connect error: %s", e)
            return False

    def renew_token(self) -> bool:
        """Renew JWT using refresh token (SmartAPI generateTokens). Call when JWT expires (e.g. 403)."""
        try:
            if not self.obj or not self.refresh_token:
                return False
            resp = self.obj.generateToken(self.refresh_token)
            if resp.get("status") in (True, "true") and resp.get("data"):
                self.jwt_token = resp["data"]["jwtToken"]
                self.feed_token = resp["data"].get("feedToken") or self.feed_token
                logger.info("Angel One token renewed")
                return True
            return False
        except Exception as e:
            logger.error("Token renew failed: %s", e)
            return False

    def get_profile(self) -> Optional[Dict]:
        """Get user profile. SmartAPI getProfile expects refreshToken (not JWT)."""
        try:
            if not self.obj:
                return None
            # SDK getProfile(refreshToken) per SmartAPI docs
            token = self.refresh_token or self.jwt_token
            if not token:
                return None
            return self.obj.getProfile(token)
        except Exception as e:
            logger.error("Error getting profile: %s", e)
            return None
    
    def place_buy_order(
        self,
        symbol: str,
        token: str,
        quantity: int,
        price: float,
        order_type: str = "LIMIT"
    ) -> Optional[Dict]:
        """
        Place a buy order
        
        Args:
            symbol: Trading symbol (e.g., 'NIFTY25JAN29100CE')
            token: Instrument token
            quantity: Number of lots/contracts
            price: Limit price
            order_type: Order type (LIMIT/MARKET)
        """
        if not self.obj:
            logger.error("place_buy_order: broker not connected")
            return None
        try:
            order_params = {
                "variety": Config.VARIETY,
                "tradingsymbol": symbol,
                "symboltoken": token,
                "transactiontype": "BUY",
                "exchange": Config.EXCHANGE,
                "ordertype": order_type,
                "producttype": Config.PRODUCT_TYPE,
                "duration": Config.ORDER_DURATION,
                "price": str(price),
                "squareoff": "0",
                "stoploss": "0",
                "quantity": str(quantity)
            }
            
            response = self.obj.placeOrder(order_params)
            logger.info(f"Buy order placed: {symbol} | Qty: {quantity} | Price: {price}")
            return response
            
        except Exception as e:
            logger.error(f"Error placing buy order: {str(e)}")
            return None
    
    def place_sell_order(
        self,
        symbol: str,
        token: str,
        quantity: int,
        price: float,
        order_type: str = "LIMIT"
    ) -> Optional[Dict]:
        """
        Place a sell order
        
        Args:
            symbol: Trading symbol
            token: Instrument token
            quantity: Number of lots/contracts
            price: Limit price
            order_type: Order type (LIMIT/MARKET)
        """
        if not self.obj:
            logger.error("place_sell_order: broker not connected")
            return None
        try:
            order_params = {
                "variety": Config.VARIETY,
                "tradingsymbol": symbol,
                "symboltoken": token,
                "transactiontype": "SELL",
                "exchange": Config.EXCHANGE,
                "ordertype": order_type,
                "producttype": Config.PRODUCT_TYPE,
                "duration": Config.ORDER_DURATION,
                "price": str(price),
                "squareoff": "0",
                "stoploss": "0",
                "quantity": str(quantity)
            }
            
            response = self.obj.placeOrder(order_params)
            logger.info(f"Sell order placed: {symbol} | Qty: {quantity} | Price: {price}")
            return response
            
        except Exception as e:
            logger.error(f"Error placing sell order: {str(e)}")
            return None
    
    def cancel_order(self, order_id: str) -> Optional[Dict]:
        """Cancel an order"""
        try:
            response = self.obj.cancelOrder(
                Config.VARIETY,
                order_id
            )
            logger.info(f"Order cancelled: {order_id}")
            return response
        except Exception as e:
            logger.error(f"Error cancelling order: {str(e)}")
            return None
    
    def get_all_open_orders(self) -> List[Dict]:
        """Get all open orders (returns list of dicts). Use get_all_open_orders_as_df() for DataFrame."""
        try:
            response = self.obj.orderBook()
            if response and response.get('status'):
                return response.get('data', [])
            return []
        except Exception as e:
            logger.error(f"Error getting open orders: {str(e)}")
            return []

    def get_all_open_orders_as_df(self):
        """Get all pending orders as a pandas DataFrame. Returns empty DataFrame on error or no pandas."""
        try:
            import pandas as pd
            data = self.get_all_open_orders()
            return pd.DataFrame(data) if data else pd.DataFrame()
        except Exception as e:
            logger.debug(f"get_all_open_orders_as_df: {e}")
            return None

    def get_position(self) -> List[Dict]:
        """Get current positions"""
        try:
            response = self.obj.position()
            if response and response.get('status'):
                return response.get('data', [])
            return []
        except Exception as e:
            logger.error(f"Error getting positions: {str(e)}")
            return []
    
    def get_tradebook(self) -> List[Dict]:
        """Get trade book (executed trades)"""
        try:
            response = self.obj.tradeBook()
            if response and response.get('status'):
                return response.get('data', [])
            return []
        except Exception as e:
            logger.error(f"Error getting tradebook: {str(e)}")
            return []
    
    def get_ltp(self, exchange: str, symbol_token: str, tradingsymbol: Optional[str] = None) -> Optional[float]:
        """Get Last Traded Price (LTP). SmartAPI requires exchange, tradingsymbol, symboltoken."""
        try:
            ts = (tradingsymbol or "").strip() or str(symbol_token)
            logger.debug("[broker] get_ltp request exchange=%s symboltoken=%s tradingsymbol=%s", exchange, symbol_token, ts)
            _step("broker", "get_ltp", "request", exchange=exchange, symboltoken=symbol_token, tradingsymbol=ts)
            response = self.obj.ltpData(exchange, ts, str(symbol_token))
            if response and response.get('status'):
                ltp = float(response['data']['ltp'])
                logger.debug("[broker] get_ltp OK ltp=%s", ltp)
                _step("broker", "get_ltp", "OK", ltp=ltp)
                return ltp
            logger.debug("[broker] get_ltp no data in response status=%s", response.get('status') if response else None)
            _step("broker", "get_ltp", "no data")
            return None
        except Exception as e:
            logger.exception("Error getting LTP: %s", e)
            _step("broker", "get_ltp", "error", error=str(e))
            return None
    
    def get_historical_data(
        self,
        token: str,
        exchange: str,
        interval: str,
        from_date: str,
        to_date: str,
        tradingsymbol: Optional[str] = None,
    ) -> Optional[List[Dict]]:
        """
        Get historical OHLC data
        
        Args:
            token: Instrument token
            exchange: Exchange (NSE/NFO)
            interval: Timeframe (ONE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE)
            from_date: Start date (YYYY-MM-DD HH:mm:ss)
            to_date: End date (YYYY-MM-DD HH:mm:ss)
            tradingsymbol: Optional; required for some indices (e.g. Nifty 50)
        """
        try:
            params = {
                "exchange": exchange,
                "symboltoken": token,
                "interval": interval,
                "fromdate": from_date,
                "todate": to_date,
            }
            if tradingsymbol:
                params["tradingsymbol"] = tradingsymbol
            _step("broker", "get_historical_data", "request", token=token, interval=interval, fromdate=from_date, todate=to_date)
            response = self.obj.getCandleData(params)
            if response and response.get('status'):
                data = response.get('data', [])
                _step("broker", "get_historical_data", "OK", rows=len(data))
                return data
            _step("broker", "get_historical_data", "no data")
            return []
        except Exception as e:
            logger.exception("Error getting historical data: %s", e)
            _step("broker", "get_historical_data", "error", error=str(e))
            return None
    
    def cancel_all(self) -> int:
        """
        Cancel all open orders
        
        Returns:
            Number of orders cancelled
        """
        try:
            open_orders = self.get_all_open_orders()
            cancelled_count = 0
            
            for order in open_orders:
                order_id = order.get('orderid') or order.get('order_id')
                if order_id:
                    result = self.cancel_order(str(order_id))
                    if result and result.get('status'):
                        cancelled_count += 1
            
            logger.info(f"Cancelled {cancelled_count} orders")
            return cancelled_count
        except Exception as e:
            logger.error(f"Error cancelling all orders: {str(e)}")
            return 0

    def squareoff(self, exchange: str = None, wait_seconds: int = 30) -> int:
        """
        Square off all open positions at LTP. Cancels open orders, places opposite orders
        at LTP for each position, waits, then logs current positions.
        Returns number of positions squared off.
        """
        exchange = exchange or getattr(Config, "EXCHANGE", "NSE")
        try:
            self.cancel_all()
            positions = self.get_position() or []
            squared = 0
            for position in positions:
                symbol = position.get("tradingsymbol") or position.get("symbol")
                token = position.get("symboltoken") or position.get("token")
                quantity = int(position.get("netqty", 0))
                if quantity == 0:
                    continue
                ltp = self.get_ltp(exchange, str(token), position.get("tradingsymbol")) if token else None
                if ltp is None or float(ltp) <= 0:
                    logger.warning(f"squareoff: no LTP for {symbol}, skip")
                    continue
                if quantity > 0:
                    self.place_sell_order(symbol, str(token), abs(quantity), float(ltp) * 0.99, "LIMIT")
                else:
                    self.place_buy_order(symbol, str(token), abs(quantity), float(ltp) * 1.01, "LIMIT")
                squared += 1
                logger.info(f"Squared off {symbol} qty={quantity} at ~{ltp}")
            if wait_seconds > 0:
                time.sleep(wait_seconds)
            remaining = self.get_position() or []
            logger.info(f"Positions after squareoff (wait {wait_seconds}s): {len(remaining)}")
            return squared
        except Exception as e:
            logger.error(f"squareoff error: {e}")
            return 0

    def logout(self):
        """Logout from Angel One API"""
        try:
            if self.obj:
                self.obj.terminateSession(self.client_id)
                logger.info("Logged out from Angel One API")
        except Exception as e:
            logger.error(f"Error logging out: {str(e)}")
