import React, { useEffect, useState } from 'react'
import { getOptionChainData, getCurrentNiftyPrice } from '../data/optionChain'
import { getStrategyLogBarData } from '../data/strategyLogBars'
import { initTradingViewChart } from '../lib/tradingView'
import type { OptionChainRow } from '../data/optionChain'

function OptionChainTable({ rows }: { rows: OptionChainRow[] }) {
  return (
    <div className="option-chain-wrap">
      <table className="option-chain-table">
        <thead>
          <tr>
            <th className="option-chain-th">CALL IV</th>
            <th className="option-chain-th">CALL DELTA</th>
            <th className="option-chain-th">CALL LTP</th>
            <th className="option-chain-th option-chain-strike-th">STRIKE</th>
            <th className="option-chain-th">PUT LTP</th>
            <th className="option-chain-th">PUT DELTA</th>
            <th className="option-chain-th">PUT IV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`option-chain-tr ${r.isAtm ? 'option-chain-atm' : ''}`}
              title={r.isAtm ? '25,325.00 | +85.90 (0.34%)' : undefined}
            >
              <td className="option-chain-td option-chain-call">{r.callIv}</td>
              <td className="option-chain-td option-chain-call">{r.callDelta}</td>
              <td className="option-chain-td option-chain-call option-chain-ltp">
                {r.callLtp} <span className={`option-chain-pct positive`}>{r.callLtpChgPct}</span>
              </td>
              <td className="option-chain-td option-chain-strike">{r.strike.toLocaleString('en-IN')}</td>
              <td className="option-chain-td option-chain-put option-chain-ltp">
                {r.putLtp} <span className={`option-chain-pct negative`}>{r.putLtpChgPct}</span>
              </td>
              <td className="option-chain-td option-chain-put">{r.putDelta}</td>
              <td className="option-chain-td option-chain-put">{r.putIv}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OpenInterestBars() {
  const data = getStrategyLogBarData()
  const maxVal = Math.max(...data.flatMap((d) => [d.callOi, d.putOi]), 1)
  return (
    <>
      {data.map((d, i) => (
        <div key={i} className="oi-bar-group">
          <div
            className="oi-bar oi-call"
            style={{ height: `${(d.callOi / maxVal) * 100}%` }}
          ></div>
          <div
            className="oi-bar oi-put"
            style={{ height: `${(d.putOi / maxVal) * 100}%` }}
          ></div>
          <span className="oi-bar-label">{d.label}</span>
        </div>
      ))}
    </>
  )
}

export default function Trading() {
  const [terminalTime, setTerminalTime] = useState('')
  const [niftyPrice] = useState(() => getCurrentNiftyPrice().toLocaleString('en-IN'))
  const [optionChainData] = useState(() => getOptionChainData())

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const t = now.toLocaleTimeString('en-IN', { hour12: false })
      setTerminalTime(t)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    initTradingViewChart()
  }, [])

  return (
    <div className="page-content page-content-terminal">
      <div className="terminal-bar">
        <div className="terminal-widgets-row">
          <span className="terminal-id">{terminalTime || '15:20:41'}</span>
          <div className="terminal-widget-tabs">
            <span className="terminal-widget-tab">
              Market Watch<button type="button" className="terminal-widget-close" aria-label="Close">×</button>
            </span>
            <span className="terminal-widget-tab">
              Scalper Zone<button type="button" className="terminal-widget-close" aria-label="Close">×</button>
            </span>
            <span className="terminal-widget-tab">
              SectoralIndexes<button type="button" className="terminal-widget-close" aria-label="Close">×</button>
            </span>
            <span className="terminal-widget-tab">
              Straddle<button type="button" className="terminal-widget-close" aria-label="Close">×</button>
            </span>
            <span className="terminal-widget-tab">
              Charts<button type="button" className="terminal-widget-close" aria-label="Close">×</button>
            </span>
            <span className="terminal-widget-tab terminal-widget-pnl">
              P&L ₹0.00<button type="button" className="terminal-widget-close" aria-label="Close">×</button>
            </span>
            <span className="terminal-widget-tab">
              + Widgets<button type="button" className="terminal-widget-close" aria-label="Close">×</button>
            </span>
          </div>
          <div className="terminal-bar-icons">
            <button type="button" className="terminal-icon-btn" aria-label="User">👤</button>
            <button type="button" className="terminal-icon-btn" aria-label="Settings">⚙</button>
          </div>
        </div>
        <div className="terminal-indices-row">
          <span className="terminal-index-item">
            <strong>BANKNIFTY</strong> 55,481.85 334.25 (0.61%) <span className="terminal-arrow positive">▲</span>
          </span>
          <span className="terminal-index-item">
            <strong>MIDCPNIFTY</strong> 13,151.10 4.55 (0.03%) <span className="terminal-arrow positive">▲</span>
          </span>
          <span className="terminal-index-item">
            <strong>FINNIFTY</strong> 26,555.10 59.80 (0.23%) <span className="terminal-arrow positive">▲</span>
          </span>
          <span className="terminal-index-item">
            <strong>BANKEX</strong> 62,429.63 467.75 (0.75%) <span className="terminal-arrow positive">▲</span>
          </span>
          <span className="terminal-index-item">
            <strong>NIFTY NEXT 50</strong> 69,146.60 145.×
          </span>
        </div>
      </div>

      <div className="trading-terminal-layout">
        <div className="terminal-panel chart-panel">
          <div className="terminal-panel-header">
            <h3 className="terminal-panel-title">Chart</h3>
            <div className="terminal-panel-header-actions">
              <button type="button" className="terminal-panel-btn" aria-label="Fullscreen">⛶</button>
              <button type="button" className="terminal-panel-close" aria-label="Close">×</button>
            </div>
          </div>
          <div className="terminal-chart-toolbar-row">
            <span className="terminal-chart-symbol">Q AAPL</span>
            <span className="terminal-chart-search-icon">🔍</span>
            <button type="button" className="terminal-chart-ctrl active">D</button>
            <button type="button" className="terminal-chart-ctrl">Indicators</button>
            <button type="button" className="terminal-chart-ctrl" aria-label="Undo">↶</button>
            <button type="button" className="terminal-chart-ctrl" aria-label="Redo">↷</button>
            <button type="button" className="terminal-chart-ctrl" aria-label="Screenshot">📷</button>
          </div>
          <div className="terminal-chart-ohlc">
            AAPL - 1D - NASDAQ &nbsp; (Live from TradingView)
          </div>
          <div className="chart-area-with-toolbar">
            <div className="chart-left-toolbar">
              <button type="button" className="chart-tool-btn" aria-label="Crosshair">⊕</button>
              <button type="button" className="chart-tool-btn" aria-label="Trend line">∕</button>
              <button type="button" className="chart-tool-btn" aria-label="Fibonacci">F</button>
              <button type="button" className="chart-tool-btn" aria-label="Text">T</button>
              <button type="button" className="chart-tool-btn" aria-label="Ruler">⌓</button>
              <button type="button" className="chart-tool-btn" aria-label="Magnet">⌗</button>
              <button type="button" className="chart-tool-btn" aria-label="Lock">🔒</button>
              <button type="button" className="chart-tool-btn" aria-label="Delete">🗑</button>
              <button type="button" className="chart-tool-btn" aria-label="Zoom in">+</button>
              <button type="button" className="chart-tool-btn" aria-label="Zoom out">−</button>
              <button type="button" className="chart-tool-btn" aria-label="Settings">⚙</button>
              <button type="button" className="chart-tool-btn" aria-label="Fullscreen">⛶</button>
              <span className="chart-toolbar-logo">TV</span>
            </div>
            <div id="tradingview_chart_container" className="tradingview-chart-container"></div>
          </div>
          <div className="terminal-chart-timeframe-row">
            <button type="button" className="terminal-tf-btn">5y</button>
            <button type="button" className="terminal-tf-btn">1y</button>
            <button type="button" className="terminal-tf-btn">3m</button>
            <button type="button" className="terminal-tf-btn">1m</button>
            <button type="button" className="terminal-tf-btn">5d</button>
            <button type="button" className="terminal-tf-btn active">1d</button>
            <button type="button" className="terminal-tf-btn" aria-label="Refresh">↻</button>
          </div>
          <div className="terminal-chart-footer">
            <span className="terminal-chart-footer-time">
              {terminalTime ? `${terminalTime} UTC+5:30` : '15:20:41 UTC+5:30'}
            </span>
            <span className="terminal-chart-footer-meta">%</span>
            <span className="terminal-chart-footer-meta">log</span>
            <span className="terminal-chart-footer-meta">auto</span>
            <div className="terminal-chart-slider-wrap">
              <input
                type="range"
                className="terminal-chart-slider"
                min="0"
                max="100"
                defaultValue="100"
                aria-label="Time range"
              />
              <span className="terminal-chart-slider-labels">09:15</span>
              <span className="terminal-chart-slider-labels">15:20</span>
            </div>
          </div>
        </div>

        <div className="terminal-right-col">
          <div className="terminal-panel option-chain-panel">
            <div className="terminal-panel-header">
              <h3 className="terminal-panel-title">Option Chain</h3>
              <button type="button" className="terminal-panel-close" aria-label="Close">×</button>
            </div>
            <div className="option-chain-controls">
              <span className="option-chain-symbol">Q NIFTY</span>
              <select className="option-chain-expiry" aria-label="Expiry">
                <option>23 Sept</option>
              </select>
              <button type="button" className="option-chain-toggle">BASKET</button>
              <button type="button" className="option-chain-toggle">Σ GREEKS</button>
            </div>
            <OptionChainTable rows={optionChainData} />
          </div>

          <div className="terminal-panel open-interest-panel">
            <div className="terminal-panel-header">
              <h3 className="terminal-panel-title">Open Interest</h3>
              <button type="button" className="terminal-panel-close" aria-label="Close">×</button>
            </div>
            <div className="oi-controls">
              <span className="oi-symbol">NIFTY</span>
              <select className="oi-expiry" aria-label="Expiry">
                <option>23 Sept</option>
              </select>
            </div>
            <div className="oi-legend">
              <span className="oi-legend-item">
                <i className="oi-legend-call"></i> Call
              </span>
              <span className="oi-legend-item">
                <i className="oi-legend-put"></i> Put
              </span>
              <span className="oi-legend-item">
                <i className="oi-legend-oi-up"></i> OI Increase
              </span>
              <span className="oi-legend-item">
                <i className="oi-legend-oi-down"></i> OI Decrease
              </span>
            </div>
            <div className="oi-bars-chart">
              <span className="oi-yaxis-label">1.0Cr</span>
              <OpenInterestBars />
            </div>
            <div className="oi-footer">
              <span className="oi-nifty-price">NIFTY {niftyPrice}</span>
              <div className="oi-time-slider-wrap">
                <input
                  type="range"
                  className="oi-time-slider"
                  min="0"
                  max="100"
                  defaultValue="100"
                  aria-label="Intraday time"
                />
                <span className="oi-time-label">09:15</span>
                <span className="oi-time-label">15:20</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

