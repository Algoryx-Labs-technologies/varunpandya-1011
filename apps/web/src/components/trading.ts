import { renderOrderBookTable } from './orderBookTable'
import { renderTradeBookTable } from './tradeBookTable'
import { getOrderBookData } from '../data/orderBook'
import { getTradeBookData } from '../data/tradeBook'
import { getLogsData } from '../data/logs'
import { escapeHtml } from '../utils/html'

function renderLogsPanel() {
  const logs = getLogsData()
  const rows = logs
    .map(
      (log) =>
        `<tr class="logs-table-tr">
          <td class="logs-table-td logs-table-time">${escapeHtml(log.time)}</td>
          <td class="logs-table-td logs-table-level logs-level-${log.level}">${escapeHtml(log.level)}</td>
          <td class="logs-table-td logs-table-message">${escapeHtml(log.message)}</td>
          <td class="logs-table-td logs-table-strategy">${escapeHtml(log.strategy)}</td>
        </tr>`
    )
    .join('')
  return `
    <div class="logs-table-wrap">
      <table class="logs-table">
        <thead>
          <tr>
            <th class="logs-table-th">Time</th>
            <th class="logs-table-th">Level</th>
            <th class="logs-table-th">Message</th>
            <th class="logs-table-th">Strategy</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

export function renderTrading() {
  return `
    <div class="page-content">
      <div class="trading-layout">
        <div class="card trading-chart-card">
          <div id="tradingview_chart_container" class="tradingview-chart-container"></div>
        </div>
        <div class="card order-form trading-place-order">
          <h2 class="card-title" style="margin-bottom: 16px;">Place Order</h2>
          <div class="form-group">
            <label>Amount</label>
            <input type="text" value="0.00" placeholder="0.00">
          </div>
          <div class="form-group">
            <label>Price</label>
            <input type="text" value="67,000.00" placeholder="Price">
          </div>
          <div class="form-group">
            <label>Total</label>
            <input type="text" value="0.00" readonly>
          </div>
          <button type="button" class="btn-buy">Buy BTC</button>
          <button type="button" class="btn-sell">Sell BTC</button>
        </div>
        <div class="card order-trade-book-card">
          <div class="order-trade-book-tabs" role="tablist">
            <button type="button" class="order-trade-book-tab active" role="tab" data-tab="order-book" aria-selected="true">Order Book</button>
            <button type="button" class="order-trade-book-tab" role="tab" data-tab="trade-book" aria-selected="false">Trade Book</button>
            <button type="button" class="order-trade-book-tab" role="tab" data-tab="logs" aria-selected="false">Logs</button>
          </div>
          <div id="order-book-pane" class="order-trade-book-pane active" role="tabpanel">
            ${renderOrderBookTable(getOrderBookData())}
          </div>
          <div id="trade-book-pane" class="order-trade-book-pane" role="tabpanel" hidden>
            ${renderTradeBookTable(getTradeBookData())}
          </div>
          <div id="logs-pane" class="order-trade-book-pane" role="tabpanel" hidden>
            ${renderLogsPanel()}
          </div>
        </div>
      </div>
    </div>
  `
}

export function initOrderTradeBookTabs() {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.order-trade-book-tab')
  const orderBookPane = document.getElementById('order-book-pane')
  const tradeBookPane = document.getElementById('trade-book-pane')
  const logsPane = document.getElementById('logs-pane')
  if (!tabs.length || !orderBookPane || !tradeBookPane || !logsPane) return

  const panes = { 'order-book': orderBookPane, 'trade-book': tradeBookPane, logs: logsPane }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab as keyof typeof panes
      if (!target || !panes[target]) return
      tabs.forEach((t) => {
        t.classList.toggle('active', t === tab)
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false')
      })
      ;(Object.keys(panes) as (keyof typeof panes)[]).forEach((key) => {
        const pane = panes[key]
        if (key === target) {
          pane.classList.add('active')
          pane.removeAttribute('hidden')
        } else {
          pane.classList.remove('active')
          pane.setAttribute('hidden', '')
        }
      })
    })
  })
}
