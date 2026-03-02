# Trading Backend API

Custom backend API server for trading bot integration.

## Features

- REST API endpoints for trading data
- WebSocket server for real-time updates
- In-memory data store (can be replaced with database)
- CORS enabled for frontend integration

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

### Trading Data

- `POST /api/trading/signals` - Receive trade signals from bot
- `POST /api/trading/trades` - Receive trade executions
- `POST /api/trading/levels` - Receive level updates
- `POST /api/trading/market-data` - Receive market data

### Get Data

- `GET /api/trading/signals` - Get all signals
- `GET /api/trading/trades` - Get all trades
- `GET /api/trading/levels` - Get current levels
- `GET /api/trading/market-data` - Get market data
- `GET /api/trading/statistics` - Get trading statistics
- `GET /api/trading/config` - Get configuration

### Health

- `GET /health` - Health check

## WebSocket

Connect to `ws://localhost:3000/ws` for real-time updates.

Message types:
- `signal` - New trade signal
- `trade` - Trade execution
- `levels` - Level updates
- `market-data` - Market data updates
