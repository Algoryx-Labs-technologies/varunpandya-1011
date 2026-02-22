import type { RouteKey } from '../constants/routes'
import { ROUTES } from '../constants/routes'
import { isAuthenticated } from '../utils/auth'

export function getCurrentRoute(): RouteKey {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  if (path.toLowerCase() === '/trading') return 'trading'
  if (path.toLowerCase() === '/dashboard') return 'dashboard'
  if (path.toLowerCase() === '/profile') return 'profile'
  return 'auth'
}

/**
 * Check if a route requires authentication
 */
export function requiresAuth(route: RouteKey): boolean {
  return route !== 'auth'
}

/**
 * Navigate to a route with authentication check
 */
export function navigateTo(route: RouteKey) {
  // TODO: Uncomment in future to enable authentication middleware
  // // If route requires auth and user is not authenticated, redirect to auth
  // if (requiresAuth(route) && !isAuthenticated()) {
  //   const authPath = ROUTES.auth
  //   window.history.pushState({}, '', authPath)
  //   return
  // }

  const path = ROUTES[route]
  window.history.pushState({}, '', path)
}

/**
 * Protect route - redirect to auth if not authenticated
 */
export function protectRoute(route: RouteKey): RouteKey {
  // TODO: Uncomment in future to enable authentication middleware
  // if (requiresAuth(route) && !isAuthenticated()) {
  //   return 'auth'
  // }
  return route
}

export type { RouteKey } from '../constants/routes'
