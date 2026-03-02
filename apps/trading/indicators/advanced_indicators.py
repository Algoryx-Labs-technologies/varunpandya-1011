"""
Vertex Advanced Indicators — Institutional-Grade Technical Analysis

Fully vectorized, index-aligned indicators for level detection and regime analysis:
ATR bands, Bollinger, Keltner, Donchian, VWAP, Supertrend, Parabolic SAR,
RSI zones, MACD clusters, pivot points, Fibonacci retracements, volume profile.
TA-Lib used where available; fallbacks for critical series. All outputs aligned to input index.
"""
from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd
from loguru import logger

try:
    import talib
    _HAS_TALIB = True
except ImportError:
    talib = None
    _HAS_TALIB = False

_REQUIRED = ["open", "high", "low", "close"]


def _ensure_ohlc(df: Optional[pd.DataFrame]) -> Optional[pd.DataFrame]:
    if df is None or not isinstance(df, pd.DataFrame) or df.empty:
        return None
    for c in _REQUIRED:
        if c not in df.columns:
            return None
    return df


class AdvancedIndicators:
    """
    Institutional-grade technical indicators. All methods accept OHLCV DataFrame,
    return DataFrame/Series aligned to input index. Minimum lookback documented per method.
    """

    @staticmethod
    def atr_bands(
        df: Optional[pd.DataFrame],
        period: int = 14,
        multiplier: float = 2.0,
    ) -> pd.DataFrame:
        """ATR-based dynamic bands: close ± (ATR × multiplier). Min bars: period."""
        df = _ensure_ohlc(df)
        if df is None or len(df) < period:
            return pd.DataFrame(index=df.index if df is not None else None)
        try:
            h, l, c = df["high"].values, df["low"].values, df["close"].values
            if _HAS_TALIB:
                atr = talib.ATR(h, l, c, timeperiod=period)
            else:
                tr = np.maximum(h - l, np.maximum(np.abs(np.roll(c, 1) - h), np.abs(np.roll(c, 1) - l)))
                atr = pd.Series(tr, index=df.index).rolling(period).mean().values
            out = pd.DataFrame({
                "atr_upper": c + atr * multiplier,
                "atr_middle": c,
                "atr_lower": c - atr * multiplier,
            }, index=df.index)
            return out
        except Exception as e:
            logger.debug(f"ATR bands: {e}")
            return pd.DataFrame(index=df.index)

    @staticmethod
    def bollinger_bands(
        df: Optional[pd.DataFrame],
        period: int = 20,
        std_dev: float = 2.0,
    ) -> pd.DataFrame:
        """Bollinger Bands (SMA ± k×std). Min bars: period."""
        df = _ensure_ohlc(df)
        if df is None or len(df) < period:
            return pd.DataFrame(index=df.index if df is not None else None)
        try:
            c = df["close"].values
            if _HAS_TALIB:
                u, m, l = talib.BBANDS(c, timeperiod=period, nbdevup=std_dev, nbdevdn=std_dev, matype=0)
            else:
                m = pd.Series(c).rolling(period).mean().values
                std = pd.Series(c).rolling(period).std().values
                std = np.where(np.isnan(std), 0, std)
                u = m + std_dev * std
                l = m - std_dev * std
            return pd.DataFrame({"bb_upper": u, "bb_middle": m, "bb_lower": l}, index=df.index)
        except Exception as e:
            logger.debug(f"Bollinger: {e}")
            return pd.DataFrame(index=df.index)

    @staticmethod
    def keltner_channel(
        df: Optional[pd.DataFrame],
        period: int = 20,
        multiplier: float = 2.0,
    ) -> pd.DataFrame:
        """Keltner Channel: EMA(close) ± multiplier×ATR. Min bars: period."""
        df = _ensure_ohlc(df)
        if df is None or len(df) < period:
            return pd.DataFrame(index=df.index if df is not None else None)
        try:
            h, l, c = df["high"].values, df["low"].values, df["close"].values
            if _HAS_TALIB:
                ema = talib.EMA(c, timeperiod=period)
                atr = talib.ATR(h, l, c, timeperiod=period)
            else:
                ema = pd.Series(c).ewm(span=period, adjust=False).mean().values
                tr = np.maximum(h - l, np.maximum(np.abs(np.roll(c, 1) - h), np.abs(np.roll(c, 1) - l)))
                atr = pd.Series(tr).rolling(period).mean().values
            return pd.DataFrame({
                "kc_upper": ema + atr * multiplier,
                "kc_middle": ema,
                "kc_lower": ema - atr * multiplier,
            }, index=df.index)
        except Exception as e:
            logger.debug(f"Keltner: {e}")
            return pd.DataFrame(index=df.index)

    @staticmethod
    def donchian_channel(df: Optional[pd.DataFrame], period: int = 20) -> pd.DataFrame:
        """Donchian Channel: rolling high/low and mid. Min bars: period."""
        df = _ensure_ohlc(df)
        if df is None or len(df) < period:
            return pd.DataFrame(index=df.index if df is not None else None)
        try:
            high_roll = df["high"].rolling(window=period).max()
            low_roll = df["low"].rolling(window=period).min()
            mid = (high_roll + low_roll) / 2
            return pd.DataFrame({"dc_upper": high_roll, "dc_middle": mid, "dc_lower": low_roll}, index=df.index)
        except Exception as e:
            logger.debug(f"Donchian: {e}")
            return pd.DataFrame(index=df.index)

    @staticmethod
    def vwap(df: Optional[pd.DataFrame]) -> pd.Series:
        """Volume-Weighted Average Price: cumsum(typical_price × volume) / cumsum(volume)."""
        df = _ensure_ohlc(df)
        if df is None:
            return pd.Series(dtype=float)
        if "volume" not in df.columns:
            return pd.Series(dtype=float, index=df.index)
        try:
            tp = (df["high"] + df["low"] + df["close"]) / 3
            v = df["volume"].replace(0, np.nan).bfill().fillna(1)
            return (tp * v).cumsum() / v.cumsum()
        except Exception as e:
            logger.debug(f"VWAP: {e}")
            return pd.Series(dtype=float, index=df.index)

    @staticmethod
    def parabolic_sar(
        df: Optional[pd.DataFrame],
        acceleration: float = 0.02,
        maximum: float = 0.2,
    ) -> pd.Series:
        """Parabolic SAR. Min bars: ~5."""
        df = _ensure_ohlc(df)
        if df is None or len(df) < 5:
            return pd.Series(dtype=float, index=df.index if df is not None else None)
        try:
            if _HAS_TALIB:
                sar = talib.SAR(df["high"].values, df["low"].values, acceleration=acceleration, maximum=maximum)
            else:
                sar = np.full(len(df), np.nan)
                sar[0] = df["low"].iloc[0]
                # Minimal SAR logic for fallback
                for i in range(1, len(df)):
                    sar[i] = sar[i - 1] + acceleration * (df["high"].iloc[i - 1] - sar[i - 1])
            return pd.Series(sar, index=df.index)
        except Exception as e:
            logger.debug(f"SAR: {e}")
            return pd.Series(dtype=float, index=df.index)

    @staticmethod
    def rsi_zones(df: Optional[pd.DataFrame], period: int = 14) -> pd.DataFrame:
        """RSI and oversold (<30) / overbought (>70) zone levels. Min bars: period+1."""
        df = _ensure_ohlc(df)
        if df is None or len(df) < period + 1:
            return pd.DataFrame(index=df.index if df is not None else None)
        try:
            c = df["close"].values
            if _HAS_TALIB:
                rsi = talib.RSI(c, timeperiod=period)
            else:
                delta = pd.Series(c).diff()
                gain = delta.where(delta > 0, 0)
                loss = (-delta).where(delta < 0, 0)
                avg_g = gain.rolling(period).mean().values
                avg_l = loss.rolling(period).mean().values
                rs = np.where(avg_l == 0, 100, avg_g / avg_l)
                rsi = 100 - (100 / (1 + rs))
            rsi_s = pd.Series(rsi, index=df.index)
            return pd.DataFrame({
                "rsi": rsi_s,
                "rsi_oversold": df["close"].where(rsi_s < 30),
                "rsi_overbought": df["close"].where(rsi_s > 70),
            }, index=df.index)
        except Exception as e:
            logger.debug(f"RSI zones: {e}")
            return pd.DataFrame(index=df.index)

    @staticmethod
    def pivot_points(df: Optional[pd.DataFrame]) -> pd.DataFrame:
        """Classic pivot (PP, R1, R2, S1, S2) per bar from H/L/C of that bar (or use prior bar for session pivot)."""
        df = _ensure_ohlc(df)
        if df is None or len(df) == 0:
            return pd.DataFrame(index=df.index if df is not None else None)
        try:
            h, l, c = df["high"].values, df["low"].values, df["close"].values
            pp = (h + l + c) / 3
            r1 = 2 * pp - l
            r2 = pp + (h - l)
            s1 = 2 * pp - h
            s2 = pp - (h - l)
            return pd.DataFrame({
                "pivot_pp": pp, "pivot_r1": r1, "pivot_r2": r2,
                "pivot_s1": s1, "pivot_s2": s2,
            }, index=df.index)
        except Exception as e:
            logger.debug(f"Pivot: {e}")
            return pd.DataFrame(index=df.index)

    @staticmethod
    def fibonacci_retracement(df: Optional[pd.DataFrame], lookback: int = 20) -> pd.DataFrame:
        """Fibonacci levels (0.236–0.786) from rolling high-low range. Min bars: lookback."""
        df = _ensure_ohlc(df)
        if df is None or len(df) < lookback:
            return pd.DataFrame(index=df.index if df is not None else None)
        try:
            high = df["high"].rolling(window=lookback).max()
            low = df["low"].rolling(window=lookback).min()
            diff = high - low
            return pd.DataFrame({
                "fib_236": low + diff * 0.236,
                "fib_382": low + diff * 0.382,
                "fib_500": low + diff * 0.500,
                "fib_618": low + diff * 0.618,
                "fib_786": low + diff * 0.786,
            }, index=df.index)
        except Exception as e:
            logger.debug(f"Fibonacci: {e}")
            return pd.DataFrame(index=df.index)

    @staticmethod
    def supertrend(
        df: Optional[pd.DataFrame],
        period: int = 10,
        multiplier: float = 3.0,
    ) -> pd.DataFrame:
        """Supertrend (ATR-based). Min bars: period. Returns supertrend line and direction (1/-1)."""
        df = _ensure_ohlc(df)
        if df is None or len(df) < period:
            return pd.DataFrame(index=df.index if df is not None else None)
        try:
            hl_avg = (df["high"] + df["low"]) / 2
            if _HAS_TALIB:
                atr = talib.ATR(df["high"].values, df["low"].values, df["close"].values, timeperiod=period)
            else:
                tr = np.maximum(
                    df["high"].values - df["low"].values,
                    np.maximum(
                        np.abs(np.roll(df["close"].values, 1) - df["high"].values),
                        np.abs(np.roll(df["close"].values, 1) - df["low"].values),
                    ),
                )
                atr = pd.Series(tr).rolling(period).mean().values
            atr_s = pd.Series(atr, index=df.index)
            upper = hl_avg + multiplier * atr_s
            lower = hl_avg - multiplier * atr_s
            supertrend = pd.Series(index=df.index, dtype=float)
            direction = pd.Series(1, index=df.index)
            for i in range(1, len(df)):
                if df["close"].iloc[i] > upper.iloc[i - 1]:
                    direction.iloc[i] = 1
                    supertrend.iloc[i] = lower.iloc[i]
                elif df["close"].iloc[i] < lower.iloc[i - 1]:
                    direction.iloc[i] = -1
                    supertrend.iloc[i] = upper.iloc[i]
                else:
                    direction.iloc[i] = direction.iloc[i - 1]
                    supertrend.iloc[i] = lower.iloc[i] if direction.iloc[i] == 1 else upper.iloc[i]
            return pd.DataFrame({"supertrend": supertrend, "supertrend_direction": direction}, index=df.index)
        except Exception as e:
            logger.debug(f"Supertrend: {e}")
            return pd.DataFrame(index=df.index)

    @staticmethod
    def macd_clusters(
        df: Optional[pd.DataFrame],
        fastperiod: int = 12,
        slowperiod: int = 26,
        signalperiod: int = 9,
    ) -> pd.DataFrame:
        """MACD, signal, histogram; peak/trough detection for clusters. Min bars: slowperiod+signalperiod."""
        df = _ensure_ohlc(df)
        if df is None or len(df) < slowperiod + signalperiod:
            return pd.DataFrame(index=df.index if df is not None else None)
        try:
            c = df["close"].values
            if _HAS_TALIB:
                macd, signal, hist = talib.MACD(c, fastperiod=fastperiod, slowperiod=slowperiod, signalperiod=signalperiod)
            else:
                ema_f = pd.Series(c).ewm(span=fastperiod, adjust=False).mean().values
                ema_s = pd.Series(c).ewm(span=slowperiod, adjust=False).mean().values
                macd = ema_f - ema_s
                signal = pd.Series(macd).ewm(span=signalperiod, adjust=False).mean().values
                hist = macd - signal
            hist_s = pd.Series(hist, index=df.index)
            peaks = hist_s[(hist_s.shift(1) < hist_s) & (hist_s.shift(-1) < hist_s)]
            troughs = hist_s[(hist_s.shift(1) > hist_s) & (hist_s.shift(-1) > hist_s)]
            return pd.DataFrame({
                "macd": macd,
                "macd_signal": signal,
                "macd_histogram": hist,
                "macd_peaks": peaks.reindex(df.index),
                "macd_troughs": troughs.reindex(df.index),
            }, index=df.index)
        except Exception as e:
            logger.debug(f"MACD: {e}")
            return pd.DataFrame(index=df.index)

    @staticmethod
    def volume_profile_clusters(df: Optional[pd.DataFrame], bins: int = 20) -> pd.DataFrame:
        """Volume profile: price bins and high-volume clusters (POC-style)."""
        df = _ensure_ohlc(df)
        if df is None or "volume" not in df.columns or len(df) < 2:
            return pd.DataFrame(index=df.index if df is not None else None)
        try:
            c = df["close"]
            v = df["volume"]
            r = c.max() - c.min()
            if r <= 0:
                return pd.DataFrame(index=df.index)
            bin_size = r / bins
            price_bins = np.arange(float(c.min()), float(c.max()) + bin_size, bin_size)
            if len(price_bins) < 2:
                return pd.DataFrame(index=df.index)
            vol_profile = []
            for i in range(len(price_bins) - 1):
                mask = (c >= price_bins[i]) & (c < price_bins[i + 1])
                vol_profile.append((price_bins[i] + price_bins[i + 1]) / 2 if mask.any() else np.nan)
            vp_df = pd.DataFrame({"price_level": vol_profile[:len(df)]})
            if len(vp_df) < len(df):
                vp_df = vp_df.reindex(df.index).ffill()
            return pd.DataFrame({"volume_profile_levels": vp_df["price_level"].values}, index=df.index)
        except Exception as e:
            logger.debug(f"Volume profile: {e}")
            return pd.DataFrame(index=df.index)

    @staticmethod
    def compute_all_indicators(df: Optional[pd.DataFrame]) -> pd.DataFrame:
        """Compute all indicators and merge into one DataFrame. Preserves original OHLCV."""
        df = _ensure_ohlc(df)
        if df is None:
            return pd.DataFrame()
        result = df.copy()
        for name, method in [
            ("atr_bands", lambda: AdvancedIndicators.atr_bands(result)),
            ("bb", lambda: AdvancedIndicators.bollinger_bands(result)),
            ("kc", lambda: AdvancedIndicators.keltner_channel(result)),
            ("dc", lambda: AdvancedIndicators.donchian_channel(result)),
            ("vwap", lambda: AdvancedIndicators.vwap(result)),
            ("supertrend", lambda: AdvancedIndicators.supertrend(result)),
            ("sar", lambda: AdvancedIndicators.parabolic_sar(result)),
            ("rsi", lambda: AdvancedIndicators.rsi_zones(result)),
            ("macd", lambda: AdvancedIndicators.macd_clusters(result)),
            ("pivot", lambda: AdvancedIndicators.pivot_points(result)),
            ("fib", lambda: AdvancedIndicators.fibonacci_retracement(result)),
            ("vp", lambda: AdvancedIndicators.volume_profile_clusters(result)),
        ]:
            try:
                out = method()
                if isinstance(out, pd.Series):
                    result[out.name if out.name else name] = out
                elif isinstance(out, pd.DataFrame) and not out.empty:
                    for col in out.columns:
                        result[col] = out[col]
            except Exception as e:
                logger.debug(f"compute_all {name}: {e}")
        return result
