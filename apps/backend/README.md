# Trading Backend API

Custom backend API server for trading bot integration.

## Features

- REST API for trading data (signals, trades, OHLC, option chain, levels, alerts, pattern detections, **trading logs**, **market status**)
- WebSocket server for real-time updates to frontend
- In-memory store plus optional **SQLite** persistence (candles, option_snapshots, trades, **trading_logs**)
- **GET /api/trading/market-status**: Indian market hours (Live / Market closed) from system time in IST
- CORS enabled for frontend

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```
PORT=3000
BACKEND_URL=http://localhost:3000
WEBSOCKET_URL=ws://localhost:3000
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## API Endpoints

### Trading Data (POST from bot)

- `POST /api/trading/signals`, `/trades`, `/levels`, `/market-data`, `/ohlc`, `/option-chain`, `/alert`, `/pattern-detection`, **`/logs`** (body: level, message, payload; stored in DB by date)

### Get Data

- `GET /api/trading/signals`, `/trades`, `/levels`, `/market-data`, `/statistics`, `/config`
- `GET /api/trading/ohlc?index=&timeframe=&limit=` - OHLC from memory or SQLite
- `GET /api/trading/option-chain?index=` - Option chain
- **`GET /api/trading/logs?date=YYYY-MM-DD`** - Trading logs for that day (from SQLite)
- **`GET /api/trading/market-status`** - Indian market hours: `{ live, message, istTime, nextOpen, nextClose }`
- `GET /api/trading/alerts`, `/risk-status`, `/analytics`, `/ai/missed-trades`, `/pattern-detections`, `/market-intelligence`, `/indicators/catalog`
- **`GET /api/trading/unlock-request`** – Returns `{ unlock_requested: boolean }` (bot polls to honour manual unlock)
- **`POST /api/trading/request-unlock`** – Set unlock request (user clicked Unlock in Risk tab)
- **`POST /api/trading/clear-unlock-request`** – Clear unlock request (called by bot after applying unlock)

### Health

- `GET /health` - Health check

## WebSocket

Connect to `ws://localhost:<PORT>/ws` for real-time updates. When running via `node run-all.js` from repo root, the frontend proxies `/ws` and `/api` to the backend port.

Message types broadcast to clients: `signal`, `trade`, `levels`, `market-data`, `ohlc`, `option-chain`, `alert`, `pattern-detection`, `risk-status`, `analytics`, `missed-trades`, `market-intelligence`.
