/**
 * Margin Calculator Routes
 * Handles AngelOne margin calculator endpoints
 */
import { Router, Request, Response } from 'express';
import { angelOneService } from '../services/angelone.service';
import { MarginCalculatorRequest, MarginCalculatorPosition } from '../types/angelone.types';

const router = Router();

/**
 * POST /api/margin/calculate
 * Calculate real-time margin for a basket of positions
 * Rate limit: 10 requests per second
 * Maximum 50 positions per request
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Missing or invalid authorization token',
        errorcode: 'UNAUTHORIZED',
      });
    }

    const { positions } = req.body;

    // Validate required fields
    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'Missing or invalid positions: positions array is required and must not be empty',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    // Validate maximum positions limit
    if (positions.length > 50) {
      return res.status(400).json({
        status: false,
        message: 'Maximum 50 positions allowed per request',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    // Validate each position has required fields
    for (const position of positions) {
      if (
        !position.exchange ||
        position.qty === undefined ||
        position.price === undefined ||
        !position.productType ||
        !position.token ||
        !position.tradeType
      ) {
        return res.status(400).json({
          status: false,
          message:
            'Invalid position: Each position must have exchange, qty, price, productType, token, and tradeType',
          errorcode: 'VALIDATION_ERROR',
        });
      }
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    
    // Set default orderType to LIMIT if not provided
    const processedPositions: MarginCalculatorPosition[] = positions.map((pos: any) => ({
      exchange: pos.exchange,
      qty: pos.qty,
      price: pos.price,
      productType: pos.productType,
      token: pos.token,
      tradeType: pos.tradeType,
      orderType: pos.orderType || 'LIMIT',
    }));

    const request: MarginCalculatorRequest = { positions: processedPositions };
    const response = await angelOneService.calculateMargin(jwtToken, request);
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
      message: error.message || 'Failed to calculate margin',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

export default router;

