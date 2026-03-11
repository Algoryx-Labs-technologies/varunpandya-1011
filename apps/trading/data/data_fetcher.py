"""
Data Acquisition Module
Fetches OHLC from broker (Angel One) and option chain from NSE only. No yfinance.
Edge cases: invalid index/timeframe, empty data, NaN, empty option chain, timeout/retries.
"""
import os
import time
import math
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import requests
from loguru import logger
from broker.angel_one import AngelOneBroker
from config import Config
from .historical_storage import save_index_ohlc

# Optional: use central alert for repeated failures
try:
    from utils.logging_alert import log_module, alert, ALERT_WARNING
except ImportError:
    def log_module(m, a, msg, **k): logger.info(f"[{m}] {a}: {msg}")
    def alert(sev, msg, payload=None): logger.warning(f"[ALERT] {msg}")
    ALERT_WARNING = "warning"
try:
    from utils.logging_config import step_log as _step
except ImportError:
    def _step(m, s, d="", **k): logger.info(f"[{m}] {s} | {d}")

VALID_INDICES = frozenset(getattr(Config, "INDEX_SYMBOLS", {}).keys() or {"NIFTY", "BANKNIFTY", "FINNIFTY"})
VALID_TIMEFRAMES = frozenset(getattr(Config, "TIMEFRAMES", []) or ["1m", "5m", "15m"])


def _get_timeout() -> int:
    try:
        return max(5, int(os.getenv('DATA_FETCH_TIMEOUT', '15')))
    except ValueError:
        return 15


def _get_nse_retries() -> int:
    try:
        return max(0, min(5, int(os.getenv('NSE_OPTION_CHAIN_RETRIES', '2'))))
    except ValueError:
        return 2


class DataFetcher:
    """Handles data acquisition: broker (OHLC), NSE (option chain only)."""
    
    def __init__(self, broker: AngelOneBroker):
        self.broker = broker
        self.timeout = _get_timeout()
        self.nse_retries = _get_nse_retries()
        self.nse_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.nseindia.com/'
        }
    
    def get_index_token(self, index: str) -> Optional[str]:
        """Get instrument token for index. Returns None if index invalid."""
        if not index or not isinstance(index, str):
            logger.warning("get_index_token: empty or invalid index")
            return None
        index = index.strip().upper()
        tokens = {
            "NIFTY": "99926000",
            "BANKNIFTY": "99926009",
            "FINNIFTY": "99926037",
        }
        return tokens.get(index)

    def get_index_tradingsymbol(self, index: str) -> Optional[str]:
        """Angel One tradingsymbol for LTP/historical (NSE index symbols)."""
        if not index or not isinstance(index, str):
            return None
        index = index.strip().upper()
        symbols = {
            "NIFTY": "Nifty 50",
            "BANKNIFTY": "Nifty Bank",
            "FINNIFTY": "Fin Nifty",
        }
        return symbols.get(index)
    
    def fetch_ohlc_data(
        self,
        index: str,
        timeframe: str,
        days_back: int = 1,
    ) -> Optional[pd.DataFrame]:
        """
        Fetch OHLC for index from broker only. Returns None on invalid input or failure.
        Edge cases: invalid index/timeframe, days_back<=0 or >30, empty/NaN in columns.
        """
        try:
            index = (index or "").strip().upper()
            timeframe = (timeframe or "1m").strip().lower()
            if index not in VALID_INDICES:
                logger.warning(f"fetch_ohlc_data: invalid index '{index}'")
                return None
            if timeframe not in VALID_TIMEFRAMES:
                logger.warning(f"fetch_ohlc_data: invalid timeframe '{timeframe}'")
                return None
            days_back = max(1, min(30, int(days_back) if days_back is not None else 1))

            interval_map = {"1m": "ONE_MINUTE", "5m": "FIVE_MINUTE", "15m": "FIFTEEN_MINUTE"}
            token = self.get_index_token(index)
            if not token:
                log_module("data_fetcher", "fetch_ohlc", f"Token not found for {index}", index=index)
                return None

            to_date = datetime.now()
            from_date = to_date - timedelta(days=days_back)
            from_str = from_date.strftime("%Y-%m-%d %H:%M")
            to_str = to_date.strftime("%Y-%m-%d %H:%M")

            logger.debug("[data] fetch_ohlc request index=%s timeframe=%s days_back=%s from=%s to=%s", index, timeframe, days_back, from_str, to_str)
            _step("data", "fetch_ohlc", "request", index=index, timeframe=timeframe, days_back=days_back)
            tradingsymbol = self.get_index_tradingsymbol(index)
            data = self.broker.get_historical_data(
                token=token,
                exchange=Config.EXCHANGE,
                interval=interval_map.get(timeframe, "ONE_MINUTE"),
                from_date=from_str,
                to_date=to_str,
                tradingsymbol=tradingsymbol,
            )

            if not data:
                log_module("data_fetcher", "fetch_ohlc", "No data from broker", index=index, timeframe=timeframe)
                return None

            df = pd.DataFrame(data)
            if df.empty or len(df.columns) < 6:
                logger.warning(f"fetch_ohlc_data: empty or invalid columns for {index} {timeframe}")
                return None
            df.columns = ["timestamp", "open", "high", "low", "close", "volume"]
            # Angel One returns e.g. 2023-11-16T09:15:00+05:30; use errors=coerce to accept timezone
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
            df = df.dropna(subset=["timestamp"])
            if df.empty:
                return None
            for col in ["open", "high", "low", "close", "volume"]:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            df = df.dropna(subset=["open", "high", "low", "close"])
            df.set_index("timestamp", inplace=True)
            df = df.sort_index()
            if len(df) > 0:
                logger.debug("[data] fetch_ohlc OK rows=%s first_ts=%s last_ts=%s", len(df), df.index[0], df.index[-1])
            log_module("data_fetcher", "fetch_ohlc", f"Fetched {len(df)} candles", index=index, timeframe=timeframe, rows=len(df))
            _step("data", "fetch_ohlc", "OK", index=index, timeframe=timeframe, rows=len(df))
            try:
                save_index_ohlc(index, timeframe, df)
                _step("data", "fetch_ohlc", "saved to historical", index=index, timeframe=timeframe)
            except Exception as _e:
                pass
            return df

        except Exception as e:
            logger.exception("fetch_ohlc_data failed: %s", e)
            return None
    
    def fetch_option_chain(self, index: str) -> Optional[Dict]:
        """
        Fetch option chain from NSE only. Edge cases: invalid index, empty records,
        missing CE/PE, invalid numeric fields (use 0), empty DataFrames.
        """
        index = (index or "").strip().upper()
        if index not in VALID_INDICES:
            logger.warning(f"fetch_option_chain: invalid index '{index}'")
            return None
        logger.debug("[data] fetch_option_chain request NSE index=%s url=option-chain-indices", index)
        _step("data", "fetch_option_chain", "request NSE", index=index)
        url = f"https://www.nseindia.com/api/option-chain-indices?symbol={index}"
        session = requests.Session()
        session.headers.update(self.nse_headers)
        last_error = None
        for attempt in range(self.nse_retries + 1):
            try:
                session.get("https://www.nseindia.com/", timeout=self.timeout)
                response = session.get(url, timeout=self.timeout)
                logger.debug("[data] fetch_option_chain NSE response status=%s len=%s", response.status_code, len(response.content) if response.content else 0)
                response.raise_for_status()
                data = response.json()
                break
            except Exception as e:
                last_error = e
                if attempt < self.nse_retries:
                    time.sleep(1)
                continue
        else:
            log_module("data_fetcher", "fetch_option_chain", f"Failed after {self.nse_retries + 1} attempts", index=index, error=str(last_error))
            alert(ALERT_WARNING, "NSE option chain fetch failed", {"index": index, "error": str(last_error)})
            try:
                from .historical_storage import load_latest_option_snapshot
                fallback = load_latest_option_snapshot(index)
                if fallback:
                    _step("data", "fetch_option_chain", "fallback from historical (NSE failed)", index=index)
                    return fallback
            except Exception:
                pass
            return None

        try:
            records = data.get("records") or {}
            option_data = records.get("data") or []
            if not option_data:
                logger.warning(f"fetch_option_chain: empty data for {index}")
                try:
                    from .historical_storage import load_latest_option_snapshot
                    fallback = load_latest_option_snapshot(index)
                    if fallback:
                        _step("data", "fetch_option_chain", "fallback from historical", index=index)
                        return fallback
                except Exception:
                    pass
                return None

            def _num(v, default=0):
                try:
                    return float(v) if v is not None and not (isinstance(v, float) and math.isnan(v)) else default
                except (TypeError, ValueError):
                    return default

            calls, puts = [], []
            for item in option_data:
                if not isinstance(item, dict):
                    continue
                if "CE" in item and item["CE"]:
                    ce = item["CE"]
                    calls.append({
                        "strike": _num(item.get("strikePrice"), 0),
                        "ltp": _num(ce.get("lastPrice"), 0),
                        "oi": _num(ce.get("openInterest"), 0),
                        "volume": _num(ce.get("totalTradedVolume"), 0),
                        "bid": _num(ce.get("bidPrice"), 0),
                        "ask": _num(ce.get("askPrice"), 0),
                        "symbol": str(ce.get("identifier", "") or ""),
                    })
                if "PE" in item and item["PE"]:
                    pe = item["PE"]
                    puts.append({
                        "strike": _num(item.get("strikePrice"), 0),
                        "ltp": _num(pe.get("lastPrice"), 0),
                        "oi": _num(pe.get("openInterest"), 0),
                        "volume": _num(pe.get("totalTradedVolume"), 0),
                        "bid": _num(pe.get("bidPrice"), 0),
                        "ask": _num(pe.get("askPrice"), 0),
                        "symbol": str(pe.get("identifier", "") or ""),
                    })

            underlying = _num(records.get("underlyingValue"), 0)
            if underlying <= 0:
                logger.warning(f"fetch_option_chain: invalid underlying_value for {index}")
                underlying = 0.0

            # Ensure required columns exist for real-time trading (avoid KeyError in main/position_sizer)
            cols = ["strike", "ltp", "oi", "volume", "bid", "ask", "symbol"]
            calls_df = pd.DataFrame(calls) if calls else pd.DataFrame(columns=cols)
            puts_df = pd.DataFrame(puts) if puts else pd.DataFrame(columns=cols)
            for c in cols:
                if c not in calls_df.columns:
                    calls_df[c] = 0.0 if c != "symbol" else ""
                if c not in puts_df.columns:
                    puts_df[c] = 0.0 if c != "symbol" else ""
            # Drop rows with invalid strike (NaN or <=0) so select_strike_from_option_chain does not break
            if not calls_df.empty and "strike" in calls_df.columns:
                calls_df = calls_df[pd.to_numeric(calls_df["strike"], errors="coerce").fillna(0) > 0]
            if not puts_df.empty and "strike" in puts_df.columns:
                puts_df = puts_df[pd.to_numeric(puts_df["strike"], errors="coerce").fillna(0) > 0]

            result = {
                "index": index,
                "timestamp": datetime.now().isoformat(),
                "calls": calls_df,
                "puts": puts_df,
                "underlying_value": underlying,
            }
            log_module("data_fetcher", "fetch_option_chain", f"OK calls={len(calls_df)} puts={len(puts_df)}", index=index)
            _step("data", "fetch_option_chain", "OK", index=index, calls=len(calls_df), puts=len(puts_df), underlying=underlying)
            return result
        except Exception as e:
            logger.exception("fetch_option_chain parse error: %s", e)
            return None
    
    def get_current_price(self, index: str) -> Optional[float]:
        """Broker LTP first, then NSE option chain underlying. None if invalid or missing."""
        try:
            index = (index or "").strip().upper()
            if index not in VALID_INDICES:
                return None
            logger.debug("[data] get_current_price request index=%s", index)
            _step("data", "get_current_price", "request", index=index)
            token = self.get_index_token(index)
            tradingsymbol = self.get_index_tradingsymbol(index)
            if token:
                try:
                    from broker.feed_websocket import get_ltp_from_feed
                    price = get_ltp_from_feed(token)
                    if price is not None and price > 0:
                        logger.debug("[data] get_current_price source=WebSocket feed price=%s", price)
                        _step("data", "get_current_price", "OK from WebSocket feed", index=index, price=price)
                        return float(price)
                except Exception as feed_err:
                    logger.debug("[data] get_current_price WebSocket feed skip: %s", feed_err)
                price = self.broker.get_ltp(Config.EXCHANGE, token, tradingsymbol)
                if price is not None and not (isinstance(price, float) and math.isnan(price)) and price > 0:
                    logger.debug("[data] get_current_price source=broker LTP price=%s", price)
                    _step("data", "get_current_price", "OK from broker LTP", index=index, price=price)
                    return float(price)
            logger.debug("[data] get_current_price trying option chain underlying")
            chain = self.fetch_option_chain(index)
            if chain:
                uv = chain.get("underlying_value")
                if uv is not None and uv > 0:
                    logger.debug("[data] get_current_price source=option_chain underlying value=%s", uv)
                    _step("data", "get_current_price", "OK from option chain underlying", index=index, underlying=uv)
                    return float(uv)
            logger.debug("[data] get_current_price no price available for index=%s", index)
            _step("data", "get_current_price", "no price", index=index)
            return None
        except Exception as e:
            logger.exception("get_current_price failed: %s", e)
            _step("data", "get_current_price", "error", index=index, error=str(e))
            return None
    
    def get_atm_strikes(self, index: str, num_strikes: int = 5) -> List[float]:
        """ATM strikes from option chain. Edge cases: empty chain, no strikes, num_strikes clamped."""
        try:
            if index not in VALID_INDICES:
                return []
            num_strikes = max(1, min(20, int(num_strikes) if num_strikes is not None else 5))
            chain = self.fetch_option_chain(index)
            if not chain or not isinstance(chain.get("calls"), pd.DataFrame):
                return []
            calls_df = chain["calls"]
            if calls_df.empty or "strike" not in calls_df.columns:
                return []
            strikes = sorted([float(s) for s in calls_df["strike"].dropna().unique() if float(s) > 0])
            if not strikes:
                return []
            underlying = float(chain.get("underlying_value") or 0)
            if underlying <= 0:
                underlying = strikes[len(strikes) // 2]
            atm_idx = min(range(len(strikes)), key=lambda i: abs(strikes[i] - underlying))
            half = num_strikes // 2
            start_idx = max(0, atm_idx - half)
            end_idx = min(len(strikes), atm_idx + half + 1)
            return strikes[start_idx:end_idx]
        except Exception as e:
            logger.error(f"get_atm_strikes: {e}")
            return []
