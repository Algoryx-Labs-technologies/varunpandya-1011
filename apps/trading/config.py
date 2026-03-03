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

# Load from key.txt first, then fallback to env (including ANGELONE_* alternative names)
key_data = load_key_file()


_ANGEL_KEY_MAP = {"ANGEL_ONE_API_KEY": "api_key", "ANGEL_ONE_CLIENT_SECRET": "client_secret", "ANGEL_ONE_CLIENT_ID": "client_code", "ANGEL_ONE_PASSWORD": "password", "ANGEL_ONE_TOTP_SECRET": "totp_secret"}


def _angel_env(env_key: str, alt_key: str = None) -> str:
    """Get Angel One credential: key.txt -> ANGEL_ONE_* -> alt env (e.g. ANGELONE_TRADING_API_KEY, AUTH_USERNAME)."""
    if isinstance(key_data, dict):
        k = _ANGEL_KEY_MAP.get(env_key)
        if k and key_data.get(k):
            return key_data.get(k)
    val = (os.getenv(env_key) or "").strip()
    if val:
        return val
    if alt_key:
        return (os.getenv(alt_key) or "").strip()
    return ""


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
    
    # Angel One API Credentials (from key.txt or env; env can use ANGELONE_TRADING_* etc.)
    ANGEL_ONE_API_KEY = _angel_env("ANGEL_ONE_API_KEY", "ANGELONE_TRADING_API_KEY") or key_data.get('api_key') or os.getenv('ANGEL_ONE_API_KEY', '')
    ANGEL_ONE_CLIENT_SECRET = _angel_env("ANGEL_ONE_CLIENT_SECRET", "ANGELONE_TRADING_SECRET_KEY") or key_data.get('client_secret') or os.getenv('ANGEL_ONE_CLIENT_SECRET', '')
    ANGEL_ONE_CLIENT_ID = _angel_env("ANGEL_ONE_CLIENT_ID", "AUTH_USERNAME") or key_data.get('client_code') or os.getenv('ANGEL_ONE_CLIENT_ID', '')
    ANGEL_ONE_PASSWORD = _angel_env("ANGEL_ONE_PASSWORD", "AUTH_PASSWORD") or key_data.get('password') or os.getenv('ANGEL_ONE_PASSWORD', '')
    ANGEL_ONE_TOTP_SECRET = key_data.get('totp_secret') or os.getenv('ANGEL_ONE_TOTP_SECRET', '').strip() or os.getenv('ANGELONE_TOTP_SECRET', '').strip()
    
    # Trading Configuration (invalid env = use default)
    TRADING_CAPITAL = _float_env('TRADING_CAPITAL', 20000.0)
    NIFTY_ALLOCATION = _float_env('NIFTY_ALLOCATION', 0.5)
    BANKNIFTY_ALLOCATION = _float_env('BANKNIFTY_ALLOCATION', 0.5)
    FINNIFTY_ALLOCATION = _float_env('FINNIFTY_ALLOCATION', 0.0)

    # Risk Management
    MAX_TRADES_PER_DAY = _int_env('MAX_TRADES_PER_DAY', 4)
    TRADE_CYCLES = max(1, _int_env('TRADE_CYCLES', 2))  # Number of trade cycles per day (e.g. 2)
    TRADES_PER_CYCLE = max(1, _int_env('TRADES_PER_CYCLE', 2))  # Trades per cycle; alert when each cycle ends
    KILL_SWITCH_TIME = os.getenv('KILL_SWITCH_TIME', '15:15')
    STOP_LOSS_PERCENTAGE = _float_env('STOP_LOSS_PERCENTAGE', 2.0)
    TARGET_PERCENTAGE = _float_env('TARGET_PERCENTAGE', 1.5)

    # Paper vs Live: PAPER_TRADING=true (default) = no real orders, only data/signals/logs. Set PAPER_TRADING=false or TRADING_MODE=live for live orders.
    _paper_raw = os.getenv('PAPER_TRADING', 'true').strip().lower()
    _mode = (os.getenv('TRADING_MODE') or '').strip().lower()
    if _mode == 'live':
        PAPER_TRADING = False
    elif _mode == 'paper':
        PAPER_TRADING = True
    else:
        PAPER_TRADING = _paper_raw in ('1', 'true', 'yes')

    # Trade cycle: stop new trades when net PnL reaches target % of capital (user opt-in)
    ENABLE_NET_PNL_TARGET = os.getenv('ENABLE_NET_PNL_TARGET', 'false').strip().lower() in ('1', 'true', 'yes')
    NET_PNL_TARGET_PERCENT = _float_env('NET_PNL_TARGET_PERCENT', 20.0)

    # Strategy Parameters
    CANDLES_TO_WAIT = _int_env('CANDLES_TO_WAIT', 7)
    # Min candles to hold before allowing take-profit or time-based square off (stop loss still immediate)
    MIN_CANDLES_BEFORE_EXIT = _int_env('MIN_CANDLES_BEFORE_EXIT', 7)
    # Target candles (e.g. 7 or 10): square off trade after this many candles
    CANDLES_BEFORE_SQUARE_OFF = _int_env('CANDLES_BEFORE_SQUARE_OFF', 10)
    # Candlestick pattern filters: tune to make pattern detection more/less strict (open/high/low/close effect via body/wick)
    MIN_CANDLE_BODY_SIZE = _float_env('MIN_CANDLE_BODY_SIZE', 0.3)
    MIN_WICK_RATIO = _float_env('MIN_WICK_RATIO', 0.5)
    PATTERN_MAX_BODY_SIZE = _float_env('PATTERN_MAX_BODY_SIZE', 0.0)  # 0 = no max; set e.g. 0.6 to exclude very large bodies
    
    # Strike selection: 'best_return' | 'atm' | 'itm' | 'otm'
    _STRIKE_PREF_VALID = ('best_return', 'atm', 'itm', 'otm')
    _strike_pref = (os.getenv('STRIKE_PREFERENCE') or 'best_return').strip().lower()
    STRIKE_PREFERENCE = _strike_pref if _strike_pref in _STRIKE_PREF_VALID else 'best_return'
    # Optional daily strike list (comma-separated). If set, only these strikes are used for selection.
    # e.g. DAILY_STRIKES_NIFTY=29050,29100,29150,29200
    _daily_strikes_raw = {
        'NIFTY': os.getenv('DAILY_STRIKES_NIFTY', '').strip(),
        'BANKNIFTY': os.getenv('DAILY_STRIKES_BANKNIFTY', '').strip(),
        'FINNIFTY': os.getenv('DAILY_STRIKES_FINNIFTY', '').strip(),
    }

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

    @classmethod
    def get_daily_strikes(cls, index: str):
        """
        Optional user-provided strike list for the day (e.g. 29050,29100,29150,29200).
        Returns list of floats or None if not set; when set, strike selection uses only these strikes.
        """
        raw = cls._daily_strikes_raw.get((index or '').strip().upper(), '').strip()
        if not raw:
            return None
        try:
            return [float(x.strip()) for x in raw.split(',') if x.strip()]
        except (ValueError, TypeError):
            return None
