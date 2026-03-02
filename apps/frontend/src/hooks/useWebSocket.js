import { useState, useEffect, useRef } from 'react';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173';
    const wsUrl = `${protocol}//${host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'connected') {
          // Initial data load
          setData(message.data);
        } else {
          // Real-time update
          setData(prev => {
            const newData = { ...prev };
            
            switch (message.type) {
              case 'signal':
                newData.signals = [...(prev?.signals || []), message.data];
                break;
              case 'trade':
                newData.trades = [...(prev?.trades || []), message.data];
                break;
              case 'levels':
                const lev = message.data;
                if (lev && lev.index != null && lev.timeframe != null) {
                  newData.levels = { ...prev?.levels };
                  if (!newData.levels[lev.index]) newData.levels[lev.index] = {};
                  newData.levels[lev.index][lev.timeframe] = lev;
                }
                break;
              case 'market-data':
                newData.marketData = { ...prev?.marketData, ...message.data };
                break;
              case 'analytics':
                newData.analytics = message.data;
                break;
              case 'missed-trades':
                newData.missedTrades = message.data || [];
                break;
              case 'pattern-detection':
                newData.patternDetections = [...(prev?.patternDetections || []), message.data];
                break;
              case 'alert':
                newData.alerts = [...(prev?.alerts || []), message.data];
                break;
              case 'market-intelligence':
                newData.marketIntelligence = message.data;
                break;
              case 'risk-status':
                newData.riskStatus = message.data;
                break;
              case 'ohlc':
                const { index: oidx, timeframe: otf, candles: ocs } = message.data || {};
                if (oidx && otf && Array.isArray(ocs)) {
                  newData.ohlc = { ...prev?.ohlc };
                  if (!newData.ohlc[oidx]) newData.ohlc[oidx] = {};
                  newData.ohlc[oidx][otf] = ocs;
                }
                break;
              case 'option-chain':
                const oc = message.data;
                if (oc && oc.index) {
                  newData.optionChain = { ...prev?.optionChain, [oc.index]: oc };
                }
                break;
              default:
                break;
            }
            
            return newData;
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current === null) {
          const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173';
          wsRef.current = new WebSocket(`${protocol}//${host}/ws`);
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { connected, data };
}
