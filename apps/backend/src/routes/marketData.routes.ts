/**
 * Market Data Routes
 * Top Gainers/Losers, PCR Volume, OI BuildUp (AngelOne marketData APIs)
 * Optional: start Smart Stream with login credentials
 */
import { Router, Request, Response } from 'express';
import { angelOneService } from '../services/angelone.service';
import { getApiKeyConfig } from '../config/angelone.config';
import { startSmartStream, isSmartStreamConnected } from '../websocket/smartStreamClient';
import type {
  GainersLosersDataType,
  GainersLosersExpiryType,
  OIBuildupDataType,
  OIBuildupExpiryType,
  HistoricalExchange,
  HistoricalInterval,
} from '../types/angelone.types';

const router = Router();

function getJwtFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '');
}

function unauthorized(res: Response) {
  return res.status(401).json({
    status: false,
    message: 'Missing or invalid authorization token',
    errorcode: 'UNAUTHORIZED',
  });
}

const GAINERS_LOSERS_DATATYPES: GainersLosersDataType[] = [
  'PercPriceGainers',
  'PercPriceLosers',
  'PercOILosers',
  'PercOIGainers',
];
const EXPIRY_TYPES = ['NEAR', 'NEXT', 'FAR'] as const;
const OI_BUILDUP_DATATYPES: OIBuildupDataType[] = [
  'Long Built Up',
  'Short Built Up',
  'Short Covering',
  'Long Unwinding',
];

const HISTORICAL_EXCHANGES: HistoricalExchange[] = ['NSE', 'NFO', 'BSE', 'BFO', 'CDS', 'MCX'];
const HISTORICAL_INTERVALS: HistoricalInterval[] = [
  'ONE_MINUTE',
  'THREE_MINUTE',
  'FIVE_MINUTE',
  'TEN_MINUTE',
  'FIFTEEN_MINUTE',
  'THIRTY_MINUTE',
  'ONE_HOUR',
  'ONE_DAY',
];

const SCRIP_MASTER_URL = 'https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json';

/**
 * GET /api/market-data/instruments
 * Retrieve the JSON dump of all tradable instruments (AngelOne Scrip Master).
 */
router.get('/instruments', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(SCRIP_MASTER_URL);
    if (!response.ok) {
      return res.status(response.status).json({
        status: false,
        message: `Failed to fetch scrip master: ${response.statusText}`,
        errorcode: 'UPSTREAM_ERROR',
      });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch instruments',
      errorcode: 'NETWORK_ERROR',
    });
  }
});

/**
 * GET /api/market-data/nse-intraday
 * NSE scrips allowed for intraday trading with multipliers.
 */
router.get('/nse-intraday', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtFromRequest(req);
    if (!jwtToken) return unauthorized(res);

    const response = await angelOneService.getNseIntraday(jwtToken);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch NSE intraday scrips',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * GET /api/market-data/bse-intraday
 * BSE scrips allowed for intraday trading with multipliers.
 */
router.get('/bse-intraday', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtFromRequest(req);
    if (!jwtToken) return unauthorized(res);

    const response = await angelOneService.getBseIntraday(jwtToken);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch BSE intraday scrips',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * GET /api/market-data/cautionary-scrips
 * Cautionary messages for scrips. Optional query: ?scripconsent=yes
 */
router.get('/cautionary-scrips', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtFromRequest(req);
    if (!jwtToken) return unauthorized(res);

    const scripconsent = typeof req.query.scripconsent === 'string' ? req.query.scripconsent : undefined;
    const response = await angelOneService.getCautionaryScrips(jwtToken, scripconsent);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch cautionary scrips',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * POST /api/market-data/search-scrip
 * Search scrip by symbol (one scrip per request). Body: { exchange, searchscrip }
 */
router.post('/search-scrip', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtFromRequest(req);
    if (!jwtToken) return unauthorized(res);

    const { exchange, searchscrip } = req.body;
    if (!exchange || typeof exchange !== 'string' || !exchange.trim()) {
      return res.status(400).json({
        status: false,
        message: 'exchange is required',
        errorcode: 'VALIDATION_ERROR',
      });
    }
    if (!searchscrip || typeof searchscrip !== 'string' || !searchscrip.trim()) {
      return res.status(400).json({
        status: false,
        message: 'searchscrip is required',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const response = await angelOneService.searchScrip(jwtToken, {
      exchange: exchange.trim(),
      searchscrip: searchscrip.trim(),
    });
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to search scrip',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * POST /api/market-data/gainers-losers
 * Body: { datatype: "PercOIGainers" | "PercOILosers" | "PercPriceGainers" | "PercPriceLosers", expirytype: "NEAR" | "NEXT" | "FAR" }
 */
router.post('/gainers-losers', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtFromRequest(req);
    if (!jwtToken) return unauthorized(res);

    const { datatype, expirytype } = req.body;
    if (
      !datatype ||
      !GAINERS_LOSERS_DATATYPES.includes(datatype) ||
      !expirytype ||
      !EXPIRY_TYPES.includes(expirytype)
    ) {
      return res.status(400).json({
        status: false,
        message: `datatype must be one of ${GAINERS_LOSERS_DATATYPES.join(', ')} and expirytype one of ${EXPIRY_TYPES.join(', ')}`,
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const response = await angelOneService.getGainersLosers(jwtToken, {
      datatype,
      expirytype: expirytype as GainersLosersExpiryType,
    });
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch gainers/losers',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * GET /api/market-data/put-call-ratio
 * No body. Returns PCR for options (mapped to futures symbols).
 */
router.get('/put-call-ratio', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtFromRequest(req);
    if (!jwtToken) return unauthorized(res);

    const response = await angelOneService.getPutCallRatio(jwtToken);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch put-call ratio',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * POST /api/market-data/oi-buildup
 * Body: { expirytype: "NEAR" | "NEXT" | "FAR", datatype: "Long Built Up" | "Short Built Up" | "Short Covering" | "Long Unwinding" }
 */
router.post('/oi-buildup', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtFromRequest(req);
    if (!jwtToken) return unauthorized(res);

    const { expirytype, datatype } = req.body;
    if (
      !expirytype ||
      !EXPIRY_TYPES.includes(expirytype) ||
      !datatype ||
      !OI_BUILDUP_DATATYPES.includes(datatype)
    ) {
      return res.status(400).json({
        status: false,
        message: `expirytype must be one of ${EXPIRY_TYPES.join(', ')} and datatype one of: ${OI_BUILDUP_DATATYPES.join(', ')}`,
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const response = await angelOneService.getOIBuildup(jwtToken, {
      expirytype: expirytype as OIBuildupExpiryType,
      datatype,
    });
    res.json(response);
  } catch (error: any) {
    const statusCode =
      error.errorcode === 'UNAUTHORIZED' ? 401 : error.errorcode === 'VALIDATION_ERROR' ? 400 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch OI buildup',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * POST /api/market-data/historical/candle
 * Historical API: Get Candle Data. Body: { exchange, symboltoken, interval, fromdate, todate }
 * fromdate/todate format: "yyyy-MM-dd hh:mm". Exchange: NSE|NFO|BSE|BFO|CDS|MCX.
 */
router.post('/historical/candle', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtFromRequest(req);
    if (!jwtToken) return unauthorized(res);

    const { exchange, symboltoken, interval, fromdate, todate } = req.body;
    if (
      !exchange ||
      !HISTORICAL_EXCHANGES.includes(exchange) ||
      !symboltoken ||
      typeof symboltoken !== 'string' ||
      !symboltoken.trim() ||
      !interval ||
      !HISTORICAL_INTERVALS.includes(interval) ||
      !fromdate ||
      typeof fromdate !== 'string' ||
      !fromdate.trim() ||
      !todate ||
      typeof todate !== 'string' ||
      !todate.trim()
    ) {
      return res.status(400).json({
        status: false,
        message: `exchange (one of ${HISTORICAL_EXCHANGES.join(', ')}), symboltoken, interval (one of ${HISTORICAL_INTERVALS.join(', ')}), fromdate, todate required. Date format: yyyy-MM-dd hh:mm`,
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const response = await angelOneService.getCandleData(jwtToken, {
      exchange,
      symboltoken: symboltoken.trim(),
      interval,
      fromdate: fromdate.trim(),
      todate: todate.trim(),
    });
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch candle data',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * POST /api/market-data/historical/oi
 * Historical API: Get OI Data. Body: { exchange, symboltoken, interval, fromdate, todate }
 * fromdate/todate format: "yyyy-MM-dd hh:mm". For F&O contracts use token from scrip master.
 */
router.post('/historical/oi', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtFromRequest(req);
    if (!jwtToken) return unauthorized(res);

    const { exchange, symboltoken, interval, fromdate, todate } = req.body;
    if (
      !exchange ||
      !HISTORICAL_EXCHANGES.includes(exchange) ||
      !symboltoken ||
      typeof symboltoken !== 'string' ||
      !symboltoken.trim() ||
      !interval ||
      !HISTORICAL_INTERVALS.includes(interval) ||
      !fromdate ||
      typeof fromdate !== 'string' ||
      !fromdate.trim() ||
      !todate ||
      typeof todate !== 'string' ||
      !todate.trim()
    ) {
      return res.status(400).json({
        status: false,
        message: `exchange (one of ${HISTORICAL_EXCHANGES.join(', ')}), symboltoken, interval (one of ${HISTORICAL_INTERVALS.join(', ')}), fromdate, todate required. Date format: yyyy-MM-dd hh:mm`,
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const response = await angelOneService.getOIData(jwtToken, {
      exchange,
      symboltoken: symboltoken.trim(),
      interval,
      fromdate: fromdate.trim(),
      todate: todate.trim(),
    });
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch OI data',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * POST /api/market-data/stream/start
 * Start Angel One Smart Stream with credentials (e.g. from login).
 * Body: { jwtToken: string, feedToken: string, clientCode: string }
 * If stream is already connected, returns 200 without reconnecting.
 */
router.post('/stream/start', async (req: Request, res: Response) => {
  try {
    if (isSmartStreamConnected()) {
      return res.json({ status: true, message: 'Smart Stream already connected' });
    }
    const { jwtToken, feedToken, clientCode } = req.body;
    if (!jwtToken || !feedToken || !clientCode) {
      return res.status(400).json({
        status: false,
        message: 'jwtToken, feedToken, and clientCode are required',
        errorcode: 'VALIDATION_ERROR',
      });
    }
    const { apiKey } = getApiKeyConfig();
    if (!apiKey) {
      return res.status(500).json({
        status: false,
        message: 'API key not configured',
        errorcode: 'CONFIG_ERROR',
      });
    }
    startSmartStream({ jwtToken, feedToken, clientCode, apiKey });
    res.json({ status: true, message: 'Smart Stream start requested' });
  } catch (error: any) {
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to start stream',
      errorcode: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/market-data/stream/status
 * Returns whether Smart Stream is connected.
 */
router.get('/stream/status', (_req: Request, res: Response) => {
  res.json({ status: true, connected: isSmartStreamConnected() });
});

/**
 * POST /api/market-data/option-greek
 * Body: { name: string (underlying e.g. "TCS"), expirydate: string (e.g. "25JAN2024") }
 * Returns Delta, Gamma, Theta, Vega and IV for multiple strike prices.
 */
router.post('/option-greek', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtFromRequest(req);
    if (!jwtToken) return unauthorized(res);

    const { name, expirydate } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        status: false,
        message: 'name (underlying) is required and must be a non-empty string',
        errorcode: 'VALIDATION_ERROR',
      });
    }
    if (!expirydate || typeof expirydate !== 'string' || !expirydate.trim()) {
      return res.status(400).json({
        status: false,
        message: 'expirydate is required and must be a non-empty string (e.g. 25JAN2024)',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const response = await angelOneService.getOptionGreek(jwtToken, {
      name: name.trim(),
      expirydate: expirydate.trim(),
    });
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch option greeks',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

export default router;
