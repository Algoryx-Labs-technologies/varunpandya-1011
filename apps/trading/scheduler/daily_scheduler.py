"""
Daily Scheduler
Handles scheduled tasks: AI level detection, trading activation, kill switch
"""
import schedule
import time
import threading
from datetime import datetime, time as dt_time
from loguru import logger
from typing import Callable, Optional


class DailyScheduler:
    """Manages daily trading schedule"""
    
    def __init__(self):
        self.running = False
        self.scheduler_thread = None
        self.callbacks = {
            'pre_market_analysis': None,
            'market_open': None,
            'kill_switch': None
        }
    
    def register_callback(self, event: str, callback: Callable):
        """Register callback for scheduled events"""
        if event in self.callbacks:
            self.callbacks[event] = callback
            logger.info(f"Registered callback for {event}")
        else:
            logger.warning(f"Unknown event: {event}")
    
    def start(self):
        """Start the scheduler"""
        if self.running:
            return
        
        self.running = True
        
        # Schedule tasks
        schedule.every().day.at("08:30").do(self._pre_market_analysis)
        schedule.every().day.at("09:15").do(self._market_open)
        schedule.every().day.at("15:15").do(self._kill_switch)
        
        # Start scheduler thread
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        logger.info("Daily scheduler started")
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        schedule.clear()
        logger.info("Daily scheduler stopped")
    
    def _run_scheduler(self):
        """Run scheduler loop"""
        while self.running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    def _pre_market_analysis(self):
        """Pre-market analysis at 8:30 AM"""
        logger.info("Running pre-market analysis...")
        if self.callbacks['pre_market_analysis']:
            try:
                self.callbacks['pre_market_analysis']()
            except Exception as e:
                logger.error(f"Error in pre-market analysis callback: {e}")
    
    def _market_open(self):
        """Market open at 9:15 AM"""
        logger.info("Market opened - activating trading...")
        if self.callbacks['market_open']:
            try:
                self.callbacks['market_open']()
            except Exception as e:
                logger.error(f"Error in market open callback: {e}")
    
    def _kill_switch(self):
        """Kill switch at 3:15 PM"""
        logger.warning("Kill switch activated - squaring off positions...")
        if self.callbacks['kill_switch']:
            try:
                self.callbacks['kill_switch']()
            except Exception as e:
                logger.error(f"Error in kill switch callback: {e}")
    
    def is_trading_hours(self) -> bool:
        """Check if current time is within trading hours"""
        now = datetime.now().time()
        market_open = dt_time(9, 15)
        market_close = dt_time(15, 15)
        return market_open <= now <= market_close
    
    def time_until_market_open(self) -> Optional[float]:
        """Get seconds until market open"""
        now = datetime.now()
        market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
        
        if now < market_open:
            return (market_open - now).total_seconds()
        return None
    
    def time_until_kill_switch(self) -> Optional[float]:
        """Get seconds until kill switch"""
        now = datetime.now()
        kill_time = now.replace(hour=15, minute=15, second=0, microsecond=0)
        
        if now < kill_time:
            return (kill_time - now).total_seconds()
        return None
