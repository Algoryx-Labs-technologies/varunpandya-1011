import { getOptionChainData, getCurrentNiftyPrice } from '../data/optionChain'
import { getStrategyLogBarData } from '../data/strategyLogBars'
import { renderOptionChainTable } from './optionChainTable'
import { escapeHtml } from '../utils/html'

function renderOpenInterestBars() {
  const data = getStrategyLogBarData()
  const maxVal = Math.max(...data.flatMap((d) => [d.callOi, d.putOi]), 1)
  return data
    .map(
      (d) => `
    <div class="oi-bar-group">
      <div class="oi-bar oi-call" style="height: ${(d.callOi / maxVal) * 100}%"></div>
      <div class="oi-bar oi-put" style="height: ${(d.putOi / maxVal) * 100}%"></div>
      <span class="oi-bar-label">${escapeHtml(d.label)}</span>
    </div>
  `
    )
    .join('')
}

export function renderTrading() {
  const niftyPrice = getCurrentNiftyPrice().toLocaleString('en-IN')
  return `
    <div class="page-content page-content-terminal">
      <!-- Top bar: widget tabs with X + indices band + P&L + icons -->
      <div class="terminal-bar">
        <div class="terminal-widgets-row">
          <span class="terminal-id" id="terminal-time">15:20:41</span>
          <div class="terminal-widget-tabs">
            <span class="terminal-widget-tab">Market Watch<button type="button" class="terminal-widget-close" aria-label="Close">×</button></span>
            <span class="terminal-widget-tab">Scalper Zone<button type="button" class="terminal-widget-close" aria-label="Close">×</button></span>
            <span class="terminal-widget-tab">SectoralIndexes<button type="button" class="terminal-widget-close" aria-label="Close">×</button></span>
            <span class="terminal-widget-tab">Straddle<button type="button" class="terminal-widget-close" aria-label="Close">×</button></span>
            <span class="terminal-widget-tab">Charts<button type="button" class="terminal-widget-close" aria-label="Close">×</button></span>
            <span class="terminal-widget-tab terminal-widget-pnl">P&L ₹0.00<button type="button" class="terminal-widget-close" aria-label="Close">×</button></span>
            <span class="terminal-widget-tab">+ Widgets<button type="button" class="terminal-widget-close" aria-label="Close">×</button></span>
          </div>
          <div class="terminal-bar-icons">
            <button type="button" class="terminal-icon-btn" aria-label="User">👤</button>
            <button type="button" class="terminal-icon-btn" aria-label="Settings">⚙</button>
          </div>
        </div>
        <div class="terminal-indices-row">
          <span class="terminal-index-item"><strong>BANKNIFTY</strong> 55,481.85 334.25 (0.61%) <span class="terminal-arrow positive">▲</span></span>
          <span class="terminal-index-item"><strong>MIDCPNIFTY</strong> 13,151.10 4.55 (0.03%) <span class="terminal-arrow positive">▲</span></span>
          <span class="terminal-index-item"><strong>FINNIFTY</strong> 26,555.10 59.80 (0.23%) <span class="terminal-arrow positive">▲</span></span>
          <span class="terminal-index-item"><strong>BANKEX</strong> 62,429.63 467.75 (0.75%) <span class="terminal-arrow positive">▲</span></span>
          <span class="terminal-index-item"><strong>NIFTY NEXT 50</strong> 69,146.60 145.×</span>
        </div>
      </div>

      <div class="trading-terminal-layout">
        <!-- Left: Chart panel with toolbar -->
        <div class="terminal-panel chart-panel">
          <div class="terminal-panel-header">
            <h3 class="terminal-panel-title">Chart</h3>
            <div class="terminal-panel-header-actions">
              <button type="button" class="terminal-panel-btn" aria-label="Fullscreen">⛶</button>
              <button type="button" class="terminal-panel-close" aria-label="Close">×</button>
            </div>
          </div>
          <div class="terminal-chart-toolbar-row">
            <span class="terminal-chart-symbol">Q AAPL</span>
            <span class="terminal-chart-search-icon">🔍</span>
            <button type="button" class="terminal-chart-ctrl active">D</button>
            <button type="button" class="terminal-chart-ctrl">Indicators</button>
            <button type="button" class="terminal-chart-ctrl" aria-label="Undo">↶</button>
            <button type="button" class="terminal-chart-ctrl" aria-label="Redo">↷</button>
            <button type="button" class="terminal-chart-ctrl" aria-label="Screenshot">📷</button>
          </div>
          <div class="terminal-chart-ohlc">
            AAPL - 1D - NASDAQ &nbsp; (Live from TradingView)
          </div>
          <div class="chart-area-with-toolbar">
            <div class="chart-left-toolbar">
              <button type="button" class="chart-tool-btn" aria-label="Crosshair">⊕</button>
              <button type="button" class="chart-tool-btn" aria-label="Trend line">∕</button>
              <button type="button" class="chart-tool-btn" aria-label="Fibonacci">F</button>
              <button type="button" class="chart-tool-btn" aria-label="Text">T</button>
              <button type="button" class="chart-tool-btn" aria-label="Ruler">⌓</button>
              <button type="button" class="chart-tool-btn" aria-label="Magnet">⌗</button>
              <button type="button" class="chart-tool-btn" aria-label="Lock">🔒</button>
              <button type="button" class="chart-tool-btn" aria-label="Delete">🗑</button>
              <button type="button" class="chart-tool-btn" aria-label="Zoom in">+</button>
              <button type="button" class="chart-tool-btn" aria-label="Zoom out">−</button>
              <button type="button" class="chart-tool-btn" aria-label="Settings">⚙</button>
              <button type="button" class="chart-tool-btn" aria-label="Fullscreen">⛶</button>
              <span class="chart-toolbar-logo">TV</span>
            </div>
            <div id="tradingview_chart_container" class="tradingview-chart-container"></div>
          </div>
          <div class="terminal-chart-timeframe-row">
            <button type="button" class="terminal-tf-btn">5y</button>
            <button type="button" class="terminal-tf-btn">1y</button>
            <button type="button" class="terminal-tf-btn">3m</button>
            <button type="button" class="terminal-tf-btn">1m</button>
            <button type="button" class="terminal-tf-btn">5d</button>
            <button type="button" class="terminal-tf-btn active">1d</button>
            <button type="button" class="terminal-tf-btn" aria-label="Refresh">↻</button>
          </div>
          <div class="terminal-chart-footer">
            <span class="terminal-chart-footer-time" id="terminal-footer-time">15:20:41 UTC+5:30</span>
            <span class="terminal-chart-footer-meta">%</span>
            <span class="terminal-chart-footer-meta">log</span>
            <span class="terminal-chart-footer-meta">auto</span>
            <div class="terminal-chart-slider-wrap">
              <input type="range" class="terminal-chart-slider" min="0" max="100" value="100" aria-label="Time range">
              <span class="terminal-chart-slider-labels">09:15</span>
              <span class="terminal-chart-slider-labels">15:20</span>
            </div>
          </div>
        </div>

        <!-- Right: Option Chain + Open Interest -->
        <div class="terminal-right-col">
          <div class="terminal-panel option-chain-panel">
            <div class="terminal-panel-header">
              <h3 class="terminal-panel-title">Option Chain</h3>
              <button type="button" class="terminal-panel-close" aria-label="Close">×</button>
            </div>
            <div class="option-chain-controls">
              <span class="option-chain-symbol">Q NIFTY</span>
              <select class="option-chain-expiry" aria-label="Expiry">
                <option>23 Sept</option>
              </select>
              <button type="button" class="option-chain-toggle">BASKET</button>
              <button type="button" class="option-chain-toggle">Σ GREEKS</button>
            </div>
            ${renderOptionChainTable(getOptionChainData())}
          </div>

          <div class="terminal-panel open-interest-panel">
            <div class="terminal-panel-header">
              <h3 class="terminal-panel-title">Open Interest</h3>
              <button type="button" class="terminal-panel-close" aria-label="Close">×</button>
            </div>
            <div class="oi-controls">
              <span class="oi-symbol">NIFTY</span>
              <select class="oi-expiry" aria-label="Expiry">
                <option>23 Sept</option>
              </select>
            </div>
            <div class="oi-legend">
              <span class="oi-legend-item"><i class="oi-legend-call"></i> Call</span>
              <span class="oi-legend-item"><i class="oi-legend-put"></i> Put</span>
              <span class="oi-legend-item"><i class="oi-legend-oi-up"></i> OI Increase</span>
              <span class="oi-legend-item"><i class="oi-legend-oi-down"></i> OI Decrease</span>
            </div>
            <div class="oi-bars-chart">
              <span class="oi-yaxis-label">1.0Cr</span>
              ${renderOpenInterestBars()}
            </div>
            <div class="oi-footer">
              <span class="oi-nifty-price">NIFTY ${niftyPrice}</span>
              <div class="oi-time-slider-wrap">
                <input type="range" class="oi-time-slider" min="0" max="100" value="100" aria-label="Intraday time">
                <span class="oi-time-label">09:15</span>
                <span class="oi-time-label">15:20</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

export function initOrderTradeBookTabs() {
  /* No tabs in exact replication; kept for compatibility */
}

export function initTerminalTime() {
  const el = document.getElementById('terminal-time')
  const footerEl = document.getElementById('terminal-footer-time')
  if (!el) return
  const update = () => {
    const now = new Date()
    const t = now.toLocaleTimeString('en-IN', { hour12: false })
    el.textContent = t
    if (footerEl) footerEl.textContent = `${t} UTC+5:30`
  }
  update()
  setInterval(update, 1000)
}
