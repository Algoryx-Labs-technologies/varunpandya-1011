import { useEffect, useState } from 'react'
import { getBotApiBase } from '../../utils/botApi'

const GROUP_LABELS: Record<string, string> = { volatility: 'Volatility', trend: 'Trend', levels: 'Levels', momentum: 'Momentum' }

interface IndicatorItem {
  id: string
  name: string
  group?: string
  min_bars?: number
  description?: string
}

export default function IndicatorsPanel() {
  const [catalog, setCatalog] = useState<IndicatorItem[]>([])
  const base = getBotApiBase()
  const api = base ? `${base}/api/trading/indicators/catalog` : '/api/trading/indicators/catalog'

  useEffect(() => {
    fetch(api)
      .then((res) => res.json())
      .then((result: { status: string; data?: IndicatorItem[] }) => {
        if (result.status === 'success' && result.data) setCatalog(result.data)
      })
      .catch(() => {})
  }, [api])

  const byGroup = catalog.reduce<Record<string, IndicatorItem[]>>((acc, ind) => {
    const g = ind.group ?? 'other'
    if (!acc[g]) acc[g] = []
    acc[g].push(ind)
    return acc
  }, {})

  return (
    <div className="indicators-panel">
      <h2>Indicators</h2>
      <p className="indicators-intro">Institutional-grade technical indicators used for level detection and regime analysis. All series are index-aligned and vectorized.</p>
      {catalog.length === 0 && <p className="loading">Loading…</p>}
      {Object.entries(byGroup).map(([group, items]) => (
        <div key={group} className="indicator-group">
          <h3>{GROUP_LABELS[group] ?? group}</h3>
          <ul className="indicator-list">
            {items.map((ind) => (
              <li key={ind.id} className="indicator-card">
                <div className="indicator-name">{ind.name}</div>
                <div className="indicator-meta">Min bars: {ind.min_bars ?? '—'}</div>
                <div className="indicator-desc">{ind.description ?? ''}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
