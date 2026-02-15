import type { OptionChainRow } from '../data/optionChain'
import { escapeHtml } from '../utils/html'

export function renderOptionChainTable(rows: OptionChainRow[]): string {
  const body = rows
    .map(
      (r) => `
    <tr class="option-chain-tr ${r.isAtm ? 'option-chain-atm' : ''}" ${r.isAtm ? 'title="25,325.00 | +85.90 (0.34%)"' : ''}>
      <td class="option-chain-td option-chain-call">${escapeHtml(r.callIv)}</td>
      <td class="option-chain-td option-chain-call">${escapeHtml(r.callDelta)}</td>
      <td class="option-chain-td option-chain-call option-chain-ltp">
        ${escapeHtml(r.callLtp)} <span class="option-chain-pct positive">${escapeHtml(r.callLtpChgPct)}</span>
      </td>
      <td class="option-chain-td option-chain-strike">${r.strike.toLocaleString('en-IN')}</td>
      <td class="option-chain-td option-chain-put option-chain-ltp">
        ${escapeHtml(r.putLtp)} <span class="option-chain-pct negative">${escapeHtml(r.putLtpChgPct)}</span>
      </td>
      <td class="option-chain-td option-chain-put">${escapeHtml(r.putDelta)}</td>
      <td class="option-chain-td option-chain-put">${escapeHtml(r.putIv)}</td>
    </tr>
  `
    )
    .join('')
  return `
    <div class="option-chain-wrap">
      <table class="option-chain-table">
        <thead>
          <tr>
            <th class="option-chain-th">CALL IV</th>
            <th class="option-chain-th">CALL DELTA</th>
            <th class="option-chain-th">CALL LTP</th>
            <th class="option-chain-th option-chain-strike-th">STRIKE</th>
            <th class="option-chain-th">PUT LTP</th>
            <th class="option-chain-th">PUT DELTA</th>
            <th class="option-chain-th">PUT IV</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `
}
