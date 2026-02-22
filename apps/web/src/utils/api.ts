/**
 * API Utility
 * Handles API calls to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const DEFAULT_STATE = import.meta.env.VITE_ANGELONE_STATE || undefined

export interface LoginRequest {
  clientcode: string
  password: string
  totp: string
  state?: string
}

export interface LoginResponse {
  status: boolean
  message: string
  errorcode: string
  data: {
    jwtToken: string
    refreshToken: string
    feedToken: string
    state?: string
  }
}

export interface ApiError {
  status: false
  message: string
  errorcode: string
  data?: any
}

/**
 * Call AngelOne login API
 */
export async function loginToAngelOne(credentials: {
  clientcode: string
  password: string
  totp: string
  state?: string
}): Promise<LoginResponse> {
  try {
    // Prepare request body with optional state from env
    const requestBody: LoginRequest = {
      clientcode: credentials.clientcode,
      password: credentials.password,
      totp: credentials.totp,
      ...(credentials.state || DEFAULT_STATE ? { state: credentials.state || DEFAULT_STATE } : {}),
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    if (!response.ok || !data.status) {
      throw {
        status: false,
        message: data.message || 'Login failed',
        errorcode: data.errorcode || 'UNKNOWN_ERROR',
        data: data.data,
      } as ApiError
    }

    return data as LoginResponse
  } catch (error: any) {
    if (error.status === false) {
      throw error
    }
    throw {
      status: false,
      message: error.message || 'Network error',
      errorcode: 'NETWORK_ERROR',
    } as ApiError
  }
}

