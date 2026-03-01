import React, { useEffect, useState } from 'react'
import { getCurrentNiftyPrice } from '../data/optionChain'
import { getPosition, getAllHolding } from '../data/dashboard'
import { getLogsData } from '../data/logs'
import { initTradingViewChart } from '../lib/tradingView'
import type { PositionItem, HoldingItem } from '../types/dashboard'

export default function Trading() {
  const [terminalTime, setTerminalTime] = useState('')
  const [niftyPrice] = useState(() => getCurrentNiftyPrice().toLocaleString('en-IN'))
  const [holdings, setHoldings] = useState<HoldingItem[]>([])
  const [holdingsLoading, setHoldingsLoading] = useState(true)
  const [holdingsError, setHoldingsError] = useState(false)
  const [positionsNet, setPositionsNet] = useState<PositionItem[]>([])
  const [positionsDay, setPositionsDay] = useState<PositionItem[]>([])
  const [positionsLoading, setPositionsLoading] = useState(true)
  const [positionsError, setPositionsError] = useState(false)

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

  useEffect(() => {
    const loadHoldings = async () => {
      setHoldingsLoading(true)
      setHoldingsError(false)
      try {
        const res = await getAllHolding()
        if (res?.data?.holdings?.length) setHoldings(res.data.holdings)
        else setHoldings([])
      } catch {
        setHoldingsError(true)
        setHoldings([])
      } finally {
        setHoldingsLoading(false)
      }
    }
    loadHoldings()
  }, [])

  useEffect(() => {
    const loadPositions = async () => {
      setPositionsLoading(true)
      setPositionsError(false)
      try {
        const res = await getPosition()
        if (res?.data?.net) setPositionsNet(res.data.net)
        else setPositionsNet([])
        if (res?.data?.day) setPositionsDay(res.data.day)
        else setPositionsDay([])
      } catch {
        setPositionsError(true)
        setPositionsNet([])
        setPositionsDay([])
      } finally {
        setPositionsLoading(false)
      }
    }
    loadPositions()
  }, [])

  const hasPositions = positionsNet.length > 0 || positionsDay.length > 0
  const hasHoldings = holdings.length > 0
  const botLogs = getLogsData()

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
              <h3 className="terminal-panel-title">Holdings</h3>
              <button type="button" className="terminal-panel-close" aria-label="Close">×</button>
            </div>
            {holdingsLoading && (
              <div className="oi-bars-chart" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <span className="market-data-td-muted">Loading…</span>
              </div>
            )}
            {!holdingsLoading && holdingsError && (
              <div className="oi-bars-chart" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <span className="market-data-td-muted">Unable to load holdings</span>
              </div>
            )}
            {!holdingsLoading && !holdingsError && !hasHoldings && (
              <div className="oi-bars-chart" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <span className="market-data-td-muted">No holdings</span>
              </div>
            )}
            {!holdingsLoading && !holdingsError && hasHoldings && (
              <div className="market-data-table-wrap" style={{ padding: '8px 0' }}>
                <table className="market-data-table">
                  <thead>
                    <tr>
                      <th className="market-data-th">Symbol</th>
                      <th className="market-data-th">Qty</th>
                      <th className="market-data-th">Avg</th>
                      <th className="market-data-th">LTP</th>
                      <th className="market-data-th">P&L</th>
                      <th className="market-data-th">P&L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h, i) => {
                      const pnlClass = h.profitandloss >= 0 ? 'positive' : 'negative'
                      return (
                        <tr key={i} className="market-data-tr">
                          <td className="market-data-td">{h.tradingsymbol}</td>
                          <td className="market-data-td">{h.quantity}</td>
                          <td className="market-data-td">₹{h.averageprice.toFixed(2)}</td>
                          <td className="market-data-td">₹{h.ltp.toFixed(2)}</td>
                          <td className={`market-data-td ${pnlClass}`}>₹{h.profitandloss.toFixed(2)}</td>
                          <td className={`market-data-td ${pnlClass}`}>{h.pnlpercentage.toFixed(2)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="terminal-panel open-interest-panel">
            <div className="terminal-panel-header">
              <h3 className="terminal-panel-title">Positions</h3>
              <button type="button" className="terminal-panel-close" aria-label="Close">×</button>
            </div>
            {positionsLoading && (
              <div className="oi-bars-chart" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <span className="market-data-td-muted">Loading…</span>
              </div>
            )}
            {!positionsLoading && positionsError && (
              <div className="oi-bars-chart" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <span className="market-data-td-muted">Unable to load positions</span>
              </div>
            )}
            {!positionsLoading && !positionsError && !hasPositions && (
              <div className="oi-bars-chart" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <span className="market-data-td-muted">No positions</span>
              </div>
            )}
            {!positionsLoading && !positionsError && hasPositions && (
              <div className="positions-tabs" style={{ padding: '8px 0' }}>
                <h4 className="positions-subtitle">Net</h4>
                <div className="market-data-table-wrap">
                  <table className="market-data-table">
                    <thead>
                      <tr>
                        <th className="market-data-th">Symbol</th>
                        <th className="market-data-th">Product</th>
                        <th className="market-data-th">Net Qty</th>
                        <th className="market-data-th">Net Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positionsNet.map((p, i) => (
                        <tr key={i} className="market-data-tr">
                          <td className="market-data-td">{p.tradingsymbol}</td>
                          <td className="market-data-td">{p.producttype}</td>
                          <td className="market-data-td">{p.netqty}</td>
                          <td className="market-data-td">{p.netvalue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h4 className="positions-subtitle">Day</h4>
                <div className="market-data-table-wrap">
                  <table className="market-data-table">
                    <thead>
                      <tr>
                        <th className="market-data-th">Symbol</th>
                        <th className="market-data-th">Product</th>
                        <th className="market-data-th">Net Qty</th>
                        <th className="market-data-th">Net Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positionsDay.length === 0 ? (
                        <tr><td className="market-data-td market-data-td-muted" colSpan={4}>No day positions</td></tr>
                      ) : (
                        positionsDay.map((p, i) => (
                          <tr key={i} className="market-data-tr">
                            <td className="market-data-td">{p.tradingsymbol}</td>
                            <td className="market-data-td">{p.producttype}</td>
                            <td className="market-data-td">{p.netqty}</td>
                            <td className="market-data-td">{p.netvalue}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bot-logs">
        <h3 className="bot-logs-title">Bot logs</h3>
        <div className="bot-logs-content">
          {botLogs.length === 0 ? (
            <div className="bot-log-empty">No strategy logs</div>
          ) : (
            botLogs.map((entry, i) => (
              <div key={i} className={`bot-log-entry bot-log-entry--${entry.level.toLowerCase()}`}>
                <span className="bot-log-time">{entry.time}</span>
                <span className="bot-log-level">{entry.level}</span>
                <span className="bot-log-strategy">{entry.strategy}</span>
                <span className="bot-log-message">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

