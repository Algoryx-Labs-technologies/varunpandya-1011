import React, { useEffect, useState, useRef } from 'react'
import { orderStatusWebSocket, type OrderStatusMessage } from '../utils/websocket'

interface OrderUpdate {
  orderid: string
  tradingsymbol: string
  status: string
  orderstatus: string
  quantity: string
  filledshares: string
  unfilledshares: string
  price: number
  averageprice: number
  transactiontype: string
  updatetime: string
  text: string
  orderStatus: string
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  'AB00': { label: 'Connected', color: 'var(--accent-green)' },
  'AB01': { label: 'Open', color: 'var(--accent-blue)' },
  'AB02': { label: 'Cancelled', color: 'var(--accent-red)' },
  'AB03': { label: 'Rejected', color: 'var(--accent-red)' },
  'AB04': { label: 'Modified', color: 'var(--accent-yellow)' },
  'AB05': { label: 'Complete', color: 'var(--accent-green)' },
  'AB06': { label: 'After Market Req', color: 'var(--accent-blue)' },
  'AB07': { label: 'Cancelled After Market', color: 'var(--accent-red)' },
  'AB08': { label: 'Modify After Market', color: 'var(--accent-yellow)' },
  'AB09': { label: 'Open Pending', color: 'var(--accent-blue)' },
  'AB10': { label: 'Trigger Pending', color: 'var(--accent-yellow)' },
  'AB11': { label: 'Modify Pending', color: 'var(--accent-yellow)' },
}

export default function OrderStatusWidget() {
  const [isConnected, setIsConnected] = useState(false)
  const [orderUpdates, setOrderUpdates] = useState<OrderUpdate[]>([])
  const [error, setError] = useState<string | null>(null)
  const updatesRef = useRef<OrderUpdate[]>([])

  useEffect(() => {
    // Connection status callback
    const unsubscribeConnection = orderStatusWebSocket.onConnection((connected) => {
      setIsConnected(connected)
      if (!connected) {
        setError('Disconnected from order status server')
      } else {
        setError(null)
      }
    })

    // Order status callback
    const unsubscribeStatus = orderStatusWebSocket.onStatus((message: OrderStatusMessage) => {
      if (message['status-code'] === '200' && message['order-status'] === 'AB00') {
        // Initial connection message
        return
      }

      const update: OrderUpdate = {
        orderid: message.orderData.orderid,
        tradingsymbol: message.orderData.tradingsymbol,
        status: message.orderData.status,
        orderstatus: message.orderData.orderstatus,
        quantity: message.orderData.quantity,
        filledshares: message.orderData.filledshares,
        unfilledshares: message.orderData.unfilledshares,
        price: message.orderData.price,
        averageprice: message.orderData.averageprice,
        transactiontype: message.orderData.transactiontype,
        updatetime: message.orderData.updatetime || message.orderData.exchtime || new Date().toLocaleString(),
        text: message.orderData.text,
        orderStatus: message['order-status'],
      }

      // Add to updates (keep last 50)
      updatesRef.current = [update, ...updatesRef.current].slice(0, 50)
      setOrderUpdates([...updatesRef.current])
    })

    // Error callback
    const unsubscribeError = orderStatusWebSocket.onError((err) => {
      setError(err.message)
      setIsConnected(false)
    })

    // Connect to WebSocket
    if (!orderStatusWebSocket.isConnected()) {
      orderStatusWebSocket.connect()
    } else {
      setIsConnected(true)
    }

    return () => {
      unsubscribeConnection()
      unsubscribeStatus()
      unsubscribeError()
      // Don't disconnect on unmount - keep connection alive
      // orderStatusWebSocket.disconnect()
    }
  }, [])

  const getStatusInfo = (statusCode: string) => {
    return ORDER_STATUS_MAP[statusCode] || { label: statusCode, color: 'var(--text-secondary)' }
  }

  const clearUpdates = () => {
    updatesRef.current = []
    setOrderUpdates([])
  }

  return (
    <div className="dashboard-card market-data-card">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Order Status (Live)</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? 'var(--accent-green)' : 'var(--accent-red)',
              animation: isConnected ? 'pulse 2s infinite' : 'none',
            }}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {orderUpdates.length > 0 && (
            <button
              type="button"
              onClick={clearUpdates}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', color: 'var(--accent-red)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div className="market-data-table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {orderUpdates.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {isConnected ? 'Waiting for order updates...' : 'Not connected'}
          </div>
        ) : (
          <table className="market-data-table">
            <thead>
              <tr>
                <th className="market-data-th">Symbol</th>
                <th className="market-data-th">Type</th>
                <th className="market-data-th">Qty</th>
                <th className="market-data-th">Filled</th>
                <th className="market-data-th">Status</th>
                <th className="market-data-th">Time</th>
              </tr>
            </thead>
            <tbody>
              {orderUpdates.map((update, index) => {
                const statusInfo = getStatusInfo(update.orderStatus)
                return (
                  <tr key={`${update.orderid}-${index}`} className="market-data-tr">
                    <td className="market-data-td">{update.tradingsymbol || '-'}</td>
                    <td className="market-data-td">
                      <span
                        style={{
                          color: update.transactiontype === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)',
                        }}
                      >
                        {update.transactiontype}
                      </span>
                    </td>
                    <td className="market-data-td">{update.quantity}</td>
                    <td className="market-data-td">
                      {update.filledshares}/{update.quantity}
                    </td>
                    <td className="market-data-td">
                      <span style={{ color: statusInfo.color, fontWeight: '500' }}>
                        {statusInfo.label}
                      </span>
                      {update.text && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {update.text}
                        </div>
                      )}
                    </td>
                    <td className="market-data-td market-data-td-muted" style={{ fontSize: '11px' }}>
                      {update.updatetime || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

