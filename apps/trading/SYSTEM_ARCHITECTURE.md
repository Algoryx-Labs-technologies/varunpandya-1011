# 🔥 Advanced AI + Manual Options Trading System - Architecture

## System Overview

Production-grade, institutional-level intraday options trading system for Nifty/BankNifty/FinNifty using Angel One SmartAPI.

## Architecture Components

### 1. Broker Wrapper (`broker/angel_one.py`)
- **SmartAPI Integration**: Full wrapper around Angel One SmartAPI
- **Credentials**: Loaded from `.env` only (ANGEL_ONE_*)
- **Methods**:
  - `connect()` - Authenticate with TOTP
  - `place_buy_order()` / `place_sell_order()` - Order placement
  - `cancel_order()` / `cancel_all()` - Order cancellation
  - `get_all_open_orders()` - List of pending orders; `get_all_open_orders_as_df()` - Same as DataFrame (when pandas available)
  - `get_position()` / `get_tradebook()` - Position and trade data
  - `get_ltp()` - Last traded price
  - `get_historical_data()` - OHLC data fetching
  - `squareoff(exchange, wait_seconds=30)` - Cancel all orders, square all positions at LTP, wait, log positions (used by kill switch)

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

#### Levels per trade cycle (manual + automatic)
- **Manual**: User-defined levels from CSV/Excel or UI (required columns: `price`, `type`, `timeframe`). Level types: EU, TFD, ED, TFU, RU, TFRU, RD, TFRD, EURTZ, EDRTZ.
- **Automatic (intelligence)**: From ML and indicators (pivot, K-Means, ATR, Bollinger, SAR, ML detector). See `TRADING_ENGINE_EXPLAINED.md` Section 4.
- **Every trade cycle** uses **all levels** from both sources (manual + automatic); `get_levels(timeframe)` returns the merged list.

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
  - Configurable OHLC filters: `MIN_CANDLE_BODY_SIZE`, `MIN_WICK_RATIO`, `PATTERN_MAX_BODY_SIZE` (env) for stricter/looser detection
  - Multi-candle pattern support

### 5. Strategy Engine (`strategy/trading_strategy.py`)
- **Entry Logic**:
  - Level break + pattern confirmation
  - Trading hours validation
  - Examples:
    - EU + bullish pattern → Buy CALL
    - ED + bearish pattern → Buy PUT
    - RU/RD → Reversal logic

- **Exit Logic** (see `TRADING_ENGINE_EXPLAINED.md` Section 3):
  - **Stop loss**: Always allowed immediately (user-defined SL %).
  - **Minimum hold**: No take-profit or time-based exit until `MIN_CANDLES_BEFORE_EXIT` candles (default 7).
  - **Take profit**: Allowed only after min candles; exit at target if hit.
  - **Time-based square off**: After target candles (`CANDLES_BEFORE_SQUARE_OFF`, e.g. 7 or 10), exit at market if still in trade.

### 6. Strike Selection Engine (`money/position_sizing.py`)
- **Optimal allocation on strike prices based on highest historical return**: Selection uses a **historical return score** = utilization × ATM weight (ATM = 1.0, ITM/OTM = 0.9) so that the chosen strike maximizes participation and favors ATM (highest delta/return potential).
- **User daily strikes** (optional): Set `DAILY_STRIKES_NIFTY`, `DAILY_STRIKES_BANKNIFTY`, `DAILY_STRIKES_FINNIFTY` (comma-separated); when set, only these strikes are considered.
- **Auto from option chain**: Otherwise uses full/ATM window from live option chain.
- **Selection Logic**:
  - Preference: `best_return` (highest historical return proxy) | `atm` | `itm` | `otm` (`STRIKE_PREFERENCE`)
  - Compute quantity: `qty = floor(allocation / price)` per lot size
  - Rank by historical_return_score (utilization × atm_weight), then capital_used
  - Vectorized selection

### 7. Risk Engine (`risk/risk_manager.py`)
- **Trade cycles**: `TRADE_CYCLES` (default 2) per day; `TRADES_PER_CYCLE` (default 2). When a cycle completes (e.g. after trade 2, cycle 1), an **alert** and **trading log** are sent ("Trade cycle N completed – all trades for this cycle are done").
- **Auto Lock**: After `MAX_TRADES_PER_DAY` (default 4); no new trades until next day (or manual unlock).
- **Kill Switch**: At `KILL_SWITCH_TIME` (e.g. 15:15 IST) – calls broker `squareoff()` (cancel all, square at LTP, wait 30s), then set auto-lock.
- **Cycle net PnL target** (opt-in): If `ENABLE_NET_PNL_TARGET=true`, when daily PnL as % of capital ≥ `NET_PNL_TARGET_PERCENT` (e.g. 20%), no new trades until next day.
- **Manual Unlock**: User clicks **Unlock trading** in Risk tab → backend sets unlock request → bot polls `GET /api/trading/unlock-request`, calls `unlock_trading()`, clears request. Trading resumes on next loop.

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
- **React Dashboard** (tabs: Dashboard, Trading, Signals, Trades, Patterns, Intelligence, Risk, Alerts, Statistics, Indicators, Analytics, AI, **Logs**):
  - Real-time candlestick charts (lightweight-charts) + level overlay
  - Option chain panel
  - Manual level entry and CSV/Excel upload
  - **Market status**: Live / Market closed / Offline (from Indian market hours IST via backend `/api/trading/market-status`)
  - **Logs tab**: Select date, view trading logs for that day (from backend DB)
  - WebSocket real-time updates (signals, trades, OHLC, option chain, alerts, etc.)

### 15. Backend API (`apps/backend/`)
- **REST**: In-memory store + optional SQLite (candles, option_snapshots, trades, **trading_logs**).
- **Key endpoints**:
  - `POST /api/trading/signals`, `/trades`, `/levels`, `/market-data`, `/ohlc`, `/option-chain`, `/alert`, `/pattern-detection`, **`/logs`**
  - `GET /api/trading/ohlc`, `/option-chain`, `/signals`, `/trades`, `/statistics`, **`/logs?date=YYYY-MM-DD`**, **`/market-status`** (Indian market hours IST)
- **WebSocket**: Real-time broadcast of signals, trades, OHLC, option-chain, alerts, pattern-detection, risk-status, etc.

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
- `config.py` - Configuration (from .env only)

## Testing (real historical data)

Tests run on **real historical OHLC** that has been fetched and saved under `data/historical/index_ohlc/`. Run `python tests/run_e2e_with_logs.py` once to fetch and save data; then `pytest tests/ -v` uses this data for indicators, levels, patterns, ML, and E2E flow tests. When no historical data exists, tests fall back to synthetic dummy data or skip (see `tests/README.md` and `conftest.py` fixtures `historical_ohlc_df`, `real_ohlc_df`).

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

1. **Trading bot**: `cd apps/trading`, `pip install -r requirements.txt`, configure `.env` with Angel One credentials and `BACKEND_API_URL`, run `python main.py`.
2. **Full stack**: From repo root run `node run-all.js` to start backend + frontend; see repo root **`TRADING_ENGINE_EXPLAINED.md`** Section 12 (Process to run the system) for full steps.

## Integration

- Backend API: `http://localhost:3000` (or port chosen by `run-all.js`)
- Frontend: `http://localhost:5173`
- WebSocket: `ws://localhost:<port>/ws`
- For full architecture and level/exit/risk details, see **`TRADING_ENGINE_EXPLAINED.md`** in the repo root.
