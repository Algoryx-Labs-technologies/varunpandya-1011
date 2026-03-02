# 🔥 Advanced AI + Manual Options Trading System - Architecture

## System Overview

Production-grade, institutional-level intraday options trading system for Nifty/BankNifty/FinNifty using Angel One SmartAPI.

## Architecture Components

### 1. Broker Wrapper (`broker/angel_one.py`)
- **SmartAPI Integration**: Full wrapper around Angel One SmartAPI
- **Key File Loading**: Loads credentials from `key.txt` (space-separated format)
- **Methods**:
  - `connect()` - Authenticate with TOTP
  - `place_buy_order()` / `place_sell_order()` - Order placement
  - `cancel_order()` / `cancel_all()` - Order cancellation
  - `get_position()` / `get_tradebook()` - Position and trade data
  - `get_ltp()` - Last traded price
  - `get_historical_data()` - OHLC data fetching

### 2. Data Engine (`data/data_fetcher.py`)
- **Multi-timeframe Support**: 1m, 5m, 15m
- **Multi-index Support**: NIFTY, BANKNIFTY, FINNIFTY
- **Data Sources** (real-time / NSE only, no yfinance):
  - Angel One API: OHLC (historical/intraday)
  - NSE API: option chain only (real-time)
- **Features**:
  - Historical data from market open (9:15)
  - Live updates with caching
  - Option chain real-time fetching
  - Vectorized pandas DataFrames

### 3. Level Engine (`levels/level_manager.py`)

#### Manual Mode
- CSV upload support (format: `index, timeframe, level_type, price, stoploss, target`)
- GUI entry support
- Level types: EU, TFD, ED, TFU, RU, TFRU, RD, TFRD, EURTZ, EDRTZ

#### AI Auto-Level Mode (`ai/ml_level_detector.py`)
- **10+ Indicator Variations**:
  1. ATR Bands
  2. Bollinger Bands
  3. Keltner Channel
  4. Donchian Channel
  5. VWAP
  6. Supertrend
  7. Parabolic SAR
  8. RSI zones
  9. MACD histogram clusters
  10. Pivot points
  11. Fibonacci retracement
  12. Volume profile clusters

- **Machine Learning Layer** (`indicators/advanced_indicators.py`):
  - KMeans clustering on swing highs/lows
  - DBSCAN clustering
  - Linear regression on rolling windows
  - Gradient Boosting regression for level prediction
  - Confidence-weighted aggregation
  - Top 30-40 highest confidence zones

### 4. Candlestick Pattern Engine (`patterns/candlestick_patterns.py`)
- **TA-Lib Integration**: Vectorized pattern detection
- **Bullish Patterns**:
  - Hammer
  - Bullish Spinning Top
  - Bullish Kicker
  - Bullish Engulfing
  - Morning Doji Star
  - Three White Soldiers

- **Bearish Patterns**:
  - Shooting Star
  - Bearish Spinning Top
  - Bearish Engulfing
  - Bearish Kicker
  - Three Black Crows
  - Evening Doji Star

- **Features**:
  - Vectorized detection
  - Pattern confirmation at candle i
  - Custom OHLC thresholds via UI
  - Multi-candle pattern support

### 5. Strategy Engine (`strategy/trading_strategy.py`)
- **Entry Logic**:
  - Level break + pattern confirmation
  - Trading hours validation
  - Examples:
    - EU + bullish pattern → Buy CALL
    - ED + bearish pattern → Buy PUT
    - RU/RD → Reversal logic

- **Target Logic**:
  - Wait max 7-10 candles
  - Exit at target if hit
  - Exit at candle 10 close if target not hit
  - Fully vectorized computation

- **Stop Loss**:
  - User-defined SL
  - Immediate exit if hit

### 6. Strike Selection Engine (`money/position_sizing.py`)
- **Manual Mode**: User provides daily strikes list
- **Auto Mode**: ATM or highest OI strike
- **Selection Logic**:
  - Fetch LTP of each strike
  - Compute quantity: `qty = floor(capital / price)`
  - Choose strike with maximum capital utilization
  - Consider lot size requirements
  - Vectorized selection

### 7. Risk Engine (`risk/risk_manager.py`)
- **Auto Lock**: After 2 trades per day
- **Kill Switch**: At 3:15 PM
  - Cancel all open orders
  - Square off positions
  - Reset system
- **Manual Unlock**: Via UI toggle

### 8. Multithreading (`execution/execution_engine.py`)
- **Threads**:
  1. Position updater (every 2 sec)
  2. Trade monitor (every 5 sec)
  3. Average trade trimmer (every 15 sec)
  4. Kill switch monitor
  5. Data refresh thread

### 9. Journal Engine (`journal/trade_journal.py`)
- **Stores**:
  - Entry/exit price
  - Index, strike, pattern, level type
  - Target, stoploss, holding time
  - P&L, capital used

- **Exports**:
  - JSON
  - Excel/CSV

### 10. Analytics Engine (`analytics/analytics_engine.py`)
- **Metrics**:
  - Win rate
  - Average R:R
  - Avg holding time
  - Level type performance
  - Strike efficiency
  - Best timeframe
  - Max drawdown
  - Profit factor

### 11. AI Missed Trade Detector (`ai/missed_trade_detector.py`)
- Scans for valid signals not executed
- Marks as missed trade
- Suggests improvements
- Displays on dashboard

### 12. Market Intelligence (`intelligence/market_intelligence.py`)
- **Filters**:
  - Put-Call ratio (sentiment proxy)
  - OI change momentum
  - Volatility spike detection
  - Volume breakout filter
  - Trend filter (EMA slope)
  - Composite filter score (0-100)

### 13. Scheduler (`scheduler/daily_scheduler.py`)
- **8:30 AM**: Pre-market analysis (AI level detection)
- **9:15 AM**: Market open (activate trading)
- **3:15 PM**: Kill switch

### 14. Frontend (`apps/frontend/`)
- **React Dashboard**:
  - Real-time candlestick charts (TradingView lightweight)
  - Level overlay lines
  - Entry/exit markers
  - Trade journal dashboard
  - Manual level entry form
  - CSV upload
  - Capital allocation input
  - Strike list input
  - AI/manual mode toggle
  - Autolock toggle/unlock button
  - Live P&L display
  - Missed trade suggestions
  - Indicator overlay selector
  - WebSocket real-time updates

### 15. Backend API (`apps/backend/`)
- **REST Endpoints**:
  - `POST /api/trading/signals` - Receive signals
  - `POST /api/trading/trades` - Receive trades
  - `POST /api/trading/levels` - Receive levels
  - `POST /api/trading/market-data` - Receive market data
  - `GET /api/trading/*` - Retrieve data
  - `GET /api/trading/statistics` - Get analytics

- **WebSocket**: Real-time updates to frontend

## Data Flow

```
Trading Bot (Python)
    ↓
1. Fetch OHLC data (1m/5m/15m)
2. Compute levels (Manual/AI)
3. Detect patterns (TA-Lib)
4. Generate signals (Strategy engine)
5. Apply filters (Market intelligence)
6. Execute trades (Execution engine)
7. Monitor positions (Multithreading)
8. Log trades (Journal)
9. Analyze performance (Analytics)
    ↓
Backend API (Node.js)
    ↓ (WebSocket)
Frontend (React)
```

## Key Files

- `main.py` - Main orchestrator
- `config.py` - Configuration (loads from key.txt)
- `key.txt` - Credentials (api_key client_secret client_code password totp_secret)

## Performance Requirements

- ✅ Fully vectorized logic (pandas/numpy)
- ✅ No iterative candle-by-candle loops
- ✅ Low latency execution
- ✅ Fail-safe API reconnection
- ✅ Comprehensive exception handling

## Production Ready Features

- ✅ Modular architecture
- ✅ Type hints
- ✅ Comprehensive logging
- ✅ Error handling
- ✅ Configuration management
- ✅ Multithreading
- ✅ Real-time updates
- ✅ Analytics and reporting

## Installation & Setup

1. Install dependencies: `pip install -r requirements.txt`
2. Configure `key.txt` with Angel One credentials
3. Set up `.env` for additional configuration
4. Run: `python main.py`

## Integration

- Backend API: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- WebSocket: `ws://localhost:3000/ws`
