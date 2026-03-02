# Trading Bot - Options Strategy for Nifty/BankNifty/FinNifty

A comprehensive Python-based trading bot for options trading using Angel One SmartAPI. Implements automated support/resistance level detection, candlestick pattern recognition, and risk management.

## Features

- **Angel One SmartAPI Integration**: Full integration with Angel One brokerage
- **Multi-Timeframe Analysis**: Supports 1m, 5m, and 15m timeframes
- **Support/Resistance Levels**: Both manual and AI-assisted level detection
- **Candlestick Pattern Detection**: Uses TA-Lib for pattern recognition
- **Risk Management**: Trade cycles (default 2 per day, 2 trades per cycle); alert when each cycle completes; auto-lock after max trades, kill switch, optional cycle net PnL target
- **Exit logic**: Min 7 candles hold, then take profit or square off after target candles (e.g. 7 or 10); stop loss always immediate
- **Trade Journal**: Local JSON/Excel/CSV; trades and logs also sent to backend (DB + Logs tab)
- **Backend Integration**: REST API (signals, trades, OHLC, option chain, alerts, trading logs); see repo root `TRADING_ENGINE_EXPLAINED.md` for full run process

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install TA-Lib (requires system-level installation):
   - Windows: Download from https://www.lfd.uci.edu/~gohlke/pythonlibs/#ta-lib
   - Linux: `sudo apt-get install ta-lib`
   - macOS: `brew install ta-lib`

3. Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

4. Configure your Angel One API credentials in `.env`:
```
ANGEL_ONE_API_KEY=your_api_key
ANGEL_ONE_CLIENT_ID=your_client_id
ANGEL_ONE_PASSWORD=your_password
ANGEL_ONE_TOTP_SECRET=your_totp_secret
```

## Usage

### Running the Trading Bot

```bash
python main.py
```

### Manual Levels Setup

Create a CSV file at `levels/levels.csv` with the following format:
```csv
price,type,timeframe,confidence
29100,EU,5m,1.0
29000,ED,5m,1.0
29200,TFU,15m,0.9
```

Level types (see `levels/README_LEVELS.md` for full table):
- `EU` (Easy Up), `TFD` (Target From Down), `ED` (Easy Down), `TFU` (Target From Up)
- `RU` (Reversal Up), `TFRU` (Target For Reversal Up), `RD` (Reversal Down), `TFRD` (Target For Reversal Down)
- `EURTZ` (Easy Up Retest Zone), `EDRTZ` (Easy Down Retest Zone)

## Project Structure

```
apps/trading/
├── main.py                 # Main entry point
├── config.py              # Configuration management
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── broker/
│   └── angel_one.py      # Angel One API integration
├── data/
│   └── data_fetcher.py   # Data acquisition module
├── levels/
│   └── level_manager.py  # Support/resistance level management
├── patterns/
│   └── candlestick_patterns.py  # Pattern detection
├── strategy/
│   └── trading_strategy.py     # Strategy logic
├── money/
│   └── position_sizing.py      # Position sizing
├── risk/
│   └── risk_manager.py          # Risk management
├── journal/
│   └── trade_journal.py         # Trade logging
└── api/
    └── integration.py           # Backend API integration
```

## Configuration

Key configuration options in `config.py` and `.env` (see `.env.example` for all):

- `TRADING_CAPITAL`, `MAX_TRADES_PER_DAY`, `TRADE_CYCLES`, `TRADES_PER_CYCLE`, `KILL_SWITCH_TIME` (e.g. 15:15)
- `STOP_LOSS_PERCENTAGE`, `TARGET_PERCENTAGE`
- `MIN_CANDLES_BEFORE_EXIT`: Min candles before take-profit or time-based exit (default: 7)
- `CANDLES_BEFORE_SQUARE_OFF`: Target candles for square off (default: 10)
- `MIN_CANDLE_BODY_SIZE`, `MIN_WICK_RATIO`, `PATTERN_MAX_BODY_SIZE`: Candlestick pattern filters (tune for stricter/looser detection)
- `STRIKE_PREFERENCE`: `best_return` | `atm` | `itm` | `otm`
- `DAILY_STRIKES_NIFTY`, `DAILY_STRIKES_BANKNIFTY`, `DAILY_STRIKES_FINNIFTY`: Optional comma-separated strike list (e.g. `29050,29100,29150,29200`); when set, only these strikes are used
- `ENABLE_NET_PNL_TARGET`, `NET_PNL_TARGET_PERCENT`: Optional; stop new trades when daily PnL % reached
- `BACKEND_API_URL`: Backend base URL (e.g. http://localhost:3000)
- `LEVELS_FILE`: Path to manual levels CSV/Excel (e.g. levels/levels.csv)

## Strategy Logic

1. **Signal generation**: Level break + qualifying candlestick pattern (see `TRADING_ENGINE_EXPLAINED.md` Section 4 for level types).
2. **Entry**: Strike selection from option chain—**optimal allocation on strike prices based on highest historical return** (utilization × ATM weight when `STRIKE_PREFERENCE=best_return`); or user daily list via `DAILY_STRIKES_*`, or fixed `atm`/`itm`/`otm`; place order via broker.
3. **Exit**: Stop loss immediate; take profit and time-based exit only after `MIN_CANDLES_BEFORE_EXIT` candles; square off after `CANDLES_BEFORE_SQUARE_OFF` candles.
4. **Risk**: Auto-lock after max trades; **manual unlock** via Risk tab (Unlock trading) – bot polls backend and clears lock. Kill switch at `KILL_SWITCH_TIME` (broker `squareoff()`); optional cycle PnL target.

## Integration with Backend/Frontend

The trading bot communicates with the backend at `BACKEND_API_URL` (e.g. http://localhost:3000):

- `POST /api/trading/signals`, `/trades`, `/levels`, `/market-data`, `/ohlc`, `/option-chain`, `/alert`, `/pattern-detection`, **`/logs`** (trading log entries)
- Backend persists trades and logs to SQLite; frontend Logs tab shows logs per day. See repo root **`TRADING_ENGINE_EXPLAINED.md`** Section 12 for full run process (including `node run-all.js`).

## Logging

Logs are stored in `logs/trading.log` with daily rotation and 30-day retention.

## Trade Journal

Trades are automatically logged to:
- JSON: `data/trades_YYYYMMDD.json`
- Excel: `data/trades_YYYYMMDD.xlsx`
- CSV: `data/trades_YYYYMMDD.csv`

## Notes

- Credentials: use **key.txt** (one line: api_key client_secret client_code password totp_secret) or set env vars; see `.env.example`.
- Ensure TA-Lib is properly installed for full indicator/auto-level support.
- Backend integration is optional; without it the bot still runs but won't push data to the web UI. For full stack, run backend + frontend from repo root with `node run-all.js`, then start the bot with `BACKEND_API_URL` set to the backend port.
