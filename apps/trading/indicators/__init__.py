"""
Vertex Indicators — Institutional-Grade Technical Analysis

Public API for level detection and regime analysis. All series are
vectorized and index-aligned. Use AdvancedIndicators for computation;
INDICATOR_CATALOG for UI and documentation.
"""

from .advanced_indicators import AdvancedIndicators

__all__ = ["AdvancedIndicators", "INDICATOR_CATALOG"]

# World-class catalog: id, name, description, min_bars, group (trend/volatility/levels)
INDICATOR_CATALOG = [
    {"id": "atr_bands", "name": "ATR Bands", "group": "volatility", "min_bars": 14,
     "description": "Dynamic support/resistance from Average True Range; close ± (ATR × multiplier)."},
    {"id": "bollinger", "name": "Bollinger Bands", "group": "volatility", "min_bars": 20,
     "description": "SMA ± k×std; mean reversion and breakout context."},
    {"id": "keltner", "name": "Keltner Channel", "group": "volatility", "min_bars": 20,
     "description": "EMA ± ATR-based band; trend and volatility."},
    {"id": "donchian", "name": "Donchian Channel", "group": "levels", "min_bars": 20,
     "description": "Rolling high/low range; breakout levels."},
    {"id": "vwap", "name": "VWAP", "group": "levels", "min_bars": 1,
     "description": "Volume-weighted average price; institutional reference."},
    {"id": "supertrend", "name": "Supertrend", "group": "trend", "min_bars": 10,
     "description": "ATR-based trend line and direction."},
    {"id": "parabolic_sar", "name": "Parabolic SAR", "group": "trend", "min_bars": 5,
     "description": "Trailing stop and reversal levels."},
    {"id": "rsi_zones", "name": "RSI Zones", "group": "momentum", "min_bars": 15,
     "description": "RSI with oversold (<30) and overbought (>70) zones."},
    {"id": "macd_clusters", "name": "MACD Clusters", "group": "momentum", "min_bars": 35,
     "description": "MACD histogram peaks/troughs for reversal levels."},
    {"id": "pivot_points", "name": "Pivot Points", "group": "levels", "min_bars": 1,
     "description": "Classic PP, R1/R2, S1/S2 from H/L/C."},
    {"id": "fibonacci", "name": "Fibonacci Retracement", "group": "levels", "min_bars": 20,
     "description": "0.236–0.786 levels from rolling high-low range."},
    {"id": "volume_profile", "name": "Volume Profile", "group": "levels", "min_bars": 2,
     "description": "High-volume price clusters (POC-style)."},
]
