import { useEffect, useState } from 'react'
import { getBotApiBase } from '../../utils/botApi'

interface LogEntry {
  id?: string
  level?: string
  timestamp?: string
  message?: string
  payload?: Record<string, unknown>
}

export default function TradingLogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const base = getBotApiBase()
  const apiBase = base || (typeof window !== 'undefined' ? window.location.origin : '')
  const api = `${apiBase}/api/trading/logs?date=${date}`

  useEffect(() => {
    setLoading(true)
    fetch(api)
      .then((res) => res.json())
      .then((r: { status: string; data?: LogEntry[] }) => {
        if (r.status === 'success' && Array.isArray(r.data)) setLogs(r.data)
        else setLogs([])
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [date, api])

  return (
    <div className="trading-logs-panel">
      <h2>Trading Logs</h2>
      <p className="panel-intro">All trading events stored per day. Select a date to view logs.</p>

      <div className="logs-controls">
        <label htmlFor="log-date">Date</label>
        <input
          id="log-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
        />
      </div>

      <div className="logs-feed">
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="empty-state">No logs for this day</p>
        ) : (
          logs.map((log) => (
            <div key={log.id ?? Math.random()} className={`log-item level-${log.level ?? 'info'}`}>
              <span className="log-badge">{log.level ?? 'info'}</span>
              <span className="log-time mono">
                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
              </span>
              <span className="log-message">{log.message ?? '—'}</span>
              {log.payload && Object.keys(log.payload).length > 0 && (
                <details className="log-payload">
                  <summary>Details</summary>
                  <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
