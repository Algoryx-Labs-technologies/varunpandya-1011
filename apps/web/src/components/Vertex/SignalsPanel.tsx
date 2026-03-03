import type { VertexWsData } from '../../hooks/useWebSocket'

interface SignalsPanelProps {
  signals: NonNullable<VertexWsData['signals']>
}

export default function SignalsPanel({ signals }: SignalsPanelProps) {
  const rows = signals.slice().reverse()

  return (
    <div className="signals-panel">
      <h2>Signals</h2>
      <div className="signals-table">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Index</th>
              <th>Dir</th>
              <th>Entry</th>
              <th>Target</th>
              <th>SL</th>
              <th>Level</th>
              <th>Pattern</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((signal, idx) => (
                <tr key={signal.id ?? idx}>
                  <td className="mono">{new Date(signal.timestamp).toLocaleString()}</td>
                  <td className="mono">{signal.index}</td>
                  <td className={`direction ${signal.direction}`}>{signal.direction.toUpperCase()}</td>
                  <td className="mono">₹{signal.entry_price}</td>
                  <td className="mono">₹{signal.target_price ?? '—'}</td>
                  <td className="mono">₹{signal.stop_loss ?? '—'}</td>
                  <td>{signal.level_type ?? '—'}</td>
                  <td>{signal.pattern ?? '—'}</td>
                  <td className={`status ${signal.status ?? 'pending'}`}>{signal.status ?? 'pending'}</td>
                </tr>
              ))
            ) : (
              <tr className="empty-row">
                <td colSpan={9}>No signals</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
