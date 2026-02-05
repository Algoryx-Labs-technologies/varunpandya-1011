export default function Dashboard() {
  return (
    <div className="page-content">
      <div className="dashboard-grid">
        <div className="card balance-card">
          <div className="card-header">
            <h2 className="card-title">My Balance</h2>
            <div className="card-actions">
              <select className="dropdown" aria-label="Assets"><option>All Assets</option></select>
              <select className="dropdown" aria-label="Period"><option>24h</option></select>
              <button type="button" className="btn-text" aria-label="Refresh">↻</button>
              <button type="button" className="btn-text" aria-label="Undo">↶</button>
            </div>
          </div>
          <p className="balance-value">$164,802.43</p>
          <p className="balance-change positive">+$3,948.23 (12.00%)</p>
          <p className="balance-sub">6.09% More than last week period</p>
          <div className="chart-placeholder">
            <span className="chart-line"></span>
            <span className="chart-dot"></span>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">My Top Coins</h2>
            <span className="badge badge-blue">3 Assets</span>
            <div className="card-actions">
              <span style={{color: 'var(--text-muted)', fontSize: '0.8125rem'}}>Based on recent 24 hours</span>
              <select className="dropdown" aria-label="Currencies"><option>All Currencies</option></select>
              <select className="dropdown" aria-label="Period"><option>24h</option></select>
              <button type="button" className="btn-text">Add to watchlist</button>
            </div>
          </div>
          <div className="top-coins-row">
            <div className="coin-mini-card">
              <div className="coin-mini-header">
                <div className="coin-icon btc">B</div>
                <div>
                  <div className="coin-name">Bitcoin</div>
                  <div className="coin-symbol">BTC</div>
                </div>
              </div>
              <div className="coin-value">0.823075</div>
              <div className="coin-change positive">+1.63%</div>
              <div className="coin-fiat">$57,096.48</div>
              <div className="coin-chart-mini" style={{background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.25) 0%, transparent 100%)'}}></div>
            </div>
            <div className="coin-mini-card">
              <div className="coin-mini-header">
                <div className="coin-icon eth">E</div>
                <div>
                  <div className="coin-name">Ethereum</div>
                  <div className="coin-symbol">ETH</div>
                </div>
              </div>
              <div className="coin-value">2.9383</div>
              <div className="coin-change negative">-0.84%</div>
              <div className="coin-fiat">$10,793.64</div>
              <div className="coin-chart-mini" style={{background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, transparent 100%)'}}></div>
            </div>
            <div className="coin-mini-card">
              <div className="coin-mini-header">
                <div className="coin-icon sol">S</div>
                <div>
                  <div className="coin-name">Solana</div>
                  <div className="coin-symbol">SOL</div>
                </div>
              </div>
              <div className="coin-value">419.68</div>
              <div className="coin-change negative">-3.09%</div>
              <div className="coin-fiat">$67,108.32</div>
              <div className="coin-chart-mini" style={{background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, transparent 100%)'}}></div>
            </div>
          </div>
        </div>
      </div>
      <div className="dashboard-grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Markets</h2>
            <button type="button" className="btn-text">Learn more</button>
          </div>
          <div className="markets-list">
            <div className="market-row">
              <div className="market-row-left">
                <div className="coin-icon btc" style={{width: '36px', height: '36px', fontSize: '0.875rem'}}>B</div>
                <div>
                  <div className="coin-name">Bitcoin (BTC)</div>
                  <div className="market-price">$66,971.32</div>
                </div>
              </div>
              <span className="market-change positive">+1.63%</span>
            </div>
            <div className="market-row">
              <div className="market-row-left">
                <div className="coin-icon eth" style={{width: '36px', height: '36px', fontSize: '0.875rem'}}>E</div>
                <div>
                  <div className="coin-name">Ethereum (ETH)</div>
                  <div className="market-price">$3,481.47</div>
                </div>
              </div>
              <span className="market-change negative">-0.6%</span>
            </div>
            <div className="market-row">
              <div className="market-row-left">
                <div className="coin-icon" style={{width: '36px', height: '36px', fontSize: '0.875rem', background: '#22c55e'}}>B</div>
                <div>
                  <div className="coin-name">Bitcoin Cash (BCH)</div>
                  <div className="market-price">$430.66</div>
                </div>
              </div>
              <span className="market-change negative">-3.95%</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Swap</h2>
            <div className="card-actions">
              <select className="dropdown" aria-label="Currencies"><option>All Currencies</option></select>
              <button type="button" className="btn-text" aria-label="Refresh">↻</button>
            </div>
          </div>
          <div className="quick-swap">
            <div className="swap-field">
              <div className="swap-field-header">
                <span className="swap-currency">TON</span>
                <span className="swap-balance">Balance 219.48</span>
              </div>
              <div className="swap-amount">54.87</div>
            </div>
            <div className="swap-slider">
              <input type="range" min="0" max="100" value="25" aria-label="Amount percentage" />
            </div>
            <div className="swap-divider">
              <button type="button" className="icon-btn" aria-label="Swap">⇅</button>
            </div>
            <div className="swap-field">
              <div className="swap-field-header">
                <span className="swap-currency">USDT</span>
                <span className="swap-balance">Updated Balance 16203.85</span>
              </div>
              <div className="swap-amount">436.161</div>
            </div>
          </div>
        </div>
        <div className="card promo-card">
          <div className="promo-icon">+</div>
          <h3>Unlimited Access to Trading AI Bots!</h3>
          <p>In the beta version, you have access to staking, smart swap and new features.</p>
          <button type="button" className="btn-primary">Try it Now →</button>
        </div>
      </div>
    </div>
  )
}

