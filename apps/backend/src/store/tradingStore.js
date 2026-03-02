/**
 * In-memory store for trading data
 * Can be replaced with database later
 */
class TradingStore {
  constructor() {
    this.signals = [];
    this.trades = [];
    this.levels = {};
    this.marketData = {};
    this.alerts = [];
    this.analytics = null;   // full analytics report from Python bot
    this.missedTrades = [];  // AI missed-trade analysis
    this.patternDetections = [];  // candlestick pattern detected → shown as alert, then signal/trade
    this.marketIntelligence = null;  // PCR, OI momentum, vol, trend, filter_score (from bot)
    this.riskStatus = null;         // trade_count, max_trades, auto_locked, kill_switch_time
    this.ohlc = {};                 // { NIFTY: { '5m': [{ time, open, high, low, close, volume }] } }
    this.optionChain = {};          // { NIFTY: { timestamp, underlying_value, calls, puts } }
    this.wsClients = [];
  }

  addAlert(alert) {
    this.alerts.push(alert);
    if (this.alerts.length > 200) this.alerts.shift();
  }

  addSignal(signal) {
    this.signals.push({
      ...signal,
      id: this.signals.length + 1,
      timestamp: new Date().toISOString()
    });
    // Keep only last 1000 signals
    if (this.signals.length > 1000) {
      this.signals.shift();
    }
  }

  addTrade(trade) {
    this.trades.push({
      ...trade,
      id: this.trades.length + 1,
      recorded_at: new Date().toISOString()
    });
    // Keep only last 1000 trades
    if (this.trades.length > 1000) {
      this.trades.shift();
    }
  }

  updateLevels(levels) {
    const { index, timeframe } = levels;
    if (!this.levels[index]) {
      this.levels[index] = {};
    }
    this.levels[index][timeframe] = levels;
  }

  updateMarketData(marketData) {
    const { index, timeframe } = marketData;
    if (!this.marketData[index]) {
      this.marketData[index] = {};
    }
    this.marketData[index][timeframe] = marketData;
  }

  setOhlc(index, timeframe, candles) {
    if (!this.ohlc[index]) this.ohlc[index] = {};
    this.ohlc[index][timeframe] = Array.isArray(candles) ? candles.slice(-1000) : [];
  }

  getOhlc(index, timeframe) {
    return (this.ohlc[index] && this.ohlc[index][timeframe]) ? this.ohlc[index][timeframe] : [];
  }

  setOptionChain(index, payload) {
    this.optionChain[index] = payload;
  }

  getOptionChain(index) {
    return this.optionChain[index] || null;
  }

  getSignals() {
    return this.signals.slice(-100); // Last 100 signals
  }

  getTrades() {
    return this.trades.slice(-100); // Last 100 trades
  }

  getLevels() {
    return this.levels;
  }

  getAlerts() {
    return this.alerts.slice(-50);
  }

  getMarketData() {
    return this.marketData;
  }

  setAnalytics(payload) {
    this.analytics = payload;
  }

  getAnalytics() {
    return this.analytics;
  }

  setMissedTrades(payload) {
    this.missedTrades = Array.isArray(payload) ? payload : [];
  }

  getMissedTrades() {
    return this.missedTrades;
  }

  addPatternDetection(payload) {
    const entry = {
      ...payload,
      id: this.patternDetections.length + 1,
      timestamp: payload.timestamp || new Date().toISOString()
    };
    this.patternDetections.push(entry);
    if (this.patternDetections.length > 200) this.patternDetections.shift();
  }

  getPatternDetections() {
    return this.patternDetections.slice(-80);
  }

  setMarketIntelligence(payload) {
    this.marketIntelligence = payload;
  }

  getMarketIntelligence() {
    return this.marketIntelligence;
  }

  setRiskStatus(payload) {
    this.riskStatus = payload;
  }

  getRiskStatus() {
    return this.riskStatus;
  }

  getStatistics() {
    const recentTrades = this.trades.slice(-50);
    const totalTrades = recentTrades.length;
    const winningTrades = recentTrades.filter(t => t.pnl > 0).length;
    const losingTrades = recentTrades.filter(t => t.pnl <= 0).length;
    const totalPnl = recentTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgWin = recentTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades || 0;
    const avgLoss = recentTrades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0) / losingTrades || 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(2) : 0,
      totalPnl: totalPnl.toFixed(2),
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      profitFactor: avgLoss !== 0 ? Math.abs(avgWin / avgLoss).toFixed(2) : 0
    };
  }

  addWebSocketClient(ws) {
    this.wsClients.push(ws);
    ws.on('close', () => {
      this.wsClients = this.wsClients.filter(client => client !== ws);
    });
  }

  broadcast(type, data) {
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    this.wsClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

export const tradingStore = new TradingStore();
