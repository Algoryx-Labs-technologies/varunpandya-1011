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

### Using the venv (recommended)

From `apps/trading`:

```powershell
py -m venv venv
.\venv\Scripts\pip install -r requirements-venv.txt
```

**TA-Lib (venv):** The project can use the C library at repo root `ta-lib-0.6.4\` if present. On Windows, `pip install` of TA-Lib often fails; install the Python wrapper from a pre-built wheel, e.g.:

```powershell
.\venv\Scripts\pip install "https://github.com/cgohlke/talib-build/releases/download/v0.6.8/ta_lib-0.6.8-cp311-cp311-win_amd64.whl"
```

(Use the wheel that matches your Python version from [cgohlke/talib-build releases](https://github.com/cgohlke/talib-build/releases).) Without TA-Lib the bot still runs but candlestick pattern detection is skipped.

### Or install globally

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

## Paper vs Live Trading

- **Paper (default):** No real orders. Set `PAPER_TRADING=true` in `.env` (or leave unset). Data, signals, and logs are still fetched and sent to the backend; orders are only simulated.
- **Live:** Real orders sent to the broker. Set `PAPER_TRADING=false` or `TRADING_MODE=live` in `.env`. Use with caution.

Broker connection (Angel One) is required for both modes (for market data). You must set `ANGEL_ONE_TOTP_SECRET` in `.env` (from Angel One app / API 2FA) for the bot to connect.

## Usage

### Getting the system running

1. Copy `apps/trading/.env.example` to `apps/trading/.env` and set:
   - Angel One: `ANGEL_ONE_API_KEY`, `ANGEL_ONE_CLIENT_SECRET`, `ANGEL_ONE_CLIENT_ID`, `ANGEL_ONE_PASSWORD`, **`ANGEL_ONE_TOTP_SECRET`** (required for login).
   - `BACKEND_API_URL=http://localhost:3000` (default).
   - `PAPER_TRADING=true` for paper mode (default), or `false` for live.
2. From repo root run:

```bash
npm run run:system
```

or `node run-system.js`. This installs Node deps if needed, starts backend + frontend in the background, then the trading bot in the current terminal (venv). Open the frontend URL shown in the other window (e.g. http://localhost:5173).

### Running the Trading Bot only

With venv, from repo root:

```bash
npm run run:bot
```

or `node run-bot.js`. From `apps/trading` you can run `.\venv\Scripts\python main.py` (Windows) or `venv/bin/python main.py` (Unix) after setting `BACKEND_API_URL` to match the backend port.

Without venv:

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

## Run everything and store logs

Run the full Python trading engine (system test + trading bot); all output is stored in `logs/`:

```bash
python run_all_and_log.py
```

Or with venv: `.\venv\Scripts\python run_all_and_log.py` (Windows) / `venv/bin/python run_all_and_log.py` (Unix).

**Log locations:**

| Source | File |
|--------|------|
| Trading bot (main.py) | `logs/trading.log` (daily rotation, 30-day retention) |
| System test | `logs/system_test_YYYYMMDD_HHMMSS.log` (one per run) |

The script runs the system test first (config, indicators, patterns, levels, strikes, ML, broker check, backend health), then the trading bot. The bot exits quickly if `ANGEL_ONE_TOTP_SECRET` is not set; its log is still written to `trading.log`.

## System test only

To run only the system test (no bot), with output to file and console:

```powershell
.\venv\Scripts\python.exe run_system_test.py
```

Logs are written to `logs/system_test_YYYYMMDD_HHMMSS.log` and printed to the terminal.

## Debugging / Common issues

- **`ModuleNotFoundError: No module named 'smartapi'`** – The Angel One package imports as `SmartApi` (capital S, A). Use `from SmartApi import SmartConnect`. If you see missing **logzero** or **websocket**, run `pip install -r requirements-venv.txt` (they are listed as dependencies).
- **Tests:** From `apps/trading`, run `.\venv\Scripts\python.exe -m pytest tests/ -v`. Pytest is in `requirements-venv.txt`.
- **TA-Lib:** If the folder `ta-lib-0.6.4` is missing at repo root, the bot still runs using the Python TA-Lib wheel (no local DLL). Run scripts add the folder to PATH only when present.
