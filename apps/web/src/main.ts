import './style.css'
import { render } from './app'
import { isAuthenticated } from './utils/auth'
import { protectRoute, getCurrentRoute } from './router'

window.addEventListener('popstate', render)

window.addEventListener('load', () => {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  let route = getCurrentRoute()
  
  // Check authentication and protect route
  route = protectRoute(route)
  
  // If route was protected and redirected to auth, update URL
  if (route === 'auth') {
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/')
    }
  } else {
    // Ensure authenticated users can access protected routes
    if (isAuthenticated()) {
      let validPath = '/Dashboard'
      if (path.toLowerCase() === '/trading') {
        validPath = '/trading'
      } else if (path.toLowerCase() === '/dashboard') {
        validPath = '/Dashboard'
      }
      if (window.location.pathname !== validPath) {
        window.history.replaceState({}, '', validPath)
      }
    } else {
      // Not authenticated, redirect to auth
      window.history.replaceState({}, '', '/')
    }
  }
  
  render()
})
