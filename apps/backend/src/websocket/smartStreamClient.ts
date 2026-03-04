/**
 * Angel One Smart Stream WebSocket Client 2.0
 * Connects to wss://smartapisocket.angelone.in/smart-stream
 * Request: JSON. Response: binary (Little Endian).
 */
import WebSocket from 'ws';
import { tradingStore } from '../store/tradingStore.js';
import { getApiKeyConfig } from '../config/angelone.config.js';

const WSS_URL = 'wss://smartapisocket.angelone.in/smart-stream';
const HEARTBEAT_INTERVAL_MS = 30_000;

export type SubscriptionMode = 1 | 2 | 3; // 1 LTP, 2 Quote, 3 SnapQuote
export type ExchangeType = 1 | 2 | 3 | 4 | 5 | 7 | 13;

export interface SmartStreamCredentials {
  jwtToken: string;
  feedToken: string;
  clientCode: string;
  apiKey: string;
}

export interface LtpTick {
  mode: number;
  exchangeType: number;
  token: string;
  sequenceNumber: number;
  exchangeTimestamp: number;
  ltp: number;
  /** Optional symbol name for display (e.g. NIFTY 50, BANKNIFTY) */
  symbol?: string;
}

/** Known index tokens (NSE CM) for display names */
const INDEX_TOKEN_NAMES: Record<string, string> = {
  '26000': 'NIFTY 50',
  '26009': 'BANKNIFTY',
  '26037': 'FINNIFTY',
  '25974': 'MIDCPNIFTY',
  '26111': 'NIFTY NEXT 50',
};

/**
 * Parse LTP binary packet (51 bytes, Little Endian).
 * Layout: mode(1), exchangeType(1), token(25), sequence(8), exchangeTimestamp(8), ltp(8).
 * LTP in paise → divide by 100 for INR.
 */
function parseLtpPacket(buffer: Buffer): LtpTick | null {
  if (buffer.length < 51) return null;
  const mode = buffer.readUInt8(0);
  const exchangeType = buffer.readUInt8(1);
  const tokenBuf = buffer.subarray(2, 27);
  const token = tokenBuf.toString('utf8').replace(/\0/g, '').trim() || tokenBuf.toString('utf8', 0, tokenBuf.indexOf(0) >= 0 ? tokenBuf.indexOf(0) : 25).trim();
  const sequenceNumber = buffer.readBigInt64LE(27);
  const exchangeTimestamp = Number(buffer.readBigInt64LE(35));
  // LTP: doc says int32 at 43; packet size 51 so 43+8=51. Use 4 bytes for int32.
  const ltpPaise = buffer.length >= 47 ? buffer.readInt32LE(43) : 0;
  const ltp = ltpPaise / 100;
  const symbol = INDEX_TOKEN_NAMES[token] ?? undefined;
  return { mode, exchangeType, token, sequenceNumber: Number(sequenceNumber), exchangeTimestamp, ltp, symbol };
}

/**
 * Parse Quote packet (123 bytes) - same as LTP up to LTP, then more fields.
 * We only need LTP for display; parse same as LTP for first 51 bytes.
 */
function parseQuoteOrLtp(buffer: Buffer): LtpTick | null {
  if (buffer.length < 51) return null;
  return parseLtpPacket(buffer.subarray(0, 51));
}

function parseBinaryMessage(buffer: Buffer): LtpTick | null {
  if (buffer.length < 51) return null;
  const mode = buffer.readUInt8(0);
  if (mode === 1) return parseLtpPacket(buffer);
  if (mode === 2 && buffer.length >= 123) return parseQuoteOrLtp(buffer);
  if (mode === 3 && buffer.length >= 379) return parseQuoteOrLtp(buffer);
  return parseLtpPacket(buffer);
}

/**
 * Build subscribe request (action 1 = subscribe, mode 1 = LTP).
 * tokenList: [{ exchangeType: 1, tokens: ["26000","26009"] }]
 */
function buildSubscribeRequest(
  tokenList: { exchangeType: ExchangeType; tokens: string[] }[],
  mode: SubscriptionMode = 1,
  correlationID?: string
): string {
  const payload = {
    correlationID: correlationID || `req_${Date.now()}`,
    action: 1,
    params: {
      mode,
      tokenList: tokenList.filter((g) => g.tokens.length > 0),
    },
  };
  return JSON.stringify(payload);
}

/**
 * Default tokens: NIFTY 50, BANK NIFTY, FIN NIFTY, MIDCP NIFTY (NSE CM = 1)
 */
function getDefaultTokenList(): { exchangeType: ExchangeType; tokens: string[] }[] {
  const envTokens = process.env.SMART_STREAM_TOKENS;
  if (envTokens && envTokens.trim()) {
    const parts = envTokens.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      return [{ exchangeType: 1, tokens: parts }];
    }
  }
  return [
    { exchangeType: 1, tokens: ['26000', '26009', '26037', '25974'] },
  ];
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let smartStreamWs: WebSocket | null = null;

export function isSmartStreamConnected(): boolean {
  return smartStreamWs != null && smartStreamWs.readyState === WebSocket.OPEN;
}

export function stopSmartStream(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (smartStreamWs) {
    smartStreamWs.removeAllListeners();
    if (smartStreamWs.readyState === WebSocket.OPEN) smartStreamWs.close();
    smartStreamWs = null;
  }
}

/**
 * Start Angel One Smart Stream; call once when server starts (if credentials available).
 */
export function startSmartStream(credentials: SmartStreamCredentials): void {
  if (smartStreamWs && smartStreamWs.readyState === WebSocket.OPEN) {
    return;
  }

  const { jwtToken, feedToken, clientCode, apiKey } = credentials;

  const ws = new WebSocket(WSS_URL, {
    headers: {
      Authorization: jwtToken,
      'x-api-key': apiKey,
      'x-client-code': clientCode,
      'x-feed-token': feedToken,
    },
  });

  smartStreamWs = ws;

  ws.on('open', () => {
    console.log('📡 Angel One Smart Stream connected');
    const tokenList = getDefaultTokenList();
    const body = buildSubscribeRequest(tokenList, 1);
    ws.send(body);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, HEARTBEAT_INTERVAL_MS);
  });

  ws.on('message', (data: Buffer | string) => {
    if (typeof data === 'string') {
      if (data === 'pong') return;
      try {
        const json = JSON.parse(data);
        if (json.errorCode) {
          console.error('Smart Stream error:', json.errorMessage || json.errorCode);
        }
      } catch {
        // ignore
      }
      return;
    }
    const tick = parseBinaryMessage(data);
    if (tick) {
      tradingStore.broadcast('ltp', tick);
    }
  });

  ws.on('error', (err) => {
    console.error('Smart Stream WebSocket error:', err.message);
  });

  ws.on('close', (code, reason) => {
    console.log('Smart Stream closed:', code, reason?.toString());
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    smartStreamWs = null;
  });
}

/**
 * Try to start Smart Stream using env credentials.
 * Call from server startup. If env not set, does nothing.
 */
export function startSmartStreamFromEnv(): void {
  const jwt = process.env.ANGELONE_WS_JWT;
  const feedToken = process.env.ANGELONE_WS_FEED_TOKEN;
  const clientCode = process.env.ANGELONE_CLIENT_CODE;
  const { apiKey } = getApiKeyConfig();

  if (jwt && feedToken && clientCode && apiKey) {
    startSmartStream({ jwtToken: jwt, feedToken, clientCode, apiKey });
  } else {
    console.log('Smart Stream skipped (set ANGELONE_WS_JWT, ANGELONE_WS_FEED_TOKEN, ANGELONE_CLIENT_CODE and API key to enable)');
  }
}
