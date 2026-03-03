/**
 * Brokerage Routes
 * Handles AngelOne brokerage calculator endpoints
 */
import { Router, Request, Response } from 'express';
import { angelOneService } from '../services/angelone.service';
import { BrokerageCalculatorRequest } from '../types/angelone.types';

const router = Router();

/**
 * POST /api/brokerage/estimate-charges
 * Estimate brokerage charges and taxes for placing trades
 */
router.post('/estimate-charges', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Missing or invalid authorization token',
        errorcode: 'UNAUTHORIZED',
      });
    }

    const { orders } = req.body;

    // Validate required fields
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'Missing or invalid orders: orders array is required and must not be empty',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    // Validate each order has required fields
    for (const order of orders) {
      if (
        !order.product_type ||
        !order.transaction_type ||
        !order.quantity ||
        !order.price ||
        !order.exchange ||
        !order.symbol_name ||
        !order.token
      ) {
        return res.status(400).json({
          status: false,
          message:
            'Invalid order: Each order must have product_type, transaction_type, quantity, price, exchange, symbol_name, and token',
          errorcode: 'VALIDATION_ERROR',
        });
      }
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    const request: BrokerageCalculatorRequest = { orders };
    const response = await angelOneService.estimateBrokerageCharges(jwtToken, request);
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
      message: error.message || 'Failed to estimate brokerage charges',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

export default router;

