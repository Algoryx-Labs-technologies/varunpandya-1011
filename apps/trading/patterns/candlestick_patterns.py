"""
Candlestick Pattern Detection Module
Uses TA-Lib for vectorized pattern detection
"""
import pandas as pd
import numpy as np
import talib
from typing import List, Dict, Optional
from loguru import logger
from config import Config


class CandlestickPatternDetector:
    """Detects candlestick patterns using TA-Lib"""
    
    # Bullish patterns
    BULLISH_PATTERNS = {
        'HAMMER': talib.CDLHAMMER,
        'SPINNING_TOP_BULLISH': talib.CDLSPINNINGTOP,  # Need to filter for bullish
        'BULLISH_KICKER': talib.CDLKICKINGBYLENGTH,  # Need to filter
        'BULLISH_ENGULFING': talib.CDLENGULFING,  # Need to filter
        'MORNING_DOJI_STAR': talib.CDLMORNINGDOJISTAR,
        'MORNING_STAR': talib.CDLMORNINGSTAR,
        'THREE_WHITE_SOLDIERS': talib.CDL3WHITESOLDIERS,
    }
    
    # Bearish patterns
    BEARISH_PATTERNS = {
        'SHOOTING_STAR': talib.CDLSHOOTINGSTAR,
        'SPINNING_TOP_BEARISH': talib.CDLSPINNINGTOP,  # Need to filter
        'BEARISH_ENGULFING': talib.CDLENGULFING,  # Need to filter
        'BEARISH_KICKER': talib.CDLKICKINGBYLENGTH,  # Need to filter
        'EVENING_DOJI_STAR': talib.CDLEVENINGDOJISTAR,
        'EVENING_STAR': talib.CDLEVENINGSTAR,
        'THREE_BLACK_CROWS': talib.CDL3BLACKCROWS,
    }
    
    def __init__(self):
        self.min_body_size = Config.MIN_CANDLE_BODY_SIZE
        self.min_wick_ratio = Config.MIN_WICK_RATIO
        _max = getattr(Config, "PATTERN_MAX_BODY_SIZE", 0.0) or 0.0
        self.max_body_size = float(_max) if _max > 0 else None
    
    def detect_patterns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Detect all candlestick patterns in the DataFrame
        
        Args:
            df: OHLC DataFrame with columns: open, high, low, close
            
        Returns:
            DataFrame with pattern detection columns added
        """
        if len(df) < 3:
            return df
        
        df = df.copy()
        open_prices = df['open'].values
        high_prices = df['high'].values
        low_prices = df['low'].values
        close_prices = df['close'].values
        
        # Detect all patterns
        for pattern_name, pattern_func in self.BULLISH_PATTERNS.items():
            try:
                pattern_result = pattern_func(open_prices, high_prices, low_prices, close_prices)
                df[f'pattern_{pattern_name}'] = pattern_result
            except Exception as e:
                logger.error(f"Error detecting {pattern_name}: {str(e)}")
        
        for pattern_name, pattern_func in self.BEARISH_PATTERNS.items():
            try:
                pattern_result = pattern_func(open_prices, high_prices, low_prices, close_prices)
                df[f'pattern_{pattern_name}'] = pattern_result
            except Exception as e:
                logger.error(f"Error detecting {pattern_name}: {str(e)}")
        
        # Filter patterns based on custom criteria
        df = self._apply_custom_filters(df)
        
        # Create summary columns
        df['bullish_pattern'] = self._has_bullish_pattern(df)
        df['bearish_pattern'] = self._has_bearish_pattern(df)
        
        return df
    
    def _apply_custom_filters(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply custom filters to pattern detection"""
        df = df.copy()
        
        # Calculate body size and wick ratios
        df['body_size'] = abs(df['close'] - df['open']) / df['open']
        df['upper_wick'] = df['high'] - df[['open', 'close']].max(axis=1)
        df['lower_wick'] = df[['open', 'close']].min(axis=1) - df['low']
        df['wick_ratio'] = (df['upper_wick'] + df['lower_wick']) / (df['high'] - df['low'] + 1e-10)
        
        # Filter patterns based on body size (min and optional max for OHLC specificity)
        for col in df.columns:
            if col.startswith('pattern_'):
                mask = df['body_size'] >= self.min_body_size
                if self.max_body_size is not None:
                    mask = mask & (df['body_size'] <= self.max_body_size)
                df.loc[~mask, col] = 0
        
        return df
    
    def _has_bullish_pattern(self, df: pd.DataFrame) -> pd.Series:
        """Check if any bullish pattern is present"""
        bullish_cols = [col for col in df.columns if col.startswith('pattern_') and 
                        any(bp in col.upper() for bp in ['HAMMER', 'MORNING', 'THREE_WHITE', 'BULLISH', 'SPINNING_TOP'])]
        
        if not bullish_cols:
            return pd.Series([False] * len(df), index=df.index)
        
        return df[bullish_cols].any(axis=1) & (df[bullish_cols] > 0).any(axis=1)
    
    def _has_bearish_pattern(self, df: pd.DataFrame) -> pd.Series:
        """Check if any bearish pattern is present"""
        bearish_cols = [col for col in df.columns if col.startswith('pattern_') and 
                       any(bp in col.upper() for bp in ['SHOOTING', 'EVENING', 'THREE_BLACK', 'BEARISH', 'SPINNING_TOP'])]
        
        if not bearish_cols:
            return pd.Series([False] * len(df), index=df.index)
        
        return df[bearish_cols].any(axis=1) & (df[bearish_cols] < 0).any(axis=1)
    
    def get_latest_pattern(self, df: pd.DataFrame) -> Optional[Dict]:
        """
        Get the latest pattern detected
        
        Returns:
            Dict with pattern info or None
        """
        if len(df) == 0:
            return None
        
        latest = df.iloc[-1]
        
        # Check bullish patterns
        if latest.get('bullish_pattern', False):
            for col in df.columns:
                if col.startswith('pattern_') and latest[col] > 0:
                    return {
                        'type': 'bullish',
                        'pattern': col.replace('pattern_', ''),
                        'strength': abs(latest[col]),
                        'index': len(df) - 1
                    }
        
        # Check bearish patterns
        if latest.get('bearish_pattern', False):
            for col in df.columns:
                if col.startswith('pattern_') and latest[col] < 0:
                    return {
                        'type': 'bearish',
                        'pattern': col.replace('pattern_', ''),
                        'strength': abs(latest[col]),
                        'index': len(df) - 1
                    }
        
        return None
    
    def check_level_break_with_pattern(
        self,
        df: pd.DataFrame,
        level_price: float,
        level_type: str
    ) -> Optional[Dict]:
        """
        Check if a level is broken with a valid pattern
        
        Args:
            df: OHLC DataFrame
            level_price: Support/resistance level price
            level_type: Level type (EU, ED, RU, RD, etc.)
            
        Returns:
            Signal dict or None
        """
        if len(df) < 2:
            return None
        
        latest = df.iloc[-1]
        prev = df.iloc[-2]
        current_price = latest['close']
        prev_price = prev['close']
        
        # Check level break
        level_broken = False
        direction = None
        
        # Easy Up (EU) - price breaks above
        if level_type in ['EU', 'TFU', 'EURTZ']:
            if prev_price <= level_price < current_price:
                level_broken = True
                direction = 'bullish'
        
        # Easy Down (ED) - price breaks below
        elif level_type in ['ED', 'TFD', 'EDRTZ']:
            if prev_price >= level_price > current_price:
                level_broken = True
                direction = 'bearish'
        
        # Reversal Up (RU) - price below level, bullish reversal
        elif level_type in ['RU', 'TFRU']:
            if current_price < level_price and latest.get('bullish_pattern', False):
                level_broken = True
                direction = 'bullish'
        
        # Reversal Down (RD) - price above level, bearish reversal
        elif level_type in ['RD', 'TFRD']:
            if current_price > level_price and latest.get('bearish_pattern', False):
                level_broken = True
                direction = 'bearish'
        
        if level_broken:
            pattern_info = self.get_latest_pattern(df)
            if pattern_info and pattern_info['type'] == direction:
                return {
                    'signal': direction,
                    'level_price': level_price,
                    'level_type': level_type,
                    'current_price': current_price,
                    'pattern': pattern_info['pattern'],
                    'timestamp': latest.name if hasattr(latest.name, 'isoformat') else str(latest.name)
                }
        
        return None
