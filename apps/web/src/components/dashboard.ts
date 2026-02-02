export function renderDashboard() {
  return `
    <div class="page-content">
      <div class="dashboard-grid">
        <div class="card balance-card">
          <div class="card-header">
            <h2 class="card-title">My Balance</h2>
            <div class="card-actions">
              <select class="dropdown" aria-label="Assets"><option>All Assets</option></select>
              <select class="dropdown" aria-label="Period"><option>24h</option></select>
              <button type="button" class="btn-text" aria-label="Refresh">↻</button>
              <button type="button" class="btn-text" aria-label="Undo">↶</button>
            </div>
          </div>
          <p class="balance-value">$164,802.43</p>
          <p class="balance-change positive">+$3,948.23 (12.00%)</p>
          <p class="balance-sub">6.09% More than last week period</p>
          <div class="chart-placeholder">
            <span class="chart-line"></span>
            <span class="chart-dot"></span>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">My Top Coins</h2>
            <span class="badge badge-blue">3 Assets</span>
            <div class="card-actions">
              <span style="color: var(--text-muted); font-size: 0.8125rem;">Based on recent 24 hours</span>
              <select class="dropdown" aria-label="Currencies"><option>All Currencies</option></select>
              <select class="dropdown" aria-label="Period"><option>24h</option></select>
              <button type="button" class="btn-text">Add to watchlist</button>
            </div>
          </div>
          <div class="top-coins-row">
            <div class="coin-mini-card">
              <div class="coin-mini-header">
                <div class="coin-icon btc">B</div>
                <div>
                  <div class="coin-name">Bitcoin</div>
                  <div class="coin-symbol">BTC</div>
                </div>
              </div>
              <div class="coin-value">0.823075</div>
              <div class="coin-change positive">+1.63%</div>
              <div class="coin-fiat">$57,096.48</div>
              <div class="coin-chart-mini" style="background: linear-gradient(180deg, rgba(59, 130, 246, 0.25) 0%, transparent 100%);"></div>
            </div>
            <div class="coin-mini-card">
              <div class="coin-mini-header">
                <div class="coin-icon eth">E</div>
                <div>
                  <div class="coin-name">Ethereum</div>
                  <div class="coin-symbol">ETH</div>
                </div>
              </div>
              <div class="coin-value">2.9383</div>
              <div class="coin-change negative">-0.84%</div>
              <div class="coin-fiat">$10,793.64</div>
              <div class="coin-chart-mini" style="background: linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, transparent 100%);"></div>
            </div>
            <div class="coin-mini-card">
              <div class="coin-mini-header">
                <div class="coin-icon sol">S</div>
                <div>
                  <div class="coin-name">Solana</div>
                  <div class="coin-symbol">SOL</div>
                </div>
              </div>
              <div class="coin-value">419.68</div>
              <div class="coin-change negative">-3.09%</div>
              <div class="coin-fiat">$67,108.32</div>
              <div class="coin-chart-mini" style="background: linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, transparent 100%);"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="dashboard-grid-2">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Markets</h2>
            <button type="button" class="btn-text">Learn more</button>
          </div>
          <div class="markets-list">
            <div class="market-row">
              <div class="market-row-left">
                <div class="coin-icon btc" style="width: 36px; height: 36px; font-size: 0.875rem;">B</div>
                <div>
                  <div class="coin-name">Bitcoin (BTC)</div>
                  <div class="market-price">$66,971.32</div>
                </div>
              </div>
              <span class="market-change positive">+1.63%</span>
            </div>
            <div class="market-row">
              <div class="market-row-left">
                <div class="coin-icon eth" style="width: 36px; height: 36px; font-size: 0.875rem;">E</div>
                <div>
                  <div class="coin-name">Ethereum (ETH)</div>
                  <div class="market-price">$3,481.47</div>
                </div>
              </div>
              <span class="market-change negative">-0.6%</span>
            </div>
            <div class="market-row">
              <div class="market-row-left">
                <div class="coin-icon" style="width: 36px; height: 36px; font-size: 0.875rem; background: #22c55e;">B</div>
                <div>
                  <div class="coin-name">Bitcoin Cash (BCH)</div>
                  <div class="market-price">$430.66</div>
                </div>
              </div>
              <span class="market-change negative">-3.95%</span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Quick Swap</h2>
            <div class="card-actions">
              <select class="dropdown" aria-label="Currencies"><option>All Currencies</option></select>
              <button type="button" class="btn-text" aria-label="Refresh">↻</button>
            </div>
          </div>
          <div class="quick-swap">
            <div class="swap-field">
              <div class="swap-field-header">
                <span class="swap-currency">TON</span>
                <span class="swap-balance">Balance 219.48</span>
              </div>
              <div class="swap-amount">54.87</div>
            </div>
            <div class="swap-slider">
              <input type="range" min="0" max="100" value="25" aria-label="Amount percentage">
            </div>
            <div class="swap-divider">
              <button type="button" class="icon-btn" aria-label="Swap">⇅</button>
            </div>
            <div class="swap-field">
              <div class="swap-field-header">
                <span class="swap-currency">USDT</span>
                <span class="swap-balance">Updated Balance 16203.85</span>
              </div>
              <div class="swap-amount">436.161</div>
            </div>
          </div>
        </div>
        <div class="card promo-card">
          <div class="promo-icon">+</div>
          <h3>Unlimited Access to Trading AI Bots!</h3>
          <p>In the beta version, you have access to staking, smart swap and new features.</p>
          <button type="button" class="btn-primary">Try it Now →</button>
        </div>
      </div>
    </div>
  `
}
