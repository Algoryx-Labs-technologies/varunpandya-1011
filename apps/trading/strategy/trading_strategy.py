"""
Trading Strategy Logic Module
Implements signal generation and trade rules.
Edge cases: empty df, empty levels, invalid current_price, None from pattern detector.
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from loguru import logger
from datetime import datetime, timedelta
from levels.level_manager import LevelManager, Level
from patterns.candlestick_patterns import CandlestickPatternDetector
from config import Config


class TradeSignal:
    """Represents a trading signal"""
    def __init__(
        self,
        index: str,
        direction: str,  # 'call' or 'put'
        entry_price: float,
        target_price: float,
        stop_loss: float,
        level_price: float,
        level_type: str,
        pattern: str,
        timeframe: str,
        timestamp: datetime
    ):
        self.index = index
        self.direction = direction
        self.entry_price = entry_price
        self.target_price = target_price
        self.stop_loss = stop_loss
        self.level_price = level_price
        self.level_type = level_type
        self.pattern = pattern
        self.timeframe = timeframe
        self.timestamp = timestamp
        self.status = 'pending'  # pending, executed, cancelled
        self.order_id = None
    
    def to_dict(self) -> Dict:
        return {
            'index': self.index,
            'direction': self.direction,
            'entry_price': self.entry_price,
            'target_price': self.target_price,
            'stop_loss': self.stop_loss,
            'level_price': self.level_price,
            'level_type': self.level_type,
            'pattern': self.pattern,
            'timeframe': self.timeframe,
            'timestamp': self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else str(self.timestamp),
            'status': self.status,
            'order_id': self.order_id
        }


class TradingStrategy:
    """Main trading strategy implementation"""
    
    def __init__(self, level_manager: LevelManager):
        self.level_manager = level_manager
        self.pattern_detector = CandlestickPatternDetector()
        self.active_signals: List[TradeSignal] = []
        cw = getattr(Config, "CANDLES_TO_WAIT", 7)
        self.candles_to_wait = max(1, min(20, int(cw) if cw is not None else 7))

    def generate_signals(
        self,
        index: str,
        df: pd.DataFrame,
        timeframe: str,
        current_price: float,
    ) -> List[TradeSignal]:
        """
        Generate trading signals from levels and patterns. Returns [] on invalid input.
        """
        signals = []
        if df is None or (hasattr(df, "empty") and df.empty) or len(df) < 2:
            logger.debug("generate_signals: insufficient OHLC data")
            return []
        if current_price is None or not (isinstance(current_price, (int, float)) and float(current_price) > 0):
            logger.debug("generate_signals: invalid current_price")
            return []
        current_price = float(current_price)
        index = (index or "").strip().upper()
        timeframe = (timeframe or "5m").strip().lower()

        df_with_patterns = self.pattern_detector.detect_patterns(df)
        if df_with_patterns is None:
            df_with_patterns = df
        levels = self.level_manager.get_levels(timeframe) or []
        if not levels:
            return []

        for level in levels:
            # Check for level break with pattern
            signal_info = self.pattern_detector.check_level_break_with_pattern(
                df_with_patterns,
                level.price,
                level.level_type
            )
            
            if signal_info:
                # Generate trade signal
                signal = self._create_signal(
                    index=index,
                    signal_info=signal_info,
                    level=level,
                    current_price=current_price,
                    timeframe=timeframe
                )
                
                if signal:
                    signals.append(signal)
                    logger.info(f"Signal generated: {signal.direction} {index} @ {signal.entry_price}")
        
        return signals
    
    def _create_signal(
        self,
        index: str,
        signal_info: Dict,
        level: Level,
        current_price: float,
        timeframe: str
    ) -> Optional[TradeSignal]:
        """Create a trade signal from signal info"""
        try:
            direction = signal_info['signal']
            level_price = signal_info['level_price']
            level_type = level.level_type
            pattern = signal_info['pattern']
            
            # Determine entry, target, and stop loss
            if direction == 'bullish':
                # Buy call option
                entry_price = current_price
                # Target: next resistance level above
                target_price = self._find_target_level(level_price, level_type, direction, 'above')
                # Stop loss: below entry or below level
                stop_loss = min(entry_price * (1 - Config.STOP_LOSS_PERCENTAGE / 100), level_price * 0.995)
                trade_direction = 'call'
            else:  # bearish
                # Buy put option
                entry_price = current_price
                # Target: next support level below
                target_price = self._find_target_level(level_price, level_type, direction, 'below')
                # Stop loss: above entry or above level
                stop_loss = max(entry_price * (1 + Config.STOP_LOSS_PERCENTAGE / 100), level_price * 1.005)
                trade_direction = 'put'
            
            # Validate signal
            if not self._validate_signal(entry_price, target_price, stop_loss, direction):
                return None
            
            signal = TradeSignal(
                index=index,
                direction=trade_direction,
                entry_price=entry_price,
                target_price=target_price,
                stop_loss=stop_loss,
                level_price=level_price,
                level_type=level_type,
                pattern=pattern,
                timeframe=timeframe,
                timestamp=datetime.now()
            )
            
            return signal
            
        except Exception as e:
            logger.error(f"Error creating signal: {str(e)}")
            return None
    
    def _find_target_level(
        self,
        current_level: float,
        level_type: str,
        direction: str,
        search_direction: str
    ) -> float:
        """Find target level based on level type and direction"""
        # For now, use percentage-based targets
        if direction == 'bullish':
            return current_level * (1 + Config.TARGET_PERCENTAGE / 100)
        else:
            return current_level * (1 - Config.TARGET_PERCENTAGE / 100)
    
    def _validate_signal(
        self,
        entry: float,
        target: float,
        stop_loss: float,
        direction: str
    ) -> bool:
        """Validate signal parameters"""
        if direction == 'bullish':
            # Target should be above entry, SL below entry
            if target <= entry or stop_loss >= entry:
                return False
            # Risk-reward ratio should be reasonable
            risk = entry - stop_loss
            reward = target - entry
            if reward / risk < 1.0:  # At least 1:1 risk-reward
                return False
        else:  # bearish
            # Target should be below entry, SL above entry
            if target >= entry or stop_loss <= entry:
                return False
            # Risk-reward ratio
            risk = stop_loss - entry
            reward = entry - target
            if reward / risk < 1.0:
                return False
        
        return True
    
    def check_exit_conditions(
        self,
        signal: TradeSignal,
        df: pd.DataFrame,
        current_price: float
    ) -> Tuple[bool, str, float]:
        """
        Check if exit conditions are met
        
        Returns:
            (should_exit, reason, exit_price)
        """
        if signal.status != 'executed':
            return False, '', 0.0
        
        # Find entry index in dataframe
        entry_time = signal.timestamp
        if isinstance(entry_time, str):
            entry_time = pd.to_datetime(entry_time)
        
        # Get candles since entry
        entry_idx = None
        for idx, ts in enumerate(df.index):
            if pd.to_datetime(ts) >= entry_time:
                entry_idx = idx
                break
        
        if entry_idx is None:
            entry_idx = len(df) - self.candles_to_wait
        
        candles_since_entry = len(df) - entry_idx - 1
        
        # Check stop loss
        if signal.direction == 'call':
            if current_price <= signal.stop_loss:
                return True, 'stop_loss', signal.stop_loss
        else:  # put
            if current_price >= signal.stop_loss:
                return True, 'stop_loss', signal.stop_loss
        
        # Check target
        if signal.direction == 'call':
            if current_price >= signal.target_price:
                return True, 'target', signal.target_price
        else:  # put
            if current_price <= signal.target_price:
                return True, 'target', signal.target_price
        
        # Check time-based exit (after N candles)
        if candles_since_entry >= self.candles_to_wait:
            return True, 'time_based', current_price
        
        return False, '', 0.0
    
    def add_signal(self, signal: TradeSignal):
        """Add a signal to active signals"""
        self.active_signals.append(signal)
    
    def remove_signal(self, signal: TradeSignal):
        """Remove a signal"""
        if signal in self.active_signals:
            self.active_signals.remove(signal)
    
    def get_active_signals(self) -> List[TradeSignal]:
        """Get all active signals"""
        return [s for s in self.active_signals if s.status != 'cancelled']
