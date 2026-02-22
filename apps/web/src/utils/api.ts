/**
 * API Utility
 * Handles API calls to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
const DEFAULT_STATE = import.meta.env.VITE_ANGELONE_STATE || undefined

console.log('API_BASE_URL configured as:', API_BASE_URL)

export interface LoginRequest {
  username: string
  password: string
  clientcode: string
  pin: string
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
 * Call login API (validates username/password on server, then calls AngelOne)
 */
export async function loginToAngelOne(credentials: {
  username: string
  password: string
  clientcode: string
  pin: string
  totp: string
  state?: string
}): Promise<LoginResponse> {
  try {
    // Prepare request body with optional state from env
    const requestBody: LoginRequest = {
      username: credentials.username,
      password: credentials.password,
      clientcode: credentials.clientcode,
      pin: credentials.pin,
      totp: credentials.totp,
      ...(credentials.state || DEFAULT_STATE ? { state: credentials.state || DEFAULT_STATE } : {}),
    }

    console.log('API Request URL:', `${API_BASE_URL}/api/auth/login`)
    console.log('API Request Body:', requestBody)

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('API Response Status:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }))
      console.error('API Error Response:', errorData)
      throw {
        status: false,
        message: errorData.message || 'Login failed',
        errorcode: errorData.errorcode || 'HTTP_ERROR',
        data: errorData.data,
      } as ApiError
    }

    const data = await response.json()
    console.log('API Success Response:', data)

    if (!data.status) {
      throw {
        status: false,
        message: data.message || 'Login failed',
        errorcode: data.errorcode || 'UNKNOWN_ERROR',
        data: data.data,
      } as ApiError
    }

    return data as LoginResponse
  } catch (error: any) {
    console.error('API Call Error:', error)
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

