/**
 * Order Routes
 * Handles AngelOne order endpoints: place, modify, cancel, order book, trade book, LTP, order details
 */
import { Router, Request, Response } from 'express';
import { angelOneService } from '../services/angelone.service';
import {
  PlaceOrderRequest,
  ModifyOrderRequest,
  CancelOrderRequest,
  GetLtpDataRequest,
} from '../types/angelone.types';

const router: Router = Router();

function getJwtToken(req: Request): string | null {
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

function handleError(error: any, res: Response, defaultMessage: string) {
  const statusCode =
    error.errorcode === 'UNAUTHORIZED'
      ? 401
      : error.errorcode === 'VALIDATION_ERROR'
        ? 400
        : 500;
  res.status(statusCode).json({
    status: false,
    message: error.message || defaultMessage,
    errorcode: error.errorcode || 'UNKNOWN_ERROR',
    data: error.data,
  });
}

/**
 * POST /api/order/place
 * Place a new order
 */
router.post('/place', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtToken(req);
    if (!jwtToken) return unauthorized(res);

    const body = req.body as PlaceOrderRequest;
    const {
      variety,
      tradingsymbol,
      symboltoken,
      exchange,
      transactiontype,
      ordertype,
      producttype,
      duration,
      quantity,
      price,
      triggerprice,
      squareoff,
      stoploss,
      trailingStopLoss,
      disclosedquantity,
      ordertag,
      scripconsent,
    } = body;

    if (
      !variety ||
      !tradingsymbol ||
      !symboltoken ||
      !exchange ||
      !transactiontype ||
      !ordertype ||
      !producttype ||
      !duration ||
      !quantity
    ) {
      return res.status(400).json({
        status: false,
        message:
          'Missing required fields: variety, tradingsymbol, symboltoken, exchange, transactiontype, ordertype, producttype, duration, quantity',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const request: PlaceOrderRequest = {
      variety,
      tradingsymbol,
      symboltoken,
      exchange,
      transactiontype,
      ordertype,
      producttype,
      duration,
      quantity,
      ...(price !== undefined && { price: String(price) }),
      ...(triggerprice !== undefined && { triggerprice: String(triggerprice) }),
      ...(squareoff !== undefined && { squareoff: String(squareoff) }),
      ...(stoploss !== undefined && { stoploss: String(stoploss) }),
      ...(trailingStopLoss !== undefined && {
        trailingStopLoss: String(trailingStopLoss),
      }),
      ...(disclosedquantity !== undefined && { disclosedquantity }),
      ...(ordertag !== undefined && { ordertag }),
      ...(scripconsent !== undefined && { scripconsent }),
    };

    const response = await angelOneService.placeOrder(jwtToken, request);
    res.json(response);
  } catch (error: any) {
    handleError(error, res, 'Failed to place order');
  }
});

/**
 * POST /api/order/modify
 * Modify an open or pending order
 */
router.post('/modify', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtToken(req);
    if (!jwtToken) return unauthorized(res);

    const body = req.body as ModifyOrderRequest;
    const {
      variety,
      orderid,
      ordertype,
      producttype,
      duration,
      price,
      quantity,
      tradingsymbol,
      symboltoken,
      exchange,
    } = body;

    if (
      !variety ||
      !orderid ||
      !ordertype ||
      !producttype ||
      !duration ||
      !price ||
      !quantity
    ) {
      return res.status(400).json({
        status: false,
        message:
          'Missing required fields: variety, orderid, ordertype, producttype, duration, price, quantity',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const request: ModifyOrderRequest = {
      variety,
      orderid,
      ordertype,
      producttype,
      duration,
      price: String(price),
      quantity: String(quantity),
      ...(tradingsymbol !== undefined && { tradingsymbol }),
      ...(symboltoken !== undefined && { symboltoken }),
      ...(exchange !== undefined && { exchange }),
    };

    const response = await angelOneService.modifyOrder(jwtToken, request);
    res.json(response);
  } catch (error: any) {
    handleError(error, res, 'Failed to modify order');
  }
});

/**
 * POST /api/order/cancel
 * Cancel an open or pending order
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtToken(req);
    if (!jwtToken) return unauthorized(res);

    const { variety, orderid } = req.body as CancelOrderRequest;

    if (!variety || !orderid) {
      return res.status(400).json({
        status: false,
        message: 'Missing required fields: variety, orderid',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const response = await angelOneService.cancelOrder(jwtToken, {
      variety,
      orderid,
    });
    res.json(response);
  } catch (error: any) {
    handleError(error, res, 'Failed to cancel order');
  }
});

/**
 * GET /api/order/order-book
 * Get order book (all orders)
 */
router.get('/order-book', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtToken(req);
    if (!jwtToken) return unauthorized(res);

    const response = await angelOneService.getOrderBook(jwtToken);
    res.json(response);
  } catch (error: any) {
    handleError(error, res, 'Failed to fetch order book');
  }
});

/**
 * GET /api/order/trade-book
 * Get trade book (trades for current day)
 */
router.get('/trade-book', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtToken(req);
    if (!jwtToken) return unauthorized(res);

    const response = await angelOneService.getTradeBook(jwtToken);
    res.json(response);
  } catch (error: any) {
    handleError(error, res, 'Failed to fetch trade book');
  }
});

/**
 * POST /api/order/ltp
 * Get LTP (last traded price) data for a symbol
 */
router.post('/ltp', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtToken(req);
    if (!jwtToken) return unauthorized(res);

    const { exchange, tradingsymbol, symboltoken } = req.body as GetLtpDataRequest;

    if (!exchange || !tradingsymbol || !symboltoken) {
      return res.status(400).json({
        status: false,
        message: 'Missing required fields: exchange, tradingsymbol, symboltoken',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const request: GetLtpDataRequest = {
      exchange,
      tradingsymbol,
      symboltoken: String(symboltoken),
    };

    const response = await angelOneService.getLtpData(jwtToken, request);
    res.json(response);
  } catch (error: any) {
    handleError(error, res, 'Failed to fetch LTP data');
  }
});

/**
 * GET /api/order/details/:uniqueOrderId
 * Get individual order details by uniqueorderid
 */
router.get('/details/:uniqueOrderId', async (req: Request, res: Response) => {
  try {
    const jwtToken = getJwtToken(req);
    if (!jwtToken) return unauthorized(res);

    const { uniqueOrderId } = req.params;
    if (!uniqueOrderId) {
      return res.status(400).json({
        status: false,
        message: 'Missing required parameter: uniqueOrderId',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const response = await angelOneService.getOrderDetails(
      jwtToken,
      uniqueOrderId
    );
    res.json(response);
  } catch (error: any) {
    handleError(error, res, 'Failed to fetch order details');
  }
});

export default router;
