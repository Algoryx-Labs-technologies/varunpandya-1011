/**
 * Custom Backend API Server
 * Integrates with Python trading bot and serves frontend
 */
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import tradingRoutes from './routes/trading.js';
import { setupWebSocket } from './websocket/index.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Status page (premium API landing)
app.get('/', (req, res) => {
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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Vertex API',
    message: 'Trading Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/trading', tradingRoutes);

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server
setupWebSocket(server);

const PORT_MIN = parseInt(process.env.PORT, 10) || 3000;
const PORT_MAX = PORT_MIN + 50;
let currentPort = PORT_MIN;

function tryListen(port) {
  if (port > PORT_MAX) {
    console.error(`No free port in range ${PORT_MIN}-${PORT_MAX}. Set PORT env.`);
    process.exit(1);
  }
  currentPort = port;
  server.listen(port, () => {
    console.log(`🚀 Trading Backend API running on http://localhost:${port}`);
    console.log(`📊 WebSocket: ws://localhost:${port}/ws`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    server.removeAllListeners('error');
    server.close(() => tryListen(currentPort + 1));
  } else {
    throw err;
  }
});

tryListen(PORT_MIN);

export default app;
