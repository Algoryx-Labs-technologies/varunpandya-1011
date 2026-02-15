import type { RouteKey } from './constants/routes'
import { getCurrentRoute, navigateTo } from './router'
import { renderSidebar, renderHeader, renderDashboard, renderTrading, initDashboard, initOrderTradeBookTabs, initTerminalTime } from './components'
import { initTradingViewChart } from './lib/tradingView'

export function render() {
  const route = getCurrentRoute()
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    ${renderSidebar(route)}
    <div class="main-wrapper">
      ${renderHeader()}
      ${route === 'dashboard' ? renderDashboard() : renderTrading()}
    </div>
  `

  app.querySelectorAll('.nav-link[data-route]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      const r = (el as HTMLElement).dataset.route as RouteKey
      if (r) {
        navigateTo(r)
        render()
      }
    })
  })
  app.querySelector('.sidebar-add-trade')?.addEventListener('click', () => {
    navigateTo('trading')
    render()
  })

  if (route === 'dashboard') {
    initDashboard()
  }
  if (route === 'trading') {
    initTradingViewChart()
    initOrderTradeBookTabs()
    initTerminalTime()
  }
}
