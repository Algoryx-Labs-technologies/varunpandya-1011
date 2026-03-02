import { useEffect, useState } from 'react';
import './AIPanel.css';

function AIPanel({ missedTrades: missedFromWs }) {
  const [missedTrades, setMissedTrades] = useState(missedFromWs);

  useEffect(() => {
    if (missedFromWs !== undefined) {
      setMissedTrades(Array.isArray(missedFromWs) ? missedFromWs : []);
      return;
    }
    fetch('/api/trading/ai/missed-trades')
      .then((res) => res.json())
      .then((result) => {
        if (result.status === 'success' && Array.isArray(result.data)) setMissedTrades(result.data);
      })
      .catch(() => setMissedTrades([]));
  }, [missedFromWs]);

  const list = Array.isArray(missedTrades) ? missedTrades : [];
  const totalPotential = list.reduce((s, m) => s + (m.potential_pnl || 0), 0);
  const byReason = list.reduce((acc, m) => {
    const r = m.reason || 'unknown';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="ai-panel">
      <h2>AI</h2>
      <p className="ai-intro">ML-derived insights: missed-trade analysis (signals not executed), potential P&L, risk-reward, and reasons. Use for strategy tuning and accountability.</p>

      {list.length === 0 ? (
        <p className="loading">No missed-trade data yet. Run the bot with missed-trade detection to see results.</p>
      ) : (
        <>
          <div className="ai-summary">
            <div className="ai-summary-card">
              <span className="ai-summary-label">Missed opportunities</span>
              <span className="ai-summary-value mono">{list.length}</span>
            </div>
            <div className="ai-summary-card">
              <span className="ai-summary-label">Potential P&L (total)</span>
              <span className={`ai-summary-value mono ${totalPotential >= 0 ? 'positive' : 'negative'}`}>₹{totalPotential.toFixed(2)}</span>
            </div>
          </div>

          {Object.keys(byReason).length > 0 && (
            <div className="breakdown-block">
              <h4>By reason</h4>
              <ul className="reason-list">
                {Object.entries(byReason).map(([reason, count]) => (
                  <li key={reason}><span className="reason-name">{reason}</span><span className="mono">{count}</span></li>
                ))}
              </ul>
            </div>
          )}

          <div className="breakdown-block">
            <h4>Missed trades (recent)</h4>
            <div className="missed-list">
              {list.slice(0, 30).map((m, i) => (
                <div key={i} className="missed-card">
                  <div className="missed-row">
                    <span className="missed-direction">{m.direction || '—'}</span>
                    <span className="missed-level">{m.level_type || '—'}</span>
                    <span className={`mono ${(m.potential_pnl || 0) >= 0 ? 'positive' : 'negative'}`}>₹{Number(m.potential_pnl || 0).toFixed(2)}</span>
                  </div>
                  <div className="missed-meta">R:R {m.rr_ratio != null ? m.rr_ratio.toFixed(2) : '—'} · {m.reason || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AIPanel;
