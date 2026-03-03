export const ROUTES = {
  auth: '/',
  dashboard: '/Dashboard',
  trading: '/trading',
  profile: '/profile',
  vertex: '/vertex',
} as const

export type RouteKey = keyof typeof ROUTES
