/**
 * API Utility
 * Handles API calls to the backend (AngelOne SmartAPI proxy)
 */
import { getAngelOneToken } from './auth'
import type { ProfileResponse } from '../types'

export type { ProfileResponse }

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

/** Build headers for authenticated requests */
function authHeaders(): Record<string, string> {
  const token = getAngelOneToken()
  if (!token) {
    throw { status: false, message: 'Not authenticated', errorcode: 'UNAUTHORIZED' } as ApiError
  }
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/** Parse API response and throw on error */
async function parseResponse<T>(response: Response, data: any): Promise<T> {
  if (!response.ok || (data && data.status === false)) {
    throw {
      status: false,
      message: data?.message || 'Request failed',
      errorcode: data?.errorcode || 'UNKNOWN_ERROR',
      data: data?.data,
    } as ApiError
  }
  return data as T
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
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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

/**
 * Get user profile from AngelOne API
 */
export async function getProfile(): Promise<ProfileResponse> {
  try {
    const token = localStorage.getItem('Angel_token')
    
    if (!token) {
      throw {
        status: false,
        message: 'No authentication token found',
        errorcode: 'UNAUTHORIZED',
      } as ApiError
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }))
      throw {
        status: false,
        message: errorData.message || 'Failed to fetch profile',
        errorcode: errorData.errorcode || 'HTTP_ERROR',
        data: errorData.data,
      } as ApiError
    }

    const data = await response.json()

    if (!data.status) {
      throw {
        status: false,
        message: data.message || 'Failed to fetch profile',
        errorcode: data.errorcode || 'UNKNOWN_ERROR',
        data: data.data,
      } as ApiError
    }

    return data as ProfileResponse
  } catch (error: any) {
    if (error.status === false) throw error
    throw { status: false, message: error.message || 'Network error', errorcode: 'NETWORK_ERROR' } as ApiError
  }
}

/**
 * POST /api/auth/generate-token – generate new tokens using refresh token
 */
export async function generateToken(refreshToken: string, authorizationToken?: string): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: { jwtToken: string; refreshToken: string; feedToken: string }
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/generate-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(authorizationToken ? { Authorization: `Bearer ${authorizationToken}` } : {}),
    },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * GET /api/auth/profile – get user profile
 */
export async function getProfileApi(): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: { clientcode: string; name: string; email: string; mobileno: string; exchanges: string[]; products: string[]; lastlogintime: string; brokerid: string }
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, { method: 'GET', headers: authHeaders() })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * GET /api/auth/rms – get RMS limit (funds, cash, margin)
 */
export async function getRMSLimitApi(): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: Record<string, string>
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/rms`, { method: 'GET', headers: authHeaders() })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * POST /api/auth/logout – logout and invalidate session
 */
export async function logoutApi(clientcode: string): Promise<{ status: boolean; message: string; errorcode: string; data: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ clientcode }),
  })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * GET /api/portfolio/holding – get holding (long-term equity delivery)
 */
export async function getHoldingApi(): Promise<{ status: boolean; message: string; errorcode: string; data: any[] }> {
  const response = await fetch(`${API_BASE_URL}/api/portfolio/holding`, { method: 'GET', headers: authHeaders() })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * GET /api/portfolio/all-holdings – get all holdings with summary
 */
export async function getAllHoldingsApi(): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: { holdings: any[]; totalholding: { totalholdingvalue: number; totalinvvalue: number; totalprofitandloss: number; totalpnlpercentage: number } }
}> {
  const response = await fetch(`${API_BASE_URL}/api/portfolio/all-holdings`, { method: 'GET', headers: authHeaders() })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * GET /api/portfolio/position – get net and day positions
 */
export async function getPositionApi(): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: { net?: any[]; day?: any[] } | any[]
}> {
  const response = await fetch(`${API_BASE_URL}/api/portfolio/position`, { method: 'GET', headers: authHeaders() })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * POST /api/portfolio/convert-position – convert position margin product
 */
export async function convertPositionApi(body: {
  exchange: string
  symboltoken: string
  oldproducttype: string
  newproducttype: string
  tradingsymbol: string
  symbolname?: string
  instrumenttype?: string
  priceden?: string
  pricenum?: string
  genden?: string
  gennum?: string
  precision?: string
  multiplier?: string
  boardlotsize?: string
  buyqty: string
  sellqty: string
  buyamount: string
  sellamount: string
  transactiontype: string
  quantity: number
  type: string
}): Promise<{ status: boolean; message: string; errorcode: string; data: null }> {
  const response = await fetch(`${API_BASE_URL}/api/portfolio/convert-position`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * POST /api/brokerage/estimate-charges – estimate brokerage charges
 */
export async function estimateBrokerageChargesApi(orders: {
  product_type: string
  transaction_type: string
  quantity: string
  price: string
  exchange: string
  symbol_name: string
  token: string
}[]): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: { summary: { total_charges: number; trade_value: number; breakup: any[] }; charges: any[] }
}> {
  const response = await fetch(`${API_BASE_URL}/api/brokerage/estimate-charges`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ orders }),
  })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * POST /api/margin/calculate – calculate margin for a basket of positions
 */
export async function calculateMarginApi(positions: {
  exchange: string
  qty: number
  price: number
  productType: string
  token: string
  tradeType: string
  orderType?: string
}[]): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: { totalMarginRequired: number; marginComponents: Record<string, number> }
}> {
  const response = await fetch(`${API_BASE_URL}/api/margin/calculate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ positions }),
  })
  const data = await response.json()
  return parseResponse(response, data)
}

