const TRADINGVIEW_SCRIPT_URL =
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'

function getTradingViewConfig(interval: string) {
  return {
    autosize: true,
    symbol: 'BINANCE:BTCUSDT',
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
  script.textContent = JSON.stringify(getTradingViewConfig(interval))

  widgetContainer.appendChild(widgetInner)
  widgetContainer.appendChild(script)
  container.appendChild(widgetContainer)
}
