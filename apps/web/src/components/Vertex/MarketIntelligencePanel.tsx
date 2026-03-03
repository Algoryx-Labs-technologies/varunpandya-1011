import { useEffect, useState } from 'react'
import type { VertexWsData } from '../../hooks/useWebSocket'
import { getBotApiBase } from '../../utils/botApi'

interface MarketIntelligencePanelProps {
  marketIntelligence: VertexWsData['marketIntelligence']
}

interface MI {
  filter_score?: number
  interpretation?: string
  put_call_ratio?: number
  volatility_ratio?: number
  volatility_spike?: boolean
  volume_breakout?: boolean
  trend?: {
    trend_direction?: number
    trend_strength?: number
    ema_fast?: number
    ema_slow?: number
  }
  oi_momentum?: { call_oi_momentum?: number; put_oi_momentum?: number }
}

export default function MarketIntelligencePanel({ marketIntelligence: miFromWs }: MarketIntelligencePanelProps) {
  const [mi, setMi] = useState<MI | undefined>(miFromWs as MI | undefined)
  const base = getBotApiBase()
  const api = base ? `${base}/api/trading/market-intelligence` : '/api/trading/market-intelligence'

  useEffect(() => {
    if (miFromWs !== undefined) {
      setMi(miFromWs as MI)
      return
    }
    fetch(api)
      .then((res) => res.json())
      .then((r: { status: string; data?: MI }) => {
        if (r.status === 'success') setMi(r.data)
      })
      .catch(() => {})
  }, [miFromWs, api])

  if (!mi) {
    return (
      <div className="market-intel-panel">
        <h2>Market Intelligence</h2>
        <p className="empty-state">No market intelligence data yet. Bot will push PCR, OI momentum, volatility, trend & filter score.</p>
      </div>
    )
  }

  const score = mi.filter_score ?? 50
  const interpretation = mi.interpretation ?? (score > 60 ? 'bullish' : score < 40 ? 'bearish' : 'neutral')
  const trend = mi.trend ?? {}
  const oi = mi.oi_momentum ?? {}

  return (
    <div className="market-intel-panel">
      <h2>Market Intelligence</h2>
      <p className="panel-intro">Sentiment, volatility regime, volume & trend. Composite filter score drives signal bias.</p>

      <div className="mi-hero">
        <div className={`mi-score-card ${interpretation}`}>
          <span className="mi-score-label">Filter score</span>
          <span className="mi-score-value mono">{score}</span>
          <span className="mi-score-interp">{interpretation}</span>
        </div>
        <div className="mi-metrics">
          <div className="mi-metric">
            <span className="mi-metric-label">Put-Call Ratio</span>
            <span className="mi-metric-value mono">{mi.put_call_ratio ?? '—'}</span>
            <span className="mi-metric-hint">{mi.put_call_ratio != null && mi.put_call_ratio > 1.2 ? 'Bearish' : mi.put_call_ratio != null && mi.put_call_ratio < 0.8 ? 'Bullish' : 'Neutral'}</span>
          </div>
          <div className="mi-metric">
            <span className="mi-metric-label">Vol ratio (ATR)</span>
            <span className="mi-metric-value mono">{mi.volatility_ratio ?? '—'}</span>
            <span className="mi-metric-hint">{mi.volatility_spike ? 'Spike' : 'Normal'}</span>
          </div>
          <div className="mi-metric">
            <span className="mi-metric-label">Volume breakout</span>
            <span className="mi-metric-value mono">{mi.volume_breakout ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      <div className="mi-grid">
        <div className="mi-card">
          <h4>OI momentum</h4>
          <div className="mi-row"><span>Call OI %</span><span className="mono">{oi.call_oi_momentum ?? 0}%</span></div>
          <div className="mi-row"><span>Put OI %</span><span className="mono">{oi.put_oi_momentum ?? 0}%</span></div>
        </div>
        <div className="mi-card">
          <h4>Trend</h4>
          <div className="mi-row"><span>Direction</span><span className={`pill ${trend.trend_direction === 1 ? 'bullish' : trend.trend_direction === -1 ? 'bearish' : 'neutral'}`}>
            {trend.trend_direction === 1 ? 'Bullish' : trend.trend_direction === -1 ? 'Bearish' : 'Sideways'}
          </span></div>
          <div className="mi-row"><span>Strength</span><span className="mono">{trend.trend_strength ?? 0}%</span></div>
          <div className="mi-row"><span>EMA fast</span><span className="mono">₹{trend.ema_fast ?? '—'}</span></div>
          <div className="mi-row"><span>EMA slow</span><span className="mono">₹{trend.ema_slow ?? '—'}</span></div>
        </div>
      </div>
    </div>
  )
}
