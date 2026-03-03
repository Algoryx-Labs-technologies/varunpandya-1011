/**
 * Persist candles, option chain to SQLite. No-op if DB unavailable.
 */
import type Database from 'better-sqlite3';

let _db: Database | null | undefined = null;
let _initDone = false;

interface Candle {
  time?: string | number;
  t?: string | number;
  timestamp?: string | number;
  open?: number;
  o?: number;
  high?: number;
  h?: number;
  low?: number;
  l?: number;
  close?: number;
  c?: number;
  volume?: number;
  v?: number;
}

interface OptionSnapshot {
  timestamp?: string;
  underlying_value?: number;
  underlyingValue?: number;
  calls?: any[];
  puts?: any[];
}

interface Trade {
  trade_id?: string;
  index?: string;
  index_name?: string;
  symbol?: string;
  direction?: string;
  entry_price?: number;
  exit_price?: number;
  quantity?: number;
  pnl?: number;
  level_type?: string;
  pattern?: string;
  entry_time?: string;
  exit_time?: string;
  payload_json?: string;
}

interface TradingLogEntry {
  level?: string;
  message?: string;
  payload?: any;
}

async function getDb(): Promise<Database | null> {
  if (_db !== undefined && _db !== null) return _db;
  if (_initDone) return _db;
  _initDone = true;
  try {
    const { init } = await import('./schema.js');
    _db = await init();
  } catch (e: any) {
    console.warn('DB not available (optional):', e.message);
    _db = null;
  }
  return _db;
}

export async function saveCandles(indexName: string, timeframe: string, candles: Candle[]): Promise<void> {
  const database = await getDb();
  if (!database || !Array.isArray(candles) || candles.length === 0) return;
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO candles (index_name, timeframe, time_utc, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const run = database.transaction((rows: Candle[]) => {
    for (const c of rows) {
      const t = c.time ?? c.t ?? c.timestamp;
      const timeStr = typeof t === 'number' ? new Date(t).toISOString() : String(t);
      stmt.run(
        indexName,
        timeframe,
        timeStr,
        c.open ?? c.o ?? 0,
        c.high ?? c.h ?? 0,
        c.low ?? c.l ?? 0,
        c.close ?? c.c ?? 0,
        c.volume ?? c.v ?? 0
      );
    }
  });
  try {
    run(candles);
  } catch (err: any) {
    console.warn('saveCandles:', err.message);
  }
}

export async function saveOptionSnapshot(indexName: string, payload: OptionSnapshot): Promise<void> {
  const database = await getDb();
  if (!database || !payload) return;
  const calls = Array.isArray(payload.calls) ? payload.calls : [];
  const puts = Array.isArray(payload.puts) ? payload.puts : [];
  try {
    database.prepare(`
      INSERT INTO option_snapshots (index_name, timestamp, underlying_value, calls_json, puts_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      indexName,
      payload.timestamp || new Date().toISOString(),
      payload.underlying_value ?? payload.underlyingValue ?? null,
      JSON.stringify(calls),
      JSON.stringify(puts)
    );
  } catch (e: any) {
    console.warn('saveOptionSnapshot:', e.message);
  }
}

export async function loadCandlesFromDb(indexName: string, timeframe: string, limit: number = 500): Promise<Candle[]> {
  const database = await getDb();
  if (!database) return [];
  try {
    const rows = database.prepare(`
      SELECT time_utc as time, open, high, low, close, volume
      FROM candles WHERE index_name = ? AND timeframe = ?
      ORDER BY time_utc DESC LIMIT ?
    `).all(indexName, timeframe, limit) as Array<{
      time: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    return rows.reverse().map(r => ({
      time: r.time,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume
    }));
  } catch (e) {
    return [];
  }
}

export async function saveTrade(trade: Trade): Promise<void> {
  const database = await getDb();
  if (!database || !trade) return;
  try {
    database.prepare(`
      INSERT INTO trades (trade_id, index_name, symbol, direction, entry_price, exit_price, quantity, pnl, level_type, pattern, entry_time, exit_time, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trade.trade_id || null,
      trade.index || trade.index_name || null,
      trade.symbol || null,
      trade.direction || null,
      trade.entry_price ?? null,
      trade.exit_price ?? null,
      trade.quantity ?? null,
      trade.pnl ?? null,
      trade.level_type || null,
      trade.pattern || null,
      trade.entry_time || null,
      trade.exit_time || null,
      trade.payload_json ?? (trade.trade_id ? JSON.stringify(trade) : null)
    );
  } catch (e: any) {
    console.warn('saveTrade:', e.message);
  }
}

export async function saveTradingLog(entry: TradingLogEntry): Promise<void> {
  const database = await getDb();
  if (!database || !entry) return;
  const now = new Date();
  const logDate = now.toISOString().slice(0, 10);
  const timestamp = now.toISOString();
  const level = entry.level || 'info';
  const message = entry.message || '';
  const payloadJson = entry.payload ? JSON.stringify(entry.payload) : null;
  try {
    database.prepare(`
      INSERT INTO trading_logs (log_date, timestamp, level, message, payload_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(logDate, timestamp, level, message, payloadJson);
  } catch (e: any) {
    console.warn('saveTradingLog:', e.message);
  }
}

export async function loadTradingLogsByDate(dateStr: string, limit: number = 500): Promise<Array<{
  id: number;
  log_date: string;
  timestamp: string;
  level: string;
  message: string;
  payload: any;
}>> {
  const database = await getDb();
  if (!database) return [];
  try {
    const rows = database.prepare(`
      SELECT id, log_date, timestamp, level, message, payload_json
      FROM trading_logs WHERE log_date = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `).all(dateStr, limit) as Array<{
      id: number;
      log_date: string;
      timestamp: string;
      level: string;
      message: string;
      payload_json: string | null;
    }>;
    return rows.map(r => ({
      id: r.id,
      log_date: r.log_date,
      timestamp: r.timestamp,
      level: r.level,
      message: r.message,
      payload: r.payload_json ? (() => {
        try {
          return JSON.parse(r.payload_json);
        } catch {
          return null;
        }
      })() : null
    }));
  } catch (e) {
    return [];
  }
}

