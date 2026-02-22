import type { RouteKey } from '../constants/routes'
import { logout } from '../utils/auth'

interface HeaderProps {
  onNavigate: (route: RouteKey) => void
}

export default function Header({ onNavigate }: HeaderProps) {
  const handleLogout = () => {
    logout()
    onNavigate('auth')
  }

  const handleProfileClick = () => {
    onNavigate('profile')
  }

  return (
    <header className="header">
      <div className="header-user">
        <button
          type="button"
          onClick={handleProfileClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: 0,
          }}
          aria-label="View Profile"
        >
          <div className="header-avatar">A</div>
          <div className="header-user-info">
            <div className="header-name">Varun Pandya 77929</div>
          </div>
        </button>
      </div>
      <div className="header-actions">
        <button type="button" className="icon-btn" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <div className="header-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span>Search Here...</span>
        </div>
        <button
          type="button"
          className="icon-btn header-logout"
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  )
}

