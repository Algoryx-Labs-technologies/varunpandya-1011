import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import TradingView from './components/TradingView';
import SignalsPanel from './components/SignalsPanel';
import TradesPanel from './components/TradesPanel';
import StatisticsPanel from './components/StatisticsPanel';
import IndicatorsPanel from './components/IndicatorsPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import AIPanel from './components/AIPanel';
import PatternAlertsPanel from './components/PatternAlertsPanel';
import MarketIntelligencePanel from './components/MarketIntelligencePanel';
import RiskPanel from './components/RiskPanel';
import AlertsPanel from './components/AlertsPanel';
import TradingLogsPanel from './components/TradingLogsPanel';
import DiscoverPanel from './components/DiscoverPanel';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

const TABS = [
  { id: 'discover', label: 'Discover' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'trading', label: 'Trading' },
  { id: 'signals', label: 'Signals' },
  { id: 'trades', label: 'Trades' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'risk', label: 'Risk' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'indicators', label: 'Indicators' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'ai', label: 'AI' },
  { id: 'logs', label: 'Logs' },
];

function App() {
  const [activeTab, setActiveTab] = useState('discover');
  const { connected, data } = useWebSocket();
  const [marketStatus, setMarketStatus] = useState(null);

  useEffect(() => {
    const fetchMarketStatus = () => {
      fetch('/api/trading/market-status')
        .then((res) => res.json())
        .then((r) => { if (r.status === 'success' && r.data) setMarketStatus(r.data); })
        .catch(() => setMarketStatus(null));
    };
    fetchMarketStatus();
    const interval = setInterval(fetchMarketStatus, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const marketLive = marketStatus?.live ?? false;
  const statusLabel = !connected ? 'Offline' : (marketLive ? 'Live' : 'Market closed');
  const statusClass = !connected ? 'disconnected' : (marketLive ? 'connected' : 'market-closed');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Vertex <span>Options</span></h1>
        <div className="connection-status" title={marketStatus?.istTime || ''}>
          <span className={`status-indicator ${statusClass}`} />
          <span>{statusLabel}</span>
        </div>
      </header>

      <nav className="app-nav">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={activeTab === id ? 'active' : ''}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'discover' && <DiscoverPanel />}
        {activeTab === 'dashboard' && <Dashboard data={data} />}
        {activeTab === 'trading' && <TradingView data={data} />}
        {activeTab === 'signals' && <SignalsPanel signals={data?.signals || []} />}
        {activeTab === 'trades' && <TradesPanel trades={data?.trades || []} />}
        {activeTab === 'patterns' && <PatternAlertsPanel data={data} />}
        {activeTab === 'intelligence' && <MarketIntelligencePanel marketIntelligence={data?.marketIntelligence} />}
        {activeTab === 'risk' && <RiskPanel riskStatus={data?.riskStatus} />}
        {activeTab === 'alerts' && <AlertsPanel alerts={data?.alerts} />}
        {activeTab === 'statistics' && <StatisticsPanel statistics={data?.statistics} />}
        {activeTab === 'indicators' && <IndicatorsPanel />}
        {activeTab === 'analytics' && <AnalyticsPanel analytics={data?.analytics} />}
        {activeTab === 'ai' && <AIPanel missedTrades={data?.missedTrades} />}
        {activeTab === 'logs' && <TradingLogsPanel />}
      </main>
    </div>
  );
}

export default App;
