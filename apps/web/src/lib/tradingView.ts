const TRADINGVIEW_SCRIPT_URL =
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'

/** Nasdaq AAPL. TradingView format is EXCHANGE:SYMBOL. Config is read from the script tag innerHTML by the widget. */
const CHART_SYMBOL = 'NASDAQ:AAPL'

function getTradingViewConfig(interval: string) {
  return {
    autosize: true,
    symbol: CHART_SYMBOL,
    interval: interval === 'D' ? 'D' : interval,
    timezone: 'exchange',
    theme: 'dark',
    style: '1',
    locale: 'en',
    allow_symbol_change: true,
    calendar: false,
    hide_top_toolbar: false,
    save_image: true,
    support_host: 'https://www.tradingview.com',
  }
}

export function initTradingViewChart() {
  const container = document.getElementById('tradingview_chart_container')
  if (!container || container.querySelector('.tradingview-widget-container')) return

  const interval = 'D'
  const config = getTradingViewConfig(interval)

  const widgetContainer = document.createElement('div')
  widgetContainer.className = 'tradingview-widget-container'
  widgetContainer.style.height = '100%'
  widgetContainer.style.width = '100%'

  const widgetInner = document.createElement('div')
  widgetInner.className = 'tradingview-widget-container__widget'
  widgetInner.style.height = 'calc(100% - 32px)'
  widgetInner.style.width = '100%'

  const copyright = document.createElement('div')
  copyright.className = 'tradingview-widget-copyright'
  copyright.innerHTML =
    '<a href="https://www.tradingview.com/symbols/NASDAQ-AAPL/?utm_source=www.tradingview.com&amp;utm_medium=widget_new&amp;utm_campaign=advanced-chart" rel="noopener nofollow" target="_blank"><span class="blue-text">AAPL stock chart</span></a> <span class="trademark">by TradingView</span>'

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = TRADINGVIEW_SCRIPT_URL
  script.async = true
  script.innerHTML = JSON.stringify(config)

  widgetContainer.appendChild(widgetInner)
  widgetContainer.appendChild(copyright)
  widgetContainer.appendChild(script)
  container.appendChild(widgetContainer)
}
