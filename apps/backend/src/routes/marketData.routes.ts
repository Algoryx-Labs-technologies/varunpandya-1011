/**
 * Market Data Routes
 * Top Gainers/Losers, PCR Volume, OI BuildUp (AngelOne marketData APIs)
 */
import { Router, Request, Response } from 'express';
import { angelOneService } from '../services/angelone.service';
import type {
  GainersLosersDataType,
  GainersLosersExpiryType,
  OIBuildupDataType,
  OIBuildupExpiryType,
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
