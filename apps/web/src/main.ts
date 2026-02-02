import './style.css'
import { render } from './app'

window.addEventListener('popstate', render)
window.addEventListener('load', () => {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const validPath = path.toLowerCase() === '/trading' ? '/trading' : '/Dashboard'
  if (window.location.pathname !== validPath) {
    window.history.replaceState({}, '', validPath)
  }
  render()
})
