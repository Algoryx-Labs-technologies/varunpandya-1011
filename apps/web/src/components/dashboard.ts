import { escapeHtml } from '../utils/html'
import { getGreeting, formatDateLong } from '../utils/format'
import { getCumulativePnLSeries, type DailyPnLPoint } from '../data/dashboard'
import type { TradeBookItem } from '../types/tradeBook'
import type { GainersLosersItem, PCRItem, OIBuildupItem } from '../types/dashboard'

function svgPathFromSeries(points: DailyPnLPoint[], width: number, height: number, isCumulative: true): string
function svgPathFromSeries(points: DailyPnLPoint[], width: number, height: number, isCumulative: false): string
function svgPathFromSeries(
  points: DailyPnLPoint[],
  width: number,
  height: number,
  isCumulative: boolean
): string {
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

function renderCumulativeChart(points: DailyPnLPoint[], width: number, height: number): string {
  const pathD = svgPathFromSeries(points, width, height, true)
  const lastVal = points[points.length - 1]?.cumulativePnL ?? 0
  const fillColor = lastVal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
  return `
    <svg class="dashboard-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="cumulativeGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="${fillColor}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${fillColor}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path fill="none" stroke="${fillColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="${pathD}"/>
      <path fill="url(#cumulativeGrad)" d="${pathD} L ${width - 4} ${height - 4} L 4 ${height - 4} Z"/>
    </svg>
  `
}

function renderDailyCumulativeChart(points: DailyPnLPoint[], width: number, height: number): string {
  const lineD = svgPathFromSeries(points, width, height, true)
  const lastCum = points[points.length - 1]?.cumulativePnL ?? 0
  const lineColor = lastCum >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)'
  const barW = Math.max(2, (width - 8) / points.length - 2)
  const maxAbs = Math.max(...points.map((p) => Math.abs(p.dailyPnL)), 1)
  const bars = points
    .map((p, i) => {
      const x = 4 + i * ((width - 8) / points.length)
      const barH = (Math.abs(p.dailyPnL) / maxAbs) * (height * 0.4)
      const y = p.dailyPnL >= 0 ? height - 4 - barH : height - 4
      const fill = p.dailyPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
      return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${fill}" opacity="0.85"/>`
    })
    .join('')
  return `
    <svg class="dashboard-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      ${bars}
      <path fill="none" stroke="${lineColor}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" d="${lineD}" opacity="0.9"/>
    </svg>
  `
}

function renderRecentTradesRows(trades: TradeBookItem[]): string {
  return trades
    .slice(0, 10)
    .map((t) => {
      const date = t.filltime || '-'
      const symbol = escapeHtml(t.tradingsymbol)
      const value = Number(t.tradevalue)
      const pnlClass = value >= 0 ? 'positive' : 'negative'
      const pnlStr = value >= 0 ? `+₹${value.toFixed(2)}` : `₹${value.toFixed(2)}`
      return `
        <tr class="dashboard-recent-tr">
          <td class="dashboard-recent-td">${date}</td>
          <td class="dashboard-recent-td">${symbol}</td>
          <td class="dashboard-recent-td ${pnlClass}">${pnlStr}</td>
        </tr>
      `
    })
    .join('')
}

function renderGainersLosersRows(items: GainersLosersItem[]): string {
  return items.slice(0, 10).map((r) => {
    const pct = r.percentChange
    const pctClass = pct >= 0 ? 'positive' : 'negative'
    const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'
    return `
      <tr class="market-data-tr">
        <td class="market-data-td">${escapeHtml(r.tradingSymbol)}</td>
        <td class="market-data-td ${pctClass}">${pctStr}</td>
        <td class="market-data-td market-data-td-muted">${Number(r.opnInterest).toLocaleString('en-IN')}</td>
      </tr>
    `
  }).join('')
}

function renderPCRRows(items: PCRItem[]): string {
  return items.slice(0, 12).map((r) => `
    <tr class="market-data-tr">
      <td class="market-data-td">${escapeHtml(r.tradingSymbol)}</td>
      <td class="market-data-td market-data-pcr">${r.pcr.toFixed(2)}</td>
    </tr>
  `).join('')
}

function renderOIBuildupRows(items: OIBuildupItem[]): string {
  return items.slice(0, 10).map((r) => {
    const pct = Number(r.percentChange)
    const pctClass = pct >= 0 ? 'positive' : 'negative'
    const pctStr = (pct >= 0 ? '+' : '') + r.percentChange + '%'
    return `
      <tr class="market-data-tr">
        <td class="market-data-td">${escapeHtml(r.tradingSymbol)}</td>
        <td class="market-data-td">${escapeHtml(r.ltp)}</td>
        <td class="market-data-td ${pctClass}">${pctStr}</td>
        <td class="market-data-td market-data-td-muted">${Number(r.opnInterest).toLocaleString('en-IN')}</td>
      </tr>
    `
  }).join('')
}

export function renderDashboard(
  options: {
    userName?: string
    dateStr?: string
    greeting?: string
    todayPnL?: number
    todayTrades?: number
    todayWins?: number
    monthlyPnL?: number
    netPnL?: number
    netPnLPercent?: number
    winRate?: number
    totalTrades?: number
    profitFactor?: number
    accountBalance?: number
    riskRewardStr?: string
    pnlSeries?: DailyPnLPoint[]
    recentTrades?: TradeBookItem[]
  } = {}
): string {
  const {
    userName = 'Trader',
    dateStr = formatDateLong(new Date()),
    greeting = getGreeting(),
    todayPnL = -1099,
    todayTrades = 3,
    todayWins = 2,
    monthlyPnL = 2345,
    netPnL = 7958,
    netPnLPercent = 2.4,
    winRate = 44.6,
    totalTrades = 83,
    profitFactor = 1.33,
    accountBalance = 234700,
    riskRewardStr = '1:1.65',
    pnlSeries = [],
    recentTrades = [],
  } = options

  const chartW = 400
  const chartH = 140
  const series = pnlSeries.length ? pnlSeries : getCumulativePnLSeries(30)

  const todayPnLClass = todayPnL >= 0 ? 'positive' : 'negative'
  const monthlyPnLClass = monthlyPnL >= 0 ? 'positive' : 'negative'
  const netPnLClass = netPnL >= 0 ? 'positive' : 'negative'

  return `
    <div class="page-content page-content-dashboard">
      <div class="dashboard-top-bar">
        <div class="dashboard-monthly-pnl">
          <span class="dashboard-monthly-label">Monthly P&L</span>
          <span class="dashboard-monthly-value ${monthlyPnLClass}">${monthlyPnL >= 0 ? '+' : ''}₹${Math.abs(monthlyPnL).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div class="dashboard-hero">
        <div class="dashboard-hero-left">
          <p class="dashboard-date">${escapeHtml(dateStr)}</p>
          <h1 class="dashboard-greeting">${escapeHtml(greeting)}, <span class="dashboard-greeting-name" id="dashboard-user-name">${escapeHtml(userName)}</span></h1>
          <p class="dashboard-message">Stay focused. Every trade is a learning opportunity.</p>
        </div>
        <div class="dashboard-hero-right">
          <div class="dashboard-daily-summary">
            <div class="dashboard-daily-item">
              <span class="dashboard-daily-label">TODAY'S P&L</span>
              <span class="dashboard-daily-value ${todayPnLClass}" id="dashboard-today-pnl">${todayPnL >= 0 ? '+' : ''}₹${Math.abs(todayPnL).toLocaleString('en-IN')}</span>
            </div>
            <div class="dashboard-daily-item">
              <span class="dashboard-daily-label">TRADES</span>
              <span class="dashboard-daily-value" id="dashboard-today-trades">${todayTrades}</span>
            </div>
            <div class="dashboard-daily-item">
              <span class="dashboard-daily-label">WINS</span>
              <span class="dashboard-daily-value" id="dashboard-today-wins">${todayWins}</span>
            </div>
          </div>
          <div class="dashboard-tabs">
            <button type="button" class="dashboard-tab active" data-tab="live">Live Trading</button>
            <button type="button" class="dashboard-tab" data-tab="prop">Prop Firm</button>
          </div>
          <div class="dashboard-actions">
            <button type="button" class="dashboard-btn-secondary">Tour</button>
            <select class="dashboard-select" id="dashboard-period" aria-label="Period">
              <option value="7">Last 7 Days</option>
              <option value="30" selected>Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <button type="button" class="dashboard-btn-secondary">Customize</button>
          </div>
        </div>
      </div>

      <div class="dashboard-kpi-grid">
        <div class="dashboard-kpi-card">
          <div class="dashboard-kpi-label">Net P&L</div>
          <div class="dashboard-kpi-value ${netPnLClass}" id="dashboard-net-pnl">₹${netPnL.toLocaleString('en-IN')}</div>
          <div class="dashboard-kpi-sub ${netPnLClass}">+${netPnLPercent}% return</div>
          <div class="dashboard-kpi-sparkline">${renderCumulativeChart(series.slice(-14), 120, 36)}</div>
        </div>
        <div class="dashboard-kpi-card">
          <div class="dashboard-kpi-label">Win Rate</div>
          <div class="dashboard-kpi-value" id="dashboard-win-rate">${winRate}%</div>
          <div class="dashboard-kpi-sub">${totalTrades} trades</div>
          <div class="dashboard-kpi-gauge">
            <div class="dashboard-gauge-track"><div class="dashboard-gauge-fill" style="width: ${winRate}%"></div></div>
          </div>
        </div>
        <div class="dashboard-kpi-card">
          <div class="dashboard-kpi-label">Profit Factor</div>
          <div class="dashboard-kpi-value" id="dashboard-profit-factor">${profitFactor}</div>
          <div class="dashboard-kpi-sub">Even</div>
        </div>
        <div class="dashboard-kpi-card">
          <div class="dashboard-kpi-label">Account Balance</div>
          <div class="dashboard-kpi-value" id="dashboard-balance">₹${(accountBalance / 1000).toFixed(1)}K</div>
          <div class="dashboard-kpi-sub">Current balance</div>
          <div class="dashboard-kpi-sparkline">${renderCumulativeChart(series.slice(-14), 120, 36)}</div>
        </div>
        <div class="dashboard-kpi-card">
          <div class="dashboard-kpi-label">Risk : Reward</div>
          <div class="dashboard-kpi-value" id="dashboard-risk-reward">${riskRewardStr}</div>
          <div class="dashboard-kpi-sub"><span class="positive">+4078</span> <span class="negative">-1631</span></div>
        </div>
      </div>

      <div class="dashboard-charts-row">
        <div class="dashboard-card dashboard-card-score">
          <div class="dashboard-card-header">
            <h3 class="dashboard-card-title">AI Performance Score</h3>
          </div>
          <div class="dashboard-radar-wrap">
            <div class="dashboard-radar-placeholder">
              <span class="dashboard-ai-score-label">AI Score</span>
              <span class="dashboard-ai-score-value" id="dashboard-ai-score">33.77</span>
            </div>
            <div class="dashboard-score-bar"><div class="dashboard-score-fill" style="width: 34%"></div></div>
          </div>
        </div>
        <div class="dashboard-card dashboard-card-chart">
          <div class="dashboard-card-header">
            <h3 class="dashboard-card-title">Net Cumulative P&L</h3>
          </div>
          <div class="dashboard-chart-wrap" id="dashboard-cumulative-chart">
            ${renderCumulativeChart(series, chartW, chartH)}
          </div>
          <div class="dashboard-chart-labels" id="dashboard-cumulative-labels">
            ${series.length ? `<span>${series[0].date}</span><span>${series[series.length - 1].date}</span>` : ''}
          </div>
        </div>
        <div class="dashboard-card dashboard-card-chart">
          <div class="dashboard-card-header">
            <h3 class="dashboard-card-title">Daily & Cumulative Net P&L</h3>
          </div>
          <div class="dashboard-chart-wrap" id="dashboard-daily-chart">
            ${renderDailyCumulativeChart(series, chartW, chartH)}
          </div>
          <div class="dashboard-chart-labels">
            ${series.length ? `<span>${series[0].date.slice(5)}</span><span>${series[series.length - 1].date.slice(5)}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="dashboard-market-row">
        <div class="dashboard-card market-data-card">
          <div class="dashboard-card-header">
            <h3 class="dashboard-card-title">Top Gainers / Losers</h3>
            <div class="market-data-controls">
              <select class="market-data-select" id="gainers-datatype" aria-label="Data type">
                <option value="PercPriceGainers">Price Gainers</option>
                <option value="PercPriceLosers">Price Losers</option>
                <option value="PercOIGainers">OI Gainers</option>
                <option value="PercOILosers">OI Losers</option>
              </select>
              <select class="market-data-select" id="gainers-expiry" aria-label="Expiry">
                <option value="NEAR">NEAR</option>
                <option value="NEXT">NEXT</option>
                <option value="FAR">FAR</option>
              </select>
            </div>
          </div>
          <div class="market-data-table-wrap">
            <table class="market-data-table">
              <thead><tr><th class="market-data-th">Symbol</th><th class="market-data-th">% Chg</th><th class="market-data-th">OI</th></tr></thead>
              <tbody id="gainers-losers-tbody">${renderGainersLosersRows([])}</tbody>
            </table>
          </div>
        </div>
        <div class="dashboard-card market-data-card">
          <div class="dashboard-card-header">
            <h3 class="dashboard-card-title">PCR (Put-Call Ratio)</h3>
          </div>
          <div class="market-data-table-wrap">
            <table class="market-data-table">
              <thead><tr><th class="market-data-th">Symbol</th><th class="market-data-th">PCR</th></tr></thead>
              <tbody id="pcr-tbody">${renderPCRRows([])}</tbody>
            </table>
          </div>
        </div>
        <div class="dashboard-card market-data-card">
          <div class="dashboard-card-header">
            <h3 class="dashboard-card-title">OI Buildup</h3>
            <div class="market-data-controls">
              <select class="market-data-select" id="oibuildup-datatype" aria-label="Data type">
                <option value="Long Built Up">Long Built Up</option>
                <option value="Short Built Up">Short Built Up</option>
                <option value="Short Covering">Short Covering</option>
                <option value="Long Unwinding">Long Unwinding</option>
              </select>
              <select class="market-data-select" id="oibuildup-expiry" aria-label="Expiry">
                <option value="NEAR">NEAR</option>
                <option value="NEXT">NEXT</option>
                <option value="FAR">FAR</option>
              </select>
            </div>
          </div>
          <div class="market-data-table-wrap">
            <table class="market-data-table">
              <thead><tr><th class="market-data-th">Symbol</th><th class="market-data-th">LTP</th><th class="market-data-th">% Chg</th><th class="market-data-th">OI</th></tr></thead>
              <tbody id="oibuildup-tbody">${renderOIBuildupRows([])}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="dashboard-bottom-row">
        <div class="dashboard-card dashboard-card-wide">
          <div class="dashboard-card-header">
            <h3 class="dashboard-card-title">Recent Trades</h3>
            <span class="dashboard-sync-badge" id="dashboard-sync-badge">0 trades synced today</span>
          </div>
          <div class="dashboard-recent-table-wrap">
            <table class="dashboard-recent-table">
              <thead><tr><th class="dashboard-recent-th">DATE</th><th class="dashboard-recent-th">SYMBOL</th><th class="dashboard-recent-th">P&L</th></tr></thead>
              <tbody id="dashboard-recent-tbody">${renderRecentTradesRows(recentTrades)}</tbody>
            </table>
          </div>
        </div>

        <div class="dashboard-card dashboard-card-calculator">
          <div class="dashboard-card-header">
            <h3 class="dashboard-card-title">Brokerage Calculator</h3>
          </div>
          <div class="brokerage-calc">
            <div class="brokerage-form">
              <div class="brokerage-row">
                <label class="brokerage-label">Symbol</label>
                <input type="text" class="brokerage-input" id="brokerage-symbol" placeholder="e.g. SBIN-EQ" />
              </div>
              <div class="brokerage-row">
                <label class="brokerage-label">Token</label>
                <input type="text" class="brokerage-input" id="brokerage-token" placeholder="e.g. 3045" />
              </div>
              <div class="brokerage-row">
                <label class="brokerage-label">Exchange</label>
                <select class="brokerage-input" id="brokerage-exchange"><option value="NSE">NSE</option><option value="BSE">BSE</option></select>
              </div>
              <div class="brokerage-row">
                <label class="brokerage-label">Product</label>
                <select class="brokerage-input" id="brokerage-product"><option value="DELIVERY">DELIVERY</option><option value="INTRADAY">INTRADAY</option><option value="MARGIN">MARGIN</option></select>
              </div>
              <div class="brokerage-row">
                <label class="brokerage-label">Transaction</label>
                <select class="brokerage-input" id="brokerage-transaction"><option value="BUY">BUY</option><option value="SELL">SELL</option></select>
              </div>
              <div class="brokerage-row">
                <label class="brokerage-label">Quantity</label>
                <input type="number" class="brokerage-input" id="brokerage-quantity" placeholder="10" min="1" />
              </div>
              <div class="brokerage-row">
                <label class="brokerage-label">Price (₹)</label>
                <input type="number" class="brokerage-input" id="brokerage-price" placeholder="800" min="0" step="0.01" />
              </div>
              <button type="button" class="brokerage-btn-calc" id="brokerage-calc-btn">Calculate Charges</button>
            </div>
            <div class="brokerage-result" id="brokerage-result">
              <div class="brokerage-result-placeholder" id="brokerage-result-placeholder">Enter details and click Calculate.</div>
              <div class="brokerage-result-content" id="brokerage-result-content" hidden>
                <div class="brokerage-total">
                  <span>Total Charges</span>
                  <strong id="brokerage-total-charges">₹0.00</strong>
                </div>
                <div class="brokerage-trade-value">
                  <span>Trade Value</span>
                  <span id="brokerage-trade-value">₹0</span>
                </div>
                <div class="brokerage-breakup" id="brokerage-breakup"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

export function initDashboard(): void {
  const nameEl = document.getElementById('dashboard-user-name')
  const balanceEl = document.getElementById('dashboard-balance')
  const netPnLEl = document.getElementById('dashboard-net-pnl')
  const todayPnLEl = document.getElementById('dashboard-today-pnl')
  const todayTradesEl = document.getElementById('dashboard-today-trades')
  const todayWinsEl = document.getElementById('dashboard-today-wins')
  const recentTbody = document.getElementById('dashboard-recent-tbody')
  const syncBadge = document.getElementById('dashboard-sync-badge')

  Promise.all([
    import('../data/dashboard').then((m) => m.getProfile()),
    import('../data/dashboard').then((m) => m.getRMSLimit()),
    import('../data/dashboard').then((m) => m.getAllHolding()),
    import('../data/dashboard').then((m) => m.getTradeBook()),
  ]).then(([profile, rms, holding, tradeBook]) => {
    if (profile?.data?.name && nameEl) nameEl.textContent = profile.data.name
    if (rms?.data?.net && balanceEl) {
      const net = Number(rms.data.net)
      balanceEl.textContent = net >= 1000 ? `₹${(net / 1000).toFixed(1)}K` : `₹${net}`
    }
    if (holding?.data?.totalholding) {
      const th = holding.data.totalholding
      if (netPnLEl) {
        const pnl = th.totalprofitandloss
        netPnLEl.textContent = `₹${(pnl >= 0 ? pnl : -pnl).toLocaleString('en-IN')}`
        netPnLEl.classList.toggle('positive', pnl >= 0)
        netPnLEl.classList.toggle('negative', pnl < 0)
      }
    }
    if (tradeBook?.data?.length) {
      const trades = tradeBook.data
      if (todayTradesEl) todayTradesEl.textContent = String(trades.length)
      const wins = trades.filter((t) => Number(t.tradevalue) > 0 && t.transactiontype === 'SELL').length
      if (todayWinsEl) todayWinsEl.textContent = String(wins)
      const todayPnL = trades.reduce((sum, t) => sum + Number(t.tradevalue) * (t.transactiontype === 'SELL' ? 1 : -1), 0)
      if (todayPnLEl) {
        todayPnLEl.textContent = (todayPnL >= 0 ? '+' : '') + `₹${Math.round(todayPnL).toLocaleString('en-IN')}`
        todayPnLEl.classList.toggle('positive', todayPnL >= 0)
        todayPnLEl.classList.toggle('negative', todayPnL < 0)
      }
      if (recentTbody) recentTbody.innerHTML = renderRecentTradesRows(trades)
      if (syncBadge) syncBadge.textContent = `${trades.length} trades synced today`
    }
  }).catch(() => {})

  document.querySelectorAll('.dashboard-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dashboard-tab').forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
    })
  })

  const periodSelect = document.getElementById('dashboard-period')
  const cumulativeChartWrap = document.getElementById('dashboard-cumulative-chart')
  const dailyChartWrap = document.getElementById('dashboard-daily-chart')
  const chartW = 400
  const chartH = 140
  function updateCharts(days: number) {
    const series = getCumulativePnLSeries(days)
    if (cumulativeChartWrap) cumulativeChartWrap.innerHTML = renderCumulativeChart(series, chartW, chartH)
    if (dailyChartWrap) dailyChartWrap.innerHTML = renderDailyCumulativeChart(series, chartW, chartH)
  }
  if (periodSelect) {
    periodSelect.addEventListener('change', () => {
      const days = Number((periodSelect as HTMLSelectElement).value) || 30
      updateCharts(days)
    })
  }

  function loadGainersLosers() {
    const datatype = (document.getElementById('gainers-datatype') as HTMLSelectElement)?.value as import('../types/dashboard').GainersLosersDataType
    const expiry = (document.getElementById('gainers-expiry') as HTMLSelectElement)?.value as import('../types/dashboard').GainersLosersExpiryType
    const tbody = document.getElementById('gainers-losers-tbody')
    if (!tbody) return
    import('../data/dashboard').then((m) => m.getGainersLosers(datatype, expiry)).then((res) => {
      if (res?.data) tbody.innerHTML = renderGainersLosersRows(res.data)
    }).catch(() => {})
  }
  function loadPCR() {
    const tbody = document.getElementById('pcr-tbody')
    if (!tbody) return
    import('../data/dashboard').then((m) => m.getPutCallRatio()).then((res) => {
      if (res?.data) tbody.innerHTML = renderPCRRows(res.data)
    }).catch(() => {})
  }
  function loadOIBuildup() {
    const datatype = (document.getElementById('oibuildup-datatype') as HTMLSelectElement)?.value as import('../types/dashboard').OIBuildupDataType
    const expiry = (document.getElementById('oibuildup-expiry') as HTMLSelectElement)?.value as import('../types/dashboard').OIBuildupExpiryType
    const tbody = document.getElementById('oibuildup-tbody')
    if (!tbody) return
    import('../data/dashboard').then((m) => m.getOIBuildup(expiry, datatype)).then((res) => {
      if (res?.data) tbody.innerHTML = renderOIBuildupRows(res.data)
    }).catch(() => {})
  }
  loadGainersLosers()
  loadPCR()
  loadOIBuildup()
  document.getElementById('gainers-datatype')?.addEventListener('change', loadGainersLosers)
  document.getElementById('gainers-expiry')?.addEventListener('change', loadGainersLosers)
  document.getElementById('oibuildup-datatype')?.addEventListener('change', loadOIBuildup)
  document.getElementById('oibuildup-expiry')?.addEventListener('change', loadOIBuildup)

  const calcBtn = document.getElementById('brokerage-calc-btn')
  const placeholder = document.getElementById('brokerage-result-placeholder')
  const resultContent = document.getElementById('brokerage-result-content')
  const totalChargesEl = document.getElementById('brokerage-total-charges')
  const tradeValueEl = document.getElementById('brokerage-trade-value')
  const breakupEl = document.getElementById('brokerage-breakup')

  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      const symbol = (document.getElementById('brokerage-symbol') as HTMLInputElement)?.value?.trim()
      const token = (document.getElementById('brokerage-token') as HTMLInputElement)?.value?.trim()
      const exchange = (document.getElementById('brokerage-exchange') as HTMLSelectElement)?.value || 'NSE'
      const product = (document.getElementById('brokerage-product') as HTMLSelectElement)?.value || 'DELIVERY'
      const transaction = (document.getElementById('brokerage-transaction') as HTMLSelectElement)?.value || 'BUY'
      const qty = (document.getElementById('brokerage-quantity') as HTMLInputElement)?.value
      const price = (document.getElementById('brokerage-price') as HTMLInputElement)?.value
      if (!symbol || !token || !qty || !price || Number(qty) < 1 || Number(price) <= 0) {
        return
      }
      import('../data/dashboard').then((m) =>
        m.estimateCharges([{ product_type: product, transaction_type: transaction, quantity: qty, price, exchange, symbol_name: symbol, token }])
      ).then((res) => {
        if (!res?.data?.summary || !placeholder || !resultContent || !totalChargesEl || !tradeValueEl || !breakupEl) return
        placeholder.hidden = true
        resultContent.hidden = false
        totalChargesEl.textContent = `₹${res.data.summary.total_charges.toFixed(2)}`
        tradeValueEl.textContent = `₹${res.data.summary.trade_value.toLocaleString('en-IN')}`
        const breakupHtml = res.data.summary.breakup
          .filter((b) => b.amount > 0 || (b.breakup && b.breakup.length > 0))
          .map((b) => {
            const subHtml = b.breakup && b.breakup.length
              ? b.breakup.map((s) => `<div class="brokerage-breakup-sub"><span>${escapeHtml(s.name)}</span><span>₹${s.amount.toFixed(2)}</span></div>`).join('')
              : ''
            return `<div class="brokerage-breakup-item"><span>${escapeHtml(b.name)}</span><span>₹${b.amount.toFixed(2)}</span></div>${subHtml}`
          })
          .join('')
        breakupEl.innerHTML = breakupHtml
      }).catch(() => {})
    })
  }
}
