/**
 * SQLite schema for candles, option chain snapshots. Optional: needs better-sqlite3.
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(__dirname, '..', '..', 'data');
const DB_PATH = join(DB_DIR, 'trading.db');

let db = null;
let Database = null;

async function loadNative() {
  if (Database) return;
  const mod = await import('better-sqlite3');
  Database = mod.default;
}

export async function getDb() {
  if (db) return db;
  try {
    await loadNative();
    if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    return db;
  } catch (e) {
    return null;
  }
}

export async function init() {
  const database = await getDb();
  if (!database) return null;
  database.exec(`
    CREATE TABLE IF NOT EXISTS candles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      index_name TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      time_utc TEXT NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(index_name, timeframe, time_utc)
    );
    CREATE INDEX IF NOT EXISTS idx_candles_index_tf_time ON candles(index_name, timeframe, time_utc);

    CREATE TABLE IF NOT EXISTS option_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      index_name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      underlying_value REAL,
      calls_json TEXT,
      puts_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_option_snap_index ON option_snapshots(index_name, timestamp);

    CREATE TABLE IF NOT EXISTS market_data_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      index_name TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      current_price REAL,
      candle_count INTEGER,
      timestamp TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS levels_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      index_name TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      levels_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id TEXT,
      index_name TEXT,
      symbol TEXT,
      direction TEXT,
      entry_price REAL,
      exit_price REAL,
      quantity REAL,
      pnl REAL,
      level_type TEXT,
      pattern TEXT,
      entry_time TEXT,
      exit_time TEXT,
      payload_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      index_name TEXT,
      direction TEXT,
      entry_price REAL,
      level_type TEXT,
      pattern TEXT,
      payload_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trading_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_date TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_trading_logs_date ON trading_logs(log_date);
  `);
  return database;
}

export function close() {
  if (db) {
    db.close();
    db = null;
  }
}
