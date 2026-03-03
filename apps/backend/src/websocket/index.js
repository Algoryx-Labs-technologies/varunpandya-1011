/**
 * WebSocket Server Setup
 * Provides real-time updates to frontend
 */
import { WebSocketServer } from 'ws';
import { tradingStore } from '../store/tradingStore.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection:', req.socket.remoteAddress);
    
    // Add client to store
    tradingStore.addWebSocketClient(ws);

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        signals: tradingStore.getSignals(),
        trades: tradingStore.getTrades(),
        levels: tradingStore.getLevels(),
        marketData: tradingStore.getMarketData(),
        statistics: tradingStore.getStatistics(),
        alerts: tradingStore.getAlerts(),
        analytics: tradingStore.getAnalytics(),
        missedTrades: tradingStore.getMissedTrades(),
        patternDetections: tradingStore.getPatternDetections(),
        alerts: tradingStore.getAlerts(),
        marketIntelligence: tradingStore.getMarketIntelligence(),
        riskStatus: tradingStore.getRiskStatus(),
        ohlc: tradingStore.ohlc || {},
        optionChain: tradingStore.optionChain || {}
      }
    }));

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received WebSocket message:', data.type);
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          case 'subscribe':
            // Client can subscribe to specific data types
            ws.subscriptions = data.subscriptions || [];
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('WebSocket server initialized');
}
