/**
 * In-memory store for trading data
 * Can be replaced with database later
 */
import type { WebSocket } from 'ws';

interface Signal {
  id?: number;
  timestamp?: string;
  [key: string]: any;
}

interface Trade {
  id?: number;
  recorded_at?: string;
  [key: string]: any;
}

interface Alert {
  severity: string;
  message: string;
  payload?: any;
  timestamp?: string;
}

interface Levels {
  index?: string;
  timeframe?: string;
  [key: string]: any;
}

interface MarketData {
  index?: string;
  timeframe?: string;
  [key: string]: any;
}

interface Candle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface OptionChain {
  index: string;
  timestamp: string;
  underlying_value?: number | null;
  calls: any[];
  puts: any[];
}

export class TradingStore {
  signals: Signal[] = [];
  trades: Trade[] = [];
  levels: Record<string, Record<string, Levels>> = {};
  marketData: Record<string, Record<string, MarketData>> = {};
  alerts: Alert[] = [];
  analytics: any = null;   // full analytics report from Python bot
  missedTrades: any[] = [];  // AI missed-trade analysis
  patternDetections: any[] = [];  // candlestick pattern detected → shown as alert, then signal/trade
  marketIntelligence: any = null;  // PCR, OI momentum, vol, trend, filter_score (from bot)
  riskStatus: any = null;         // trade_count, max_trades, auto_locked, kill_switch_time
  unlockRequested: boolean = false;   // user requested manual unlock; bot clears after acting
  ohlc: Record<string, Record<string, Candle[]>> = {};                 // { NIFTY: { '5m': [{ time, open, high, low, close, volume }] } }
  optionChain: Record<string, OptionChain> = {};          // { NIFTY: { timestamp, underlying_value, calls, puts } }
  wsClients: WebSocket[] = [];

  addAlert(alert: Alert): void {
    this.alerts.push(alert);
    if (this.alerts.length > 200) this.alerts.shift();
  }

  addSignal(signal: Signal): void {
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

  addTrade(trade: Trade): void {
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

  updateLevels(levels: Levels): void {
    const { index, timeframe } = levels;
    if (!index || !timeframe) return;
    if (!this.levels[index]) {
      this.levels[index] = {};
    }
    this.levels[index][timeframe] = levels;
  }

  updateMarketData(marketData: MarketData): void {
    const { index, timeframe } = marketData;
    if (!index || !timeframe) return;
    if (!this.marketData[index]) {
      this.marketData[index] = {};
    }
    this.marketData[index][timeframe] = marketData;
  }

  setOhlc(index: string, timeframe: string, candles: Candle[]): void {
    if (!this.ohlc[index]) this.ohlc[index] = {};
    this.ohlc[index][timeframe] = Array.isArray(candles) ? candles.slice(-1000) : [];
  }

  getOhlc(index: string, timeframe: string): Candle[] {
    return (this.ohlc[index] && this.ohlc[index][timeframe]) ? this.ohlc[index][timeframe] : [];
  }

  setOptionChain(index: string, payload: OptionChain): void {
    this.optionChain[index] = payload;
  }

  getOptionChain(index: string): OptionChain | null {
    return this.optionChain[index] || null;
  }

  getSignals(): Signal[] {
    return this.signals.slice(-100); // Last 100 signals
  }

  getTrades(): Trade[] {
    return this.trades.slice(-100); // Last 100 trades
  }

  getLevels(): Record<string, Record<string, Levels>> {
    return this.levels;
  }

  getAlerts(): Alert[] {
    return this.alerts.slice(-50);
  }

  getMarketData(): Record<string, Record<string, MarketData>> {
    return this.marketData;
  }

  setAnalytics(payload: any): void {
    this.analytics = payload;
  }

  getAnalytics(): any {
    return this.analytics;
  }

  setMissedTrades(payload: any[]): void {
    this.missedTrades = Array.isArray(payload) ? payload : [];
  }

  getMissedTrades(): any[] {
    return this.missedTrades;
  }

  addPatternDetection(payload: any): void {
    const entry = {
      ...payload,
      id: this.patternDetections.length + 1,
      timestamp: payload.timestamp || new Date().toISOString()
    };
    this.patternDetections.push(entry);
    if (this.patternDetections.length > 200) this.patternDetections.shift();
  }

  getPatternDetections(): any[] {
    return this.patternDetections.slice(-80);
  }

  setMarketIntelligence(payload: any): void {
    this.marketIntelligence = payload;
  }

  getMarketIntelligence(): any {
    return this.marketIntelligence;
  }

  setRiskStatus(payload: any): void {
    this.riskStatus = payload;
  }

  getRiskStatus(): any {
    return this.riskStatus;
  }

  setUnlockRequested(value: boolean): void {
    this.unlockRequested = Boolean(value);
  }

  getUnlockRequested(): boolean {
    return this.unlockRequested;
  }

  getStatistics(): {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: string;
    totalPnl: string;
    avgWin: string;
    avgLoss: string;
    profitFactor: string;
  } {
    const recentTrades = this.trades.slice(-50);
    const totalTrades = recentTrades.length;
    const winningTrades = recentTrades.filter(t => (t.pnl as number) > 0).length;
    const losingTrades = recentTrades.filter(t => (t.pnl as number) <= 0).length;
    const totalPnl = recentTrades.reduce((sum, t) => sum + ((t.pnl as number) || 0), 0);
    const avgWin = winningTrades > 0
      ? recentTrades.filter(t => (t.pnl as number) > 0).reduce((sum, t) => sum + (t.pnl as number), 0) / winningTrades
      : 0;
    const avgLoss = losingTrades > 0
      ? recentTrades.filter(t => (t.pnl as number) <= 0).reduce((sum, t) => sum + (t.pnl as number), 0) / losingTrades
      : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(2) : '0',
      totalPnl: totalPnl.toFixed(2),
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      profitFactor: avgLoss !== 0 ? Math.abs(avgWin / avgLoss).toFixed(2) : '0'
    };
  }

  addWebSocketClient(ws: WebSocket): void {
    this.wsClients.push(ws);
    ws.on('close', () => {
      this.wsClients = this.wsClients.filter(client => client !== ws);
    });
  }

  broadcast(type: string, data: any): void {
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    this.wsClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

export const tradingStore = new TradingStore();

