import { useEffect, useState } from 'react';
import './RiskPanel.css';

function RiskPanel({ riskStatus: riskFromWs }) {
  const [risk, setRisk] = useState(riskFromWs);

  useEffect(() => {
    if (riskFromWs !== undefined) {
      setRisk(riskFromWs);
      return;
    }
    fetch('/api/trading/risk-status')
      .then((res) => res.json())
      .then((r) => { if (r.status === 'success') setRisk(r.data); })
      .catch(() => {});
  }, [riskFromWs]);

  const [unlockRequested, setUnlockRequested] = useState(false);
  const tradeCount = risk?.trade_count ?? 0;
  const maxTrades = risk?.max_trades ?? 2;
  const autoLocked = risk?.auto_locked ?? false;
  const killSwitchTime = risk?.kill_switch_time ?? '15:15';
  const canTrade = !autoLocked && tradeCount < maxTrades;

  const handleRequestUnlock = () => {
    fetch('/api/trading/request-unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((res) => res.json())
      .then((r) => { if (r.status === 'success') setUnlockRequested(true); })
      .catch(() => {});
  };

  return (
    <div className="risk-panel">
      <h2>Risk</h2>
      <p className="panel-intro">Trade limits, auto-lock and kill switch. Bot pushes status here.</p>

      <div className="risk-cards">
        <div className={`risk-card ${canTrade ? 'ok' : 'blocked'}`}>
          <span className="risk-card-label">Trading</span>
          <span className="risk-card-value">{canTrade ? 'Allowed' : 'Blocked'}</span>
        </div>
        <div className="risk-card">
          <span className="risk-card-label">Trades today</span>
          <span className="risk-card-value mono">{tradeCount} / {maxTrades}</span>
        </div>
        <div className="risk-card">
          <span className="risk-card-label">Auto-lock</span>
          <span className={`risk-card-value pill ${autoLocked ? 'danger' : 'muted'}`}>{autoLocked ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="risk-card">
          <span className="risk-card-label">Kill switch</span>
          <span className="risk-card-value mono">{killSwitchTime}</span>
        </div>
      </div>

      {autoLocked && (
        <div className="unlock-section">
          <button type="button" className="unlock-btn" onClick={handleRequestUnlock} disabled={unlockRequested}>
            {unlockRequested ? 'Unlock requested' : 'Unlock trading'}
          </button>
          {unlockRequested && <p className="unlock-hint">Bot will clear auto-lock on its next loop.</p>}
        </div>
      )}

      {!risk && (
        <p className="empty-hint">No risk status from bot yet. Use POST /api/trading/risk-status to push trade_count, max_trades, auto_locked, kill_switch_time.</p>
      )}
    </div>
  );
}

export default RiskPanel;
