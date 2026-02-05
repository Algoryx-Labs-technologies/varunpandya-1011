import { useState, useEffect, useRef } from 'react'
import OrderBookTable from './OrderBookTable'
import TradeBookTable from './TradeBookTable'
import { getOrderBookData } from '../data/orderBook'
import { getTradeBookData } from '../data/tradeBook'
import { getLogsData } from '../data/logs'
import { useTradingViewChart } from '../lib/tradingView'

function LogsPanel() {
  const logs = getLogsData()
  
  return (
    <div className="logs-table-wrap">
      <table className="logs-table">
        <thead>
          <tr>
            <th className="logs-table-th">Time</th>
            <th className="logs-table-th">Level</th>
            <th className="logs-table-th">Message</th>
            <th className="logs-table-th">Strategy</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, idx) => (
            <tr key={idx} className="logs-table-tr">
              <td className="logs-table-td logs-table-time">{log.time}</td>
              <td className={`logs-table-td logs-table-level logs-level-${log.level}`}>
                {log.level}
              </td>
              <td className="logs-table-td logs-table-message">{log.message}</td>
              <td className="logs-table-td logs-table-strategy">{log.strategy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type TabType = 'order-book' | 'trade-book' | 'logs'

export default function Trading() {
  const [activeTab, setActiveTab] = useState<TabType>('order-book')
  const chartContainerRef = useRef<HTMLDivElement>(null)
  
  useTradingViewChart(chartContainerRef)

  return (
    <div className="page-content">
      <div className="trading-layout">
        <div className="card trading-chart-card">
          <div ref={chartContainerRef} id="tradingview_chart_container" className="tradingview-chart-container"></div>
        </div>
        <div className="card order-form trading-place-order">
          <h2 className="card-title" style={{marginBottom: '16px'}}>Place Order</h2>
          <div className="form-group">
            <label>Amount</label>
            <input type="text" defaultValue="0.00" placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Price</label>
            <input type="text" defaultValue="67,000.00" placeholder="Price" />
          </div>
          <div className="form-group">
            <label>Total</label>
            <input type="text" defaultValue="0.00" readOnly />
          </div>
          <button type="button" className="btn-buy">Buy BTC</button>
          <button type="button" className="btn-sell">Sell BTC</button>
        </div>
        <div className="card order-trade-book-card">
          <div className="order-trade-book-tabs" role="tablist">
            <button
              type="button"
              className={`order-trade-book-tab ${activeTab === 'order-book' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'order-book'}
              onClick={() => setActiveTab('order-book')}
            >
              Order Book
            </button>
            <button
              type="button"
              className={`order-trade-book-tab ${activeTab === 'trade-book' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'trade-book'}
              onClick={() => setActiveTab('trade-book')}
            >
              Trade Book
            </button>
            <button
              type="button"
              className={`order-trade-book-tab ${activeTab === 'logs' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'logs'}
              onClick={() => setActiveTab('logs')}
            >
              Logs
            </button>
          </div>
          <div
            id="order-book-pane"
            className={`order-trade-book-pane ${activeTab === 'order-book' ? 'active' : ''}`}
            role="tabpanel"
            hidden={activeTab !== 'order-book'}
          >
            <OrderBookTable orders={getOrderBookData()} />
          </div>
          <div
            id="trade-book-pane"
            className={`order-trade-book-pane ${activeTab === 'trade-book' ? 'active' : ''}`}
            role="tabpanel"
            hidden={activeTab !== 'trade-book'}
          >
            <TradeBookTable trades={getTradeBookData()} />
          </div>
          <div
            id="logs-pane"
            className={`order-trade-book-pane ${activeTab === 'logs' ? 'active' : ''}`}
            role="tabpanel"
            hidden={activeTab !== 'logs'}
          >
            <LogsPanel />
          </div>
        </div>
      </div>
    </div>
  )
}

