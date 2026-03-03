import { useEffect, useState } from 'react';
import './Dashboard.css';

function Dashboard({ data }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (data?.statistics) {
      setStats(data.statistics);
    } else {
      fetch('/api/trading/statistics')
        .then((res) => res.json())
        .then((result) => {
          if (result.status === 'success') setStats(result.data);
        })
        .catch(() => {});
    }
  }, [data]);

  const signals = data?.signals?.slice(-5).reverse() || [];
  const patternAlerts = (data?.patternDetections ?? []).slice(-5).reverse();

  return (
    <div className="dashboard">
      <h2>Overview</h2>

      {patternAlerts.length > 0 && (
        <div className="dashboard-pattern-alerts">
          <h3>Pattern detected</h3>
          <div className="pattern-alerts-strip">
            {patternAlerts.map((p, idx) => (
              <div key={p.id || idx} className={`pattern-strip-item ${(p.type || p.signal || '').toLowerCase()}`}>
                <span className="pattern-name">{p.pattern || 'Pattern'}</span>
                <span className="pattern-where">{p.index || ''}{p.timeframe ? ` ${p.timeframe}` : ''}</span>
                <span className="pattern-ts">{p.timestamp ? new Date(p.timestamp).toLocaleTimeString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Trades</h3>
          <p className="stat-value mono">{stats?.totalTrades ?? 0}</p>
        </div>
        <div className="stat-card">
          <h3>Win Rate</h3>
          <p className="stat-value mono">{stats?.winRate ?? 0}%</p>
        </div>
        <div className="stat-card">
          <h3>Total P&L</h3>
          <p className={`stat-value mono ${(stats?.totalPnl ?? 0) >= 0 ? 'positive' : 'negative'}`}>
            ₹{stats?.totalPnl ?? 0}
          </p>
        </div>
        <div className="stat-card">
          <h3>Winners</h3>
          <p className="stat-value mono">{stats?.winningTrades ?? 0}</p>
        </div>
        <div className="stat-card">
          <h3>Losers</h3>
          <p className="stat-value mono">{stats?.losingTrades ?? 0}</p>
        </div>
        <div className="stat-card">
          <h3>Profit Factor</h3>
          <p className="stat-value mono">{stats?.profitFactor ?? 0}</p>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Signals</h3>
        <div className="signals-list">
          {signals.length > 0 ? (
            signals.map((signal, idx) => (
              <div key={idx} className="signal-item">
                <span className={`signal-direction ${signal.direction}`}>{signal.direction}</span>
                <span className="signal-index">{signal.index}</span>
                <span className="signal-price">₹{signal.entry_price}</span>
                <span className="signal-time">
                  {new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <p className="empty-state">No signals yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
