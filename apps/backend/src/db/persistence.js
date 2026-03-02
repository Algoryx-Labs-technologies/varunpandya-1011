/**
 * Persist candles, option chain to SQLite. No-op if DB unavailable.
 */
let _db = null;
let _initDone = false;

async function getDb() {
  if (_db !== undefined && _db !== null) return _db;
  if (_initDone) return _db;
  _initDone = true;
  try {
    const { init } = await import('./schema.js');
    _db = await init();
  } catch (e) {
    console.warn('DB not available (optional):', e.message);
    _db = null;
  }
  return _db;
}

export async function saveCandles(indexName, timeframe, candles) {
  const database = await getDb();
  if (!database || !Array.isArray(candles) || candles.length === 0) return;
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO candles (index_name, timeframe, time_utc, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const run = database.transaction((rows) => {
    for (const c of rows) {
      const t = c.time ?? c.t ?? c.timestamp;
      const timeStr = typeof t === 'number' ? new Date(t).toISOString() : String(t);
      stmt.run(indexName, timeframe, timeStr, c.open ?? c.o, c.high ?? c.h, c.low ?? c.l, c.close ?? c.c, c.volume ?? c.v ?? 0);
    }
  });
  try { run(candles); } catch (err) { console.warn('saveCandles:', err.message); }
}

export async function saveOptionSnapshot(indexName, payload) {
  const database = await getDb();
  if (!database || !payload) return;
  const calls = Array.isArray(payload.calls) ? payload.calls : (payload.calls && payload.calls.length ? Array.from(payload.calls) : []);
  const puts = Array.isArray(payload.puts) ? payload.puts : (payload.puts && payload.puts.length ? Array.from(payload.puts) : []);
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
  } catch (e) {
    console.warn('saveOptionSnapshot:', e.message);
  }
}

export async function loadCandlesFromDb(indexName, timeframe, limit = 500) {
  const database = await getDb();
  if (!database) return [];
  try {
    const rows = database.prepare(`
      SELECT time_utc as time, open, high, low, close, volume
      FROM candles WHERE index_name = ? AND timeframe = ?
      ORDER BY time_utc DESC LIMIT ?
    `).all(indexName, timeframe, limit);
    return rows.reverse().map(r => ({ time: r.time, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume }));
  } catch (e) {
    return [];
  }
}

export async function saveTrade(trade) {
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
  } catch (e) {
    console.warn('saveTrade:', e.message);
  }
}

export async function saveTradingLog(entry) {
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
  } catch (e) {
    console.warn('saveTradingLog:', e.message);
  }
}

export async function loadTradingLogsByDate(dateStr, limit = 500) {
  const database = await getDb();
  if (!database) return [];
  try {
    const rows = database.prepare(`
      SELECT id, log_date, timestamp, level, message, payload_json
      FROM trading_logs WHERE log_date = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `).all(dateStr, limit);
    return rows.map(r => ({
      id: r.id,
      log_date: r.log_date,
      timestamp: r.timestamp,
      level: r.level,
      message: r.message,
      payload: r.payload_json ? (() => { try { return JSON.parse(r.payload_json); } catch { return null; } })() : null
    }));
  } catch (e) {
    return [];
  }
}
