# Trading Bot Frontend

Custom React frontend for the trading bot dashboard.

## Features

- Real-time WebSocket updates
- Dashboard with statistics
- Trading view with levels
- Signals and trades panels
- Responsive design

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

```bash
npm run build
```

## Configuration

The frontend connects to:
- Backend API: `http://localhost:3000`
- WebSocket: `ws://localhost:3000/ws`

These can be configured in `vite.config.js` if needed.
