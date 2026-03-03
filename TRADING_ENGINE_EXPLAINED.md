# Trading Engine – Detailed Explanation

This document describes how the Vertex Options trading system works: the Python trading bot, the Node backend, the React frontend, and how they interact.

---

## Table of contents

1. [System architecture](#1-system-architecture)
2. [Trading bot (Python) – deep dive](#2-trading-bot-python--deep-dive)
3. [Exit logic: candles, take profit, square off](#3-exit-logic-candles-take-profit-square-off)
4. [Levels: types, manual input, and automatic calculation](#4-levels-types-manual-input-and-automatic-calculation)
5. [Risk management and trade cycle](#5-risk-management-and-trade-cycle)
6. [Backend (Node)](#6-backend-node)
7. [Frontend (React)](#7-frontend-react)
8. [Indian market hours (Live / Market closed)](#8-indian-market-hours-live--market-closed)
9. [Trading logs and persistence](#9-trading-logs-and-persistence)
10. [Configuration reference](#10-configuration-reference)
11. [End-to-end data flow](#11-end-to-end-data-flow)
12. [Process to run the system](#12-process-to-run-the-system)

---

## 1. System architecture

The system has **three main parts**:

| Component | Location | Role |
|-----------|----------|------|
| **Trading bot** | `apps/trading/` (Python) | Connects to Angel One, fetches OHLC and option chain, loads levels, detects patterns, generates signals, places and exits option trades, and pushes all relevant data to the backend. |
| **Backend** | `apps/backend/` (Node/Express) | Receives data from the bot via REST, stores trades and logs in SQLite, keeps recent data in memory, and serves the frontend via REST and WebSocket. |
| **Frontend** | `apps/frontend/` (React/Vite) | Connects to the backend over WebSocket and REST, and displays charts, option chain, trades, signals, alerts, logs, statistics, and market status (Live / Market closed). |

**Data flow (high level):** Bot → HTTP POST to backend → backend stores and broadcasts over WebSocket → frontend receives and renders. The bot also writes trades to a local journal (CSV/Excel) and uses config from `config.py` / `.env`.

---

## 2. Trading bot (Python) – deep dive

**Entry point:** `apps/trading/main.py` → `TradingBot` class → `run()`.

### 2.1 Components initialized

| Component | Module | Purpose |
|-----------|--------|---------|
| **Broker** | `broker/angel_one.py` | Angel One API: login, fetch price/OHLC/option chain, place/cancel orders. |
| **DataFetcher** | `data/data_fetcher.py` | Uses broker to get current price and OHLC for indices and timeframes. |
| **LevelManager** | `levels/level_manager.py` | Holds manual levels (CSV/Excel) and/or auto-levels computed from OHLC. |
| **TradingStrategy** | `strategy/trading_strategy.py` | Generates signals from levels + patterns; checks exit conditions (SL, target, candles). |
| **CandlestickPatternDetector** | `patterns/candlestick_patterns.py` | Detects patterns (e.g. bullish/bearish) and level breaks; uses MIN_CANDLE_BODY_SIZE, MIN_WICK_RATIO, optional PATTERN_MAX_BODY_SIZE. |

### 2.2 Broker (Angel One)

- **Orders:** `place_buy_order`, `place_sell_order`, `cancel_order`, `cancel_all`, `get_all_open_orders` (list), `get_all_open_orders_as_df()` (pandas DataFrame when pandas available).
- **Positions & data:** `get_position`, `get_tradebook`, `get_ltp`, `get_historical_data`.
- **Square off:** `squareoff(exchange, wait_seconds=30)` cancels all open orders, squares every position at LTP, waits, then logs remaining positions. Used by kill switch.
| **PositionSizer** | `money/position_sizing.py` | Optimal allocation on strike prices based on highest historical return (utilization × ATM weight); selects strike and quantity from option chain. |
| **RiskManager** | `risk/risk_manager.py` | Enforces max trades per day, kill-switch time, cycle PnL target (opt-in), auto-lock. |
| **TradeJournal** | `journal/trade_journal.py` | Appends trades locally (JSON/CSV/Excel), computes stats. |
| **BackendAPI** | `api/integration.py` | HTTP client to backend: sends signals, trades, OHLC, option chain, alerts, logs. |

### 2.2 Main loop (step by step)

The bot runs an infinite loop with a **~30 second** sleep between iterations.

#### Step 1: Daily reset

- If the **calendar date** has changed since the last run:
  - **Cycle net PnL** is reset to `0` (used for the “stop at X% daily profit” feature).
  - **risk_manager.reset_daily()** is called: resets trade count, auto-lock, and the “cycle PnL target reached” flag.

#### Step 2: Can we trade?

- **risk_manager.can_trade()** returns `(allowed, reason)`. It checks, in order:
  1. **Cycle net PnL target** (if `ENABLE_NET_PNL_TARGET` is true): if daily PnL as % of capital ≥ `NET_PNL_TARGET_PERCENT`, no new trades until next day.
  2. **Auto-lock**: max trades per day already reached.
  3. **Kill-switch time** (e.g. 15:15): no new trades after this time.
- If not allowed, the bot logs “Trading paused: &lt;reason&gt;”, sleeps **60 seconds**, and goes back to the start of the loop.

#### Step 3: Process each index (NIFTY, BANKNIFTY, FINNIFTY)

For each index, **`_process_index(index)`** runs:

1. **Current price** – Fetched via `data_fetcher.get_current_price(index)`.
2. **OHLC** – Fetched for each configured timeframe (e.g. 1m, 5m, 15m). If the level manager does not yet have auto-levels for that timeframe, they are computed from OHLC.
3. **Levels** – From **LevelManager**: manual levels (CSV/Excel from `LEVELS_FILE`) and/or auto-levels. Levels define support/resistance and level types (EU, ED, RU, RD, etc.).
4. **Signals** – **TradingStrategy.generate_signals(index, df, timeframe, current_price)**:
   - Runs **candlestick pattern** detection on the OHLC DataFrame.
   - For each level, checks for a **level break** with a qualifying pattern (e.g. bullish at support → call, bearish at resistance → put).
   - Builds **TradeSignal** objects: index, direction (call/put), entry_price, target_price, stop_loss, level_type, pattern, timeframe, timestamp.
5. **Execute new signals** – For each signal whose ID is not already in **active_trades**, **`_execute_signal(signal, index, current_price)`**:
   - Calls **can_trade()** again.
   - Fetches **option chain** for the index.
   - **PositionSizer** selects strike and quantity from the option chain: **optimal allocation is on strike prices based on highest historical return** (uses utilization and ATM-weight proxy; or `STRIKE_PREFERENCE` atm/itm/otm).
   - Sends **pattern detection** to the backend (for alerts/UI).
   - **Broker**: places buy (call) or sell (put) order with the chosen strike and quantity.
   - On success: marks signal as executed, stores it in **active_trades**, **risk_manager.record_trade()**, updates capital in position sizer, sends signal to backend.
6. **Backend updates** – Sends **market data** (levels, price), **OHLC candles** (for charts), and **option chain** to the backend (stored in memory and/or SQLite).

#### Step 4: Check exit conditions for active trades

- **`_check_exit_conditions()`** runs for **every** entry in **active_trades**:
  - Fetches latest OHLC and current price for that signal’s index/timeframe.
  - **TradingStrategy.check_exit_conditions(signal, df, current_price)** returns whether to exit and why (see [Section 3](#3-exit-logic-candles-take-profit-square-off)).
- If exit is required:
  - **`_exit_trade(signal, exit_price, reason)`**: places closing order with broker, computes P&amp;L, creates a **Trade** object.
  - **TradeJournal.add_trade(trade)** (local persistence).
  - **BackendAPI**: sends trade execution and a **trading log** entry to the backend.
  - **Cycle net PnL** is updated. If **ENABLE_NET_PNL_TARGET** is on and (cycle_net_pnl / TRADING_CAPITAL) * 100 ≥ **NET_PNL_TARGET_PERCENT**, **risk_manager.set_cycle_pnl_target_reached(True)** is called so no new trades are taken until the next day.
  - The signal is removed from **active_trades**.

#### Step 5: Sleep and repeat

- The loop **sleeps ~30 seconds**, then continues from Step 1.

**In one sentence:** Every ~30s the bot resets daily state if needed, checks if trading is allowed, then for each index loads price/OHLC/levels, generates signals from levels and patterns, executes new signals as option orders, checks exit conditions for open trades (including candle-based hold and square off), updates backend and journal, then sleeps.

---

## 3. Exit logic: candles, take profit, square off

Exit behaviour is implemented in **`strategy/trading_strategy.py`** → **`check_exit_conditions()`**.

The strategy keeps a trade open for **at least 7 candles** (configurable) before allowing take-profit or time-based square off. **Stop loss is always allowed immediately** to limit risk.

### 3.1 Order of checks

1. **Stop loss (immediate)**  
   - **Call:** if `current_price <= signal.stop_loss` → exit with reason `stop_loss`.  
   - **Put:** if `current_price >= signal.stop_loss` → exit with reason `stop_loss`.  
   - No minimum candle requirement.

2. **Minimum hold (candles)**  
   - `candles_since_entry` = number of candles since the entry candle (derived from OHLC index vs signal timestamp).  
   - If **candles_since_entry &lt; MIN_CANDLES_BEFORE_EXIT** (default **7**): **do not exit** for target or time; return “hold”.  
   - So take profit and time-based square off are **only** considered after at least 7 candles.

3. **Take profit (after min candles)**  
   - **Call:** if `current_price >= signal.target_price` → exit with reason `target`.  
   - **Put:** if `current_price <= signal.target_price` → exit with reason `target`.

4. **Time-based square off (target candles)**  
   - Set **CANDLES_BEFORE_SQUARE_OFF** to a target (e.g. **7** or **10**). If **candles_since_entry >= CANDLES_BEFORE_SQUARE_OFF** → exit with reason `time_based` at `current_price` (square off).  
   - So the trade is squared off after that many candles if not already closed by stop loss or target.

### 3.2 Config knobs

| Config / Env | Default | Meaning |
|--------------|---------|---------|
| **MIN_CANDLES_BEFORE_EXIT** | 7 | Minimum candles to hold before **take profit** or **time-based** exit is allowed. Stop loss is still immediate. |
| **CANDLES_BEFORE_SQUARE_OFF** | 10 | **Target candles** (e.g. 7 or 10): after this many candles the trade is **squared off**. Set to 7 or 10; should be ≥ MIN_CANDLES_BEFORE_EXIT. |

Set **CANDLES_BEFORE_SQUARE_OFF** to **7** or **10**; once that many candles have passed, the trade is closed at market unless already closed by stop loss or target.

---

## 4. Levels: types, manual input, and automatic calculation

Levels are support/resistance prices used to generate trading signals. **Every trade cycle uses all levels from both sources:**

1. **Manual** – Levels you define (CSV/Excel or UI).  
2. **Automatic (intelligence)** – Levels from ML and indicators (pivot, K-Means, ATR, Bollinger, SAR, ML detector).

The strategy merges **manual + automatic** for each timeframe and checks whether price has broken any level **with a qualifying candlestick pattern**; if so, it produces a signal (call or put). So both your own levels and the system’s computed levels are active in every cycle.

### 4.1 The 10 level types (what each does)

Each level has a **type** that defines how the bot interprets it and when it triggers a signal. The pattern detector uses these to decide “level broken + right pattern → signal.”

| Code | Full name | Meaning | When it triggers a signal |
|------|------------|--------|----------------------------|
| **EU** | Easy Up | Resistance level; expect move up on break | Price **breaks above** the level (previous close ≤ level < current close) **and** a **bullish** candlestick pattern is present → **Buy Call**. |
| **TFD** | Target From Down | Target for an Easy Up trade | Price **breaks below** this level (used as exit target for shorts / “target from down”) → **Bearish** signal (Buy Put). In auto-levels, used for support-like levels. |
| **ED** | Easy Down | Support level; expect move down on break | Price **breaks below** the level (previous close ≥ level > current close) **and** a **bearish** pattern → **Buy Put**. |
| **TFU** | Target From Up | Target for an Easy Down trade | Price **breaks above** this level (exit target for longs) → **Bullish** signal. In auto-levels, used for resistance-like levels. |
| **RU** | Reversal Up | Support; buy on bullish reversal at level | Price is **below** the level **and** the latest candle has a **bullish** pattern (reversal at support) → **Buy Call**. |
| **TFRU** | Target For Reversal Up | Exit target for RU trade | Treated like RU for pattern/break logic; used as target level for closing the reversal-up trade. |
| **RD** | Reversal Down | Resistance; buy put on bearish reversal at level | Price is **above** the level **and** the latest candle has a **bearish** pattern (reversal at resistance) → **Buy Put**. |
| **TFRD** | Target For Reversal Down | Exit target for RD trade | Treated like RD for break logic; used as target for closing the reversal-down trade. |
| **EURTZ** | Easy Up Retest Zone | Same as EU; allows second entry on retest, same strike | Same break-above + bullish pattern logic as **EU**; typically used when you plan a second entry on a retest of the level. |
| **EDRTZ** | Easy Down Retest Zone | Same as ED; second entry on retest | Same break-below + bearish pattern logic as **ED**; for a second entry on retest. |

**Summary:**  
- **EU / TFU / EURTZ** → break **above** + bullish pattern → **Call**.  
- **ED / TFD / EDRTZ** → break **below** + bearish pattern → **Put**.  
- **RU / TFRU** → price **below** level + bullish pattern (reversal) → **Call**.  
- **RD / TFRD** → price **above** level + bearish pattern (reversal) → **Put**.

Level types are stored in the strategy and journal so you can analyse performance by type (e.g. EU vs RU).

### 4.2 Manual levels (CSV or Excel)

You can define levels in a file and load them at startup. The **LevelManager** reads from **LEVELS_FILE** (e.g. `levels/levels.csv` or an Excel path set in config).

**Required columns:**

| Column | Description | Example |
|--------|-------------|--------|
| **price** | Level price (number) | 24150 |
| **type** | One of the 10 codes above (EU, ED, TFD, TFU, RU, TFRU, RD, TFRD, EURTZ, EDRTZ) | EU |
| **timeframe** | 1m, 5m, or 15m (must match config TIMEFRAMES) | 5m |

**Optional columns:** `stoploss`, `target`, `confidence` (0–1). If present, `confidence` is used when merging or ranking levels.

**Loading:** The bot calls `load_manual_levels_from_csv(path)` or `load_manual_levels_from_excel(path)` during **initialize()** if the file exists. Invalid rows (bad type, price ≤ 0, duplicate) are skipped. You can also add a single level at runtime with **add_manual_level(price, level_type, timeframe)**.

**Example CSV:**

```text
index,timeframe,type,price,stoploss,target,description
NIFTY,5m,EU,24150,24100,24200,Easy Up - Buy Call on break
NIFTY,5m,TFD,24200,,,Target From Down - Exit EU
NIFTY,5m,ED,24100,24150,24050,Easy Down - Buy Put on break
```

The frontend Trading tab can load the same file or let you add levels manually with a type dropdown.

### 4.3 Automatic levels (how they are calculated)

When OHLC is available for a timeframe and auto-levels are not yet computed for it, the **LevelManager** runs **compute_auto_levels(df, timeframe, num_levels=40)**. This builds a set of candidate levels from several methods, then **aggregates** and **assigns** level types. All formulae use the **last candle(s)** or a rolling window over the OHLC DataFrame.

#### Step 1: Traditional indicator-based levels

- **Pivot points (classic)**  
  Uses the **last candle’s** High (H), Low (L), Close (C).  
  - Pivot **PP** = (H + L + C) / 3  
  - R1 = 2×PP − L, R2 = PP + (H − L)  
  - S1 = 2×PP − H, S2 = PP − (H − L)  
  PP is stored as type **TFD** (confidence 0.8); R1/R2 as **TFU**; S1/S2 as **TFD**.

- **K-Means on swing highs and lows**  
  - **Swing highs:** local maxima over a window of 5 bars (high ≥ neighbours).  
  - **Swing lows:** local minima over the same window.  
  - **K-Means** is run on swing high prices and on swing low prices separately (e.g. `num_clusters = num_levels // 2`).  
  - Cluster **centers** become levels: highs → **TFU** (resistance), lows → **TFD** (support), each with confidence 0.7.

- **ATR-based levels**  
  Requires TA-Lib and at least 14 bars. **ATR(14)** is computed on H, L, C. With **current close** and **current ATR**:  
  - Levels at **close + 1×ATR**, **close + 2×ATR** → **TFU** (resistance).  
  - Levels at **close − 1×ATR**, **close − 2×ATR** → **TFD** (support).  
  Confidence 0.6 and 0.5 respectively.

- **Bollinger Bands**  
  Requires TA-Lib and at least 20 bars. **BBANDS(20, 2, 2)** on close.  
  - **Upper band** → **TFU** (0.7).  
  - **Middle** → **TFD** (0.6).  
  - **Lower band** → **TFD** (0.7).

- **Parabolic SAR**  
  Requires TA-Lib and at least 10 bars. **SAR** (e.g. acceleration 0.02, maximum 0.2) on H, L.  
  - **Current SAR** value: if **close > SAR** then SAR is treated as **TFD** (support), else **TFU** (resistance). Confidence 0.6.

#### Step 2: ML-based levels (optional)

If **use_ai** is True and **MLLevelDetector** is available (in `ai/ml_level_detector.py`), the manager calls **ml_detector.detect_levels(df)**. It returns a list of (price, confidence). These are added as level type **AUTO** (up to **num_levels**), then passed into aggregation and type assignment.

#### Step 3: Aggregate and deduplicate

**_aggregate_levels(levels, df):**  
- Sorts levels by price.  
- Defines a **proximity threshold** = 0.1% of the DataFrame’s price range (high.max − low.min).  
- Levels whose prices fall within that threshold are **grouped**.  
- Each group is replaced by a **single level**: average price, average confidence, and the most common level type in the group.  
This removes duplicate or near-duplicate levels.

#### Step 4: Assign level types from price action

**_assign_level_types(levels, df):**  
- Uses **current close** and the last 20 bars’ **recent_high** and **recent_low**.  
- For each level:  
  - If **level.price > current_price**:  
    - If level is near **recent_high** (within 1%) → treat as **EU** (entry for upside).  
    - Else → **TFU** (resistance/target).  
  - If **level.price ≤ current_price**:  
    - If level is near **recent_low** (within 1%) → treat as **ED** (entry for downside).  
    - Else → **TFD** (support/target).  
So automatic levels get refined to **EU / ED / TFU / TFD** depending on where price is relative to the level and recent range.

#### Step 5: Limit and store

- Levels are sorted by **confidence** (descending) and trimmed to **num_levels** (default 40).  
- Result is stored in **LevelManager.auto_levels[timeframe]** and merged with manual levels when **get_levels(timeframe)** is called.

### 4.4 How levels are used in the strategy

- **get_levels(timeframe)** returns **manual + auto** levels for that timeframe, sorted by price.  
- For each level, **TradingStrategy.generate_signals()** calls **pattern_detector.check_level_break_with_pattern(df, level.price, level.level_type)**.  
- If that returns a signal (level broken with the right pattern), a **TradeSignal** is built (direction, entry/target/stop, level_type, pattern) and can be executed.  
- So: **levels define where to look**; **pattern + break logic** define **when** a trade is generated and whether it is a call or put.

---

## 5. Risk management and trade cycle

### 5.1 RiskManager (`risk/risk_manager.py`)

- **Trade cycles** – The day is split into **TRADE_CYCLES** (default **2**) cycles. Each cycle allows up to **TRADES_PER_CYCLE** (default **2**) trades (e.g. 2 × 2 = 4 total per day). When a cycle completes (e.g. after trade 2, cycle 1 is done), an **alert** and **trading log** are sent so the user is notified ("Trade cycle 1 completed – all trades for this cycle are done").
- **Max trades per day** – `MAX_TRADES_PER_DAY` (e.g. 4). When reached, **auto_locked** is set and **can_trade()** returns false until the next day or **manual unlock**.
- **Manual unlock** – User can click **Unlock trading** in the Risk tab when auto-locked. The backend sets an unlock request; the bot polls **GET /api/trading/unlock-request** each loop and, when requested, calls **unlock_trading()** and clears the request. Trading can then resume within one loop.
- **Kill-switch time** – `KILL_SWITCH_TIME` (e.g. 15:15). After this time, **can_trade()** returns false. A background thread calls **execute_kill_switch()**, which uses the broker’s **squareoff()** (cancel all orders, square all positions at LTP, wait 30s, then lock).
- **Cycle net PnL target (opt-in)** – If **ENABLE_NET_PNL_TARGET** is true and daily net PnL (as % of **TRADING_CAPITAL**) reaches **NET_PNL_TARGET_PERCENT** (e.g. 20%), **cycle_pnl_target_reached** is set. Then **can_trade()** returns false until **reset_daily()** (next calendar day).

### 5.2 Trade cycle (daily PnL target)

- **Cycle** = one trading day. At day change, **cycle_net_pnl** and risk daily state are reset.
- After each **closed** trade, the bot adds that trade’s PnL to **cycle_net_pnl** and checks:  
  `(cycle_net_pnl / TRADING_CAPITAL) * 100 >= NET_PNL_TARGET_PERCENT`.  
  If true and the feature is enabled, it sets **cycle_pnl_target_reached** and sends a trading log to the backend. No new trades until the next day.

---

## 6. Backend (Node)

- **Stack:** Express, CORS, JSON body parser; optional **better-sqlite3** for persistence.
- **WebSocket:** Attached to the same HTTP server; broadcasts events to all connected clients.

### 6.1 REST API (prefix `/api/trading`)

| Method + Path | Purpose |
|---------------|---------|
| POST `/signals` | Store trade signal from bot; broadcast to WS. |
| POST `/trades` | Store trade execution; persist to SQLite `trades` table; broadcast. |
| POST `/levels` | Update levels cache; broadcast. |
| POST `/market-data` | Update market data cache; broadcast. |
| POST `/ohlc` | Store OHLC candles in memory and SQLite; broadcast. |
| POST `/option-chain` | Store option chain in memory and SQLite; broadcast. |
| POST `/alert` | Add alert (e.g. auto-lock, kill switch); broadcast. |
| POST `/pattern-detection` | Record pattern detection; add alert; broadcast. |
| POST `/logs` | Append one trading log row (date from server time); SQLite `trading_logs`. |
| GET `/ohlc?index=&timeframe=&limit=` | Return OHLC from memory or DB. |
| GET `/option-chain?index=` | Return option chain from memory. |
| GET `/signals`, `/trades`, `/levels`, `/market-data`, `/statistics` | Return in-memory store data. |
| GET `/logs?date=YYYY-MM-DD` | Return trading logs for that day from SQLite. |
| GET `/market-status` | Return Indian market status (Live / Market closed) from system time in IST. |
| GET `/alerts`, `/risk-status`, `/analytics`, `/ai/missed-trades`, `/pattern-detections`, `/market-intelligence` | Return respective cached data. |
| GET `/unlock-request` | Return `{ unlock_requested: boolean }` for bot to honour manual unlock. |
| POST `/request-unlock` | Set unlock request (user clicked Unlock in Risk tab); bot clears on next loop. |
| POST `/clear-unlock-request` | Clear unlock request (called by bot after applying unlock). |

### 6.2 WebSocket

- Clients connect to `/ws`. On connect, server can send initial state. Every time the bot (or another source) POSTs data, the backend **broadcasts** the same event type (e.g. `trade`, `signal`, `ohlc`, `option-chain`, `alert`, `pattern-detection`) to all connected clients so the frontend updates in real time.

### 6.3 SQLite (optional)

- **Tables:** `candles`, `option_snapshots`, `market_data_snapshots`, `levels_snapshots`, `trades`, `signals`, **`trading_logs`**.
- **trading_logs:** `log_date`, `timestamp`, `level`, `message`, `payload_json` – used for the “Logs” tab and per-day views.
- **trades:** Filled on POST `/trades` for history.

---

## 7. Frontend (React)

- **Connection:** Uses **WebSocket** to the same origin (Vite proxies `/ws` and `/api` to the backend in dev). Also calls REST for initial or on-demand data (e.g. OHLC, logs by date, market status).
- **Tabs:** Dashboard, Trading (chart + levels + option chain), Signals, Trades, Patterns, Intelligence, Risk, Alerts, Statistics, Indicators, Analytics, AI, **Logs**.
- **Dashboard:** Overview stats (total trades, win rate, P&amp;L, etc.), recent signals, pattern alerts.
- **Trading:** Price chart (OHLC), manual/server levels, option chain panel.
- **Risk:** Trade count, max trades, auto-lock status, kill-switch time. When auto-locked, an **Unlock trading** button appears; clicking it requests unlock and the bot clears the lock on its next loop.
- **Logs:** Date picker; GET `/api/trading/logs?date=YYYY-MM-DD`; list of log entries (time, level, message, optional payload).

---

## 8. Indian market hours (Live / Market closed)

- **Backend** (`utils/marketHours.js`): Converts **system (server) time** to **IST** (UTC+5:30).  
  **Live** = Monday–Friday, **9:15–15:30 IST** (NSE/BSE equity/derivatives).  
  **Not live** = outside that window.
- **API:** **GET `/api/trading/market-status`** returns `{ live, message, istTime, nextOpen, nextClose }`.
- **Frontend:** Polls this endpoint (e.g. on load and every 60s). Header status:
  - **Offline** – WebSocket disconnected (red).
  - **Live** – WebSocket connected and market open in IST (green).
  - **Market closed** – WebSocket connected but market closed in IST (amber).  
  Tooltip can show current IST time.

---

## 9. Trading logs and persistence

- **Bot** sends a **trading log** entry to the backend on:
  - Each **trade execution** (e.g. “Trade executed” + trade payload).
  - **Cycle net PnL target reached** (e.g. “Cycle net PnL target reached: X% (target Y%)”).
- **Backend** stores each entry in **trading_logs** (with `log_date` from server date) and can serve them via **GET /api/trading/logs?date=YYYY-MM-DD**.
- **Frontend** “Logs” tab lets the user pick a date and view all stored log entries for that day.

---

## 10. Configuration reference

Relevant **env / config** (see `apps/trading/config.py` and `.env.example`):

| Key | Default | Description |
|-----|---------|-------------|
| **TRADING_CAPITAL** | 20000 | Capital used for allocation and PnL %. |
| **NIFTY_ALLOCATION**, **BANKNIFTY_ALLOCATION**, **FINNIFTY_ALLOCATION** | 0.5, 0.5, 0 | Fraction of capital per index. |
| **MAX_TRADES_PER_DAY** | 4 | Max trades per day; then auto-lock. |
| **TRADE_CYCLES** | 2 | Number of trade cycles per day (e.g. 2). |
| **TRADES_PER_CYCLE** | 2 | Trades per cycle; alert sent when each cycle completes. |
| **KILL_SWITCH_TIME** | 15:15 | No new trades after this time (HH:MM). |
| **STOP_LOSS_PERCENTAGE**, **TARGET_PERCENTAGE** | 2.0, 1.5 | Used for SL/target levels. |
| **ENABLE_NET_PNL_TARGET** | false | If true, stop new trades when daily PnL % ≥ target. |
| **NET_PNL_TARGET_PERCENT** | 20 | Target daily PnL % of capital when opt-in is on. |
| **CANDLES_TO_WAIT** | 7 | Used in strategy (e.g. pattern wait). |
| **MIN_CANDLES_BEFORE_EXIT** | 7 | Min candles before take-profit or time-based exit. |
| **CANDLES_BEFORE_SQUARE_OFF** | 10 | Target candles (e.g. 7 or 10): square off trade after this many candles. |
| **MIN_CANDLE_BODY_SIZE**, **MIN_WICK_RATIO** | 0.3, 0.5 | Candlestick pattern filters (body/wick) for entry; tune for stricter/looser detection. |
| **PATTERN_MAX_BODY_SIZE** | 0 | Optional max body size (e.g. 0.6) to exclude very large candles from pattern match; 0 = no max. |
| **STRIKE_PREFERENCE** | best_return | Strike selection: `best_return` = optimal allocation by **highest historical return** (utilization × ATM weight); or `atm`, `itm`, `otm`. |
| **DAILY_STRIKES_NIFTY**, **DAILY_STRIKES_BANKNIFTY**, **DAILY_STRIKES_FINNIFTY** | (empty) | Optional comma-separated strike list (e.g. `29050,29100,29150,29200`); when set, only these strikes are used for selection. |
| **LEVELS_FILE** | levels/levels.csv | Manual levels file (CSV or Excel). |
| **BACKEND_API_URL** | http://localhost:3000 | Backend base URL for the bot. |
| **TIMEFRAMES** | 1m, 5m, 15m | OHLC timeframes. |
| **INDEX_SYMBOLS** | NIFTY, BANKNIFTY, FINNIFTY | Indices to process. |

Credentials: **key.txt** (in `apps/trading/`) or env vars for Angel One (API key, client secret, client ID, password, TOTP secret).

---

## 11. End-to-end data flow (one trade)

1. Bot sees a **level break** with a qualifying **pattern** → **TradeSignal** created.
2. Bot sends **pattern detection** to backend → backend stores and broadcasts → frontend shows in Alerts/Patterns.
3. Bot **places order** with broker → on success, adds to **active_trades**, **record_trade()** (if a trade cycle completes, alert + log sent), sends **signal** to backend → backend stores and broadcasts.
4. Each loop, bot runs **check_exit_conditions** for that trade: **stop loss** (any time), **take profit** and **time-based** only after **min 7 candles**, **square off** after **10 candles** if still open.
5. On exit: **closing order** with broker, **Trade** with PnL → **TradeJournal** (local) + backend (POST trade + POST log) → backend stores and broadcasts.
6. **Cycle net PnL** updated; if target % reached and opt-in on, **cycle_pnl_target_reached** set.
7. Frontend shows the trade in Trades tab and in Logs; stats and market status update.

---

## 12. Process to run the system

Follow these steps to run the web app and/or the trading bot. The backend must be running before the bot if you want live data in the UI.

### Prerequisites

- **Node.js** (v18 or higher) and **npm** (v9 or higher).
- **Python 3** (for the trading bot), with dependencies from `apps/trading/requirements.txt`.
- Repo root: the folder that contains `run-all.js`, `package.json`, and the `apps/` directory (e.g. `varunpandya-1011/`).

### Step 1: Install dependencies

From the **repo root**:

```bash
npm install
```

This installs dependencies for the backend and frontend (npm workspaces). The frontend uses **@vitejs/plugin-react-swc** (no Babel required).  
From **`apps/trading/`** (for the bot):

```bash
cd apps/trading
pip install -r requirements.txt
```

(Use a virtual environment if you prefer.)

### Step 2: Run the web app (backend + frontend)

From the **repo root**:

```bash
node run-all.js
```

What this does:

1. Finds a free port between 3000 and 3050 (e.g. **3000**).
2. Starts the **backend** (Node/Express) on that port. You should see something like:  
   `Trading Backend API running on http://localhost:3000`  
   `WebSocket: ws://localhost:3000/ws`
3. Writes **`apps/frontend/.env.local`** with `VITE_API_PORT=<port>` so the frontend proxies to the correct backend.
4. After a short delay, starts the **frontend** (Vite). You should see something like:  
   `Local: http://localhost:5173/`

**Open in browser:** **http://localhost:5173/**  

You can use the Dashboard, Trading chart, Signals, Trades, Logs, and other tabs. The header shows **Live** / **Market closed** / **Offline** based on Indian market hours (IST) and WebSocket connection.  
To stop: press **Ctrl+C** in the terminal where `run-all.js` is running (both backend and frontend will exit).

### Step 3 (optional): Run the trading bot

The bot needs **Angel One** credentials and must know the **backend URL** so it can push trades, OHLC, and logs.

1. **Go to the trading app folder:**
   ```bash
   cd apps/trading
   ```

2. **Set credentials** (one of the two):
   - **Option A – key.txt:** Create a file **`key.txt`** in `apps/trading/` with one line:  
     `api_key client_secret client_code password totp_secret`  
     (space-separated; get these from Angel One).
   - **Option B – .env:** Copy **`.env.example`** to **`.env`** and set:
     - `ANGEL_ONE_API_KEY`, `ANGEL_ONE_CLIENT_SECRET`, `ANGEL_ONE_CLIENT_ID`, `ANGEL_ONE_PASSWORD`, `ANGEL_ONE_TOTP_SECRET`.

3. **Set the backend URL** in **`.env`**:
   ```env
   BACKEND_API_URL=http://localhost:3000
   ```
   Use the **same port** that `run-all.js` printed for the backend (e.g. 3000). If you started the backend on a different port, use that (e.g. `http://localhost:3005`).

4. **Run the bot:**
   ```bash
   python main.py
   ```
   The bot will connect to Angel One, load levels (if `LEVELS_FILE` exists), and start the main loop. It will send market data, signals, trades, and logs to the backend. Keep this terminal open; **Ctrl+C** stops the bot.

5. **In the browser:** Refresh or keep the frontend open; you should see data (OHLC, option chain, signals, trades, logs) as the bot runs.

### Running backend and frontend separately (optional)

If you prefer not to use `run-all.js`:

1. **Backend** (from repo root):
   ```bash
   cd apps/backend
   npm run dev
   ```
   Or: `PORT=3000 node src/index.js`  
   Note the port (e.g. 3000).

2. **Frontend** (from another terminal, repo root):
   ```bash
   cd apps/frontend
   echo VITE_API_PORT=3000 > .env.local
   npm run dev
   ```
   Use the same port as the backend in `.env.local`. Then open **http://localhost:5173/**.

3. **Bot:** Same as Step 3 above; set **BACKEND_API_URL** to the backend URL and run **`python main.py`** from **`apps/trading/`**.

### Summary

| What you want              | Command / steps |
|----------------------------|-----------------|
| Web app only (no bot)      | Repo root → `node run-all.js` → open http://localhost:5173 |
| Full system (web + bot)    | Repo root → `npm run run:system` or `node run-system.js` (starts backend+frontend, then bot; BACKEND_API_URL set from .env.local). Or: 1) `node run-all.js` and note port. 2) Set `BACKEND_API_URL` in .env. 3) `npm run run:bot` or `node run-bot.js`. 4) Open http://localhost:5173. |
| Backend only               | `apps/backend` → `npm run dev` (or set `PORT` and run `node src/index.js`). |
| Frontend only (needs backend) | Set `VITE_API_PORT` in `apps/frontend/.env.local` to backend port, then `apps/frontend` → `npm run dev`. |

### Troubleshooting

- **Vite/frontend build or dev errors:** Run **`npm install`** from the **repo root**. The frontend uses `@vitejs/plugin-react-swc` (no Babel). If the frontend was recently updated, run `npm install` again.
- **Frontend port in use:** Vite will try the next port (e.g. 5174, 5175). Use the URL printed in the terminal.
- **Backend not reachable:** Ensure `run-all.js` (or the backend) is running and that `VITE_API_PORT` in `apps/frontend/.env.local` matches the backend port.

**Market status (Live / Market closed):** The backend uses system time converted to IST. No extra setup; ensure the machine’s clock (or server time) is correct if you rely on accurate market hours.
