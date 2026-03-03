import { useState, useEffect } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { getBotApiBase } from '../../utils/botApi'
import DiscoverPanel from './DiscoverPanel'
import BotDashboardPanel from './BotDashboardPanel'
import BotTradingView from './BotTradingView'
import SignalsPanel from './SignalsPanel'
import TradesPanel from './TradesPanel'
import PatternAlertsPanel from './PatternAlertsPanel'
import MarketIntelligencePanel from './MarketIntelligencePanel'
import RiskPanel from './RiskPanel'
import AlertsPanel from './AlertsPanel'
import StatisticsPanel from './StatisticsPanel'
import IndicatorsPanel from './IndicatorsPanel'
import AnalyticsPanel from './AnalyticsPanel'
import AIPanel from './AIPanel'
import TradingLogsPanel from './TradingLogsPanel'
import './vertex.css'
import './vertex-panels.css'

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
]

interface MarketStatusResponse {
  status: string
  data?: { live?: boolean; istTime?: string }
}

export default function Vertex() {
  const [activeTab, setActiveTab] = useState('discover')
  const { connected, data } = useWebSocket()
  const [marketStatus, setMarketStatus] = useState<MarketStatusResponse['data'] | null>(null)

  useEffect(() => {
    const base = getBotApiBase()
    const url = base ? `${base}/api/trading/market-status` : '/api/trading/market-status'
    const fetchMarketStatus = () => {
      fetch(url)
        .then((res) => res.json())
        .then((r: MarketStatusResponse) => {
          if (r.status === 'success' && r.data) setMarketStatus(r.data)
        })
        .catch(() => setMarketStatus(null))
    }
    fetchMarketStatus()
    const interval = setInterval(fetchMarketStatus, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const marketLive = marketStatus?.live ?? false
  const statusLabel = !connected ? 'Offline' : marketLive ? 'Live' : 'Market closed'
  const statusClass = !connected ? 'disconnected' : marketLive ? 'connected' : 'market-closed'

  return (
    <div className="vertex-page page-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <header className="vertex-header">
        <h2>Vertex <span>Options</span></h2>
        <div className="vertex-status" title={marketStatus?.istTime ?? ''}>
          <span className={`vertex-status-dot ${statusClass}`} />
          <span>{statusLabel}</span>
        </div>
      </header>

      <nav className="vertex-nav">
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

      <main className="vertex-main">
        {activeTab === 'discover' && <DiscoverPanel />}
        {activeTab === 'dashboard' && <BotDashboardPanel data={data} />}
        {activeTab === 'trading' && <BotTradingView data={data} />}
        {activeTab === 'signals' && <SignalsPanel signals={data?.signals ?? []} />}
        {activeTab === 'trades' && <TradesPanel trades={data?.trades ?? []} />}
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
  )
}
