export default function Header() {
  return (
    <header className="header">
      <div className="header-user">
        <div className="header-avatar">A</div>
        <div className="header-user-info">
          <div className="header-name">Varun Pandya 77929</div>
        </div>
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
      </div>
    </header>
  )
}

