"""
Vertex ML Level Detector — Research-Grade Support/Resistance Discovery

Multi-source level aggregation: swing-point detection, KMeans/DBSCAN clustering,
rolling regression, and Gradient Boosting prediction. Confidence-weighted fusion
with configurable lookback and cluster counts. Designed for auditability and
backtest alignment.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from loguru import logger
from sklearn.cluster import DBSCAN, KMeans
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

try:
    from indicators.advanced_indicators import AdvancedIndicators
except ImportError:
    AdvancedIndicators = None  # type: ignore

MIN_BARS_SWING = 5
MIN_BARS_REGRESSION = 20
MIN_BARS_GB = 50
DEFAULT_N_CLUSTERS = 5
CONFIDENCE_THRESHOLD_PCT = 0.001  # 0.1% of range for level merging


class MLLevelDetector:
    """
    Research-grade level detection: swing points → clustering & regression → GB
    prediction → confidence-weighted aggregation. All outputs (price, confidence).
    """

    def __init__(self, n_clusters: int = 10) -> None:
        self.n_clusters = max(2, min(50, n_clusters))
        self.scaler = StandardScaler()
        self.gb_model_high: Optional[GradientBoostingRegressor] = None
        self.gb_model_low: Optional[GradientBoostingRegressor] = None

    def detect_swing_points(
        self,
        df: Optional[pd.DataFrame],
        window: int = 5,
    ) -> Tuple[List[float], List[float]]:
        """
        Vectorized swing highs and swing lows: local max/min over symmetric window.
        Returns (swing_highs, swing_lows) in price order.
        """
        if df is None or len(df) < 2 * window + 1:
            return [], []
        if "high" not in df.columns or "low" not in df.columns:
            return [], []
        try:
            high = df["high"].values
            low = df["low"].values
            n = len(high)
            highs, lows = [], []
            for i in range(window, n - window):
                if high[i] >= np.max(high[i - window : i + window + 1]):
                    highs.append(float(high[i]))
                if low[i] <= np.min(low[i - window : i + window + 1]):
                    lows.append(float(low[i]))
            return highs, lows
        except Exception as e:
            logger.debug(f"Swing points: {e}")
            return [], []

    def kmeans_clustering(
        self,
        prices: List[float],
        n_clusters: Optional[int] = None,
    ) -> List[float]:
        """KMeans clustering of price levels; returns sorted cluster centers."""
        if not prices or len(prices) < 2:
            return []
        n_clusters = min(n_clusters or self.n_clusters, len(prices), len(set(prices)))
        if n_clusters < 1:
            return []
        try:
            X = np.array(prices).reshape(-1, 1)
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            kmeans.fit(X)
            centers = kmeans.cluster_centers_.flatten().tolist()
            return sorted(centers)
        except Exception as e:
            logger.debug(f"KMeans: {e}")
            return []

    def dbscan_clustering(
        self,
        prices: List[float],
        eps: float = 10.0,
        min_samples: int = 3,
    ) -> List[float]:
        """Density-based cluster centers; noise (label -1) excluded."""
        if len(prices) < min_samples:
            return []
        try:
            X = np.array(prices).reshape(-1, 1)
            db = DBSCAN(eps=eps, min_samples=min_samples)
            labels = db.fit_predict(X)
            centers = []
            for label in set(labels) - {-1}:
                mask = labels == label
                if mask.sum() > 0:
                    centers.append(float(np.mean(X[mask])))
            return sorted(centers)
        except Exception as e:
            logger.debug(f"DBSCAN: {e}")
            return []

    def linear_regression_levels(
        self,
        df: Optional[pd.DataFrame],
        window: int = 20,
    ) -> List[float]:
        """Rolling linear regression of high/low; next-step predicted levels."""
        if df is None or len(df) < window + 1:
            return []
        if "high" not in df.columns or "low" not in df.columns:
            return []
        try:
            levels = set()
            for i in range(window, len(df)):
                w = df.iloc[i - window : i]
                X = np.arange(len(w)).reshape(-1, 1)
                y_high = w["high"].values
                y_low = w["low"].values
                reg_h = LinearRegression().fit(X, y_high)
                reg_l = LinearRegression().fit(X, y_low)
                next_x = np.array([[window]])
                levels.add(float(reg_h.predict(next_x)[0]))
                levels.add(float(reg_l.predict(next_x)[0]))
            return sorted(levels)
        except Exception as e:
            logger.debug(f"Regression levels: {e}")
            return []

    def gradient_boosting_levels(self, df: Optional[pd.DataFrame]) -> List[float]:
        """Gradient Boosting next-bar high/low prediction from rolling features. Min 50 bars."""
        if df is None or len(df) < MIN_BARS_GB:
            return []
        if "high" not in df.columns or "low" not in df.columns:
            return []
        try:
            window = 20
            features, t_high, t_low = [], [], []
            for i in range(window, len(df) - 1):
                w = df.iloc[i - window : i]
                feat = [
                    w["high"].max(),
                    w["low"].min(),
                    w["close"].mean(),
                    w["volume"].mean() if "volume" in w.columns else 0,
                    w["high"].std() if w["high"].std() == w["high"].std() else 0,
                    w["low"].std() if w["low"].std() == w["low"].std() else 0,
                ]
                features.append(feat)
                t_high.append(df["high"].iloc[i + 1])
                t_low.append(df["low"].iloc[i + 1])
            if len(features) < 10:
                return []
            X = np.array(features)
            y_h = np.array(t_high)
            y_l = np.array(t_low)
            self.gb_model_high = GradientBoostingRegressor(n_estimators=100, random_state=42)
            self.gb_model_low = GradientBoostingRegressor(n_estimators=100, random_state=42)
            self.gb_model_high.fit(X, y_h)
            self.gb_model_low.fit(X, y_l)
            last = np.array([features[-1]])
            return [
                float(self.gb_model_low.predict(last)[0]),
                float(self.gb_model_high.predict(last)[0]),
            ]
        except Exception as e:
            logger.debug(f"GB levels: {e}")
            return []

    def aggregate_levels(
        self,
        indicator_levels: Dict[str, List[float]],
        ml_levels: List[float],
        price_range: float,
    ) -> List[Tuple[float, float]]:
        """
        Merge levels from indicators and ML; same price within threshold (0.1% of range)
        increases confidence. ML levels get higher weight. Returns top 40 (price, confidence).
        """
        if price_range <= 0:
            price_range = 1.0
        threshold = price_range * CONFIDENCE_THRESHOLD_PCT
        all_levels: Dict[float, float] = {}

        def add_level(price: float, weight: float) -> None:
            if np.isnan(price) or price <= 0:
                return
            p = float(price)
            for existing in list(all_levels.keys()):
                if abs(existing - p) <= threshold:
                    all_levels[existing] += weight
                    return
            all_levels[p] = weight

        for levels in (indicator_levels or {}).values():
            for lev in levels or []:
                add_level(lev, 0.1)
        for lev in ml_levels or []:
            add_level(lev, 0.3)

        sorted_levels = sorted(all_levels.items(), key=lambda x: -x[1])
        return sorted_levels[:40]

    def detect_levels(self, df: Optional[pd.DataFrame]) -> List[Tuple[float, float]]:
        """
        Full pipeline: indicator-derived levels + swing-based clustering and
        regression + GB prediction → aggregated (price, confidence) list.
        """
        if df is None or len(df) < MIN_BARS_SWING:
            return []
        try:
            indicator_levels: Dict[str, List[float]] = {}
            if AdvancedIndicators is not None:
                try:
                    rich = AdvancedIndicators.compute_all_indicators(df)
                    if rich is not None and not rich.empty:
                        tail = min(10, len(rich))
                        for col in ["atr_upper", "atr_lower", "bb_upper", "bb_lower", "kc_upper", "kc_lower", "dc_upper", "dc_lower"]:
                            if col in rich.columns:
                                indicator_levels[col] = rich[col].tail(tail).dropna().astype(float).tolist()
                        if "vwap" in rich.columns:
                            indicator_levels["vwap"] = rich["vwap"].tail(tail).dropna().astype(float).tolist()
                        if "supertrend" in rich.columns:
                            indicator_levels["supertrend"] = rich["supertrend"].tail(tail).dropna().astype(float).tolist()
                        for col in rich.columns:
                            if col.startswith("pivot_") or col.startswith("fib_"):
                                indicator_levels[col] = rich[col].tail(1).dropna().astype(float).tolist()
                except Exception as e:
                    logger.debug(f"Indicator levels: {e}")

            swing_highs, swing_lows = self.detect_swing_points(df)
            kmeans_levels = []
            if swing_highs:
                kmeans_levels.extend(self.kmeans_clustering(swing_highs, DEFAULT_N_CLUSTERS))
            if swing_lows:
                kmeans_levels.extend(self.kmeans_clustering(swing_lows, DEFAULT_N_CLUSTERS))
            dbscan_levels = self.dbscan_clustering(swing_highs + swing_lows) if (swing_highs or swing_lows) else []
            reg_levels = self.linear_regression_levels(df)
            gb_levels = self.gradient_boosting_levels(df)
            ml_levels = kmeans_levels + dbscan_levels + reg_levels + gb_levels

            price_range = float(df["high"].max() - df["low"].min()) or 1.0
            return self.aggregate_levels(indicator_levels, ml_levels, price_range)
        except Exception as e:
            logger.exception(f"detect_levels: {e}")
            return []
