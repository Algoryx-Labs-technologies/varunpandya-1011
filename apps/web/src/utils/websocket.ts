/**
 * WebSocket Service for Order Status Updates
 * Connects to AngelOne Smart Order Update WebSocket
 */
import { getAngelOneToken } from './auth'

export interface OrderStatusMessage {
  'user-id': string
  'status-code': string
  'order-status': string
  'error-message': string
  orderData: {
    variety: string
    ordertype: string
    ordertag: string
    producttype: string
    price: number
    triggerprice: number
    quantity: string
    disclosedquantity: string
    duration: string
    squareoff: number
    stoploss: number
    trailingstoploss: number
    tradingsymbol: string
    transactiontype: string
    exchange: string
    symboltoken: string
    instrumenttype: string
    strikeprice: number
    optiontype: string
    expirydate: string
    lotsize: string
    cancelsize: string
    averageprice: number
    filledshares: string
    unfilledshares: string
    orderid: string
    text: string
    status: string
    orderstatus: string
    updatetime: string
    exchtime: string
    exchorderupdatetime: string
    fillid: string
    filltime: string
    parentorderid: string
  }
}

export type OrderStatusCallback = (message: OrderStatusMessage) => void
export type ErrorCallback = (error: Error) => void
export type ConnectionCallback = (connected: boolean) => void

// Use backend WebSocket proxy (browsers can't set custom headers)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/api/order/websocket'
const PING_INTERVAL = 10000 // 10 seconds

class OrderStatusWebSocket {
  private ws: WebSocket | null = null
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private isManualClose = false
  private statusCallbacks: Set<OrderStatusCallback> = new Set()
  private errorCallbacks: Set<ErrorCallback> = new Set()
  private connectionCallbacks: Set<ConnectionCallback> = new Set()

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    const token = getAngelOneToken()
    if (!token) {
      const error = new Error('No authentication token available')
      this.errorCallbacks.forEach(cb => cb(error))
      return
    }

    this.isManualClose = false
    this.reconnectAttempts = 0

    try {
      // Connect to backend WebSocket proxy which adds Authorization header
      // Pass token as query parameter for backend to extract
      const wsUrl = `${WS_URL}?token=${encodeURIComponent(token)}`
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
        this.startPingInterval()
        this.connectionCallbacks.forEach(cb => cb(true))
      }

      this.ws.onmessage = (event) => {
        try {
          const message: OrderStatusMessage = JSON.parse(event.data)
          
          // Handle pong response
          if (event.data === 'pong' || message['status-code'] === '200' && message['order-status'] === 'AB00') {
            // Initial connection response
            console.log('WebSocket connection confirmed:', message)
            return
          }

          // Handle order status updates
          this.statusCallbacks.forEach(cb => cb(message))
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        const err = new Error('WebSocket connection error')
        this.errorCallbacks.forEach(cb => cb(err))
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        this.stopPingInterval()
        this.connectionCallbacks.forEach(cb => cb(false))

        // Auto-reconnect if not manually closed
        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
          this.reconnectTimeout = setTimeout(() => {
            this.connect()
          }, this.reconnectDelay)
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          const error = new Error('Max reconnection attempts reached')
          this.errorCallbacks.forEach(cb => cb(error))
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      const err = error instanceof Error ? error : new Error('Failed to create WebSocket')
      this.errorCallbacks.forEach(cb => cb(err))
    }
  }

  disconnect(): void {
    this.isManualClose = true
    this.stopPingInterval()
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval()
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping')
      }
    }, PING_INTERVAL)
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  onStatus(callback: OrderStatusCallback): () => void {
    this.statusCallbacks.add(callback)
    return () => {
      this.statusCallbacks.delete(callback)
    }
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback)
    return () => {
      this.errorCallbacks.delete(callback)
    }
  }

  onConnection(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback)
    return () => {
      this.connectionCallbacks.delete(callback)
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Singleton instance
export const orderStatusWebSocket = new OrderStatusWebSocket()

