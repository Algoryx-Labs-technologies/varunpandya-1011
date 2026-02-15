import type { OrderBookItem } from '../types/orderBook'
import { ORDER_BOOK_COLUMNS } from '../constants/orderBook'
import { escapeHtml } from '../utils/html'

export function renderOrderBookTable(orders: OrderBookItem[]) {
  const headers = ORDER_BOOK_COLUMNS.map(
    (c) => `<th class="order-book-th">${c.label}</th>`
  ).join('')
  const rows = orders
    .map(
      (row) =>
        `<tr class="order-book-tr">${ORDER_BOOK_COLUMNS.map((col) => {
          const val = row[col.key]
          const text = val == null ? '' : String(val)
          const cellClass =
            col.key === 'transactiontype'
              ? text.toUpperCase() === 'BUY'
                ? 'positive'
                : 'negative'
              : col.key === 'status' || col.key === 'orderstatus'
                ? 'order-book-status'
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
