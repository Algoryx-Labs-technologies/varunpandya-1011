"""
Support/Resistance Level Identification Module
Handles manual and AI-assisted level detection.
Edge cases: invalid type/timeframe/price, missing columns, empty file, duplicates, NaN.
"""
import math
import pandas as pd
import numpy as np
from typing import List, Dict, Optional
from pathlib import Path
from loguru import logger
try:
    import talib
    HAS_TALIB = True
except ImportError:
    talib = None
    HAS_TALIB = False
from sklearn.cluster import KMeans
from config import Config

VALID_LEVEL_TYPES = frozenset({"EU", "TFD", "ED", "TFU", "RU", "TFRU", "RD", "TFRD", "EURTZ", "EDRTZ"})
VALID_TIMEFRAMES = frozenset(getattr(Config, "TIMEFRAMES", []) or ["1m", "5m", "15m"])


def _safe_float(v, default: float) -> float:
    try:
        if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


class Level:
    """Represents a support/resistance level"""
    def __init__(self, price: float, level_type: str, timeframe: str, confidence: float = 1.0):
        self.price = price
        self.level_type = level_type  # EU, TFD, ED, TFU, RU, TFRU, RD, TFRD, EURTZ, EDRTZ
        self.timeframe = timeframe
        self.confidence = confidence
    
    def to_dict(self) -> Dict:
        return {
            'price': self.price,
            'type': self.level_type,
            'timeframe': self.timeframe,
            'confidence': self.confidence
        }


class LevelManager:
    """Manages support/resistance levels"""
    
    def __init__(self, use_ai: bool = True):
        self.manual_levels: Dict[str, List[Level]] = {}  # timeframe -> levels
        self.auto_levels: Dict[str, List[Level]] = {}  # timeframe -> levels
        self.use_ai = use_ai
        self.ml_detector = None
        if use_ai:
            try:
                from ai.ml_level_detector import MLLevelDetector
                self.ml_detector = MLLevelDetector()
            except ImportError:
                logger.warning("MLLevelDetector not available (e.g. talib missing); AI levels disabled")
    
    def load_manual_levels_from_csv(self, filepath: str) -> bool:
        """Load manual levels from CSV. Edge cases: missing file, empty, wrong columns."""
        path = Path(filepath)
        if not path.exists():
            logger.warning(f"Levels CSV not found: {filepath}")
            return False
        try:
            df = pd.read_csv(filepath)
        except Exception as e:
            logger.error(f"Levels CSV read failed: {e}")
            return False
        return self._load_manual_levels_df(df, filepath)

    def load_manual_levels_from_excel(self, filepath: str) -> bool:
        """Load manual levels from Excel. Edge cases: missing file, wrong sheet, read error."""
        path = Path(filepath)
        if not path.exists():
            logger.warning(f"Levels Excel not found: {filepath}")
            return False
        try:
            df = pd.read_excel(filepath)
        except Exception as e:
            logger.error(f"Levels Excel read failed: {e}")
            return False
        return self._load_manual_levels_df(df, filepath)

    def _load_manual_levels_df(self, df: pd.DataFrame, source: str = "") -> bool:
        """Common loader. Validates type in VALID_LEVEL_TYPES, timeframe, price>0; skips bad rows; dedupes."""
        required_cols = ["price", "type", "timeframe"]
        if df is None or df.empty:
            logger.warning(f"Levels file empty: {source}")
            return False
        if not all(col in df.columns for col in required_cols):
            logger.error(f"Levels file missing required columns {required_cols}; got {list(df.columns)}")
            return False
        self.manual_levels = {}
        seen = set()
        skipped = 0
        for idx, row in df.iterrows():
            try:
                price = _safe_float(row.get("price"), 0)
                if price <= 0:
                    skipped += 1
                    continue
                level_type = str(row.get("type", "")).strip().upper()
                if level_type not in VALID_LEVEL_TYPES:
                    logger.debug(f"Levels row {idx}: invalid type '{level_type}', skip")
                    skipped += 1
                    continue
                timeframe = str(row.get("timeframe", "")).strip().lower()
                if timeframe not in VALID_TIMEFRAMES:
                    timeframe = "5m"
                confidence = _safe_float(row.get("confidence"), 1.0)
                confidence = max(0, min(1, confidence))
                key = (timeframe, level_type, round(price, 2))
                if key in seen:
                    skipped += 1
                    continue
                seen.add(key)
                level = Level(price=price, level_type=level_type, timeframe=timeframe, confidence=confidence)
                if timeframe not in self.manual_levels:
                    self.manual_levels[timeframe] = []
                self.manual_levels[timeframe].append(level)
            except Exception as e:
                logger.debug(f"Levels row {idx} skip: {e}")
                skipped += 1
        logger.info(f"Loaded {len(seen)} manual levels from {source}" + (f"; skipped {skipped}" if skipped else ""))
        return len(seen) > 0

    def add_manual_level(self, price: float, level_type: str, timeframe: str) -> bool:
        """Add a single manual level. Returns False if invalid (price<=0, bad type/timeframe)."""
        price = _safe_float(price, 0)
        if price <= 0:
            logger.warning("add_manual_level: price must be > 0")
            return False
        level_type = str(level_type or "").strip().upper()
        if level_type not in VALID_LEVEL_TYPES:
            logger.warning(f"add_manual_level: invalid type '{level_type}'")
            return False
        timeframe = str(timeframe or "5m").strip().lower()
        if timeframe not in VALID_TIMEFRAMES:
            timeframe = "5m"
        if timeframe not in self.manual_levels:
            self.manual_levels[timeframe] = []
        self.manual_levels[timeframe].append(Level(price, level_type, timeframe))
        logger.info(f"Added manual level: {level_type} @ {price} ({timeframe})")
        return True
    
    def compute_auto_levels(self, df: pd.DataFrame, timeframe: str, num_levels: int = 40) -> List[Level]:
        """
        Compute support/resistance levels using AI/ML techniques
        
        Args:
            df: OHLC DataFrame
            timeframe: Timeframe identifier
            num_levels: Number of levels to generate
        """
        try:
            levels = []
            
            # Traditional indicator-based levels
            pivot_levels = self._compute_pivot_points(df)
            levels.extend(pivot_levels)
            
            cluster_levels = self._compute_kmeans_levels(df, num_clusters=num_levels // 2)
            levels.extend(cluster_levels)
            
            atr_levels = self._compute_atr_levels(df)
            levels.extend(atr_levels)
            
            bb_levels = self._compute_bollinger_levels(df)
            levels.extend(bb_levels)
            
            sar_levels = self._compute_sar_levels(df)
            levels.extend(sar_levels)
            
            # ML-based level detection
            if self.use_ai and self.ml_detector:
                try:
                    ml_levels_with_confidence = self.ml_detector.detect_levels(df)
                    # Convert ML levels to Level objects
                    for price, confidence in ml_levels_with_confidence[:num_levels]:
                        levels.append(Level(price, 'AUTO', timeframe, confidence))
                except Exception as e:
                    logger.warning(f"ML level detection failed: {e}, using traditional methods only")
            
            # Aggregate and deduplicate levels
            aggregated = self._aggregate_levels(levels, df)
            
            # Assign level types based on price action
            typed_levels = self._assign_level_types(aggregated, df)
            
            # Limit to requested number
            typed_levels = sorted(typed_levels, key=lambda x: x.confidence, reverse=True)[:num_levels]
            
            self.auto_levels[timeframe] = typed_levels
            logger.info(f"Computed {len(typed_levels)} auto levels for {timeframe}")
            
            return typed_levels
            
        except Exception as e:
            logger.error(f"Error computing auto levels: {str(e)}")
            return []
    
    def _compute_pivot_points(self, df: pd.DataFrame) -> List[Level]:
        """Compute pivot points (PP, R1, R2, S1, S2)"""
        levels = []
        
        if len(df) < 1:
            return levels
        
        # Classic pivot points
        high = df['high'].values
        low = df['low'].values
        close = df['close'].values
        
        # Use last candle for pivot calculation
        h = high[-1]
        l = low[-1]
        c = close[-1]
        
        pp = (h + l + c) / 3
        r1 = 2 * pp - l
        r2 = pp + (h - l)
        s1 = 2 * pp - h
        s2 = pp - (h - l)
        
        levels.extend([
            Level(pp, 'TFD', 'auto', 0.8),
            Level(r1, 'TFU', 'auto', 0.7),
            Level(r2, 'TFU', 'auto', 0.6),
            Level(s1, 'TFD', 'auto', 0.7),
            Level(s2, 'TFD', 'auto', 0.6)
        ])
        
        return levels
    
    def _compute_kmeans_levels(self, df: pd.DataFrame, num_clusters: int = 5) -> List[Level]:
        """Use K-Means clustering on swing highs and lows"""
        levels = []
        
        if len(df) < 20:
            return levels
        
        # Detect swing highs and lows
        highs = []
        lows = []
        
        window = 5
        for i in range(window, len(df) - window):
            if df['high'].iloc[i] == df['high'].iloc[i-window:i+window+1].max():
                highs.append(df['high'].iloc[i])
            if df['low'].iloc[i] == df['low'].iloc[i-window:i+window+1].min():
                lows.append(df['low'].iloc[i])
        
        if len(highs) < num_clusters or len(lows) < num_clusters:
            return levels
        
        # Cluster swing highs
        if len(highs) >= num_clusters:
            kmeans_highs = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
            high_array = np.array(highs).reshape(-1, 1)
            kmeans_highs.fit(high_array)
            high_centers = kmeans_highs.cluster_centers_.flatten()
            
            for center in high_centers:
                levels.append(Level(center, 'TFU', 'auto', 0.7))
        
        # Cluster swing lows
        if len(lows) >= num_clusters:
            kmeans_lows = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
            low_array = np.array(lows).reshape(-1, 1)
            kmeans_lows.fit(low_array)
            low_centers = kmeans_lows.cluster_centers_.flatten()
            
            for center in low_centers:
                levels.append(Level(center, 'TFD', 'auto', 0.7))
        
        return levels
    
    def _compute_atr_levels(self, df: pd.DataFrame) -> List[Level]:
        """Compute ATR-based support/resistance bands"""
        levels = []
        if not HAS_TALIB or len(df) < 14:
            return levels
        try:
            atr = talib.ATR(df['high'].values, df['low'].values, df['close'].values, timeperiod=14)
            current_price = df['close'].iloc[-1]
            current_atr = atr[-1]
            
            # ATR-based levels
            levels.extend([
                Level(current_price + current_atr, 'TFU', 'auto', 0.6),
                Level(current_price + 2 * current_atr, 'TFU', 'auto', 0.5),
                Level(current_price - current_atr, 'TFD', 'auto', 0.6),
                Level(current_price - 2 * current_atr, 'TFD', 'auto', 0.5)
            ])
        except Exception as e:
            logger.error(f"Error computing ATR levels: {str(e)}")
        
        return levels
    
    def _compute_bollinger_levels(self, df: pd.DataFrame) -> List[Level]:
        """Compute Bollinger Band levels"""
        levels = []
        if not HAS_TALIB or len(df) < 20:
            return levels
        try:
            upper, middle, lower = talib.BBANDS(
                df['close'].values,
                timeperiod=20,
                nbdevup=2,
                nbdevdn=2,
                matype=0
            )
            
            levels.extend([
                Level(upper[-1], 'TFU', 'auto', 0.7),
                Level(middle[-1], 'TFD', 'auto', 0.6),
                Level(lower[-1], 'TFD', 'auto', 0.7)
            ])
        except Exception as e:
            logger.error(f"Error computing Bollinger levels: {str(e)}")
        
        return levels
    
    def _compute_sar_levels(self, df: pd.DataFrame) -> List[Level]:
        """Compute Parabolic SAR levels"""
        levels = []
        if not HAS_TALIB or len(df) < 10:
            return levels
        try:
            sar = talib.SAR(df['high'].values, df['low'].values, acceleration=0.02, maximum=0.2)
            current_sar = sar[-1]
            current_price = df['close'].iloc[-1]
            
            # SAR acts as dynamic support/resistance
            if current_price > current_sar:
                levels.append(Level(current_sar, 'TFD', 'auto', 0.6))
            else:
                levels.append(Level(current_sar, 'TFU', 'auto', 0.6))
        except Exception as e:
            logger.error(f"Error computing SAR levels: {str(e)}")
        
        return levels
    
    def _aggregate_levels(self, levels: List[Level], df: pd.DataFrame) -> List[Level]:
        """Aggregate and deduplicate levels"""
        if not levels:
            return []
        
        # Group levels by price proximity (within 0.1% of price range)
        price_range = df['high'].max() - df['low'].min()
        threshold = price_range * 0.001
        
        sorted_levels = sorted(levels, key=lambda x: x.price)
        aggregated = []
        
        current_group = [sorted_levels[0]]
        for level in sorted_levels[1:]:
            if abs(level.price - current_group[-1].price) <= threshold:
                current_group.append(level)
            else:
                # Average the group
                avg_price = np.mean([l.price for l in current_group])
                avg_confidence = np.mean([l.confidence for l in current_group])
                avg_type = max(set([l.level_type for l in current_group]), key=[l.level_type for l in current_group].count)
                
                aggregated.append(Level(avg_price, avg_type, current_group[0].timeframe, avg_confidence))
                current_group = [level]
        
        # Add last group
        if current_group:
            avg_price = np.mean([l.price for l in current_group])
            avg_confidence = np.mean([l.confidence for l in current_group])
            avg_type = max(set([l.level_type for l in current_group]), key=[l.level_type for l in current_group].count)
            aggregated.append(Level(avg_price, avg_type, current_group[0].timeframe, avg_confidence))
        
        return aggregated
    
    def _assign_level_types(self, levels: List[Level], df: pd.DataFrame) -> List[Level]:
        """Assign level types based on price action context"""
        if not levels or len(df) < 10:
            return levels
        
        current_price = df['close'].iloc[-1]
        recent_high = df['high'].tail(20).max()
        recent_low = df['low'].tail(20).min()
        
        typed_levels = []
        for level in levels:
            level_type = level.level_type
            
            # Refine type based on position relative to current price
            if level.price > current_price:
                if level.price < recent_high * 1.01:  # Near recent high
                    level_type = 'EU' if level_type == 'TFU' else level_type
                else:
                    level_type = 'TFU'
            else:
                if level.price > recent_low * 0.99:  # Near recent low
                    level_type = 'ED' if level_type == 'TFD' else level_type
                else:
                    level_type = 'TFD'
            
            typed_levels.append(Level(level.price, level_type, level.timeframe, level.confidence))
        
        return typed_levels
    
    def get_levels(self, timeframe: str) -> List[Level]:
        """
        Get all levels (manual + automatic) for a timeframe.
        Used every trade cycle: (1) Manual – user-defined from CSV/Excel/UI.
        (2) Automatic – from ML and indicators (pivot, K-Means, ATR, Bollinger, SAR, ML detector).
        Both sets are combined for signal generation.
        """
        levels = []
        if timeframe in self.manual_levels:
            levels.extend(self.manual_levels[timeframe])
        if timeframe in self.auto_levels:
            levels.extend(self.auto_levels[timeframe])
        return sorted(levels, key=lambda x: x.price)
    
    def get_levels_by_type(self, timeframe: str, level_type: str) -> List[Level]:
        """Get levels filtered by type"""
        all_levels = self.get_levels(timeframe)
        return [l for l in all_levels if l.level_type == level_type]
