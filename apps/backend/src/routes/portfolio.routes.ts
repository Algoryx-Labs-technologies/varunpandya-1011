/**
 * Portfolio Routes
 * Handles AngelOne portfolio endpoints
 */
import { Router, Request, Response } from 'express';
import { angelOneService } from '../services/angelone.service';
import { ConvertPositionRequest } from '../types/angelone.types';

const router = Router();

/**
 * GET /api/portfolio/holding
 * Get holding - long-term equity delivery stocks
 */
router.get('/holding', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Missing or invalid authorization token',
        errorcode: 'UNAUTHORIZED',
      });
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    const response = await angelOneService.getHolding(jwtToken);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch holdings',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * GET /api/portfolio/all-holdings
 * Get all holdings with summary of total investments
 */
router.get('/all-holdings', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Missing or invalid authorization token',
        errorcode: 'UNAUTHORIZED',
      });
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    const response = await angelOneService.getAllHoldings(jwtToken);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch all holdings',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * GET /api/portfolio/position
 * Get position - net and day positions
 */
router.get('/position', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Missing or invalid authorization token',
        errorcode: 'UNAUTHORIZED',
      });
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    const response = await angelOneService.getPosition(jwtToken);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch positions',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * POST /api/portfolio/convert-position
 * Convert position - change a position's margin product
 */
router.post('/convert-position', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Missing or invalid authorization token',
        errorcode: 'UNAUTHORIZED',
      });
    }

    const {
      exchange,
      symboltoken,
      oldproducttype,
      newproducttype,
      tradingsymbol,
      symbolname,
      instrumenttype,
      priceden,
      pricenum,
      genden,
      gennum,
      precision,
      multiplier,
      boardlotsize,
      buyqty,
      sellqty,
      buyamount,
      sellamount,
      transactiontype,
      quantity,
      type,
    } = req.body;

    // Validate required fields
    if (
      !exchange ||
      !symboltoken ||
      !oldproducttype ||
      !newproducttype ||
      !tradingsymbol ||
      !transactiontype ||
      quantity === undefined ||
      !type
    ) {
      return res.status(400).json({
        status: false,
        message:
          'Missing required fields: exchange, symboltoken, oldproducttype, newproducttype, tradingsymbol, transactiontype, quantity, and type are required',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    const request: ConvertPositionRequest = {
      exchange,
      symboltoken,
      oldproducttype,
      newproducttype,
      tradingsymbol,
      symbolname: symbolname || '',
      instrumenttype: instrumenttype || '',
      priceden: priceden || '1',
      pricenum: pricenum || '1',
      genden: genden || '1',
      gennum: gennum || '1',
      precision: precision || '2',
      multiplier: multiplier || '-1',
      boardlotsize: boardlotsize || '1',
      buyqty: buyqty || '0',
      sellqty: sellqty || '0',
      buyamount: buyamount || '0',
      sellamount: sellamount || '0',
      transactiontype,
      quantity,
      type,
    };

    const response = await angelOneService.convertPosition(jwtToken, request);
    res.json(response);
  } catch (error: any) {
    const statusCode =
      error.errorcode === 'UNAUTHORIZED'
        ? 401
        : error.errorcode === 'VALIDATION_ERROR'
        ? 400
        : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to convert position',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

export default router;

