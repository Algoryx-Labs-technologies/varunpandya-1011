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

# Optional: use central alert for repeated failures
try:
    from utils.logging_alert import log_module, alert, ALERT_WARNING
except ImportError:
    def log_module(m, a, msg, **k): logger.info(f"[{m}] {a}: {msg}")
    def alert(sev, msg, payload=None): logger.warning(f"[ALERT] {msg}")
    ALERT_WARNING = "warning"

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

            data = self.broker.get_historical_data(
                token=token,
                exchange=Config.EXCHANGE,
                interval=interval_map.get(timeframe, "ONE_MINUTE"),
                from_date=from_str,
                to_date=to_str,
            )

            if not data:
                log_module("data_fetcher", "fetch_ohlc", "No data from broker", index=index, timeframe=timeframe)
                return None

            df = pd.DataFrame(data)
            if df.empty or len(df.columns) < 6:
                logger.warning(f"fetch_ohlc_data: empty or invalid columns for {index} {timeframe}")
                return None
            df.columns = ["timestamp", "open", "high", "low", "close", "volume"]
            df["timestamp"] = pd.to_datetime(df["timestamp"], format="%Y-%m-%dT%H:%M:%S", errors="coerce")
            df = df.dropna(subset=["timestamp"])
            if df.empty:
                return None
            for col in ["open", "high", "low", "close", "volume"]:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            df = df.dropna(subset=["open", "high", "low", "close"])
            df.set_index("timestamp", inplace=True)
            df = df.sort_index()
            log_module("data_fetcher", "fetch_ohlc", f"Fetched {len(df)} candles", index=index, timeframe=timeframe, rows=len(df))
            return df

        except Exception as e:
            logger.exception(f"fetch_ohlc_data failed: {e}")
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

        url = f"https://www.nseindia.com/api/option-chain-indices?symbol={index}"
        session = requests.Session()
        session.headers.update(self.nse_headers)
        last_error = None
        for attempt in range(self.nse_retries + 1):
            try:
                session.get("https://www.nseindia.com/", timeout=self.timeout)
                response = session.get(url, timeout=self.timeout)
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
            return None

        try:
            records = data.get("records") or {}
            option_data = records.get("data") or []
            if not option_data:
                logger.warning(f"fetch_option_chain: empty data for {index}")
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

            result = {
                "index": index,
                "timestamp": datetime.now().isoformat(),
                "calls": pd.DataFrame(calls) if calls else pd.DataFrame(columns=["strike", "ltp", "oi", "volume", "bid", "ask", "symbol"]),
                "puts": pd.DataFrame(puts) if puts else pd.DataFrame(columns=["strike", "ltp", "oi", "volume", "bid", "ask", "symbol"]),
                "underlying_value": underlying,
            }
            log_module("data_fetcher", "fetch_option_chain", f"OK calls={len(calls)} puts={len(puts)}", index=index)
            return result
        except Exception as e:
            logger.exception(f"fetch_option_chain parse error: {e}")
            return None
    
    def get_current_price(self, index: str) -> Optional[float]:
        """Broker LTP first, then NSE option chain underlying. None if invalid or missing."""
        try:
            index = (index or "").strip().upper()
            if index not in VALID_INDICES:
                return None
            token = self.get_index_token(index)
            if token:
                price = self.broker.get_ltp(Config.EXCHANGE, token)
                if price is not None and not (isinstance(price, float) and math.isnan(price)) and price > 0:
                    return float(price)
            chain = self.fetch_option_chain(index)
            if chain:
                uv = chain.get("underlying_value")
                if uv is not None and uv > 0:
                    return float(uv)
            return None
        except Exception as e:
            logger.error(f"get_current_price: {e}")
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
