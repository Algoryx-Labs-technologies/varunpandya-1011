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
