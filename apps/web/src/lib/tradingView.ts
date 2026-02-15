const TRADINGVIEW_SCRIPT_URL =
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'

/** AAPL on NASDAQ. TradingView format is EXCHANGE:SYMBOL. Config must be in the same script tag as src so the widget can read it. */
const CHART_SYMBOL = 'NASDAQ:AAPL'

function getTradingViewConfig(interval: string) {
  return {
    autosize: true,
    symbol: CHART_SYMBOL,
    interval: interval === 'D' ? 'D' : interval,
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'en',
    allow_symbol_change: true,
    calendar: false,
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
  widgetInner.style.height = '100%'
  widgetInner.style.width = '100%'

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = TRADINGVIEW_SCRIPT_URL
  script.async = true
  script.innerHTML = JSON.stringify(config)

  widgetContainer.appendChild(widgetInner)
  widgetContainer.appendChild(script)
  container.appendChild(widgetContainer)
}
