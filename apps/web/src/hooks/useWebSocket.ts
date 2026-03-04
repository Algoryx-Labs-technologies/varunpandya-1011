import { useState, useEffect, useRef } from 'react'
import { getBotWsUrl } from '../utils/botApi'

export interface VertexWsData {
  signals?: Array<{
    id?: string
    timestamp: string
    index: string
    direction: string
    entry_price: number
    target_price?: number
    stop_loss?: number
    level_type?: string
    pattern?: string
    status?: string
  }>
  trades?: Array<{
    id?: string
    entry_time: string
    exit_time: string
    index: string
    symbol?: string
    direction?: string
    entry_price: number
    exit_price: number
    quantity: number
    pnl: number
    exit_reason?: string
    recorded_at?: string
    side?: string
    timestamp?: string
  }>
  levels?: Record<string, Record<string, { levels: Array<{ type: string; price: number; confidence?: number; stoploss?: number; target?: number }> }>>
  marketData?: Record<string, Record<string, { current_price?: number }>>
  ohlc?: Record<string, Record<string, Array<{ time: string | number; open: number; high: number; low: number; close: number }>>>
  optionChain?: Record<string, { index: string; calls: any[]; puts: any[]; underlying_value?: number; underlyingValue?: number; timestamp?: string }>
  alerts?: Array<{ timestamp?: string; severity?: string; message?: string }>
  riskStatus?: { trade_count?: number; max_trades?: number; auto_locked?: boolean; kill_switch_time?: string }
  analytics?: Record<string, unknown>
  marketIntelligence?: Record<string, unknown>
  patternDetections?: Array<{ id?: string; pattern?: string; type?: string; signal?: string; index?: string; timeframe?: string; timestamp?: string; level_type?: string; level_price?: number; current_price?: number }>
  missedTrades?: Array<{ direction?: string; level_type?: string; potential_pnl?: number; rr_ratio?: number; reason?: string }>
  statistics?: { totalTrades?: number; winRate?: number; totalPnl?: number; winningTrades?: number; losingTrades?: number; profitFactor?: number; avgWin?: number; avgLoss?: number }
  /** Real-time LTP by token (Angel One Smart Stream). Key = token string. */
  realTimeLtp?: Record<string, { ltp: number; symbol?: string; exchangeType?: number }>
}

export function useWebSocket(): { connected: boolean; data: VertexWsData | null } {
  const [connected, setConnected] = useState(false)
  const [data, setData] = useState<VertexWsData | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = getBotWsUrl()
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as { type: string; data?: any }
        if (message.type === 'connected') {
          setData(message.data ?? null)
        } else {
          setData((prev) => {
            const newData = { ...prev }
            switch (message.type) {
              case 'signal':
                newData.signals = [...(prev?.signals ?? []), message.data]
                break
              case 'trade':
                newData.trades = [...(prev?.trades ?? []), message.data]
                break
              case 'levels': {
                const lev = message.data
                if (lev && lev.index != null && lev.timeframe != null) {
                  newData.levels = { ...prev?.levels }
                  if (!newData.levels[lev.index]) newData.levels[lev.index] = {}
                  newData.levels[lev.index][lev.timeframe] = lev
                }
                break
              }
              case 'market-data':
                newData.marketData = { ...prev?.marketData, ...message.data }
                break
              case 'analytics':
                newData.analytics = message.data
                break
              case 'missed-trades':
                newData.missedTrades = message.data ?? []
                break
              case 'pattern-detection':
                newData.patternDetections = [...(prev?.patternDetections ?? []), message.data]
                break
              case 'alert':
                newData.alerts = [...(prev?.alerts ?? []), message.data]
                break
              case 'market-intelligence':
                newData.marketIntelligence = message.data
                break
              case 'risk-status':
                newData.riskStatus = message.data
                break
              case 'ohlc': {
                const { index: oidx, timeframe: otf, candles: ocs } = message.data ?? {}
                if (oidx && otf && Array.isArray(ocs)) {
                  newData.ohlc = { ...prev?.ohlc }
                  if (!newData.ohlc[oidx]) newData.ohlc[oidx] = {}
                  newData.ohlc[oidx][otf] = ocs
                }
                break
              }
              case 'option-chain': {
                const oc = message.data
                if (oc && oc.index) {
                  newData.optionChain = { ...prev?.optionChain, [oc.index]: oc }
                }
                break
              }
              case 'ltp': {
                const tick = message.data
                if (tick && tick.token != null && typeof tick.ltp === 'number') {
                  newData.realTimeLtp = { ...prev?.realTimeLtp, [String(tick.token)]: { ltp: tick.ltp, symbol: tick.symbol, exchangeType: tick.exchangeType } }
                }
                break
              }
              default:
                break
            }
            return newData
          })
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      setTimeout(() => {
        if (wsRef.current === null) {
          const w = new WebSocket(getBotWsUrl())
          wsRef.current = w
        }
      }, 3000)
    }

    ws.onerror = () => {
      setConnected(false)
    }

    wsRef.current = ws
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  return { connected, data }
}
