(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))r(e);new MutationObserver(e=>{for(const s of e)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&r(l)}).observe(document,{childList:!0,subtree:!0});function i(e){const s={};return e.integrity&&(s.integrity=e.integrity),e.referrerPolicy&&(s.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?s.credentials="include":e.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(e){if(e.ep)return;e.ep=!0;const s=i(e);fetch(e.href,s)}})();const c={dashboard:"/Dashboard",trading:"/trading"};function u(){return(window.location.pathname.replace(/\/$/,"")||"/").toLowerCase()==="/trading"?"trading":"dashboard"}function h(t){const a=c[t];window.history.pushState({},"",a)}const p=[{key:"orderid",label:"Order ID"},{key:"tradingsymbol",label:"Trading Symbol"},{key:"transactiontype",label:"Type"},{key:"quantity",label:"Qty"},{key:"price",label:"Price"},{key:"triggerprice",label:"Trigger Price"},{key:"averageprice",label:"Avg Price"},{key:"status",label:"Status"},{key:"orderstatus",label:"Order Status"},{key:"variety",label:"Variety"},{key:"ordertype",label:"Order Type"},{key:"producttype",label:"Product"},{key:"duration",label:"Duration"},{key:"exchange",label:"Exchange"},{key:"disclosedquantity",label:"Disclosed Qty"},{key:"squareoff",label:"Square Off"},{key:"stoploss",label:"Stop Loss"},{key:"trailingstoploss",label:"Trailing SL"},{key:"symboltoken",label:"Symbol Token"},{key:"instrumenttype",label:"Instrument"},{key:"strikeprice",label:"Strike Price"},{key:"optiontype",label:"Option Type"},{key:"expirydate",label:"Expiry"},{key:"lotsize",label:"Lot Size"},{key:"cancelsize",label:"Cancel Size"},{key:"filledshares",label:"Filled"},{key:"unfilledshares",label:"Unfilled"},{key:"text",label:"Text"},{key:"updatetime",label:"Update Time"},{key:"exchtime",label:"Exch Time"},{key:"exchorderupdatetime",label:"Exch Order Update"},{key:"fillid",label:"Fill ID"},{key:"filltime",label:"Fill Time"},{key:"parentorderid",label:"Parent Order ID"},{key:"uniqueorderid",label:"Unique Order ID"},{key:"exchangeorderid",label:"Exchange Order ID"}];function d(t){const a=document.createElement("div");return a.textContent=t,a.innerHTML}function y(t){const a=p.map(r=>`<th class="order-book-th">${r.label}</th>`).join(""),i=t.map(r=>`<tr class="order-book-tr">${p.map(e=>{const s=r[e.key],l=s==null?"":String(s);return`<td class="order-book-td ${e.key==="transactiontype"?l.toUpperCase()==="BUY"?"positive":"negative":e.key==="status"||e.key==="orderstatus"?"order-book-status":""}">${d(l)}</td>`}).join("")}</tr>`).join("");return`
    <div class="order-book-table-wrap">
      <table class="order-book-table">
        <thead><tr>${a}</tr></thead>
        <tbody>${i}</tbody>
      </table>
    </div>
  `}const b=[{key:"orderid",label:"Order ID"},{key:"fillid",label:"Fill ID"},{key:"tradingsymbol",label:"Trading Symbol"},{key:"transactiontype",label:"Type"},{key:"fillsize",label:"Fill Size"},{key:"fillprice",label:"Fill Price"},{key:"tradevalue",label:"Trade Value"},{key:"filltime",label:"Fill Time"},{key:"exchange",label:"Exchange"},{key:"producttype",label:"Product"},{key:"instrumenttype",label:"Instrument"},{key:"symbolgroup",label:"Symbol Group"},{key:"strikeprice",label:"Strike Price"},{key:"optiontype",label:"Option Type"},{key:"expirydate",label:"Expiry"},{key:"marketlot",label:"Market Lot"},{key:"precision",label:"Precision"},{key:"multiplier",label:"Multiplier"}];function g(t){const a=b.map(r=>`<th class="order-book-th">${r.label}</th>`).join(""),i=t.map(r=>`<tr class="order-book-tr">${b.map(e=>{const s=r[e.key],l=s==null?"":String(s);return`<td class="order-book-td ${e.key==="transactiontype"?l.toUpperCase()==="BUY"?"positive":"negative":""}">${d(l)}</td>`}).join("")}</tr>`).join("");return`
    <div class="order-book-table-wrap">
      <table class="order-book-table">
        <thead><tr>${a}</tr></thead>
        <tbody>${i}</tbody>
      </table>
    </div>
  `}function m(t){return`
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">+</div>
        <span class="sidebar-logo-text">Crypto Link</span>
      </div>
      <select class="sidebar-select" aria-label="Account">
        <option>Default</option>
      </select>
      <nav>
        <ul class="nav-list">
          <li class="nav-item">
            <a href="${c.dashboard}" class="nav-link ${t==="dashboard"?"active":""}" data-route="dashboard" aria-current="${t==="dashboard"?"page":void 0}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Dashboard
            </a>
          </li>
          <li class="nav-item">
            <a href="${c.trading}" class="nav-link ${t==="trading"?"active":""}" data-route="trading" aria-current="${t==="trading"?"page":void 0}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              Trading
            </a>
          </li>
        </ul>
      </nav>
      <div class="sidebar-footer">
        <button type="button" class="btn-pill primary">Wallet</button>
        <button type="button" class="btn-pill secondary">Pools</button>
      </div>
    </aside>
  `}function k(){return`
    <header class="header">
      <div class="header-user">
        <div class="header-avatar">A</div>
        <div class="header-user-info">
          <div class="header-name">Varun Pandya 77929</div>
        </div>
      </div>
      <div class="header-actions">
        <button type="button" class="icon-btn" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>
        <div class="header-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span>Search Here...</span>
        </div>

      </div>
    </header>
  `}function f(){return`
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
  `}function w(){return[{variety:"NORMAL",ordertype:"LIMIT",producttype:"INTRADAY",duration:"DAY",price:"194.00",triggerprice:"0",quantity:"1",disclosedquantity:"0",squareoff:"0",stoploss:"0",trailingstoploss:"0",tradingsymbol:"SBIN-EQ",transactiontype:"BUY",exchange:"NSE",symboltoken:null,instrumenttype:"",strikeprice:"-1",optiontype:"",expirydate:"",lotsize:"1",cancelsize:"1",averageprice:"0",filledshares:"0",unfilledshares:"1",orderid:0xb6d39db15850,text:"",status:"cancelled",orderstatus:"cancelled",updatetime:"20-Oct-2020 13:10:59",exchtime:"20-Oct-2020 13:10:59",exchorderupdatetime:"20-Oct-2020 13:10:59",fillid:"",filltime:"",parentorderid:"",uniqueorderid:"34reqfachdfih",exchangeorderid:"1100000000048358"}]}function T(){return[{exchange:"NSE",producttype:"DELIVERY",tradingsymbol:"ITC-EQ",instrumenttype:"",symbolgroup:"EQ",strikeprice:"-1",optiontype:"",expirydate:"",marketlot:"1",precision:"2",multiplier:"-1",tradevalue:"175.00",transactiontype:"BUY",fillprice:"175.00",fillsize:"1",orderid:"201020000000095",fillid:"50005750",filltime:"13:27:53"}]}function x(){return[{time:"2025-02-03 10:15:32",level:"INFO",message:"Strategy bot started",strategy:"BTC-USDT DCA"},{time:"2025-02-03 10:15:33",level:"INFO",message:"Connected to exchange",strategy:"BTC-USDT DCA"},{time:"2025-02-03 10:16:01",level:"INFO",message:"Signal: BUY – price within range",strategy:"BTC-USDT DCA"},{time:"2025-02-03 10:16:02",level:"INFO",message:"Order placed – 0.001 BTC @ 67000",strategy:"BTC-USDT DCA"},{time:"2025-02-03 10:18:45",level:"INFO",message:"Order filled",strategy:"BTC-USDT DCA"},{time:"2025-02-03 10:20:00",level:"WARN",message:"Position size near limit",strategy:"BTC-USDT DCA"}]}function C(){return`
    <div class="logs-table-wrap">
      <table class="logs-table">
        <thead>
          <tr>
            <th class="logs-table-th">Time</th>
            <th class="logs-table-th">Level</th>
            <th class="logs-table-th">Message</th>
            <th class="logs-table-th">Strategy</th>
          </tr>
        </thead>
        <tbody>${x().map(i=>`<tr class="logs-table-tr">
          <td class="logs-table-td logs-table-time">${d(i.time)}</td>
          <td class="logs-table-td logs-table-level logs-level-${i.level}">${d(i.level)}</td>
          <td class="logs-table-td logs-table-message">${d(i.message)}</td>
          <td class="logs-table-td logs-table-strategy">${d(i.strategy)}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
  `}function B(){return`
    <div class="page-content">
      <div class="trading-layout">
        <div class="card trading-chart-card">
          <div id="tradingview_chart_container" class="tradingview-chart-container"></div>
        </div>
        <div class="card order-form trading-place-order">
          <h2 class="card-title" style="margin-bottom: 16px;">Place Order</h2>
          <div class="form-group">
            <label>Amount</label>
            <input type="text" value="0.00" placeholder="0.00">
          </div>
          <div class="form-group">
            <label>Price</label>
            <input type="text" value="67,000.00" placeholder="Price">
          </div>
          <div class="form-group">
            <label>Total</label>
            <input type="text" value="0.00" readonly>
          </div>
          <button type="button" class="btn-buy">Buy BTC</button>
          <button type="button" class="btn-sell">Sell BTC</button>
        </div>
        <div class="card order-trade-book-card">
          <div class="order-trade-book-tabs" role="tablist">
            <button type="button" class="order-trade-book-tab active" role="tab" data-tab="order-book" aria-selected="true">Order Book</button>
            <button type="button" class="order-trade-book-tab" role="tab" data-tab="trade-book" aria-selected="false">Trade Book</button>
            <button type="button" class="order-trade-book-tab" role="tab" data-tab="logs" aria-selected="false">Logs</button>
          </div>
          <div id="order-book-pane" class="order-trade-book-pane active" role="tabpanel">
            ${y(w())}
          </div>
          <div id="trade-book-pane" class="order-trade-book-pane" role="tabpanel" hidden>
            ${g(T())}
          </div>
          <div id="logs-pane" class="order-trade-book-pane" role="tabpanel" hidden>
            ${C()}
          </div>
        </div>
      </div>
    </div>
  `}function S(){const t=document.querySelectorAll(".order-trade-book-tab"),a=document.getElementById("order-book-pane"),i=document.getElementById("trade-book-pane"),r=document.getElementById("logs-pane");if(!t.length||!a||!i||!r)return;const e={"order-book":a,"trade-book":i,logs:r};t.forEach(s=>{s.addEventListener("click",()=>{const l=s.dataset.tab;!l||!e[l]||(t.forEach(o=>{o.classList.toggle("active",o===s),o.setAttribute("aria-selected",o===s?"true":"false")}),Object.keys(e).forEach(o=>{const n=e[o];o===l?(n.classList.add("active"),n.removeAttribute("hidden")):(n.classList.remove("active"),n.setAttribute("hidden",""))}))})})}const O="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";function E(t){return{autosize:!0,symbol:"BINANCE:BTCUSDT",interval:t==="D"?"D":t,timezone:"Etc/UTC",theme:"dark",style:"1",locale:"en",allow_symbol_change:!0,calendar:!1,support_host:"https://www.tradingview.com"}}function D(){const t=document.getElementById("tradingview_chart_container");if(!t||t.querySelector(".tradingview-widget-container"))return;const a="D",i=document.createElement("div");i.className="tradingview-widget-container",i.style.height="100%",i.style.width="100%";const r=document.createElement("div");r.className="tradingview-widget-container__widget",r.style.height="100%",r.style.width="100%";const e=document.createElement("script");e.type="text/javascript",e.src=O,e.async=!0,e.textContent=JSON.stringify(E(a)),i.appendChild(r),i.appendChild(e),t.appendChild(i)}function v(){const t=u(),a=document.querySelector("#app");a.innerHTML=`
    ${m(t)}
    <div class="main-wrapper">
      ${k()}
      ${t==="dashboard"?f():B()}
    </div>
  `,a.querySelectorAll(".nav-link[data-route]").forEach(i=>{i.addEventListener("click",r=>{r.preventDefault();const e=i.dataset.route;e&&(h(e),v())})}),t==="trading"&&(D(),S())}window.addEventListener("popstate",v);window.addEventListener("load",()=>{const a=(window.location.pathname.replace(/\/$/,"")||"/").toLowerCase()==="/trading"?"/trading":"/Dashboard";window.location.pathname!==a&&window.history.replaceState({},"",a),v()});
