/**
 * Trading bot API base URL for Vertex features.
 * When not set, uses same origin (relative /api and /ws).
 */
const BOT_API_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BOT_API_URL != null
  ? String(import.meta.env.VITE_BOT_API_URL).replace(/\/$/, '')
  : ''

export function getBotApiBase(): string {
  return BOT_API_BASE
}

export function getBotWsUrl(): string {
  if (BOT_API_BASE) {
    const u = BOT_API_BASE.replace(/^http/, 'ws')
    return `${u}/ws`
  }
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173'
  return `${protocol}//${host}/ws`
}
