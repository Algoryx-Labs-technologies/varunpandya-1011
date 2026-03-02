# Trading Bot - Options Strategy for Nifty/BankNifty/FinNifty

A comprehensive Python-based trading bot for options trading using Angel One SmartAPI. Implements automated support/resistance level detection, candlestick pattern recognition, and risk management.

## Features

- **Angel One SmartAPI Integration**: Full integration with Angel One brokerage
- **Multi-Timeframe Analysis**: Supports 1m, 5m, and 15m timeframes
- **Support/Resistance Levels**: Both manual and AI-assisted level detection
- **Candlestick Pattern Detection**: Uses TA-Lib for pattern recognition
- **Risk Management**: Auto-lock, kill switch, position monitoring
- **Trade Journal**: Comprehensive logging and analysis
- **Backend Integration**: Communicates with React frontend via REST API

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

Level types:
- `EU`: Easy Up
- `ED`: Easy Down
- `TFU`: Trend Following Up
- `TFD`: Trend Following Down
- `RU`: Reversal Up
- `RD`: Reversal Down
- `TFRU`: Trend Following Reversal Up
- `TFRD`: Trend Following Reversal Down
- `EURTZ`: Easy Up Resistance Zone
- `EDRTZ`: Easy Down Resistance Zone

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

Key configuration options in `config.py` and `.env`:

- `TRADING_CAPITAL`: Total capital for trading (default: 20000)
- `MAX_TRADES_PER_DAY`: Maximum trades before auto-lock (default: 2)
- `KILL_SWITCH_TIME`: Time to automatically square off (default: 15:15)
- `STOP_LOSS_PERCENTAGE`: Stop loss percentage (default: 2.0%)
- `TARGET_PERCENTAGE`: Target percentage (default: 1.5%)
- `CANDLES_TO_WAIT`: Candles to wait before time-based exit (default: 7)

## Strategy Logic

1. **Signal Generation**: When a support/resistance level is broken with a valid candlestick pattern
2. **Entry**: Place order at optimal strike based on capital allocation
3. **Exit**: Exit when target reached, stop loss hit, or after N candles
4. **Risk Controls**: Auto-lock after max trades, kill switch at end of day

## Integration with Backend/Frontend

The trading bot communicates with the backend API at `http://localhost:3000`:

- `POST /api/trading/signals`: Send trade signals
- `POST /api/trading/trades`: Send trade executions
- `POST /api/trading/levels`: Send level updates
- `POST /api/trading/market-data`: Send market data updates

## Logging

Logs are stored in `logs/trading.log` with daily rotation and 30-day retention.

## Trade Journal

Trades are automatically logged to:
- JSON: `data/trades_YYYYMMDD.json`
- Excel: `data/trades_YYYYMMDD.xlsx`
- CSV: `data/trades_YYYYMMDD.csv`

## Notes

- Ensure TA-Lib is properly installed before running
- Test with paper trading first
- Monitor logs for any errors
- Backend API integration is optional - bot can run standalone
