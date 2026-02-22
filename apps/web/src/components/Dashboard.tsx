import React, { useEffect, useState, useRef } from 'react'
import { getGreeting, formatDateLong } from '../utils/format'
import { getCumulativePnLSeries, type DailyPnLPoint } from '../data/dashboard'
import { getProfile, getRMSLimit, getAllHolding, getTradeBook, getGainersLosers, getPutCallRatio, getOIBuildup, estimateCharges } from '../data/dashboard'
import type { TradeBookItem } from '../types/tradeBook'
import type { GainersLosersItem, PCRItem, OIBuildupItem, GainersLosersDataType, GainersLosersExpiryType, OIBuildupDataType, OIBuildupExpiryType } from '../types/dashboard'

function svgPathFromSeries(points: DailyPnLPoint[], width: number, height: number, isCumulative: boolean): string {
  if (!points.length) return ''
  const vals = points.map((p) => (isCumulative ? p.cumulativePnL : p.dailyPnL))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const padding = 4
  const w = width - padding * 2
  const h = height - padding * 2
  const step = points.length > 1 ? w / (points.length - 1) : 0
  const toX = (i: number) => padding + i * step
  const toY = (v: number) => padding + h - ((v - min) / range) * h
  const d = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(vals[i])}`)
    .join(' ')
  return d
}

function CumulativeChart({ points, width, height }: { points: DailyPnLPoint[]; width: number; height: number }) {
  const pathD = svgPathFromSeries(points, width, height, true)
  const lastVal = points[points.length - 1]?.cumulativePnL ?? 0
  const fillColor = lastVal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
  return (
    <svg className="dashboard-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="cumulativeGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={fillColor} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path fill="none" stroke={fillColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d={pathD}/>
      <path fill="url(#cumulativeGrad)" d={`${pathD} L ${width - 4} ${height - 4} L 4 ${height - 4} Z`}/>
    </svg>
  )
}

function DailyCumulativeChart({ points, width, height }: { points: DailyPnLPoint[]; width: number; height: number }) {
  const lineD = svgPathFromSeries(points, width, height, true)
  const lastCum = points[points.length - 1]?.cumulativePnL ?? 0
  const lineColor = lastCum >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)'
  const barW = Math.max(2, (width - 8) / points.length - 2)
  const maxAbs = Math.max(...points.map((p) => Math.abs(p.dailyPnL)), 1)
  return (
    <svg className="dashboard-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {points.map((p, i) => {
        const x = 4 + i * ((width - 8) / points.length)
        const barH = (Math.abs(p.dailyPnL) / maxAbs) * (height * 0.4)
        const y = p.dailyPnL >= 0 ? height - 4 - barH : height - 4
        const fill = p.dailyPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
        return <rect key={i} x={x} y={y} width={barW} height={barH} fill={fill} opacity="0.85"/>
      })}
      <path fill="none" stroke={lineColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" d={lineD} opacity="0.9"/>
    </svg>
  )
}

export default function Dashboard() {
  const [userName, setUserName] = useState('Trader')
  const [todayPnL, setTodayPnL] = useState(-1099)
  const [todayTrades, setTodayTrades] = useState(3)
  const [todayWins, setTodayWins] = useState(2)
  const [monthlyPnL, setMonthlyPnL] = useState(2345)
  const [netPnL, setNetPnL] = useState(7958)
  const [netPnLPercent, setNetPnLPercent] = useState(2.4)
  const [winRate, setWinRate] = useState(44.6)
  const [totalTrades, setTotalTrades] = useState(83)
  const [profitFactor, setProfitFactor] = useState(1.33)
  const [accountBalance, setAccountBalance] = useState(234700)
  const [riskRewardStr, setRiskRewardStr] = useState('1:1.65')
  const [pnlSeries, setPnlSeries] = useState<DailyPnLPoint[]>([])
  const [recentTrades, setRecentTrades] = useState<TradeBookItem[]>([])
  const [period, setPeriod] = useState(30)
  const [activeTab, setActiveTab] = useState<'live' | 'prop'>('live')
  const [gainersLosersData, setGainersLosersData] = useState<GainersLosersItem[]>([])
  const [gainersDataType, setGainersDataType] = useState<GainersLosersDataType>('PercPriceGainers')
  const [gainersExpiry, setGainersExpiry] = useState<GainersLosersExpiryType>('NEAR')
  const [pcrData, setPcrData] = useState<PCRItem[]>([])
  const [oiBuildupData, setOiBuildupData] = useState<OIBuildupItem[]>([])
  const [oiBuildupDataType, setOiBuildupDataType] = useState<OIBuildupDataType>('Long Built Up')
  const [oiBuildupExpiry, setOiBuildupExpiry] = useState<OIBuildupExpiryType>('NEAR')
  const [brokerageCalc, setBrokerageCalc] = useState({
    symbol: '',
    token: '',
    exchange: 'NSE',
    product: 'DELIVERY',
    transaction: 'BUY',
    quantity: '',
    price: '',
  })
  const [brokerageResult, setBrokerageResult] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profile, rms, holding, tradeBook] = await Promise.all([
          getProfile(),
          getRMSLimit(),
          getAllHolding(),
          getTradeBook(),
        ])

        if (profile?.data?.name) setUserName(profile.data.name)
        if (rms?.data?.net) {
          const net = Number(rms.data.net)
          setAccountBalance(net)
        }
        if (holding?.data?.totalholding) {
          const th = holding.data.totalholding
          setNetPnL(th.totalprofitandloss)
        }
        if (tradeBook?.data?.length) {
          const trades = tradeBook.data
          setTodayTrades(trades.length)
          const wins = trades.filter((t) => Number(t.tradevalue) > 0 && t.transactiontype === 'SELL').length
          setTodayWins(wins)
          const todayPnL = trades.reduce((sum, t) => sum + Number(t.tradevalue) * (t.transactiontype === 'SELL' ? 1 : -1), 0)
          setTodayPnL(todayPnL)
          setRecentTrades(trades.slice(0, 10))
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    setPnlSeries(getCumulativePnLSeries(period))
  }, [period])

  useEffect(() => {
    const loadGainersLosers = async () => {
      try {
        const res = await getGainersLosers(gainersDataType, gainersExpiry)
        if (res?.data) setGainersLosersData(res.data)
      } catch (error) {
        console.error('Failed to load gainers/losers:', error)
      }
    }
    loadGainersLosers()
  }, [gainersDataType, gainersExpiry])

  useEffect(() => {
    const loadPCR = async () => {
      try {
        const res = await getPutCallRatio()
        if (res?.data) setPcrData(res.data)
      } catch (error) {
        console.error('Failed to load PCR:', error)
      }
    }
    loadPCR()
  }, [])

  useEffect(() => {
    const loadOIBuildup = async () => {
      try {
        const res = await getOIBuildup(oiBuildupExpiry, oiBuildupDataType)
        if (res?.data) setOiBuildupData(res.data)
      } catch (error) {
        console.error('Failed to load OI buildup:', error)
      }
    }
    loadOIBuildup()
  }, [oiBuildupDataType, oiBuildupExpiry])

  const handleBrokerageCalc = async () => {
    if (!brokerageCalc.symbol || !brokerageCalc.token || !brokerageCalc.quantity || !brokerageCalc.price || Number(brokerageCalc.quantity) < 1 || Number(brokerageCalc.price) <= 0) {
      return
    }
    try {
      const res = await estimateCharges([{
        product_type: brokerageCalc.product,
        transaction_type: brokerageCalc.transaction,
        quantity: brokerageCalc.quantity,
        price: brokerageCalc.price,
        exchange: brokerageCalc.exchange,
        symbol_name: brokerageCalc.symbol,
        token: brokerageCalc.token,
      }])
      if (res?.data?.summary) {
        setBrokerageResult(res.data.summary)
      }
    } catch (error) {
      console.error('Failed to calculate brokerage:', error)
    }
  }

  const chartW = 400
  const chartH = 140
  const series = pnlSeries.length ? pnlSeries : getCumulativePnLSeries(30)

  const todayPnLClass = todayPnL >= 0 ? 'positive' : 'negative'
  const monthlyPnLClass = monthlyPnL >= 0 ? 'positive' : 'negative'
  const netPnLClass = netPnL >= 0 ? 'positive' : 'negative'

  return (
    <div className="page-content page-content-dashboard">
      <div className="dashboard-top-bar">
        <div className="dashboard-monthly-pnl">
          <span className="dashboard-monthly-label">Monthly P&L</span>
          <span className={`dashboard-monthly-value ${monthlyPnLClass}`}>
            {monthlyPnL >= 0 ? '+' : ''}₹{Math.abs(monthlyPnL).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className="dashboard-hero">
        <div className="dashboard-hero-left">
          <p className="dashboard-date">{formatDateLong(new Date())}</p>
          <h1 className="dashboard-greeting">
            {getGreeting()}, <span className="dashboard-greeting-name">{userName}</span>
          </h1>
          <p className="dashboard-message">Stay focused. Every trade is a learning opportunity.</p>
        </div>
        <div className="dashboard-hero-right">
          <div className="dashboard-daily-summary">
            <div className="dashboard-daily-item">
              <span className="dashboard-daily-label">TODAY'S P&L</span>
              <span className={`dashboard-daily-value ${todayPnLClass}`}>
                {todayPnL >= 0 ? '+' : ''}₹{Math.abs(todayPnL).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="dashboard-daily-item">
              <span className="dashboard-daily-label">TRADES</span>
              <span className="dashboard-daily-value">{todayTrades}</span>
            </div>
            <div className="dashboard-daily-item">
              <span className="dashboard-daily-label">WINS</span>
              <span className="dashboard-daily-value">{todayWins}</span>
            </div>
          </div>
          <div className="dashboard-tabs">
            <button
              type="button"
              className={`dashboard-tab ${activeTab === 'live' ? 'active' : ''}`}
              onClick={() => setActiveTab('live')}
            >
              Live Trading
            </button>
            <button
              type="button"
              className={`dashboard-tab ${activeTab === 'prop' ? 'active' : ''}`}
              onClick={() => setActiveTab('prop')}
            >
              Prop Firm
            </button>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="dashboard-btn-secondary">Tour</button>
            <select
              className="dashboard-select"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              aria-label="Period"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <button type="button" className="dashboard-btn-secondary">Customize</button>
          </div>
        </div>
      </div>

      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-label">Net P&L</div>
          <div className={`dashboard-kpi-value ${netPnLClass}`}>
            ₹{netPnL.toLocaleString('en-IN')}
          </div>
          <div className={`dashboard-kpi-sub ${netPnLClass}`}>+{netPnLPercent}% return</div>
          <div className="dashboard-kpi-sparkline">
            <CumulativeChart points={series.slice(-14)} width={120} height={36} />
          </div>
        </div>
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-label">Win Rate</div>
          <div className="dashboard-kpi-value">{winRate}%</div>
          <div className="dashboard-kpi-sub">{totalTrades} trades</div>
          <div className="dashboard-kpi-gauge">
            <div className="dashboard-gauge-track">
              <div className="dashboard-gauge-fill" style={{ width: `${winRate}%` }}></div>
            </div>
          </div>
        </div>
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-label">Profit Factor</div>
          <div className="dashboard-kpi-value">{profitFactor}</div>
          <div className="dashboard-kpi-sub">Even</div>
        </div>
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-label">Account Balance</div>
          <div className="dashboard-kpi-value">
            ₹{(accountBalance / 1000).toFixed(1)}K
          </div>
          <div className="dashboard-kpi-sub">Current balance</div>
          <div className="dashboard-kpi-sparkline">
            <CumulativeChart points={series.slice(-14)} width={120} height={36} />
          </div>
        </div>
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-label">Risk : Reward</div>
          <div className="dashboard-kpi-value">{riskRewardStr}</div>
          <div className="dashboard-kpi-sub">
            <span className="positive">+4078</span> <span className="negative">-1631</span>
          </div>
        </div>
      </div>

      <div className="dashboard-charts-row">
        <div className="dashboard-card dashboard-card-score">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">AI Performance Score</h3>
          </div>
          <div className="dashboard-radar-wrap">
            <div className="dashboard-radar-placeholder">
              <span className="dashboard-ai-score-label">AI Score</span>
              <span className="dashboard-ai-score-value">33.77</span>
            </div>
            <div className="dashboard-score-bar">
              <div className="dashboard-score-fill" style={{ width: '34%' }}></div>
            </div>
          </div>
        </div>
        <div className="dashboard-card dashboard-card-chart">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Net Cumulative P&L</h3>
          </div>
          <div className="dashboard-chart-wrap">
            <CumulativeChart points={series} width={chartW} height={chartH} />
          </div>
          <div className="dashboard-chart-labels">
            {series.length ? (
              <>
                <span>{series[0].date}</span>
                <span>{series[series.length - 1].date}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="dashboard-card dashboard-card-chart">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Daily & Cumulative Net P&L</h3>
          </div>
          <div className="dashboard-chart-wrap">
            <DailyCumulativeChart points={series} width={chartW} height={chartH} />
          </div>
          <div className="dashboard-chart-labels">
            {series.length ? (
              <>
                <span>{series[0].date.slice(5)}</span>
                <span>{series[series.length - 1].date.slice(5)}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="dashboard-market-row">
        <div className="dashboard-card market-data-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Top Gainers / Losers</h3>
            <div className="market-data-controls">
              <select
                className="market-data-select"
                value={gainersDataType}
                onChange={(e) => setGainersDataType(e.target.value as GainersLosersDataType)}
                aria-label="Data type"
              >
                <option value="PercPriceGainers">Price Gainers</option>
                <option value="PercPriceLosers">Price Losers</option>
                <option value="PercOIGainers">OI Gainers</option>
                <option value="PercOILosers">OI Losers</option>
              </select>
              <select
                className="market-data-select"
                value={gainersExpiry}
                onChange={(e) => setGainersExpiry(e.target.value as GainersLosersExpiryType)}
                aria-label="Expiry"
              >
                <option value="NEAR">NEAR</option>
                <option value="NEXT">NEXT</option>
                <option value="FAR">FAR</option>
              </select>
            </div>
          </div>
          <div className="market-data-table-wrap">
            <table className="market-data-table">
              <thead>
                <tr>
                  <th className="market-data-th">Symbol</th>
                  <th className="market-data-th">% Chg</th>
                  <th className="market-data-th">OI</th>
                </tr>
              </thead>
              <tbody>
                {gainersLosersData.slice(0, 10).map((r, i) => {
                  const pct = r.percentChange
                  const pctClass = pct >= 0 ? 'positive' : 'negative'
                  const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'
                  return (
                    <tr key={i} className="market-data-tr">
                      <td className="market-data-td">{r.tradingSymbol}</td>
                      <td className={`market-data-td ${pctClass}`}>{pctStr}</td>
                      <td className="market-data-td market-data-td-muted">
                        {Number(r.opnInterest).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="dashboard-card market-data-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">PCR (Put-Call Ratio)</h3>
          </div>
          <div className="market-data-table-wrap">
            <table className="market-data-table">
              <thead>
                <tr>
                  <th className="market-data-th">Symbol</th>
                  <th className="market-data-th">PCR</th>
                </tr>
              </thead>
              <tbody>
                {pcrData.slice(0, 12).map((r, i) => (
                  <tr key={i} className="market-data-tr">
                    <td className="market-data-td">{r.tradingSymbol}</td>
                    <td className="market-data-td market-data-pcr">{r.pcr.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="dashboard-card market-data-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">OI Buildup</h3>
            <div className="market-data-controls">
              <select
                className="market-data-select"
                value={oiBuildupDataType}
                onChange={(e) => setOiBuildupDataType(e.target.value as OIBuildupDataType)}
                aria-label="Data type"
              >
                <option value="Long Built Up">Long Built Up</option>
                <option value="Short Built Up">Short Built Up</option>
                <option value="Short Covering">Short Covering</option>
                <option value="Long Unwinding">Long Unwinding</option>
              </select>
              <select
                className="market-data-select"
                value={oiBuildupExpiry}
                onChange={(e) => setOiBuildupExpiry(e.target.value as OIBuildupExpiryType)}
                aria-label="Expiry"
              >
                <option value="NEAR">NEAR</option>
                <option value="NEXT">NEXT</option>
                <option value="FAR">FAR</option>
              </select>
            </div>
          </div>
          <div className="market-data-table-wrap">
            <table className="market-data-table">
              <thead>
                <tr>
                  <th className="market-data-th">Symbol</th>
                  <th className="market-data-th">LTP</th>
                  <th className="market-data-th">% Chg</th>
                  <th className="market-data-th">OI</th>
                </tr>
              </thead>
              <tbody>
                {oiBuildupData.slice(0, 10).map((r, i) => {
                  const pct = Number(r.percentChange)
                  const pctClass = pct >= 0 ? 'positive' : 'negative'
                  const pctStr = (pct >= 0 ? '+' : '') + r.percentChange + '%'
                  return (
                    <tr key={i} className="market-data-tr">
                      <td className="market-data-td">{r.tradingSymbol}</td>
                      <td className="market-data-td">{r.ltp}</td>
                      <td className={`market-data-td ${pctClass}`}>{pctStr}</td>
                      <td className="market-data-td market-data-td-muted">
                        {Number(r.opnInterest).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dashboard-bottom-row">
        <div className="dashboard-card dashboard-card-wide">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Recent Trades</h3>
            <span className="dashboard-sync-badge">
              {recentTrades.length} trades synced today
            </span>
          </div>
          <div className="dashboard-recent-table-wrap">
            <table className="dashboard-recent-table">
              <thead>
                <tr>
                  <th className="dashboard-recent-th">DATE</th>
                  <th className="dashboard-recent-th">SYMBOL</th>
                  <th className="dashboard-recent-th">P&L</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t, i) => {
                  const date = t.filltime || '-'
                  const value = Number(t.tradevalue)
                  const pnlClass = value >= 0 ? 'positive' : 'negative'
                  const pnlStr = value >= 0 ? `+₹${value.toFixed(2)}` : `₹${value.toFixed(2)}`
                  return (
                    <tr key={i} className="dashboard-recent-tr">
                      <td className="dashboard-recent-td">{date}</td>
                      <td className="dashboard-recent-td">{t.tradingsymbol}</td>
                      <td className={`dashboard-recent-td ${pnlClass}`}>{pnlStr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-card dashboard-card-calculator">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Brokerage Calculator</h3>
          </div>
          <div className="brokerage-calc">
            <div className="brokerage-form">
              <div className="brokerage-row">
                <label className="brokerage-label">Symbol</label>
                <input
                  type="text"
                  className="brokerage-input"
                  placeholder="e.g. SBIN-EQ"
                  value={brokerageCalc.symbol}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, symbol: e.target.value })}
                />
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Token</label>
                <input
                  type="text"
                  className="brokerage-input"
                  placeholder="e.g. 3045"
                  value={brokerageCalc.token}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, token: e.target.value })}
                />
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Exchange</label>
                <select
                  className="brokerage-input"
                  value={brokerageCalc.exchange}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, exchange: e.target.value })}
                >
                  <option value="NSE">NSE</option>
                  <option value="BSE">BSE</option>
                </select>
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Product</label>
                <select
                  className="brokerage-input"
                  value={brokerageCalc.product}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, product: e.target.value })}
                >
                  <option value="DELIVERY">DELIVERY</option>
                  <option value="INTRADAY">INTRADAY</option>
                  <option value="MARGIN">MARGIN</option>
                </select>
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Transaction</label>
                <select
                  className="brokerage-input"
                  value={brokerageCalc.transaction}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, transaction: e.target.value })}
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Quantity</label>
                <input
                  type="number"
                  className="brokerage-input"
                  placeholder="10"
                  min="1"
                  value={brokerageCalc.quantity}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, quantity: e.target.value })}
                />
              </div>
              <div className="brokerage-row">
                <label className="brokerage-label">Price (₹)</label>
                <input
                  type="number"
                  className="brokerage-input"
                  placeholder="800"
                  min="0"
                  step="0.01"
                  value={brokerageCalc.price}
                  onChange={(e) => setBrokerageCalc({ ...brokerageCalc, price: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="brokerage-btn-calc"
                onClick={handleBrokerageCalc}
              >
                Calculate Charges
              </button>
            </div>
            <div className="brokerage-result">
              {!brokerageResult ? (
                <div className="brokerage-result-placeholder">
                  Enter details and click Calculate.
                </div>
              ) : (
                <div className="brokerage-result-content">
                  <div className="brokerage-total">
                    <span>Total Charges</span>
                    <strong>₹{brokerageResult.total_charges.toFixed(2)}</strong>
                  </div>
                  <div className="brokerage-trade-value">
                    <span>Trade Value</span>
                    <span>₹{brokerageResult.trade_value.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="brokerage-breakup">
                    {brokerageResult.breakup
                      .filter((b: any) => b.amount > 0 || (b.breakup && b.breakup.length > 0))
                      .map((b: any, i: number) => (
                        <React.Fragment key={i}>
                          <div className="brokerage-breakup-item">
                            <span>{b.name}</span>
                            <span>₹{b.amount.toFixed(2)}</span>
                          </div>
                          {b.breakup && b.breakup.length > 0
                            ? b.breakup.map((s: any, j: number) => (
                                <div key={j} className="brokerage-breakup-sub">
                                  <span>{s.name}</span>
                                  <span>₹{s.amount.toFixed(2)}</span>
                                </div>
                              ))
                            : null}
                        </React.Fragment>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

