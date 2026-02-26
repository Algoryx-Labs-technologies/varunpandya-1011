import { useEffect, useState } from 'react'
import { getCurrentRoute, navigateTo, protectRoute, type RouteKey } from './router'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Trading from './components/Trading'
import Auth from './components/Auth'
import Profile from './components/Profile'

export default function App() {
  const [route, setRoute] = useState<RouteKey>(() => protectRoute(getCurrentRoute()))

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

  if (route === 'auth') {
    return <Auth onNavigate={handleNavigate} />
  }

  return (
    <>
      <Sidebar currentRoute={route} onNavigate={handleNavigate} />
      <div className="main-wrapper">
        <Header onNavigate={handleNavigate} />
        {route === 'dashboard' && <Dashboard />}
        {route === 'trading' && <Trading />}
        {route === 'profile' && <Profile />}
      </div>
    </>
  )
}

