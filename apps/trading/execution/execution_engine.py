"""
Execution Engine with Multithreading
Handles position updates, trade monitoring, and data refresh
"""
import threading
import time
from typing import Dict, List, Optional
from datetime import datetime
from loguru import logger
from broker.angel_one import AngelOneBroker
from strategy.trading_strategy import TradeSignal
from risk.risk_manager import RiskManager


class ExecutionEngine:
    """Multithreaded execution engine"""
    
    def __init__(self, broker: AngelOneBroker, risk_manager: RiskManager):
        self.broker = broker
        self.risk_manager = risk_manager
        self.running = False
        self.threads = {}
        self.active_positions: Dict[str, Dict] = {}
        self.position_lock = threading.Lock()
    
    def start(self):
        """Start all monitoring threads"""
        if self.running:
            return
        
        self.running = True
        
        # Position updater thread (every 2 seconds)
        self.threads['position_updater'] = threading.Thread(
            target=self._position_updater,
            daemon=True,
            name="PositionUpdater"
        )
        self.threads['position_updater'].start()
        
        # Trade monitor thread (every 5 seconds)
        self.threads['trade_monitor'] = threading.Thread(
            target=self._trade_monitor,
            daemon=True,
            name="TradeMonitor"
        )
        self.threads['trade_monitor'].start()
        
        # Average trade trimmer thread (every 15 seconds)
        self.threads['trade_trimmer'] = threading.Thread(
            target=self._trade_trimmer,
            daemon=True,
            name="TradeTrimmer"
        )
        self.threads['trade_trimmer'].start()
        
        logger.info("Execution engine started with all threads")
    
    def stop(self):
        """Stop all threads"""
        self.running = False
        logger.info("Execution engine stopped")
    
    def _position_updater(self):
        """Update positions every 2 seconds"""
        while self.running:
            try:
                positions = self.broker.get_position()
                
                with self.position_lock:
                    self.active_positions = {}
                    for pos in positions:
                        symbol = pos.get('tradingsymbol') or pos.get('symbol', '')
                        if symbol:
                            self.active_positions[symbol] = {
                                'symbol': symbol,
                                'quantity': pos.get('netqty', 0),
                                'avg_price': pos.get('avgprice', 0),
                                'ltp': pos.get('ltp', 0),
                                'pnl': pos.get('pnl', 0),
                                'updated_at': datetime.now().isoformat()
                            }
                
                time.sleep(2)
            except Exception as e:
                logger.error(f"Error in position updater: {e}")
                time.sleep(5)
    
    def _trade_monitor(self):
        """Monitor trades every 5 seconds"""
        while self.running:
            try:
                # Check open orders
                open_orders = self.broker.get_all_open_orders()
                
                # Check for filled orders
                for order in open_orders:
                    order_status = order.get('status', '').upper()
                    if order_status in ['COMPLETE', 'FILLED']:
                        logger.info(f"Order filled: {order.get('tradingsymbol')}")
                
                # Monitor positions for exit conditions
                with self.position_lock:
                    for symbol, position in self.active_positions.items():
                        # Check if position needs monitoring
                        if abs(position['quantity']) > 0:
                            logger.debug(f"Monitoring position: {symbol}, P&L: {position['pnl']}")
                
                time.sleep(5)
            except Exception as e:
                logger.error(f"Error in trade monitor: {e}")
                time.sleep(10)
    
    def _trade_trimmer(self):
        """Trim/average trades every 15 seconds"""
        while self.running:
            try:
                with self.position_lock:
                    for symbol, position in self.active_positions.items():
                        quantity = position.get('quantity', 0)
                        pnl = position.get('pnl', 0)
                        
                        # Trim profitable positions (partial exit)
                        if quantity > 0 and pnl > 0:
                            # Exit 30% if profit > 1%
                            profit_pct = (pnl / (position.get('avg_price', 1) * abs(quantity))) * 100
                            if profit_pct > 1.0:
                                trim_qty = int(abs(quantity) * 0.3)
                                if trim_qty > 0:
                                    logger.info(f"Trimming position: {symbol}, qty: {trim_qty}")
                                    # Place trim order (would need actual implementation)
                
                time.sleep(15)
            except Exception as e:
                logger.error(f"Error in trade trimmer: {e}")
                time.sleep(20)
    
    def get_positions(self) -> Dict[str, Dict]:
        """Get current positions (thread-safe)"""
        with self.position_lock:
            return self.active_positions.copy()
    
    def execute_signal(self, signal: TradeSignal) -> bool:
        """Execute a trade signal"""
        try:
            # Check if trading is allowed
            can_trade, reason = self.risk_manager.can_trade()
            if not can_trade:
                logger.warning(f"Cannot execute signal: {reason}")
                return False
            
            # Implementation would go here
            # This is a placeholder - actual execution logic in main.py
            logger.info(f"Signal execution requested: {signal.index} {signal.direction}")
            return True
        except Exception as e:
            logger.error(f"Error executing signal: {e}")
            return False
