import type { TradeBookItem } from '../types/tradeBook'
import { TRADE_BOOK_COLUMNS } from '../constants/tradeBook'

interface TradeBookTableProps {
  trades: TradeBookItem[]
}

export default function TradeBookTable({ trades }: TradeBookTableProps) {
  return (
    <div className="order-book-table-wrap">
      <table className="order-book-table">
        <thead>
          <tr>
            {TRADE_BOOK_COLUMNS.map((col) => (
              <th key={col.key} className="order-book-th">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((row, idx) => (
            <tr key={idx} className="order-book-tr">
              {TRADE_BOOK_COLUMNS.map((col) => {
                const val = row[col.key]
                const text = val == null ? '' : String(val)
                const cellClass =
                  col.key === 'transactiontype'
                    ? text.toUpperCase() === 'BUY'
                      ? 'positive'
                      : 'negative'
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

