const AUTH_STORAGE_KEY = 'algoryx_auth_token'
const AUTH_TOKEN = 'authenticated'

/**
 * Get the username from environment variables
 */
export function getAuthUsername(): string {
  return import.meta.env.VITE_AUTH_USERNAME || ''
}

/**
 * Get the password from environment variables
 */
export function getAuthPassword(): string {
  return import.meta.env.VITE_AUTH_PASSWORD || ''
}

/**
 * Authenticate user with username and password
 */
export function authenticate(username: string, password: string): boolean {
  const validUsername = getAuthUsername()
  const validPassword = getAuthPassword()

  if (!validUsername || !validPassword) {
    console.error('Auth credentials not configured in environment variables')
    return false
  }

  const isAuthenticated = username.trim() === validUsername && password === validPassword

  if (isAuthenticated) {
    // Store authentication token in localStorage
    localStorage.setItem(AUTH_STORAGE_KEY, AUTH_TOKEN)
  }

  return isAuthenticated
}

/**
 * Check if user is currently authenticated
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem(AUTH_STORAGE_KEY)
  return token === AUTH_TOKEN
}

/**
 * Logout user by clearing authentication token
 */
export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

/**
 * Get authentication token (for future use if needed)
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEY)
}

