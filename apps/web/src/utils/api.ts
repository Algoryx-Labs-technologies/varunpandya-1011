/**
 * API Utility
 * Handles API calls to the backend (AngelOne SmartAPI proxy)
 */
import { getAngelOneToken, getAngelOneRefreshToken, saveAngelOneToken, saveAngelOneRefreshToken } from './auth'
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

// Token refresh lock to prevent multiple simultaneous refresh attempts
let tokenRefreshPromise: Promise<boolean> | null = null

// Request deduplication cache - stores in-flight requests
const requestCache = new Map<string, Promise<Response>>()

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

/** Refresh token with lock to prevent concurrent refresh attempts */
async function refreshTokenIfNeeded(): Promise<boolean> {
  // If a refresh is already in progress, wait for it
  if (tokenRefreshPromise) {
    return tokenRefreshPromise
  }

  // Start new refresh
  tokenRefreshPromise = (async () => {
    try {
      const refreshToken = getAngelOneRefreshToken()
      const currentToken = getAngelOneToken()
      
      if (!refreshToken) {
        console.warn('No refresh token available')
        return false
      }

      const tokenResponse = await generateToken(refreshToken, currentToken || undefined)
      
      if (tokenResponse.status && tokenResponse.data) {
        saveAngelOneToken(tokenResponse.data.jwtToken)
        if (tokenResponse.data.refreshToken) {
          saveAngelOneRefreshToken(tokenResponse.data.refreshToken)
        }
        // Small delay to ensure token is saved
        await new Promise(resolve => setTimeout(resolve, 50))
        return true
      }
      
      return false
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    } finally {
      // Clear the lock after refresh completes
      tokenRefreshPromise = null
    }
  })()

  return tokenRefreshPromise
}

/** Make authenticated request with automatic token refresh on 401 */
async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Create cache key for request deduplication (only for GET requests)
  const isGet = !options.method || options.method === 'GET'
  const cacheKey = isGet ? `${url}:${JSON.stringify(options)}` : null
  
  // Check if same request is already in flight
  if (cacheKey && requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey)!
  }

  const makeRequest = async (): Promise<Response> => {
    const headers = authHeaders()
    return fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })
  }

  const executeRequest = async (): Promise<Response> => {
    let response = await makeRequest()
    
    // Only refresh on 401 (Unauthorized) - check 500 errors for auth issues
    if (response.status === 401 && getAngelOneRefreshToken()) {
      const refreshSuccess = await refreshTokenIfNeeded()
      
      if (refreshSuccess) {
        // Retry with new token
        response = await makeRequest()
      }
    } else if (response.status === 500 && getAngelOneRefreshToken()) {
      // For 500 errors, check if it's auth-related before refreshing
      try {
        const clonedResponse = response.clone()
        const errorData = await clonedResponse.json().catch(() => null)
        const isAuthError = errorData?.errorcode === 'UNAUTHORIZED' || 
                           errorData?.message?.toLowerCase().includes('token') ||
                           errorData?.message?.toLowerCase().includes('unauthorized') ||
                           errorData?.message?.toLowerCase().includes('expired')
        
        if (isAuthError) {
          const refreshSuccess = await refreshTokenIfNeeded()
          if (refreshSuccess) {
            response = await makeRequest()
          }
        }
      } catch (parseError) {
        // If we can't parse, don't refresh on 500
      }
    }
    
    return response
  }

  const requestPromise = executeRequest()
  
  // Cache GET requests to prevent duplicates
  if (cacheKey) {
    requestCache.set(cacheKey, requestPromise)
    // Remove from cache after request completes (success or failure)
    requestPromise.finally(() => {
      requestCache.delete(cacheKey)
    })
  }
  
  return requestPromise
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
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/profile`, { method: 'GET' })
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
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/rms`, { method: 'GET' })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * POST /api/auth/logout – logout and invalidate session
 */
export async function logoutApi(clientcode: string): Promise<{ status: boolean; message: string; errorcode: string; data: string }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    body: JSON.stringify({ clientcode }),
  })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * GET /api/portfolio/holding – get holding (long-term equity delivery)
 */
export async function getHoldingApi(): Promise<{ status: boolean; message: string; errorcode: string; data: any[] }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/portfolio/holding`, { method: 'GET' })
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
  const response = await authenticatedFetch(`${API_BASE_URL}/api/portfolio/all-holdings`, { method: 'GET' })
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
  const response = await authenticatedFetch(`${API_BASE_URL}/api/portfolio/position`, { method: 'GET' })
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
  const response = await authenticatedFetch(`${API_BASE_URL}/api/portfolio/convert-position`, {
    method: 'POST',
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
  const response = await authenticatedFetch(`${API_BASE_URL}/api/brokerage/estimate-charges`, {
    method: 'POST',
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
  const response = await authenticatedFetch(`${API_BASE_URL}/api/margin/calculate`, {
    method: 'POST',
    body: JSON.stringify({ positions }),
  })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * POST /api/market-data/gainers-losers – top gainers/losers (OI or price) for derivatives
 */
export async function getGainersLosersApi(body: {
  datatype: 'PercOIGainers' | 'PercOILosers' | 'PercPriceGainers' | 'PercPriceLosers'
  expirytype: 'NEAR' | 'NEXT' | 'FAR'
}): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: { tradingSymbol: string; percentChange: number; symbolToken: number; ltp: number; netChange: number }[]
}> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/market-data/gainers-losers`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * GET /api/market-data/put-call-ratio – PCR for options (mapped to futures symbols)
 */
export async function getPutCallRatioApi(): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: { pcr: number; tradingSymbol: string }[]
}> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/market-data/put-call-ratio`, {
    method: 'GET',
  })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * GET /api/order/order-book – order book (all orders)
 */
export async function getOrderBookApi(): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: import('../types/orderBook').OrderBookItem[]
}> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/order/order-book`, {
    method: 'GET',
  })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * GET /api/order/trade-book – trade book (today's trades)
 */
export async function getTradeBookApi(): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: import('../types/tradeBook').TradeBookItem[]
}> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/order/trade-book`, {
    method: 'GET',
  })
  const data = await response.json()
  return parseResponse(response, data)
}

/**
 * POST /api/market-data/oi-buildup – long/short buildup, short covering, long unwinding
 */
export async function getOIBuildupApi(body: {
  expirytype: 'NEAR' | 'NEXT' | 'FAR'
  datatype: 'Long Built Up' | 'Short Built Up' | 'Short Covering' | 'Long Unwinding'
}): Promise<{
  status: boolean
  message: string
  errorcode: string
  data: { symbolToken: string; ltp: string; netChange: string; percentChange: string; opnInterest: string; netChangeOpnInterest: string; tradingSymbol: string }[]
}> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/market-data/oi-buildup`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await response.json()
  return parseResponse(response, data)
}

