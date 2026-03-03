import { useEffect, useState } from 'react';
import './StatisticsPanel.css';

function StatisticsPanel({ statistics }) {
  const [stats, setStats] = useState(statistics);

  useEffect(() => {
    if (statistics) {
      setStats(statistics);
    } else {
      fetch('/api/trading/statistics')
        .then((res) => res.json())
        .then((result) => {
          if (result.status === 'success') setStats(result.data);
        })
        .catch(() => {});
    }
  }, [statistics]);

  if (!stats) {
    return <div className="statistics-panel"><p className="loading">Loading…</p></div>;
  }

  return (
    <div className="statistics-panel">
      <h2>Statistics</h2>
      <div className="stats-container">
        <div className="stat-group">
          <h3>Performance</h3>
          <div className="stat-item">
            <label>Total Trades</label>
            <span className="mono">{stats.totalTrades}</span>
          </div>
          <div className="stat-item">
            <label>Winners</label>
            <span className="positive mono">{stats.winningTrades}</span>
          </div>
          <div className="stat-item">
            <label>Losers</label>
            <span className="negative mono">{stats.losingTrades}</span>
          </div>
          <div className="stat-item">
            <label>Win Rate</label>
            <span className="mono">{stats.winRate}%</span>
          </div>
        </div>
        <div className="stat-group">
          <h3>P&L</h3>
          <div className="stat-item">
            <label>Total P&L</label>
            <span className={`mono ${stats.totalPnl >= 0 ? 'positive' : 'negative'}`}>
              ₹{stats.totalPnl}
            </span>
          </div>
          <div className="stat-item">
            <label>Avg Win</label>
            <span className="positive mono">₹{stats.avgWin}</span>
          </div>
          <div className="stat-item">
            <label>Avg Loss</label>
            <span className="negative mono">₹{stats.avgLoss}</span>
          </div>
          <div className="stat-item">
            <label>Profit Factor</label>
            <span className="mono">{stats.profitFactor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatisticsPanel;
