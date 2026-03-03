import { useEffect, useState } from 'react'
import type { VertexWsData } from '../../hooks/useWebSocket'
import { getBotApiBase } from '../../utils/botApi'

interface StatisticsPanelProps {
  statistics: VertexWsData['statistics']
}

interface Stats {
  totalTrades?: number
  winningTrades?: number
  losingTrades?: number
  winRate?: number
  totalPnl?: number
  avgWin?: number
  avgLoss?: number
  profitFactor?: number
}

export default function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  const [stats, setStats] = useState<Stats | null>((statistics as Stats) ?? null)
  const base = getBotApiBase()
  const api = base ? `${base}/api/trading/statistics` : '/api/trading/statistics'

  useEffect(() => {
    if (statistics) {
      setStats(statistics as Stats)
    } else {
      fetch(api)
        .then((res) => res.json())
        .then((result: { status: string; data?: Stats }) => {
          if (result.status === 'success') setStats(result.data ?? null)
        })
        .catch(() => {})
    }
  }, [statistics, api])

  if (!stats) {
    return (
      <div className="statistics-panel">
        <p className="loading">Loading…</p>
      </div>
    )
  }

  return (
    <div className="statistics-panel">
      <h2>Statistics</h2>
      <div className="stats-container">
        <div className="stat-group">
          <h3>Performance</h3>
          <div className="stat-item">
            <label>Total Trades</label>
            <span className="mono">{stats.totalTrades ?? 0}</span>
          </div>
          <div className="stat-item">
            <label>Winners</label>
            <span className="positive mono">{stats.winningTrades ?? 0}</span>
          </div>
          <div className="stat-item">
            <label>Losers</label>
            <span className="negative mono">{stats.losingTrades ?? 0}</span>
          </div>
          <div className="stat-item">
            <label>Win Rate</label>
            <span className="mono">{stats.winRate ?? 0}%</span>
          </div>
        </div>
        <div className="stat-group">
          <h3>P&L</h3>
          <div className="stat-item">
            <label>Total P&L</label>
            <span className={`mono ${(stats.totalPnl ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              ₹{stats.totalPnl ?? 0}
            </span>
          </div>
          <div className="stat-item">
            <label>Avg Win</label>
            <span className="positive mono">₹{stats.avgWin ?? 0}</span>
          </div>
          <div className="stat-item">
            <label>Avg Loss</label>
            <span className="negative mono">₹{stats.avgLoss ?? 0}</span>
          </div>
          <div className="stat-item">
            <label>Profit Factor</label>
            <span className="mono">{stats.profitFactor ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
