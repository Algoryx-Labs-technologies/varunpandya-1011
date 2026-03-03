import { useEffect, useState } from 'react';
import './PatternAlertsPanel.css';

function PatternAlertsPanel({ data }) {
  const [patternDetections, setPatternDetections] = useState(data?.patternDetections ?? []);
  const signals = (data?.signals ?? []).slice().reverse();
  const trades = (data?.trades ?? []).slice().reverse();

  useEffect(() => {
    if (data?.patternDetections !== undefined) {
      setPatternDetections(data.patternDetections);
      return;
    }
    fetch('/api/trading/pattern-detections')
      .then((res) => res.json())
      .then((result) => {
        if (result.status === 'success' && Array.isArray(result.data)) setPatternDetections(result.data);
      })
      .catch(() => {});
  }, [data?.patternDetections]);

  const patterns = Array.isArray(patternDetections) ? patternDetections.slice().reverse() : [];

  return (
    <div className="pattern-alerts-panel">
      <h2>Pattern alerts</h2>
      <p className="panel-intro">
        Candlestick pattern detected → signal generated → trade taken. Alerts appear when the bot detects a pattern (e.g. BULLISH_ENGULFING); then signals and trades show the follow-through.
      </p>

      <section className="pattern-flow">
        <h3>1. Pattern detected</h3>
        <div className="alerts-list">
          {patterns.length === 0 ? (
            <p className="empty-state">No pattern detections yet. The bot will post here when candlestick patterns are detected.</p>
          ) : (
            patterns.slice(0, 30).map((p, idx) => (
              <div key={p.id || idx} className={`pattern-alert ${(p.type || p.signal || '').toLowerCase()}`}>
                <span className="pattern-badge">{p.pattern || 'Pattern'}</span>
                <span className="pattern-meta">
                  {(p.index || '') + (p.timeframe ? ` ${p.timeframe}` : '')} · {(p.type || p.signal || '').toLowerCase()}
                  {p.level_type ? ` · ${p.level_type}` : ''}
                </span>
                <span className="pattern-time">
                  {p.timestamp ? new Date(p.timestamp).toLocaleString() : ''}
                </span>
                {(p.level_price != null || p.current_price != null) && (
                  <span className="pattern-price mono">
                    {p.level_price != null && `Level ₹${p.level_price}`}
                    {p.current_price != null && ` → ₹${p.current_price}`}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="pattern-flow">
        <h3>2. Signals (with pattern)</h3>
        <div className="signals-compact">
          {signals.length === 0 ? (
            <p className="empty-state">No signals yet</p>
          ) : (
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Index</th>
                  <th>Dir</th>
                  <th>Pattern</th>
                  <th>Entry</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {signals.slice(0, 15).map((s, idx) => (
                  <tr key={s.id || idx}>
                    <td className="mono">{new Date(s.timestamp).toLocaleTimeString()}</td>
                    <td className="mono">{s.index}</td>
                    <td className={`direction ${(s.direction || '').toLowerCase()}`}>{(s.direction || '').toUpperCase()}</td>
                    <td>{s.pattern || '—'}</td>
                    <td className="mono">₹{s.entry_price}</td>
                    <td>{s.level_type || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="pattern-flow">
        <h3>3. Trades taken</h3>
        <div className="trades-compact">
          {trades.length === 0 ? (
            <p className="empty-state">No trades yet</p>
          ) : (
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Symbol / Index</th>
                  <th>Side</th>
                  <th>P&L</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 15).map((t, idx) => (
                  <tr key={t.id || idx}>
                    <td className="mono">{new Date(t.recorded_at || t.entry_time || t.timestamp).toLocaleString()}</td>
                    <td className="mono">{t.symbol || t.index || '—'}</td>
                    <td className={`direction ${(t.side || t.direction || '').toLowerCase()}`}>{(t.side || t.direction || '—').toUpperCase()}</td>
                    <td className={`mono ${(t.pnl ?? 0) >= 0 ? 'positive' : 'negative'}`}>₹{t.pnl ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

export default PatternAlertsPanel;
