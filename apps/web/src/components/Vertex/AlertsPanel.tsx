import { useEffect, useState } from 'react'
import type { VertexWsData } from '../../hooks/useWebSocket'
import { getBotApiBase } from '../../utils/botApi'

interface AlertsPanelProps {
  alerts: VertexWsData['alerts']
}

export default function AlertsPanel({ alerts: alertsFromWs }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<NonNullable<VertexWsData['alerts']>>(alertsFromWs ?? [])
  const base = getBotApiBase()
  const api = base ? `${base}/api/trading/alerts` : '/api/trading/alerts'

  useEffect(() => {
    if (alertsFromWs !== undefined) {
      setAlerts(Array.isArray(alertsFromWs) ? alertsFromWs : [])
      return
    }
    fetch(api)
      .then((res) => res.json())
      .then((r: { status: string; data?: unknown[] }) => {
        if (r.status === 'success' && Array.isArray(r.data)) setAlerts(r.data as NonNullable<VertexWsData['alerts']>)
      })
      .catch(() => {})
  }, [alertsFromWs, api])

  const list = alerts.slice().reverse()

  return (
    <div className="alerts-panel">
      <h2>Alerts</h2>
      <p className="panel-intro">Pattern detections and system alerts (auto-lock, kill switch, data failures).</p>

      <div className="alerts-feed">
        {list.length === 0 ? (
          <p className="empty-state">No alerts yet</p>
        ) : (
          list.map((a, idx) => (
            <div key={a.timestamp ?? idx} className={`alert-item severity-${a.severity ?? 'info'}`}>
              <span className="alert-badge">{a.severity ?? 'info'}</span>
              <span className="alert-message">{a.message ?? '—'}</span>
              <span className="alert-time mono">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
