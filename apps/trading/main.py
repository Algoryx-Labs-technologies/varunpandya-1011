"""
Main Trading Bot Entry Point
Orchestrates all components and runs the trading strategy
"""
import time
import threading
from datetime import datetime
from typing import Dict
from loguru import logger
from config import Config

from broker.angel_one import AngelOneBroker
from data.data_fetcher import DataFetcher
from levels.level_manager import LevelManager
from patterns.candlestick_patterns import CandlestickPatternDetector
from strategy.trading_strategy import TradingStrategy, TradeSignal
from money.position_sizing import PositionSizer
from risk.risk_manager import RiskManager
from journal.trade_journal import TradeJournal, Trade
from api.integration import BackendAPI

try:
    from utils.logging_alert import set_alerts_callback
except ImportError:
    set_alerts_callback = lambda cb: None


class TradingBot:
    """Main trading bot orchestrator"""
    
    def __init__(self):
        # Initialize components
        self.broker = AngelOneBroker()
        self.data_fetcher = DataFetcher(self.broker)
        self.level_manager = LevelManager()
        self.strategy = TradingStrategy(self.level_manager)
        self.position_sizer = PositionSizer()
        self.risk_manager = RiskManager(self.broker)
        self.journal = TradeJournal()
        self.backend_api = BackendAPI()
        
        # State
        self.running = False
        self.active_trades: Dict[str, TradeSignal] = {}
        self.market_data_cache: Dict = {}
        # Trade cycle: net PnL for current day (reset on new day); used when ENABLE_NET_PNL_TARGET is True
        self._cycle_net_pnl = 0.0
        self._cycle_date = datetime.now().date()
        
        # Setup logging
        logger.add(
            Config.LOGS_DIR / Config.LOG_FILE,
            rotation="1 day",
            retention="30 days",
            level=Config.LOG_LEVEL
        )
    
    def initialize(self) -> bool:
        """Initialize the trading bot"""
        logger.info("Initializing trading bot...")
        
        # Connect to broker
        if not self.broker.connect():
            logger.error("Failed to connect to Angel One API")
            return False
        
        # Load manual levels if file exists (CSV or Excel from LEVELS_FILE)
        levels_path = Config.BASE_DIR / Config.LEVELS_FILE
        if levels_path.exists():
            if str(levels_path).lower().endswith(('.xlsx', '.xls')):
                self.level_manager.load_manual_levels_from_excel(str(levels_path))
            else:
                self.level_manager.load_manual_levels_from_csv(str(levels_path))
        
        if self.backend_api.health_check():
            logger.info("Backend API is reachable")
            set_alerts_callback(lambda sev, msg, payload: self.backend_api.send_alert(sev, msg, payload))
        else:
            logger.warning("Backend API is not reachable - continuing without backend integration")

        logger.info("Trading bot initialized successfully")
        return True
    
    def run(self):
        """Main trading loop"""
        if not self.initialize():
            return
        
        self.running = True
        self.risk_manager.start_monitoring()
        
        logger.info("Starting trading bot main loop...")
        
        try:
            while self.running:
                # Reset cycle PnL and risk daily state on new day
                today = datetime.now().date()
                if today != self._cycle_date:
                    self._cycle_date = today
                    self._cycle_net_pnl = 0.0
                    self.risk_manager.reset_daily()

                # Honor manual unlock request from portal (user clicked Unlock)
                if self.backend_api.get_unlock_request():
                    self.risk_manager.unlock_trading()
                    self.backend_api.clear_unlock_request()
                    logger.info("Manual unlock applied (request from portal)")

                # Check if trading is allowed
                can_trade, reason = self.risk_manager.can_trade()
                if not can_trade:
                    logger.info(f"Trading paused: {reason}")
                    time.sleep(60)
                    continue

                # Process each index
                for index in Config.INDEX_SYMBOLS.keys():
                    try:
                        self._process_index(index)
                    except Exception as e:
                        logger.error(f"Error processing {index}: {str(e)}")
                
                # Check exit conditions for active trades
                self._check_exit_conditions()
                
                # Sleep before next iteration
                time.sleep(30)  # Check every 30 seconds
                
        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
        finally:
            self.shutdown()
    
    def _process_index(self, index: str):
        """Process trading signals for an index"""
        try:
            # Fetch current price
            current_price = self.data_fetcher.get_current_price(index)
            if not current_price:
                logger.warning(f"Could not get current price for {index}")
                return
            
            # Process each timeframe
            for timeframe in Config.TIMEFRAMES:
                # Fetch OHLC data
                df = self.data_fetcher.fetch_ohlc_data(index, timeframe, days_back=1)
                if df is None or len(df) < 10:
                    logger.warning(f"Insufficient data for {index} {timeframe}")
                    continue
                
                # Compute auto levels if not already done
                if timeframe not in self.level_manager.auto_levels:
                    self.level_manager.compute_auto_levels(df, timeframe)
                
                # Generate signals
                signals = self.strategy.generate_signals(
                    index=index,
                    df=df,
                    timeframe=timeframe,
                    current_price=current_price
                )
                
                # Process signals
                for signal in signals:
                    if signal.index not in self.active_trades:
                        self._execute_signal(signal, index, current_price)
                
                # Update backend with market data
                self._update_backend_market_data(index, timeframe, df, current_price)
            # Send option chain for this index (real-time UI + DB)
            try:
                chain = self.data_fetcher.fetch_option_chain(index)
                if chain:
                    payload = {
                        'index': index,
                        'timestamp': chain.get('timestamp', datetime.now().isoformat()),
                        'underlying_value': chain.get('underlying_value'),
                        'calls': chain['calls'].to_dict('records') if hasattr(chain.get('calls'), 'to_dict') else (chain.get('calls') or []),
                        'puts': chain['puts'].to_dict('records') if hasattr(chain.get('puts'), 'to_dict') else (chain.get('puts') or []),
                    }
                    self.backend_api.send_option_chain(payload)
            except Exception as oc_err:
                logger.debug(f"Option chain send: {oc_err}")
        except Exception as e:
            logger.error(f"Error processing {index}: {str(e)}")
    
    def _execute_signal(self, signal: TradeSignal, index: str, current_price: float):
        """Execute a trading signal"""
        try:
            # Notify portal: pattern detected (so alert shows before signal/trade)
            if getattr(signal, "pattern", None):
                self.backend_api.send_pattern_detection({
                    "pattern": signal.pattern,
                    "type": "bullish" if signal.direction == "call" else "bearish",
                    "index": signal.index,
                    "timeframe": getattr(signal, "timeframe", ""),
                    "level_type": getattr(signal, "level_type", ""),
                    "level_price": getattr(signal, "level_price", None),
                    "current_price": signal.entry_price,
                    "timestamp": datetime.now().isoformat(),
                })
            # Check if we can trade
            can_trade, reason = self.risk_manager.can_trade()
            if not can_trade:
                logger.info(f"Cannot execute signal: {reason}")
                return
            
            # Get real-time option chain (all strike/price/symbol from live data)
            option_chain = self.data_fetcher.fetch_option_chain(index)
            if not option_chain:
                logger.error(f"Could not fetch option chain for {index}")
                return

            # Select strike from real-time option chain (user daily list if set, else ATM/ITM/OTM best return)
            daily_strikes = Config.get_daily_strikes(index)
            result = self.position_sizer.select_strike_from_option_chain(
                option_chain=option_chain,
                index=index,
                direction=signal.direction,
                preference=getattr(Config, 'STRIKE_PREFERENCE', 'best_return'),
                allowed_strikes=daily_strikes,
            )

            if not result:
                logger.warning("Could not select strike from option chain")
                return

            selected_strike, quantity, capital_used, moneyness, option_symbol = result
            # Option price from chain (LTP used for sizing)
            option_price = capital_used / quantity if quantity else 0
            if (option_chain.get('calls') is not None or option_chain.get('puts') is not None):
                options_df = option_chain['calls'] if signal.direction == 'call' else option_chain['puts']
                match = options_df.iloc[(options_df['strike'].astype(float) - selected_strike).abs().argmin()]
                option_price = float(match.get('ltp', option_price) if hasattr(match, 'get') else getattr(match, 'ltp', option_price))
                if not option_symbol:
                    option_symbol = match.get('symbol', '') if hasattr(match, 'get') else getattr(match, 'symbol', '')

            # Get option token (would need to fetch from broker)
            option_token = str(selected_strike)  # Placeholder; in production fetch from broker instrument list

            # Place order
            if signal.direction == 'call':
                order_response = self.broker.place_buy_order(
                    symbol=option_symbol,
                    token=option_token,
                    quantity=quantity,
                    price=option_price,
                    order_type="LIMIT"
                )
            else:
                order_response = self.broker.place_sell_order(
                    symbol=option_symbol,
                    token=option_token,
                    quantity=quantity,
                    price=option_price,
                    order_type="LIMIT"
                )
            
            if order_response and order_response.get('status'):
                signal.status = 'executed'
                signal.order_id = order_response.get('data', {}).get('orderid')
                self.active_trades[signal.index] = signal
                cycle_ended, cycle_number = self.risk_manager.record_trade()
                self.position_sizer.update_capital(index, capital_used)
                
                logger.info(f"Order placed: {signal.direction} {index} @ {selected_strike} | Qty: {quantity}")
                # Send to backend
                self.backend_api.send_trade_signal(signal.to_dict())
                if cycle_ended and cycle_number > 0:
                    self.backend_api.send_trading_log(
                        "info",
                        f"Trade cycle {cycle_number} completed – all trades for this cycle are done",
                        {"cycle_number": cycle_number}
                    )
            else:
                logger.error(f"Failed to place order: {order_response}")
        
        except Exception as e:
            logger.error(f"Error executing signal: {str(e)}")
    
    def _check_exit_conditions(self):
        """Check exit conditions for all active trades"""
        for index, signal in list(self.active_trades.items()):
            try:
                # Fetch latest data
                df = self.data_fetcher.fetch_ohlc_data(signal.index, signal.timeframe, days_back=1)
                if df is None or len(df) < 2:
                    continue
                
                current_price = self.data_fetcher.get_current_price(signal.index)
                if not current_price:
                    continue
                
                # Check exit conditions
                should_exit, reason, exit_price = self.strategy.check_exit_conditions(
                    signal, df, current_price
                )
                
                if should_exit:
                    self._exit_trade(signal, exit_price, reason)
                    del self.active_trades[index]
            
            except Exception as e:
                logger.error(f"Error checking exit for {index}: {str(e)}")
    
    def _exit_trade(self, signal: TradeSignal, exit_price: float, reason: str):
        """Exit a trade"""
        try:
            # Place exit order (opposite of entry)
            if signal.direction == 'call':
                # Sell to exit call
                self.broker.place_sell_order(
                    symbol=signal.index,  # Would need actual symbol
                    token="",  # Would need actual token
                    quantity=1,  # Would need actual quantity
                    price=exit_price,
                    order_type="MARKET"
                )
            else:
                # Buy to exit put
                self.broker.place_buy_order(
                    symbol=signal.index,
                    token="",
                    quantity=1,
                    price=exit_price,
                    order_type="MARKET"
                )
            
            # Calculate P&L
            pnl = (exit_price - signal.entry_price) * 1  # Simplified - would use actual quantity
            
            # Log trade
            trade = Trade(
                trade_id=f"{signal.index}_{datetime.now().timestamp()}",
                index=signal.index,
                symbol=signal.index,  # Would use actual symbol
                direction=signal.direction,
                entry_price=signal.entry_price,
                exit_price=exit_price,
                quantity=1,  # Would use actual quantity
                entry_time=signal.timestamp,
                exit_time=datetime.now(),
                exit_reason=reason,
                pnl=pnl,
                level_type=signal.level_type,
                pattern=signal.pattern
            )
            
            self.journal.add_trade(trade)
            self.backend_api.send_trade_execution(trade.to_dict())
            self.backend_api.send_trading_log("info", "Trade executed", trade.to_dict())

            # Update cycle net PnL and check optional target (user opt-in)
            self._cycle_net_pnl += pnl
            capital = getattr(Config, "TRADING_CAPITAL", 1.0) or 1.0
            net_pnl_pct = (self._cycle_net_pnl / capital) * 100.0
            if getattr(Config, "ENABLE_NET_PNL_TARGET", False) and getattr(Config, "NET_PNL_TARGET_PERCENT", 0):
                target_pct = float(Config.NET_PNL_TARGET_PERCENT)
                if net_pnl_pct >= target_pct:
                    self.risk_manager.set_cycle_pnl_target_reached(True)
                    self.backend_api.send_trading_log(
                        "info",
                        f"Cycle net PnL target reached: {net_pnl_pct:.2f}% (target {target_pct}%)",
                        {"cycle_net_pnl": self._cycle_net_pnl, "net_pnl_pct": net_pnl_pct, "target_pct": target_pct}
                    )
                    logger.warning(f"Cycle net PnL target reached: {net_pnl_pct:.2f}% >= {target_pct}%")

            logger.info(f"Trade exited: {signal.index} | Reason: {reason} | P&L: {pnl:.2f}")
        
        except Exception as e:
            logger.error(f"Error exiting trade: {str(e)}")
    
    def _update_backend_market_data(self, index: str, timeframe: str, df, current_price: float):
        """Update backend with market data and OHLC candles for chart/DB."""
        try:
            levels = self.level_manager.get_levels(timeframe)
            levels_data = [level.to_dict() for level in levels]
            market_data = {
                'index': index,
                'timeframe': timeframe,
                'current_price': current_price,
                'timestamp': datetime.now().isoformat(),
                'levels': levels_data,
                'candle_count': len(df)
            }
            self.backend_api.send_market_data(market_data)
            # Send OHLC for price chart and DB persistence
            if df is not None and len(df) > 0:
                candles = []
                for idx, row in df.iterrows():
                    t = idx.isoformat() if hasattr(idx, 'isoformat') else str(idx)
                    candles.append({
                        'time': t,
                        'open': float(row.get('open', 0)),
                        'high': float(row.get('high', 0)),
                        'low': float(row.get('low', 0)),
                        'close': float(row.get('close', 0)),
                        'volume': float(row.get('volume', 0) or 0),
                    })
                if candles:
                    self.backend_api.send_ohlc(index, timeframe, candles[-500:])
        except Exception as e:
            logger.debug(f"Error updating backend market data: {str(e)}")
    
    def shutdown(self):
        """Shutdown the trading bot"""
        logger.info("Shutting down trading bot...")
        self.running = False
        self.risk_manager.stop_monitoring()
        
        # Export journal
        self.journal.export_to_excel()
        self.journal.export_to_csv()
        
        # Log statistics
        stats = self.journal.get_statistics()
        logger.info(f"Trading Statistics: {stats}")
        
        # Logout from broker
        self.broker.logout()
        logger.info("Trading bot shutdown complete")


def main():
    """Main entry point"""
    bot = TradingBot()
    bot.run()


if __name__ == "__main__":
    main()
