export function renderHeader() {
  return `
    <header class="header">
      <div class="header-user">
        <div class="header-avatar">A</div>
        <div class="header-user-info">
          <div class="header-name">Varun Pandya 77929</div>
        </div>
      </div>
      <div class="header-actions">
        <button type="button" class="icon-btn" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>
        <div class="header-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span>Search Here...</span>
        </div>

      </div>
    </header>
  `
}
