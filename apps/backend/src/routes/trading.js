/**
 * Trading API Routes
 * Handles data from Python trading bot
 */
import express from 'express';
import { tradingStore } from '../store/tradingStore.js';
import * as persistence from '../db/persistence.js';

const router = express.Router();

// Store trade signals
router.post('/signals', (req, res) => {
  try {
    const signal = req.body;
    tradingStore.addSignal(signal);
    tradingStore.broadcast('signal', signal);
    res.json({ status: 'success', message: 'Signal received' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Store trade executions
router.post('/trades', (req, res) => {
  try {
    const trade = req.body;
    tradingStore.addTrade(trade);
    tradingStore.broadcast('trade', trade);
    res.json({ status: 'success', message: 'Trade recorded' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Store levels update
router.post('/levels', (req, res) => {
  try {
    const levels = req.body;
    tradingStore.updateLevels(levels);
    tradingStore.broadcast('levels', levels);
    res.json({ status: 'success', message: 'Levels updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Alerts from trading bot (auto-lock, kill switch, data failures)
router.post('/alert', (req, res) => {
  try {
    const { severity, message, payload } = req.body || {};
    tradingStore.addAlert({ severity: severity || 'info', message: message || '', payload: payload || {}, timestamp: new Date().toISOString() });
    tradingStore.broadcast('alert', { severity, message, payload });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Store market data
router.post('/market-data', (req, res) => {
  try {
    const marketData = req.body;
    tradingStore.updateMarketData(marketData);
    tradingStore.broadcast('market-data', marketData);
    res.json({ status: 'success', message: 'Market data updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// --- OHLC candles (chart data); store + persist to DB ---
router.post('/ohlc', (req, res) => {
  try {
    const { index, timeframe, candles } = req.body || {};
    if (!index || !timeframe || !Array.isArray(candles)) {
      return res.status(400).json({ status: 'error', message: 'index, timeframe, candles required' });
    }
    tradingStore.setOhlc(index, timeframe, candles);
    tradingStore.broadcast('ohlc', { index, timeframe, candles });
    persistence.saveCandles(index, timeframe, candles).catch(() => {});
    res.json({ status: 'success', message: 'OHLC updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/ohlc', async (req, res) => {
  const index = req.query.index || 'NIFTY';
  const timeframe = req.query.timeframe || '5m';
  const limit = Math.min(parseInt(req.query.limit, 10) || 500, 2000);
  const fromStore = tradingStore.getOhlc(index, timeframe);
  if (fromStore.length > 0) {
    return res.json({ status: 'success', data: fromStore.slice(-limit) });
  }
  try {
    const rows = await persistence.loadCandlesFromDb(index, timeframe, limit);
    res.json({ status: 'success', data: rows });
  } catch {
    res.json({ status: 'success', data: [] });
  }
});

// --- Option chain (real-time from broker/NSE); store + persist ---
router.post('/option-chain', (req, res) => {
  try {
    const payload = req.body || {};
    const index = (payload.index || payload.index_name || 'NIFTY').toUpperCase();
    const normalized = {
      index,
      timestamp: payload.timestamp || new Date().toISOString(),
      underlying_value: payload.underlying_value ?? payload.underlyingValue ?? null,
      calls: Array.isArray(payload.calls) ? payload.calls : [],
      puts: Array.isArray(payload.puts) ? payload.puts : [],
    };
    tradingStore.setOptionChain(index, normalized);
    tradingStore.broadcast('option-chain', normalized);
    persistence.saveOptionSnapshot(index, normalized).catch(() => {});
    res.json({ status: 'success', message: 'Option chain updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/option-chain', (req, res) => {
  const index = (req.query.index || 'NIFTY').toUpperCase();
  const data = tradingStore.getOptionChain(index);
  res.json({ status: 'success', data: data || null });
});

// Get all signals
router.get('/signals', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getSignals()
  });
});

// Get all trades
router.get('/trades', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getTrades()
  });
});

// Get current levels
router.get('/levels', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getLevels()
  });
});

// Sample levels file for user reference (CSV)
const SAMPLE_LEVELS_CSV = `index,timeframe,type,price,stoploss,target,description
NIFTY,5m,EU,24150,24100,24200,Easy Up - Buy Call on break
NIFTY,5m,TFD,24200,,,Target From Down - Exit EU
NIFTY,5m,ED,24100,24150,24050,Easy Down - Buy Put
NIFTY,5m,TFU,24050,,,Target From Up - Exit ED
NIFTY,5m,RU,24080,24050,24120,Reversal Up - Buy Call
NIFTY,5m,TFRU,24120,,,Target For Reversal Up - Exit RU
NIFTY,5m,RD,24120,24150,24080,Reversal Down - Buy Put
NIFTY,5m,TFRD,24080,,,Target For Reversal Down - Exit RD
NIFTY,5m,EURTZ,24150,24100,24200,Easy Up Retest Zone - 2 trades same strike
NIFTY,5m,EDRTZ,24100,24150,24050,Easy Down Retest Zone - 2 trades same strike
BANKNIFTY,5m,ED,51200,51250,51100,Easy Down example
BANKNIFTY,15m,EU,51300,51250,51400,Easy Up 15m
`;

router.get('/levels/sample', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="levels_sample.csv"');
  res.send(SAMPLE_LEVELS_CSV);
});

// Get market data
router.get('/market-data', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getMarketData()
  });
});

// Get statistics
router.get('/statistics', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getStatistics()
  });
});

// Get config
router.get('/config', (req, res) => {
  res.json({
    status: 'success',
    data: {
      backend_url: process.env.BACKEND_URL || 'http://localhost:3000',
      websocket_url: process.env.WEBSOCKET_URL || 'ws://localhost:3000'
    }
  });
});

// --- Indicators (catalog for frontend) ---
const INDICATOR_CATALOG = [
  { id: 'atr_bands', name: 'ATR Bands', group: 'volatility', min_bars: 14, description: 'Dynamic support/resistance from ATR; close ± (ATR × multiplier).' },
  { id: 'bollinger', name: 'Bollinger Bands', group: 'volatility', min_bars: 20, description: 'SMA ± k×std; mean reversion and breakout context.' },
  { id: 'keltner', name: 'Keltner Channel', group: 'volatility', min_bars: 20, description: 'EMA ± ATR-based band; trend and volatility.' },
  { id: 'donchian', name: 'Donchian Channel', group: 'levels', min_bars: 20, description: 'Rolling high/low range; breakout levels.' },
  { id: 'vwap', name: 'VWAP', group: 'levels', min_bars: 1, description: 'Volume-weighted average price; institutional reference.' },
  { id: 'supertrend', name: 'Supertrend', group: 'trend', min_bars: 10, description: 'ATR-based trend line and direction.' },
  { id: 'parabolic_sar', name: 'Parabolic SAR', group: 'trend', min_bars: 5, description: 'Trailing stop and reversal levels.' },
  { id: 'rsi_zones', name: 'RSI Zones', group: 'momentum', min_bars: 15, description: 'RSI with oversold (<30) and overbought (>70) zones.' },
  { id: 'macd_clusters', name: 'MACD Clusters', group: 'momentum', min_bars: 35, description: 'MACD histogram peaks/troughs for reversal levels.' },
  { id: 'pivot_points', name: 'Pivot Points', group: 'levels', min_bars: 1, description: 'Classic PP, R1/R2, S1/S2 from H/L/C.' },
  { id: 'fibonacci', name: 'Fibonacci Retracement', group: 'levels', min_bars: 20, description: '0.236–0.786 levels from rolling high-low range.' },
  { id: 'volume_profile', name: 'Volume Profile', group: 'levels', min_bars: 2, description: 'High-volume price clusters (POC-style).' },
];

router.get('/indicators/catalog', (req, res) => {
  res.json({ status: 'success', data: INDICATOR_CATALOG });
});

// --- Analytics (Python bot POSTs; frontend GETs) ---
router.post('/analytics', (req, res) => {
  try {
    const payload = req.body;
    tradingStore.setAnalytics(payload);
    tradingStore.broadcast('analytics', payload);
    res.json({ status: 'success', message: 'Analytics updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/analytics', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getAnalytics()
  });
});

// --- AI: missed trades (Python bot POSTs; frontend GETs) ---
router.post('/ai/missed-trades', (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : (req.body?.missed_trades || []);
    tradingStore.setMissedTrades(payload);
    tradingStore.broadcast('missed-trades', payload);
    res.json({ status: 'success', message: 'Missed trades updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/ai/missed-trades', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getMissedTrades()
  });
});

// --- Pattern detections (candlestick: pattern detected → signal → trade) ---
router.post('/pattern-detection', (req, res) => {
  try {
    const payload = req.body || {};
    const pattern = payload.pattern || 'PATTERN';
    const type = payload.type || payload.signal || '';
    const index = payload.index || '';
    const timeframe = payload.timeframe || '';
    const msg = `Pattern ${pattern} detected${index ? ` on ${index}` : ''}${timeframe ? ` ${timeframe}` : ''} (${type})`;
    const alertEntry = {
      severity: 'info',
      message: msg,
      payload: { ...payload, kind: 'pattern' },
      timestamp: new Date().toISOString()
    };
    tradingStore.addPatternDetection(payload);
    tradingStore.addAlert(alertEntry);
    tradingStore.broadcast('pattern-detection', payload);
    tradingStore.broadcast('alert', alertEntry);
    res.json({ status: 'success', message: 'Pattern detection recorded' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/pattern-detections', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getPatternDetections()
  });
});

// --- Market Intelligence (PCR, OI, vol, trend, filter_score from bot) ---
router.post('/market-intelligence', (req, res) => {
  try {
    const payload = req.body || {};
    tradingStore.setMarketIntelligence(payload);
    tradingStore.broadcast('market-intelligence', payload);
    res.json({ status: 'success', message: 'Market intelligence updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/market-intelligence', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getMarketIntelligence()
  });
});

// --- Risk status (trade count, max trades, auto-lock, kill switch) ---
router.post('/risk-status', (req, res) => {
  try {
    const payload = req.body || {};
    tradingStore.setRiskStatus(payload);
    tradingStore.broadcast('risk-status', payload);
    res.json({ status: 'success', message: 'Risk status updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/risk-status', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getRiskStatus()
  });
});

// --- Alerts (get all: pattern + system) ---
router.get('/alerts', (req, res) => {
  res.json({
    status: 'success',
    data: tradingStore.getAlerts()
  });
});

export default router;
