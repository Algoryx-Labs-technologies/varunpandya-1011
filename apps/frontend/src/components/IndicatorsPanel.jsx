import { useEffect, useState } from 'react';
import './IndicatorsPanel.css';

const GROUP_LABELS = { volatility: 'Volatility', trend: 'Trend', levels: 'Levels', momentum: 'Momentum' };

function IndicatorsPanel() {
  const [catalog, setCatalog] = useState([]);

  useEffect(() => {
    fetch('/api/trading/indicators/catalog')
      .then((res) => res.json())
      .then((result) => {
        if (result.status === 'success' && result.data) setCatalog(result.data);
      })
      .catch(() => {});
  }, []);

  const byGroup = catalog.reduce((acc, ind) => {
    const g = ind.group || 'other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(ind);
    return acc;
  }, {});

  return (
    <div className="indicators-panel">
      <h2>Indicators</h2>
      <p className="indicators-intro">Institutional-grade technical indicators used for level detection and regime analysis. All series are index-aligned and vectorized.</p>
      {catalog.length === 0 && <p className="loading">Loading…</p>}
      {Object.entries(byGroup).map(([group, items]) => (
        <div key={group} className="indicator-group">
          <h3>{GROUP_LABELS[group] || group}</h3>
          <ul className="indicator-list">
            {items.map((ind) => (
              <li key={ind.id} className="indicator-card">
                <div className="indicator-name">{ind.name}</div>
                <div className="indicator-meta">Min bars: {ind.min_bars}</div>
                <div className="indicator-desc">{ind.description}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default IndicatorsPanel;
