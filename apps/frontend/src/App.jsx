import { useState } from 'react';
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
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

const TABS = [
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
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { connected, data } = useWebSocket();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Vertex <span>Options</span></h1>
        <div className="connection-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`} />
          <span>{connected ? 'Live' : 'Offline'}</span>
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
      </main>
    </div>
  );
}

export default App;
