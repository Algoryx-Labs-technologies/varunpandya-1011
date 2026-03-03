import { useEffect, useState } from 'react';
import './TradingLogsPanel.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3005');

function TradingLogsPanel() {
  const [logs, setLogs] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND_URL}/api/trading/logs?date=${date}`)
      .then((res) => res.json())
      .then((r) => {
        if (r.status === 'success' && Array.isArray(r.data)) setLogs(r.data);
        else setLogs([]);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [date]);

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
            <div key={log.id} className={`log-item level-${log.level || 'info'}`}>
              <span className="log-badge">{log.level || 'info'}</span>
              <span className="log-time mono">
                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
              </span>
              <span className="log-message">{log.message || '—'}</span>
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
  );
}

export default TradingLogsPanel;
