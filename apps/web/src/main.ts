import './style.css'
import { render } from './app'
// TODO: Uncomment in future to enable authentication middleware
// import { isAuthenticated } from './utils/auth'
import { getCurrentRoute } from './router'
// import { protectRoute } from './router'

window.addEventListener('popstate', render)

window.addEventListener('load', () => {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  getCurrentRoute() // Keep for route detection
  
  // TODO: Uncomment in future to enable authentication middleware
  // // Check authentication and protect route
  // route = protectRoute(route)
  // 
  // // If route was protected and redirected to auth, update URL
  // if (route === 'auth') {
  //   if (window.location.pathname !== '/') {
  //     window.history.replaceState({}, '', '/')
  //   }
  // } else {
  //   // Ensure authenticated users can access protected routes
  //   if (isAuthenticated()) {
  //     let validPath = '/Dashboard'
  //     if (path.toLowerCase() === '/trading') {
  //       validPath = '/trading'
  //     } else if (path.toLowerCase() === '/dashboard') {
  //       validPath = '/Dashboard'
  //     }
  //     if (window.location.pathname !== validPath) {
  //       window.history.replaceState({}, '', validPath)
  //     }
  //   } else {
  //     // Not authenticated, redirect to auth
  //     window.history.replaceState({}, '', '/')
  //   }
  // }
  
  // Normalize route paths
  if (path.toLowerCase() === '/trading') {
    if (window.location.pathname !== '/trading') {
      window.history.replaceState({}, '', '/trading')
    }
  } else if (path.toLowerCase() === '/dashboard') {
    if (window.location.pathname !== '/Dashboard') {
      window.history.replaceState({}, '', '/Dashboard')
    }
  } else if (path === '/') {
    // Default to dashboard when auth is disabled
    if (window.location.pathname !== '/Dashboard') {
      window.history.replaceState({}, '', '/Dashboard')
    }
  }
  
  render()
})
