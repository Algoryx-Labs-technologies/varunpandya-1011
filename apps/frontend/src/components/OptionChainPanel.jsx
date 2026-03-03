import { useEffect, useState } from 'react';
import './OptionChainPanel.css';

const BACKEND_URL = typeof window !== 'undefined' ? window.location.origin : '';

function OptionChainPanel({ index, optionChainFromWs }) {
  const [chain, setChain] = useState(optionChainFromWs);

  useEffect(() => {
    if (optionChainFromWs !== undefined && optionChainFromWs !== null) {
      setChain(optionChainFromWs);
      return;
    }
    fetch(`${BACKEND_URL}/api/trading/option-chain?index=${index || 'NIFTY'}`)
      .then((res) => res.json())
      .then((r) => { if (r.status === 'success') setChain(r.data); })
      .catch(() => setChain(null));
  }, [index, optionChainFromWs]);

  const calls = chain?.calls || [];
  const puts = chain?.puts || [];
  const underlying = chain?.underlying_value ?? chain?.underlyingValue;
  const ts = chain?.timestamp;

  return (
    <div className="option-chain-panel">
      <div className="option-chain-header">
        <h3>Option chain · {index || 'NIFTY'}</h3>
        {underlying != null && <span className="mono">Underlying ₹{Number(underlying).toLocaleString()}</span>}
        {ts && <span className="option-chain-ts">{new Date(ts).toLocaleTimeString()}</span>}
      </div>
      {(!calls.length && !puts.length) ? (
        <p className="empty-state">No option chain data. Start the bot to stream real-time data.</p>
      ) : (
        <div className="option-chain-grid">
          <div className="option-chain-table-wrap">
            <h4>Calls (CE)</h4>
            <table className="option-chain-table">
              <thead>
                <tr>
                  <th>Strike</th>
                  <th>LTP</th>
                  <th>OI</th>
                  <th>Vol</th>
                  <th>Bid</th>
                  <th>Ask</th>
                </tr>
              </thead>
              <tbody>
                {calls.slice(0, 25).map((r, i) => (
                  <tr key={i}>
                    <td className="mono">{r.strike != null ? Number(r.strike).toLocaleString() : '—'}</td>
                    <td className="mono">{r.ltp != null ? r.ltp : '—'}</td>
                    <td className="mono">{r.oi != null ? r.oi : '—'}</td>
                    <td className="mono">{r.volume != null ? r.volume : '—'}</td>
                    <td className="mono">{r.bid != null ? r.bid : '—'}</td>
                    <td className="mono">{r.ask != null ? r.ask : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="option-chain-table-wrap">
            <h4>Puts (PE)</h4>
            <table className="option-chain-table">
              <thead>
                <tr>
                  <th>Strike</th>
                  <th>LTP</th>
                  <th>OI</th>
                  <th>Vol</th>
                  <th>Bid</th>
                  <th>Ask</th>
                </tr>
              </thead>
              <tbody>
                {puts.slice(0, 25).map((r, i) => (
                  <tr key={i}>
                    <td className="mono">{r.strike != null ? Number(r.strike).toLocaleString() : '—'}</td>
                    <td className="mono">{r.ltp != null ? r.ltp : '—'}</td>
                    <td className="mono">{r.oi != null ? r.oi : '—'}</td>
                    <td className="mono">{r.volume != null ? r.volume : '—'}</td>
                    <td className="mono">{r.bid != null ? r.bid : '—'}</td>
                    <td className="mono">{r.ask != null ? r.ask : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default OptionChainPanel;
