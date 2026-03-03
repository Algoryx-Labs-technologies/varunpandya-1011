import './TradesPanel.css';

function TradesPanel({ trades }) {
  const rows = trades.slice().reverse();

  return (
    <div className="trades-panel">
      <h2>Trade History</h2>
      <div className="trades-table">
        <table>
          <thead>
            <tr>
              <th>Entry</th>
              <th>Exit</th>
              <th>Index</th>
              <th>Symbol</th>
              <th>Dir</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>Qty</th>
              <th>P&L</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((trade, idx) => (
                <tr key={idx}>
                  <td className="mono">{new Date(trade.entry_time).toLocaleString()}</td>
                  <td className="mono">{new Date(trade.exit_time).toLocaleString()}</td>
                  <td className="mono">{trade.index}</td>
                  <td className="mono">{trade.symbol}</td>
                  <td className={`direction ${trade.direction}`}>{trade.direction?.toUpperCase()}</td>
                  <td className="mono">₹{trade.entry_price}</td>
                  <td className="mono">₹{trade.exit_price}</td>
                  <td className="mono">{trade.quantity}</td>
                  <td className={`pnl mono ${trade.pnl >= 0 ? 'positive' : 'negative'}`}>
                    ₹{Number(trade.pnl).toFixed(2)}
                  </td>
                  <td>{trade.exit_reason}</td>
                </tr>
              ))
            ) : (
              <tr className="empty-row">
                <td colSpan="10">No trades</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TradesPanel;
