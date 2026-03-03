# Trading Bot Frontend

Custom React frontend for the trading bot dashboard.

## Features

- Real-time WebSocket updates (signals, trades, OHLC, option chain, alerts, etc.)
- **Market status**: Live / Market closed / Offline (from backend Indian market hours IST)
- Dashboard, Trading (chart + levels + option chain), Signals, Trades, Patterns, Intelligence, **Risk** (trade limits, auto-lock, **Unlock trading** button when locked), Alerts, Statistics, Indicators, Analytics, AI, **Logs** (trading logs per day)
- Responsive design; proxy to backend when using Vite dev (e.g. via `node run-all.js` from repo root)

## Installation

From repo root (recommended, installs all workspaces):

```bash
npm install
```

Or from this directory:

```bash
npm install
```

**Note:** The frontend uses `@vitejs/plugin-react-swc` (SWC-based React plugin); no Babel is required. Run `npm install` from repo root so all workspace dependencies are installed.

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

When running with `node run-all.js` from repo root, the script writes `VITE_API_PORT` to `.env.local` so the Vite dev server proxies `/api` and `/ws` to the backend. Otherwise set `VITE_BACKEND_URL` or ensure `vite.config.js` proxy targets the correct backend port (default 3000).
