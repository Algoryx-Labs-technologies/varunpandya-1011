import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import App from './App'
import { getCurrentRoute, protectRoute } from './router'

function initApp() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  
  // Normalize route paths
  if (path.toLowerCase() === '/trading') {
    if (window.location.pathname !== '/trading') {
      window.history.replaceState({}, '', '/trading')
    }
  } else if (path.toLowerCase() === '/dashboard') {
    if (window.location.pathname !== '/Dashboard') {
      window.history.replaceState({}, '', '/Dashboard')
    }
  } else if (path.toLowerCase() === '/profile') {
    if (window.location.pathname !== '/profile') {
      window.history.replaceState({}, '', '/profile')
    }
  } else if (path === '/') {
    // Default to auth page - middleware will handle redirect if authenticated
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/')
    }
  }
  
  // Apply route protection
  const currentRoute = getCurrentRoute()
  const protectedRoute = protectRoute(currentRoute)
  
  // Redirect if route was changed by protection
  if (protectedRoute !== currentRoute) {
    const authPath = protectedRoute === 'auth' ? '/' : `/${protectedRoute}`
    window.history.replaceState({}, '', authPath)
  }
  
  const root = document.getElementById('app')
  if (root) {
    const reactRoot = ReactDOM.createRoot(root)
    reactRoot.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  }
}

window.addEventListener('popstate', initApp)
window.addEventListener('load', initApp)

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initApp, 1)
} else {
  initApp()
}

