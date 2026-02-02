import type { RouteKey } from '../constants/routes'
import { ROUTES } from '../constants/routes'

export function getCurrentRoute(): RouteKey {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  if (path.toLowerCase() === '/trading') return 'trading'
  return 'dashboard'
}

export function navigateTo(route: RouteKey) {
  const path = ROUTES[route]
  window.history.pushState({}, '', path)
}

export type { RouteKey } from '../constants/routes'
