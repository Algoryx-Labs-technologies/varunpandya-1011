/**
 * Combined API + Backend Server
 * Merges apps/api (AngelOne auth, brokerage, orders, WebSocket proxy) with
 * apps/backend (trading bot integration, Vertex API, status page).
 * Run with: tsx src/index.ts
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer, Server } from 'http';
import dotenv from 'dotenv';
import tradingRoutes from './routes/trading.js';
import { setupWebSocket } from './websocket/index.js';
import { startSmartStreamFromEnv } from './websocket/smartStreamClient.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '4000', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional: request logger and API routes (load when running with tsx or compiled .js)
let requestLogger: ((req: Request, res: Response, next: NextFunction) => void) | null = null;
let validateConfig: (() => void) | null = null;
let authRoutes: express.Router | null = null;
let brokerageRoutes: express.Router | null = null;
let portfolioRoutes: express.Router | null = null;
let marginRoutes: express.Router | null = null;
let marketDataRoutes: express.Router | null = null;
let orderRoutes: express.Router | null = null;
let setupWebSocketServer: ((server: Server) => void) | null = null;

async function loadApiModules(): Promise<boolean> {
  try {
    const [
      loggerMod,
      configMod,
      authMod,
      brokerageMod,
      portfolioMod,
      marginMod,
      marketDataMod,
      orderMod,
      wsRoutesMod,
    ] = await Promise.all([
      import('./middleware/requestLogger.js').catch(() => null),
      import('./config/angelone.config.js').catch(() => null),
      import('./routes/auth.routes.js').catch(() => null),
      import('./routes/brokerage.routes.js').catch(() => null),
      import('./routes/portfolio.routes.js').catch(() => null),
      import('./routes/margin.routes.js').catch(() => null),
      import('./routes/marketData.routes.js').catch(() => null),
      import('./routes/order.routes.js').catch(() => null),
      import('./routes/websocket.routes.js').catch(() => null),
    ]);
    requestLogger = loggerMod?.requestLogger ?? null;
    validateConfig = configMod?.validateConfig ?? null;
    authRoutes = authMod?.default ?? null;
    brokerageRoutes = brokerageMod?.default ?? null;
    portfolioRoutes = portfolioMod?.default ?? null;
    marginRoutes = marginMod?.default ?? null;
    marketDataRoutes = marketDataMod?.default ?? null;
    orderRoutes = orderMod?.default ?? null;
    setupWebSocketServer = wsRoutesMod?.setupWebSocketServer ?? null;
    return true;
  } catch (e: any) {
    console.warn('API route modules not loaded (run with tsx or compile TS to JS for full API):', e.message);
    return false;
  }
}

// Status page (premium API landing)
app.get('/', (req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vertex API</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0b0d;
      --surface: #111318;
      --border: rgba(255,255,255,0.08);
      --text: #f0f2f5;
      --muted: #8b92a0;
      --gold: #d4a853;
      --green: #10b981;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 2.5rem;
      max-width: 420px;
      width: 100%;
    }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.25rem; }
    h1 span { color: var(--gold); }
    .sub { font-size: 0.875rem; color: var(--muted); margin-bottom: 1.5rem; }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--green);
      margin-bottom: 1.5rem;
    }
    .status::before {
      content: '';
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 12px var(--green);
    }
    .endpoints {
      border-top: 1px solid var(--border);
      padding-top: 1.25rem;
    }
    .endpoints p { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 0.5rem; }
    .endpoints a {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      color: var(--gold);
      text-decoration: none;
    }
    .endpoints a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Vertex <span>API</span></h1>
    <p class="sub">Options trading backend</p>
    <div class="status">Operational</div>
    <div class="endpoints">
      <p>Endpoints</p>
      <a href="/health">GET /health</a> · <a href="/api/trading/statistics">GET /api/trading/statistics</a>
    </div>
  </div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Health check (combined)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Vertex API',
    message: 'Trading Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

async function start(): Promise<void> {
  await loadApiModules();
  if (validateConfig) {
    try {
      validateConfig();
    } catch (e: any) {
      console.warn('AngelOne config validation skipped:', e.message);
    }
  }
  if (setupWebSocketServer) setupWebSocketServer(httpServer);
  if (requestLogger) app.use(requestLogger);
  app.use('/api/trading', tradingRoutes);
  if (authRoutes) app.use('/api/auth', authRoutes);
  if (brokerageRoutes) app.use('/api/brokerage', brokerageRoutes);
  if (portfolioRoutes) app.use('/api/portfolio', portfolioRoutes);
  if (marginRoutes) app.use('/api/margin', marginRoutes);
  if (marketDataRoutes) app.use('/api/market-data', marketDataRoutes);
  if (orderRoutes) app.use('/api/order', orderRoutes);
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: false,
      message: 'Endpoint not found',
      errorcode: 'NOT_FOUND',
    });
  });
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      status: false,
      message: err.message || 'Internal server error',
      errorcode: 'INTERNAL_ERROR',
    });
  });
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Trading Backend API running on http://localhost:${PORT}`);
    console.log(`📊 WebSocket: ws://localhost:${PORT}/ws`);
    setupWebSocket(httpServer);
    startSmartStreamFromEnv();
    if (setupWebSocketServer) {
      setupWebSocketServer(httpServer);
      console.log(`🔌 Order WebSocket: ws://localhost:${PORT}/api/order/websocket`);
    }
    if (authRoutes) console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
    if (brokerageRoutes) console.log(`💰 Brokerage: http://localhost:${PORT}/api/brokerage`);
    if (portfolioRoutes) console.log(`📊 Portfolio: http://localhost:${PORT}/api/portfolio`);
    if (marginRoutes) console.log(`💵 Margin: http://localhost:${PORT}/api/margin`);
    if (marketDataRoutes) console.log(`📈 Market data: http://localhost:${PORT}/api/market-data`);
    if (orderRoutes) console.log(`📋 Order: http://localhost:${PORT}/api/order`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;

