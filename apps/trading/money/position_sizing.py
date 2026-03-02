"""
Money Management and Position Sizing Module
Handles capital allocation and strike selection from real-time option chain.
Edge cases: zero/negative underlying, empty strikes, NaN prices, zero allocation, invalid index/preference.
"""
import math
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from loguru import logger
from config import Config

VALID_INDICES = frozenset(getattr(Config, "INDEX_SYMBOLS", {}).keys() or {"NIFTY", "BANKNIFTY", "FINNIFTY"})
VALID_PREFERENCE = ("best_return", "atm", "itm", "otm")


def _safe_float(v: Any, default: float) -> float:
    try:
        if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v) or v < 0)):
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


def _moneyness(
    underlying: float,
    strike: float,
    option_type: str,
    atm_band_pct: float = 0.002,
) -> str:
    """
    Classify strike as ATM, ITM, or OTM.
    option_type: 'call' or 'put'
    ATM band: ±0.2% of underlying (e.g. ~50 pts for Nifty 24k).
    """
    if underlying <= 0:
        return "atm"
    pct = (strike - underlying) / underlying
    if abs(pct) <= atm_band_pct:
        return "atm"
    if option_type == "call":
        return "itm" if strike < underlying else "otm"
    else:  # put
        return "itm" if strike > underlying else "otm"


class PositionSizer:
    """Handles position sizing and strike selection (best return across ATM/ITM/OTM)."""

    def __init__(self):
        self.capital = Config.TRADING_CAPITAL
        self.allocations = {
            "NIFTY": Config.get_allocation("NIFTY"),
            "BANKNIFTY": Config.get_allocation("BANKNIFTY"),
            "FINNIFTY": Config.get_allocation("FINNIFTY"),
        }
        self.lot_sizes = getattr(Config, "LOT_SIZES", {"NIFTY": 50, "BANKNIFTY": 25, "FINNIFTY": 25})
        self.strike_preference = getattr(Config, "STRIKE_PREFERENCE", "best_return")

    def select_strike_best_return(
        self,
        underlying_price: float,
        strikes: List[float],
        option_prices: List[float],
        index: str,
        direction: str,
        preference: Optional[str] = None,
    ) -> Optional[Tuple[float, int, float, str]]:
        """
        Choose strike with best return (allocation) among ATM / ITM / OTM.
        preference: 'best_return' | 'atm' | 'itm' | 'otm'
        Returns: (strike, quantity, capital_used, moneyness) or None.
        """
        index = (index or "").strip().upper()
        if index not in VALID_INDICES:
            logger.warning("select_strike_best_return: invalid index")
            return None
        pref = (preference or self.strike_preference or "best_return").strip().lower()
        if pref not in VALID_PREFERENCE:
            pref = "best_return"
        underlying_price = _safe_float(underlying_price, 0)
        if underlying_price <= 0:
            logger.warning("select_strike_best_return: underlying_price must be > 0")
            return None
        if not strikes or not option_prices or len(strikes) != len(option_prices):
            logger.error("select_strike_best_return: invalid or mismatched strikes/prices")
            return None

        available_capital = _safe_float(self.allocations.get(index, 0), 0)
        if available_capital <= 0:
            logger.error(f"No capital allocated for {index}")
            return None

        lot_size = max(1, int(self.lot_sizes.get(index, 50) or 50))
        option_type = "call" if (str(direction or "").strip().lower() == "call") else "put"

        rows = []
        for strike, price in zip(strikes, option_prices):
            strike_f = _safe_float(strike, 0)
            price_f = _safe_float(price, 0)
            if strike_f <= 0 or price_f <= 0:
                continue
            moneyness = _moneyness(underlying_price, strike_f, option_type)
            contracts_raw = available_capital / price_f
            lots = int(contracts_raw) // lot_size
            if lots < 1:
                continue
            qty = lots * lot_size
            capital_used = qty * price_f
            utilization = capital_used / available_capital if available_capital else 0
            rows.append({
                "strike": strike_f,
                "price": price_f,
                "qty": qty,
                "capital_used": capital_used,
                "utilization": utilization,
                "moneyness": moneyness,
            })

        if not rows:
            logger.warning(f"No valid strikes for {index}")
            return None

        df = pd.DataFrame(rows)

        if pref == "atm":
            df = df[df["moneyness"] == "atm"]
        elif pref == "itm":
            df = df[df["moneyness"] == "itm"]
        elif pref == "otm":
            df = df[df["moneyness"] == "otm"]
        # else: best_return → use all, pick best allocation

        if df.empty:
            # Fallback: use all rows (e.g. no ATM found)
            df = pd.DataFrame(rows)

        # Best return = max allocation (capital_used) then max utilization
        df = df.sort_values(["capital_used", "utilization"], ascending=[False, False])
        row = df.iloc[0]

        logger.info(
            f"Strike selected: {row['strike']} ({row['moneyness'].upper()}) "
            f"qty={row['qty']} capital_used={row['capital_used']:.2f}"
        )
        return (
            float(row["strike"]),
            int(row["qty"]),
            float(row["capital_used"]),
            row["moneyness"],
        )

    def select_optimal_strike(
        self,
        strikes: List[float],
        option_prices: List[float],
        index: str,
        direction: str,
        underlying_price: Optional[float] = None,
        preference: Optional[str] = None,
    ) -> Optional[Tuple[float, int, float]]:
        """
        Select optimal strike (backward-compatible).
        If underlying_price and preference given, uses select_strike_best_return.
        Returns: (selected_strike, quantity, capital_used) or None.
        """
        if underlying_price is not None and (preference or self.strike_preference):
            result = self.select_strike_best_return(
                underlying_price, strikes, option_prices, index, direction, preference
            )
            if result:
                strike, qty, cap, _ = result
                return (strike, qty, cap)
            return None

        # Legacy: max utilization without moneyness
        if not strikes or not option_prices or len(strikes) != len(option_prices):
            return None
        available_capital = self.allocations.get(index, 0)
        if available_capital <= 0:
            return None
        lot_size = self.lot_sizes.get(index, 50)

        results = []
        for strike, price in zip(strikes, option_prices):
            if price <= 0:
                continue
            lots = int(available_capital / price) // lot_size
            if lots < 1:
                continue
            qty = lots * lot_size
            capital_used = qty * price
            results.append(
                {"strike": strike, "qty": qty, "capital_used": capital_used, "utilization": capital_used / available_capital}
            )
        if not results:
            return None
        best = max(results, key=lambda x: (x["utilization"], x["capital_used"]))
        return (best["strike"], best["qty"], best["capital_used"])

    def calculate_position_size(
        self,
        option_price: float,
        index: str,
        risk_percentage: float = 1.0,
    ) -> Tuple[int, float]:
        """Quantity and capital_required for given option price and risk %."""
        available_capital = self.allocations.get(index, 0)
        risk_capital = available_capital * (risk_percentage / 100)
        if option_price <= 0:
            return 0, 0.0
        lot_size = self.lot_sizes.get(index, 50)
        lots = int(risk_capital / option_price) // lot_size
        qty = lots * lot_size
        return qty, qty * option_price

    def adjust_position_for_lot_size(self, quantity: int, lot_size: int = 50) -> int:
        """Round down to nearest lot."""
        if quantity < lot_size:
            return 0
        return (quantity // lot_size) * lot_size

    def get_available_capital(self, index: str) -> float:
        return self.allocations.get(index, 0)

    def update_capital(self, index: str, amount: float) -> None:
        if index in self.allocations:
            self.allocations[index] = max(0, self.allocations[index] - amount)

    def reset_daily_capital(self) -> None:
        self.allocations = {
            "NIFTY": Config.get_allocation("NIFTY"),
            "BANKNIFTY": Config.get_allocation("BANKNIFTY"),
            "FINNIFTY": Config.get_allocation("FINNIFTY"),
        }
        logger.info("Daily capital reset")

    def select_strike_from_option_chain(
        self,
        option_chain: Dict[str, Any],
        index: str,
        direction: str,
        preference: Optional[str] = None,
        max_strikes: int = 20,
    ) -> Optional[Tuple[float, int, float, str, str]]:
        """
        Choose strike with best return from real-time option chain data.
        Uses current asset price (underlying_value) and strike LTP from chain.
        Strategy: classify ATM/ITM/OTM from underlying vs strike; pick best
        allocation (max capital usage) in chosen moneyness.
        Returns: (strike, quantity, capital_used, moneyness, symbol) or None.
        """
        if not option_chain:
            logger.error("Option chain is empty")
            return None

        underlying = option_chain.get("underlying_value") or option_chain.get("underlyingValue")
        if not underlying or underlying <= 0:
            logger.error("Invalid underlying in option chain")
            return None

        if direction == "call":
            df = option_chain.get("calls")
        else:
            df = option_chain.get("puts")

        if df is None or (hasattr(df, "empty") and df.empty):
            logger.error("No options in chain for direction %s", direction)
            return None

        if isinstance(df, pd.DataFrame):
            if "strike" not in df.columns or "ltp" not in df.columns:
                logger.error("Option chain must have strike and ltp")
                return None
            strikes = df["strike"].astype(float).tolist()
            prices = df["ltp"].astype(float).tolist()
            symbols = df["symbol"].tolist() if "symbol" in df.columns else [""] * len(strikes)
        else:
            strikes = [float(x.get("strike", 0)) for x in df]
            prices = [float(x.get("ltp", 0)) for x in df]
            symbols = [x.get("symbol", "") for x in df] if isinstance(df, list) else []

        if len(strikes) > max_strikes:
            mid = len(strikes) // 2
            half = max_strikes // 2
            strikes = strikes[mid - half : mid + half]
            prices = prices[mid - half : mid + half]
            symbols = symbols[mid - half : mid + half] if symbols else [""] * len(strikes)

        result = self.select_strike_best_return(
            float(underlying),
            strikes,
            prices,
            index,
            direction,
            preference=preference or self.strike_preference,
        )
        if not result:
            return None

        strike, qty, capital_used, moneyness = result
        # Match by value (float) to get symbol from chain
        idx = min(range(len(strikes)), key=lambda i: abs(float(strikes[i]) - float(strike))) if strikes else 0
        symbol = symbols[idx] if symbols and idx < len(symbols) else ""
        return (strike, qty, capital_used, moneyness, symbol)
