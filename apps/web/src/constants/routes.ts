export const ROUTES = {
  auth: '/',
  dashboard: '/Dashboard',
  trading: '/trading',
} as const

export type RouteKey = keyof typeof ROUTES
