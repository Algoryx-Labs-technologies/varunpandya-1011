import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'

window.addEventListener('popstate', () => {
  // React will handle re-rendering through state updates
})

window.addEventListener('load', () => {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const validPath = path.toLowerCase() === '/trading' ? '/trading' : '/Dashboard'
  if (window.location.pathname !== validPath) {
    window.history.replaceState({}, '', validPath)
  }
})

const rootElement = document.querySelector<HTMLDivElement>('#app')!
const root = createRoot(rootElement)

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)

