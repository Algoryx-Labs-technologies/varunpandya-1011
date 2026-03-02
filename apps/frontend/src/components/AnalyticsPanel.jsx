import { useEffect, useState } from 'react';
import './AnalyticsPanel.css';

function AnalyticsPanel({ analytics: analyticsFromWs }) {
  const [analytics, setAnalytics] = useState(analyticsFromWs);

  useEffect(() => {
    if (analyticsFromWs) {
      setAnalytics(analyticsFromWs);
      return;
    }
    fetch('/api/trading/analytics')
      .then((res) => res.json())
      .then((result) => {
        if (result.status === 'success') setAnalytics(result.data);
      })
      .catch(() => {});
  }, [analyticsFromWs]);

  if (!analytics) {
    return (
      <div className="analytics-panel">
        <h2>Analytics</h2>
        <p className="loading">No analytics yet. Run the trading bot to compute performance analytics.</p>
      </div>
    );
  }

  const breakdown = (label, data) => {
    if (!data || typeof data !== 'object') return null;
    const entries = Object.entries(data);
    if (entries.length === 0) return null;
    return (
      <div className="breakdown-block">
        <h4>{label}</h4>
        <table className="breakdown-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Count</th>
              <th>Win %</th>
              <th>Total P&L</th>
              <th>Avg P&L</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, v]) => (
              <tr key={name}>
                <td>{name}</td>
                <td className="mono">{v.count}</td>
                <td className="mono">{v.win_rate}%</td>
                <td className={`mono ${v.total_pnl >= 0 ? 'positive' : 'negative'}`}>₹{v.total_pnl}</td>
                <td className={`mono ${v.avg_pnl >= 0 ? 'positive' : 'negative'}`}>₹{v.avg_pnl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="analytics-panel">
      <h2>Analytics</h2>
      <p className="analytics-intro">Institutional-grade performance: expectancy, drawdown, Sharpe proxy, consistency, and breakdowns by level, timeframe, index, and pattern.</p>

      <div className="stats-container">
        <div className="stat-group">
          <h3>Performance</h3>
          <div className="stat-item"><label>Total Trades</label><span className="mono">{analytics.total_trades}</span></div>
          <div className="stat-item"><label>Winners</label><span className="positive mono">{analytics.winning_trades}</span></div>
          <div className="stat-item"><label>Losers</label><span className="negative mono">{analytics.losing_trades}</span></div>
          <div className="stat-item"><label>Win Rate</label><span className="mono">{analytics.win_rate}%</span></div>
        </div>
        <div className="stat-group">
          <h3>P&L & Expectancy</h3>
          <div className="stat-item"><label>Total P&L</label><span className={`mono ${analytics.total_pnl >= 0 ? 'positive' : 'negative'}`}>₹{analytics.total_pnl}</span></div>
          <div className="stat-item"><label>Expectancy/Trade</label><span className={`mono ${analytics.expectancy_per_trade >= 0 ? 'positive' : 'negative'}`}>₹{analytics.expectancy_per_trade}</span></div>
          <div className="stat-item"><label>Profit Factor</label><span className="mono">{analytics.profit_factor}</span></div>
          <div className="stat-item"><label>Avg R:R</label><span className="mono">{analytics.avg_rr}</span></div>
        </div>
        <div className="stat-group">
          <h3>Risk</h3>
          <div className="stat-item"><label>Max Drawdown</label><span className="negative mono">₹{analytics.max_drawdown}</span></div>
          <div className="stat-item"><label>Max DD %</label><span className="negative mono">{analytics.max_drawdown_pct}%</span></div>
          <div className="stat-item"><label>Sharpe (20)</label><span className="mono">{analytics.sharpe_proxy_20}</span></div>
          <div className="stat-item"><label>Consistency</label><span className="mono">{analytics.consistency_score}%</span></div>
        </div>
      </div>

      {breakdown('By Level Type', analytics.level_performance)}
      {breakdown('By Timeframe', analytics.timeframe_performance)}
      {breakdown('By Index', analytics.index_performance)}
      {breakdown('By Pattern', analytics.pattern_performance)}

      {analytics.last_updated && (
        <p className="last-updated">Last updated: {new Date(analytics.last_updated).toLocaleString()}</p>
      )}
    </div>
  );
}

export default AnalyticsPanel;
