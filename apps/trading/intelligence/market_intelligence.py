"""
Vertex Market Intelligence — Institutional-Grade Sentiment & Regime Filters

Options-derived sentiment (PCR, OI momentum), volatility regime, volume
confirmation, and trend strength. Produces a normalized composite score (0–100)
for signal filtering and regime awareness. TA-Lib optional for ATR/EMA.
"""
from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd
from loguru import logger

try:
    import talib
    _HAS_TALIB = True
except ImportError:
    talib = None
    _HAS_TALIB = False


class MarketIntelligence:
    """
    Composite market filters: PCR, OI momentum, volatility spike,
    volume breakout, trend. Outputs interpretable score and raw metrics.
    """

    @staticmethod
    def put_call_ratio(option_chain: Optional[Dict]) -> float:
        """
        Put-Call Ratio (OI-based): sentiment proxy.
        PCR > 1: put bias (bearish); PCR < 1: call bias (bullish).
        Returns 1.0 (neutral) if data missing or invalid.
        """
        if not option_chain or not isinstance(option_chain, dict):
            return 1.0
        try:
            calls_df = option_chain.get("calls")
            puts_df = option_chain.get("puts")
            if calls_df is None or puts_df is None:
                return 1.0
            if hasattr(calls_df, "columns") and "oi" not in getattr(calls_df, "columns", []):
                return 1.0
            if hasattr(puts_df, "columns") and "oi" not in getattr(puts_df, "columns", []):
                return 1.0
            total_call_oi = float(calls_df["oi"].sum()) if hasattr(calls_df, "sum") else 0
            total_put_oi = float(puts_df["oi"].sum()) if hasattr(puts_df, "sum") else 0
            if total_call_oi <= 0:
                return 1.0
            return round(total_put_oi / total_call_oi, 4)
        except Exception as e:
            logger.debug(f"PCR error: {e}")
            return 1.0

    @staticmethod
    def oi_momentum(
        option_chain: Optional[Dict],
        previous_chain: Optional[Dict] = None,
    ) -> Dict[str, float]:
        """
        Open-interest momentum (% change) for calls and puts.
        Positive call_oi_momentum: call writing or long buildup; put ditto.
        """
        out = {"call_oi_momentum": 0.0, "put_oi_momentum": 0.0}
        if not option_chain or previous_chain is None:
            return out
        try:
            def _oi_sum(df) -> float:
                if df is None or not hasattr(df, "get"):
                    return 0.0
                if hasattr(df, "columns") and "oi" in getattr(df, "columns", []):
                    return float(df["oi"].sum())
                return 0.0

            cur_c = _oi_sum(option_chain.get("calls"))
            cur_p = _oi_sum(option_chain.get("puts"))
            prev_c = _oi_sum(previous_chain.get("calls"))
            prev_p = _oi_sum(previous_chain.get("puts"))

            out["call_oi_momentum"] = round(((cur_c - prev_c) / prev_c * 100) if prev_c > 0 else 0, 2)
            out["put_oi_momentum"] = round(((cur_p - prev_p) / prev_p * 100) if prev_p > 0 else 0, 2)
            return out
        except Exception as e:
            logger.debug(f"OI momentum error: {e}")
            return out

    @staticmethod
    def volatility_spike_detection(
        df: Optional[pd.DataFrame],
        period: int = 20,
        threshold: float = 2.0,
    ) -> Tuple[bool, float]:
        """
        ATR-based volatility regime: True if current ATR > threshold (default 2)
        standard deviations above rolling mean. Second return: current ATR / mean ATR.
        """
        if df is None or len(df) < period or "high" not in df.columns or "low" not in df.columns or "close" not in df.columns:
            return False, 1.0
        try:
            h, l, c = df["high"].values, df["low"].values, df["close"].values
            if _HAS_TALIB:
                atr = talib.ATR(h, l, c, timeperiod=period)
            else:
                tr = np.maximum(h - l, np.maximum(np.abs(h - np.roll(c, 1)), np.abs(l - np.roll(c, 1))))
                atr = pd.Series(tr).rolling(period).mean().values
            atr_series = pd.Series(atr).dropna()
            if len(atr_series) < period:
                return False, 1.0
            current = float(atr_series.iloc[-1])
            mean_atr = float(atr_series.rolling(period).mean().iloc[-1])
            std_atr = float(atr_series.rolling(period).std().iloc[-1])
            if mean_atr <= 0:
                return False, 1.0
            vol_ratio = current / mean_atr
            if std_atr <= 0:
                return False, round(vol_ratio, 4)
            z = (current - mean_atr) / std_atr
            return bool(z > threshold), round(vol_ratio, 4)
        except Exception as e:
            logger.debug(f"Volatility spike error: {e}")
            return False, 1.0

    @staticmethod
    def volume_breakout_filter(
        df: Optional[pd.DataFrame],
        period: int = 20,
        multiplier: float = 1.5,
    ) -> bool:
        """True if latest volume > multiplier × rolling average volume."""
        if df is None or len(df) < period or "volume" not in df.columns:
            return False
        try:
            vol = df["volume"].astype(float)
            avg = vol.rolling(window=period).mean().iloc[-1]
            cur = vol.iloc[-1]
            if avg <= 0:
                return False
            return bool(cur / avg >= multiplier)
        except Exception as e:
            logger.debug(f"Volume breakout error: {e}")
            return False

    @staticmethod
    def trend_filter(
        df: Optional[pd.DataFrame],
        fast_period: int = 12,
        slow_period: int = 26,
    ) -> Dict[str, float]:
        """
        EMA trend: direction (-1/0/1) and strength (% of price).
        irection 1: bullish; -1: bearish; 0: sideways.
        """
        out = {"trend_direction": 0, "trend_strength": 0.0, "ema_fast": 0.0, "ema_slow": 0.0}
        if df is None or len(df) < slow_period or "close" not in df.columns:
            return out
        try:
            c = df["close"].values.astype(float)
            if _HAS_TALIB:
                ema_f = talib.EMA(c, timeperiod=fast_period)
                ema_s = talib.EMA(c, timeperiod=slow_period)
            else:
                ema_f = pd.Series(c).ewm(span=fast_period, adjust=False).mean().values
                ema_s = pd.Series(c).ewm(span=slow_period, adjust=False).mean().values
            last = len(c) - 1
            fast_slope = (ema_f[last] - ema_f[last - 5]) / 5 if last >= 5 else 0
            slow_slope = (ema_s[last] - ema_s[last - 5]) / 5 if last >= 5 else 0
            if ema_f[last] > ema_s[last] and fast_slope > 0:
                out["trend_direction"] = 1
            elif ema_f[last] < ema_s[last] and fast_slope < 0:
                out["trend_direction"] = -1
            out["trend_strength"] = round(abs(fast_slope) / c[last] * 100, 4) if c[last] > 0 else 0
            out["ema_fast"] = round(float(ema_f[last]), 2)
            out["ema_slow"] = round(float(ema_s[last]), 2)
            return out
        except Exception as e:
            logger.debug(f"Trend filter error: {e}")
            return out

    @staticmethod
    def apply_all_filters(
        df: Optional[pd.DataFrame],
        option_chain: Optional[Dict],
        previous_chain: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Run all filters and return raw metrics plus composite filter_score (0–100).
        Score interpretation: >60 bullish bias, <40 bearish bias, 40–60 neutral.
        """
        try:
            pcr = MarketIntelligence.put_call_ratio(option_chain)
            oi_mom = MarketIntelligence.oi_momentum(option_chain, previous_chain)
            vol_spike, vol_ratio = MarketIntelligence.volatility_spike_detection(df)
            vol_break = MarketIntelligence.volume_breakout_filter(df)
            trend = MarketIntelligence.trend_filter(df)
            score = MarketIntelligence._composite_score(pcr, oi_mom, vol_spike, vol_break, trend)
            return {
                "put_call_ratio": pcr,
                "oi_momentum": oi_mom,
                "volatility_spike": vol_spike,
                "volatility_ratio": vol_ratio,
                "volume_breakout": vol_break,
                "trend": trend,
                "filter_score": score,
                "interpretation": "bullish" if score > 60 else ("bearish" if score < 40 else "neutral"),
            }
        except Exception as e:
            logger.error(f"apply_all_filters error: {e}")
            return {
                "put_call_ratio": 1.0,
                "oi_momentum": {"call_oi_momentum": 0, "put_oi_momentum": 0},
                "volatility_spike": False,
                "volatility_ratio": 1.0,
                "volume_breakout": False,
                "trend": {"trend_direction": 0, "trend_strength": 0, "ema_fast": 0, "ema_slow": 0},
                "filter_score": 50,
                "interpretation": "neutral",
            }

    @staticmethod
    def _composite_score(
        pcr: float,
        oi_momentum: Dict[str, float],
        volatility_spike: bool,
        volume_breakout: bool,
        trend: Dict[str, Any],
    ) -> float:
        """Normalized 0–100 score from PCR, OI, volatility, volume, trend."""
        score = 50.0
        if pcr > 1.2:
            score -= 12
        elif pcr < 0.8:
            score += 12
        if oi_momentum.get("call_oi_momentum", 0) > 10:
            score += 6
        if oi_momentum.get("put_oi_momentum", 0) > 10:
            score -= 6
        if volatility_spike:
            score += 5
        if volume_breakout:
            score += 10
        td = trend.get("trend_direction", 0)
        ts = trend.get("trend_strength", 0)
        if abs(ts) > 0.3:
            score += 6 if td > 0 else -6
        return round(max(0, min(100, score)), 2)
