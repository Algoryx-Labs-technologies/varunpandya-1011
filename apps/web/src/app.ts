import type { RouteKey } from './constants/routes'
import { getCurrentRoute, navigateTo } from './router'
// TODO: Uncomment in future to enable authentication middleware
// import { protectRoute } from './router'
import { renderSidebar, renderHeader, renderDashboard, renderTrading, renderAuth, initDashboard, initOrderTradeBookTabs, initTerminalTime, initAuth, initHeader } from './components'
import { initTradingViewChart } from './lib/tradingView'
// TODO: Uncomment in future to enable authentication middleware
// import { isAuthenticated } from './utils/auth'

export function render() {
  let route = getCurrentRoute()
  
  // TODO: Uncomment in future to enable authentication middleware
  // // Protect route - redirect to auth if not authenticated
  // route = protectRoute(route)
  // 
  // // If redirected to auth, update URL
  // if (route === 'auth' && isAuthenticated() && window.location.pathname !== '/') {
  //   // User is authenticated but somehow on auth page, redirect to dashboard
  //   navigateTo('dashboard')
  //   route = 'dashboard'
  // }
  
  const app = document.querySelector<HTMLDivElement>('#app')!
  
  if (route === 'auth') {
    app.className = 'auth-page'
    app.innerHTML = renderAuth()
    initAuth()
    return
  }
  
  app.className = ''
  
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

  // Initialize header (includes logout button)
  initHeader()

  if (route === 'dashboard') {
    initDashboard()
  }
  if (route === 'trading') {
    initTradingViewChart()
    initOrderTradeBookTabs()
    initTerminalTime()
  }
}
