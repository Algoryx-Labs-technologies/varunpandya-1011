import type { OrderBookItem } from '../types/orderBook'
import { ORDER_BOOK_COLUMNS } from '../constants/orderBook'

interface OrderBookTableProps {
  orders: OrderBookItem[]
}

export default function OrderBookTable({ orders }: OrderBookTableProps) {
  return (
    <div className="order-book-table-wrap">
      <table className="order-book-table">
        <thead>
          <tr>
            {ORDER_BOOK_COLUMNS.map((col) => (
              <th key={col.key} className="order-book-th">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((row, idx) => (
            <tr key={idx} className="order-book-tr">
              {ORDER_BOOK_COLUMNS.map((col) => {
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
                return (
                  <td key={col.key} className={`order-book-td ${cellClass}`}>
                    {text}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

