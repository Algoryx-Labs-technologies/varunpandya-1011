/**
 * WebSocket Routes
 * Proxies WebSocket connection to AngelOne Smart Order Update WebSocket
 * Browsers can't set custom headers, so we proxy through backend
 */
import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import * as WebSocketClient from 'ws';

const ANGELONE_WS_URL = 'wss://tns.angelone.in/smart-order-update';

export function setupWebSocketServer(httpServer: HTTPServer): void {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/order/websocket',
    verifyClient: (info) => {
      // Verify Authorization token in query or header
      const token = info.req.url?.split('token=')[1]?.split('&')[0] || 
                   info.req.headers.authorization?.replace('Bearer ', '');
      return !!token;
    }
  });

  wss.on('connection', (clientWs: WebSocket, req) => {
    console.log('📡 Client WebSocket connected');

    // Extract token from query or header
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    let token = url.searchParams.get('token');
    
    if (!token) {
      const authHeader = req.headers.authorization;
      token = authHeader?.replace('Bearer ', '') || null;
    }

    if (!token) {
      console.error('❌ No token provided for WebSocket connection');
      clientWs.close(1008, 'No authorization token provided');
      return;
    }

    // Connect to AngelOne WebSocket with Authorization header
    const angelOneWs = new WebSocketClient.WebSocket(ANGELONE_WS_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Forward messages from client to AngelOne
    clientWs.on('message', (data: WebSocket.Data) => {
      if (angelOneWs.readyState === WebSocket.OPEN) {
        angelOneWs.send(data);
      }
    });

    // Forward messages from AngelOne to client
    angelOneWs.on('message', (data: WebSocket.Data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });

    // Handle AngelOne connection open
    angelOneWs.on('open', () => {
      console.log('✅ Connected to AngelOne WebSocket');
    });

    // Handle errors
    angelOneWs.on('error', (error) => {
      console.error('❌ AngelOne WebSocket error:', error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          'status-code': '500',
          'error-message': error.message || 'WebSocket connection error',
        }));
      }
    });

    // Handle AngelOne connection close
    angelOneWs.on('close', (code, reason) => {
      console.log(`🔌 AngelOne WebSocket closed: ${code} ${reason}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason.toString());
      }
    });

    // Handle client disconnect
    clientWs.on('close', () => {
      console.log('🔌 Client WebSocket disconnected');
      if (angelOneWs.readyState === WebSocket.OPEN) {
        angelOneWs.close();
      }
    });

    // Handle client errors
    clientWs.on('error', (error) => {
      console.error('❌ Client WebSocket error:', error);
    });
  });

  console.log('🔌 WebSocket server ready at /api/order/websocket');
}

