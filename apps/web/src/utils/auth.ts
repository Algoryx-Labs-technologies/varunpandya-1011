const AUTH_STORAGE_KEY = 'algoryx_auth_token'
const AUTH_TOKEN = 'authenticated'
const ANGELONE_TOKEN_KEY = 'angle one token'

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
 * Get authentication token (for future use if needed)
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEY)
}

/**
 * Save AngelOne JWT token to localStorage
 */
export function saveAngelOneToken(token: string): void {
  localStorage.setItem(ANGELONE_TOKEN_KEY, token)
}

/**
 * Get AngelOne JWT token from localStorage
 */
export function getAngelOneToken(): string | null {
  return localStorage.getItem(ANGELONE_TOKEN_KEY)
}

/**
 * Clear AngelOne token
 */
export function clearAngelOneToken(): void {
  localStorage.removeItem(ANGELONE_TOKEN_KEY)
}

/**
 * Logout user by clearing all authentication tokens
 */
export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(ANGELONE_TOKEN_KEY)
}

