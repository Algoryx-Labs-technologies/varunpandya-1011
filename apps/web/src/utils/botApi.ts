/**
 * Trading bot API base URL for Vertex features.
 * Defaults to backend on port 4000 if not set.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
const BOT_API_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BOT_API_URL != null
  ? String(import.meta.env.VITE_BOT_API_URL).replace(/\/$/, '')
  : API_BASE_URL

export function getBotApiBase(): string {
  return BOT_API_BASE
}

export function getBotWsUrl(): string {
  if (BOT_API_BASE) {
    const u = BOT_API_BASE.replace(/^http/, 'ws')
    return `${u}/ws`
  }
  // Fallback to backend WebSocket
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:4000'
  return `${protocol}//${host}/ws`
}
