import { useEffect, useState } from 'react'
import type { RouteKey } from './constants/routes'
import { getCurrentRoute, navigateTo } from './router'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Trading from './components/Trading'

function App() {
  const [route, setRoute] = useState<RouteKey>(getCurrentRoute())

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getCurrentRoute())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleNavigate = (newRoute: RouteKey) => {
    navigateTo(newRoute)
    setRoute(newRoute)
  }

  return (
    <>
      <Sidebar currentRoute={route} onNavigate={handleNavigate} />
      <div className="main-wrapper">
        <Header />
        {route === 'dashboard' ? <Dashboard /> : <Trading />}
      </div>
    </>
  )
}

export default App

