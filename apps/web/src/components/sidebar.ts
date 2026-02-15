import type { RouteKey } from '../constants/routes'
import { ROUTES } from '../constants/routes'

export function renderSidebar(current: RouteKey) {
  return `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="sidebar-logo-text">Algoryx Labs</span>
      </div>
      <nav>
        <ul class="nav-list">
          <li class="nav-section-label">TRADING</li>
          <li class="nav-item">
            <a href="${ROUTES.dashboard}" class="nav-link ${current === 'dashboard' ? 'active' : ''}" data-route="dashboard" aria-current="${current === 'dashboard' ? 'page' : undefined}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Dashboard
            </a>
          </li>
          <li class="nav-item">
            <a href="${ROUTES.trading}" class="nav-link ${current === 'trading' ? 'active' : ''}" data-route="trading" aria-current="${current === 'trading' ? 'page' : undefined}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              Trading
            </a>
          </li>
          <li class="nav-item nav-item-button">
            <button type="button" class="sidebar-add-trade btn-pill primary">+ Add Trade</button>
          </li>
        </ul>
      </nav>
    </aside>
  `
}
