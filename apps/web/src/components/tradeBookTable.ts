import type { TradeBookItem } from '../types/tradeBook'
import { TRADE_BOOK_COLUMNS } from '../constants/tradeBook'
import { escapeHtml } from '../utils/html'

export function renderTradeBookTable(trades: TradeBookItem[]) {
  const headers = TRADE_BOOK_COLUMNS.map(
    (c) => `<th class="order-book-th">${c.label}</th>`
  ).join('')
  const rows = trades
    .map(
      (row) =>
        `<tr class="order-book-tr">${TRADE_BOOK_COLUMNS.map((col) => {
          const val = row[col.key]
          const text = val == null ? '' : String(val)
          const cellClass =
            col.key === 'transactiontype'
              ? text.toUpperCase() === 'BUY'
                ? 'positive'
                : 'negative'
              : ''
          return `<td class="order-book-td ${cellClass}">${escapeHtml(text)}</td>`
        }).join('')}</tr>`
    )
    .join('')
  return `
    <div class="order-book-table-wrap">
      <table class="order-book-table">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}
