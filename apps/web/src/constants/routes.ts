export const ROUTES = {
  auth: '/',
  dashboard: '/Dashboard',
  trading: '/trading',
  profile: '/profile',
} as const

export type RouteKey = keyof typeof ROUTES
