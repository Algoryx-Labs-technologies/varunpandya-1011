"""
Configuration management for the trading system
"""
import os
from dotenv import load_dotenv
from typing import Dict, Any
from pathlib import Path

# Load environment variables
load_dotenv()

def load_key_file(filepath: str = 'key.txt') -> Dict[str, str]:
    """Load credentials from key.txt file"""
    try:
        key_path = Path(__file__).parent / filepath
        if key_path.exists():
            with open(key_path, 'r') as f:
                line = f.read().strip()
                parts = line.split()
                if len(parts) >= 5:
                    return {
                        'api_key': parts[0],
                        'client_secret': parts[1],
                        'client_code': parts[2],
                        'password': parts[3],
                        'totp_secret': parts[4]
                    }
        return {}
    except Exception as e:
        print(f"Error loading key.txt: {e}")
        return {}

# Load from key.txt first, then fallback to env
key_data = load_key_file()


def _float_env(key: str, default: float) -> float:
    try:
        v = os.getenv(key)
        return float(v) if v not in (None, '') else default
    except (ValueError, TypeError):
        return default


def _int_env(key: str, default: int) -> int:
    try:
        v = os.getenv(key)
        return int(v) if v not in (None, '') else default
    except (ValueError, TypeError):
        return default


class Config:
    """Central configuration class"""
    
    # Angel One API Credentials (from key.txt or env)
    ANGEL_ONE_API_KEY = key_data.get('api_key') or os.getenv('ANGEL_ONE_API_KEY', '')
    ANGEL_ONE_CLIENT_SECRET = key_data.get('client_secret') or os.getenv('ANGEL_ONE_CLIENT_SECRET', '')
    ANGEL_ONE_CLIENT_ID = key_data.get('client_code') or os.getenv('ANGEL_ONE_CLIENT_ID', '')
    ANGEL_ONE_PASSWORD = key_data.get('password') or os.getenv('ANGEL_ONE_PASSWORD', '')
    ANGEL_ONE_TOTP_SECRET = key_data.get('totp_secret') or os.getenv('ANGEL_ONE_TOTP_SECRET', '')
    
    # Trading Configuration (invalid env = use default)
    TRADING_CAPITAL = _float_env('TRADING_CAPITAL', 20000.0)
    NIFTY_ALLOCATION = _float_env('NIFTY_ALLOCATION', 0.5)
    BANKNIFTY_ALLOCATION = _float_env('BANKNIFTY_ALLOCATION', 0.5)
    FINNIFTY_ALLOCATION = _float_env('FINNIFTY_ALLOCATION', 0.0)

    # Risk Management
    MAX_TRADES_PER_DAY = _int_env('MAX_TRADES_PER_DAY', 2)
    KILL_SWITCH_TIME = os.getenv('KILL_SWITCH_TIME', '15:15')
    STOP_LOSS_PERCENTAGE = _float_env('STOP_LOSS_PERCENTAGE', 2.0)
    TARGET_PERCENTAGE = _float_env('TARGET_PERCENTAGE', 1.5)

    # Strategy Parameters
    CANDLES_TO_WAIT = _int_env('CANDLES_TO_WAIT', 7)
    MIN_CANDLE_BODY_SIZE = _float_env('MIN_CANDLE_BODY_SIZE', 0.3)
    MIN_WICK_RATIO = _float_env('MIN_WICK_RATIO', 0.5)
    
    # Strike selection: 'best_return' | 'atm' | 'itm' | 'otm'
    _STRIKE_PREF_VALID = ('best_return', 'atm', 'itm', 'otm')
    _strike_pref = (os.getenv('STRIKE_PREFERENCE') or 'best_return').strip().lower()
    STRIKE_PREFERENCE = _strike_pref if _strike_pref in _STRIKE_PREF_VALID else 'best_return'
    # Lot sizes per index (NSE)
    LOT_SIZES = {'NIFTY': 50, 'BANKNIFTY': 25, 'FINNIFTY': 25}
    
    # Backend API Integration
    BACKEND_API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:3000')
    BACKEND_API_KEY = os.getenv('BACKEND_API_KEY', '')
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'trading.log')
    
    # File Paths
    BASE_DIR = Path(__file__).parent
    DATA_DIR = BASE_DIR / 'data'
    LOGS_DIR = BASE_DIR / 'logs'
    LEVELS_DIR = BASE_DIR / 'levels'
    # Manual levels file (CSV or Excel); edge case: missing = skip load
    LEVELS_FILE = os.getenv('LEVELS_FILE', 'levels/levels.csv')

    # Create directories if they don't exist
    DATA_DIR.mkdir(exist_ok=True)
    LOGS_DIR.mkdir(exist_ok=True)
    LEVELS_DIR.mkdir(exist_ok=True)
    
    # Index Symbols
    INDEX_SYMBOLS = {
        'NIFTY': 'NIFTY',
        'BANKNIFTY': 'BANKNIFTY',
        'FINNIFTY': 'FINNIFTY'
    }
    
    # Timeframes
    TIMEFRAMES = ['1m', '5m', '15m']
    
    # Exchange
    EXCHANGE = 'NSE'
    PRODUCT_TYPE = 'INTRADAY'
    ORDER_DURATION = 'DAY'
    VARIETY = 'NORMAL'
    
    @classmethod
    def get_allocation(cls, index: str) -> float:
        """Get capital allocation for an index"""
        allocations = {
            'NIFTY': cls.NIFTY_ALLOCATION,
            'BANKNIFTY': cls.BANKNIFTY_ALLOCATION,
            'FINNIFTY': cls.FINNIFTY_ALLOCATION
        }
        return allocations.get(index, 0.0) * cls.TRADING_CAPITAL
