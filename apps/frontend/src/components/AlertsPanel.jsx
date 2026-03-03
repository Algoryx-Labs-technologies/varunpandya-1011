import { useEffect, useState } from 'react';
import './AlertsPanel.css';

function AlertsPanel({ alerts: alertsFromWs }) {
  const [alerts, setAlerts] = useState(alertsFromWs ?? []);

  useEffect(() => {
    if (alertsFromWs !== undefined) {
      setAlerts(Array.isArray(alertsFromWs) ? alertsFromWs : []);
      return;
    }
    fetch('/api/trading/alerts')
      .then((res) => res.json())
      .then((r) => { if (r.status === 'success' && Array.isArray(r.data)) setAlerts(r.data); })
      .catch(() => {});
  }, [alertsFromWs]);

  const list = alerts.slice().reverse();

  return (
    <div className="alerts-panel">
      <h2>Alerts</h2>
      <p className="panel-intro">Pattern detections and system alerts (auto-lock, kill switch, data failures).</p>

      <div className="alerts-feed">
        {list.length === 0 ? (
          <p className="empty-state">No alerts yet</p>
        ) : (
          list.map((a, idx) => (
            <div key={a.timestamp || idx} className={`alert-item severity-${a.severity || 'info'}`}>
              <span className="alert-badge">{a.severity || 'info'}</span>
              <span className="alert-message">{a.message || '—'}</span>
              <span className="alert-time mono">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AlertsPanel;
