import type { RouteKey } from '../constants/routes'
import { ROUTES } from '../constants/routes'

interface SidebarProps {
  currentRoute: RouteKey
  onNavigate: (route: RouteKey) => void
}

export default function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, route: RouteKey) => {
    e.preventDefault()
    onNavigate(route)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">+</div>
        <span className="sidebar-logo-text">Crypto Link</span>
      </div>
      <select className="sidebar-select" aria-label="Account">
        <option>Default</option>
      </select>
      <nav>
        <ul className="nav-list">
          <li className="nav-item">
            <a
              href={ROUTES.dashboard}
              className={`nav-link ${currentRoute === 'dashboard' ? 'active' : ''}`}
              onClick={(e) => handleClick(e, 'dashboard')}
              aria-current={currentRoute === 'dashboard' ? 'page' : undefined}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              Dashboard
            </a>
          </li>
          <li className="nav-item">
            <a
              href={ROUTES.trading}
              className={`nav-link ${currentRoute === 'trading' ? 'active' : ''}`}
              onClick={(e) => handleClick(e, 'trading')}
              aria-current={currentRoute === 'trading' ? 'page' : undefined}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              Trading
            </a>
          </li>
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button type="button" className="btn-pill primary">Wallet</button>
        <button type="button" className="btn-pill secondary">Pools</button>
      </div>
    </aside>
  )
}

