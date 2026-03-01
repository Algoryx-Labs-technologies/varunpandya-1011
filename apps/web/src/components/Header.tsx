import { useState, useEffect, useRef } from 'react'
import type { RouteKey } from '../constants/routes'
import { logout, getAngelOneToken } from '../utils/auth'
import { getProfileApi, logoutApi } from '../utils/api'

interface HeaderProps {
  onNavigate: (route: RouteKey) => void
}

// Cache key for storing user name in localStorage (same as Dashboard)
const USER_NAME_CACHE_KEY = 'algoryx_user_name'

// Extract first name from full name
function getFirstName(fullName: string): string {
  if (!fullName) return 'User'
  const parts = fullName.trim().split(' ')
  return parts[0] || 'User'
}

export default function Header({ onNavigate }: HeaderProps) {
  // Initialize from localStorage cache
  const [profileName, setProfileName] = useState<string>(() => {
    const cachedName = localStorage.getItem(USER_NAME_CACHE_KEY)
    return cachedName ? getFirstName(cachedName) : 'User'
  })
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const token = getAngelOneToken()
    if (!token) return

    const loadProfile = async () => {
      try {
        const res = await getProfileApi()
        if (!cancelled && isMountedRef.current && res?.data?.name) {
          const fullName = res.data.name.trim()
          if (fullName) {
            // Update localStorage cache
            localStorage.setItem(USER_NAME_CACHE_KEY, fullName)
            // Display first name in header
            const firstName = getFirstName(fullName)
            setProfileName(firstName)
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load profile in Header:', error)
          // Keep cached name if available
          const cachedName = localStorage.getItem(USER_NAME_CACHE_KEY)
          if (cachedName && isMountedRef.current) {
            setProfileName(getFirstName(cachedName))
          }
        }
      }
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = async () => {
    const token = getAngelOneToken()
    if (token) {
      try {
        const profile = await getProfileApi()
        const clientcode = profile.data?.clientcode
        if (clientcode) await logoutApi(clientcode)
      } catch (_) {
        // Proceed to clear local session even if API logout fails
      }
    }
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
            <div className="header-name">{profileName || 'User'}</div>
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

