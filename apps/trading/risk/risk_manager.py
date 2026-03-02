"""
Risk Management Module
Handles auto-lock, kill switch, and position monitoring.
Edge cases: invalid kill_switch_time, broker errors during kill switch, thread safety.
Alerts: auto-lock, kill switch executed.
"""
import threading
import time
import re
from datetime import datetime, time as dt_time
from typing import Dict, List, Optional, Tuple
from loguru import logger
from broker.angel_one import AngelOneBroker
from strategy.trading_strategy import TradeSignal
from config import Config

try:
    from utils.logging_alert import alert, ALERT_WARNING, ALERT_CRITICAL
except ImportError:
    def alert(sev, msg, payload=None): logger.warning(f"[ALERT] {msg}")
    ALERT_WARNING = ALERT_CRITICAL = "critical"


def _parse_kill_switch_time(s: str) -> Tuple[int, int]:
    """Parse HH:MM or HH:MM:SS; default (15, 15) on error."""
    if not s or not isinstance(s, str):
        return 15, 15
    m = re.match(r"^(\d{1,2}):(\d{2})(?::\d{2})?$", s.strip())
    if m:
        h, mi = int(m.group(1)), int(m.group(2))
        return (max(0, min(23, h)), max(0, min(59, mi)))
    return 15, 15


class RiskManager:
    """Manages risk controls and position monitoring"""

    def __init__(self, broker: AngelOneBroker):
        self.broker = broker
        self.trade_count = 0
        self.max_trades = max(0, int(getattr(Config, "MAX_TRADES_PER_DAY", 2) or 2))
        self.auto_locked = False
        _h, _m = _parse_kill_switch_time(getattr(Config, "KILL_SWITCH_TIME", "15:15"))
        self._kill_hour, self._kill_minute = _h, _m
        self.kill_switch_time = f"{_h:02d}:{_m:02d}"
        self.monitoring = False
        self.monitor_thread = None
        self.position_thread = None
        self._lock = threading.Lock()

    def can_trade(self) -> Tuple[bool, str]:
        """
        Check if trading is allowed
        
        Returns:
            (allowed, reason)
        """
        # Check auto-lock
        if self.auto_locked:
            return False, "Auto-lock active (max trades reached)"
        
        # Check kill switch time
        if self._is_kill_switch_time():
            return False, "Kill switch time reached"
        
        with self._lock:
            if self.trade_count >= self.max_trades:
                self.auto_locked = True
                alert(ALERT_WARNING, "Auto-lock: max trades reached", {"trade_count": self.trade_count, "max_trades": self.max_trades})
                return False, f"Max trades ({self.max_trades}) reached"

        return True, ""

    def record_trade(self):
        """Record a trade execution; alert on auto-lock."""
        with self._lock:
            self.trade_count += 1
            count, max_t = self.trade_count, self.max_trades
        logger.info(f"Trade count: {count}/{max_t}")
        if count >= max_t:
            with self._lock:
                self.auto_locked = True
            alert(ALERT_WARNING, "Auto-lock activated - max trades reached", {"trade_count": count, "max_trades": max_t})
            logger.warning("Auto-lock activated - max trades reached")
    
    def unlock_trading(self):
        """Manually unlock trading (override auto-lock)"""
        self.auto_locked = False
        logger.info("Trading unlocked manually")
    
    def _is_kill_switch_time(self) -> bool:
        """Check if kill switch time has been reached (uses parsed hour/minute)."""
        try:
            now = datetime.now().time()
            return now >= dt_time(self._kill_hour, self._kill_minute)
        except Exception as e:
            logger.error(f"Kill switch time check failed: {e}")
            return False
    
    def execute_kill_switch(self):
        """Execute kill switch: cancel all orders and square off positions. Alert on execution."""
        logger.warning("Executing kill switch...")
        alert(ALERT_CRITICAL, "Kill switch executed", {"time": datetime.now().isoformat()})
        try:
            open_orders = self.broker.get_all_open_orders() or []
            for order in open_orders:
                order_id = order.get('orderid') or order.get('order_id')
                if order_id:
                    self.broker.cancel_order(str(order_id))
                    logger.info(f"Cancelled order: {order_id}")
            
            positions = self.broker.get_position() or []
            for position in positions:
                symbol = position.get('tradingsymbol') or position.get('symbol')
                token = position.get('symboltoken') or position.get('token')
                quantity = int(position.get('netqty', 0))
                
                if quantity != 0:
                    # Get current LTP
                    ltp = self.broker.get_ltp(Config.EXCHANGE, str(token)) if token else None
                    if ltp is not None and float(ltp) > 0:
                        if quantity > 0:
                            # Sell to square off long position
                            self.broker.place_sell_order(
                                symbol=symbol,
                                token=str(token),
                                quantity=abs(quantity),
                                price=ltp * 0.99,  # Slightly below market for quick fill
                                order_type="MARKET"
                            )
                        else:
                            # Buy to square off short position
                            self.broker.place_buy_order(
                                symbol=symbol,
                                token=str(token),
                                quantity=abs(quantity),
                                price=ltp * 1.01,  # Slightly above market
                                order_type="MARKET"
                            )
                        logger.info(f"Squared off position: {symbol} qty={quantity}")
            
            with self._lock:
                self.auto_locked = True
            logger.info("Kill switch executed successfully")
        except Exception as e:
            logger.exception(f"Kill switch execution error: {e}")
            with self._lock:
                self.auto_locked = True
    
    def start_monitoring(self):
        """Start background monitoring threads"""
        if self.monitoring:
            return
        
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_kill_switch, daemon=True)
        self.position_thread = threading.Thread(target=self._monitor_positions, daemon=True)
        
        self.monitor_thread.start()
        self.position_thread.start()
        logger.info("Risk monitoring started")
    
    def stop_monitoring(self):
        """Stop monitoring threads"""
        self.monitoring = False
        logger.info("Risk monitoring stopped")
    
    def _monitor_kill_switch(self):
        """Monitor for kill switch time"""
        while self.monitoring:
            if self._is_kill_switch_time():
                self.execute_kill_switch()
                break
            time.sleep(60)  # Check every minute
    
    def _monitor_positions(self):
        """Monitor positions every 2 seconds"""
        while self.monitoring:
            try:
                positions = self.broker.get_position()
                # Log position updates if needed
                if positions:
                    logger.debug(f"Active positions: {len(positions)}")
                time.sleep(2)
            except Exception as e:
                logger.error(f"Error monitoring positions: {str(e)}")
                time.sleep(5)
    
    def reset_daily(self):
        """Reset daily counters"""
        self.trade_count = 0
        self.auto_locked = False
        logger.info("Daily risk counters reset")
