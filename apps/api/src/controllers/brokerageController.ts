// Brokerage controller

import { Request, Response } from 'express';
import { AngelOneService } from '../services/angelOneService';
import { EstimateChargesRequest } from '../types/brokerage';

export class BrokerageController {
  private angelOneService: AngelOneService;

  constructor() {
    this.angelOneService = new AngelOneService();
  }

  /**
   * Extract client IP and MAC address from request
   */
  private getClientInfo(req: Request): {
    clientLocalIP: string;
    clientPublicIP: string;
    macAddress: string;
  } {
    const clientLocalIP =
      (req.headers['x-client-local-ip'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const clientPublicIP =
      (req.headers['x-client-public-ip'] as string) ||
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      clientLocalIP;
    const macAddress =
      (req.headers['x-mac-address'] as string) || '00:00:00:00:00:00';

    return { clientLocalIP, clientPublicIP, macAddress };
  }

  /**
   * Estimate charges endpoint handler
   */
  estimateCharges = async (req: Request, res: Response): Promise<void> => {
    try {
      const authorizationToken =
        req.headers.authorization?.replace('Bearer ', '') || '';

      if (!authorizationToken) {
        res.status(401).json({
          status: false,
          message: 'Authorization token required',
          errorcode: 'UNAUTHORIZED',
        });
        return;
      }

      const chargesData: EstimateChargesRequest = req.body;

      // Validate required fields
      if (!chargesData.orders || !Array.isArray(chargesData.orders)) {
        res.status(400).json({
          status: false,
          message: 'Missing or invalid field: orders (must be an array)',
          errorcode: 'VALIDATION_ERROR',
        });
        return;
      }

      if (chargesData.orders.length === 0) {
        res.status(400).json({
          status: false,
          message: 'Orders array cannot be empty',
          errorcode: 'VALIDATION_ERROR',
        });
        return;
      }

      // Validate each order
      for (const order of chargesData.orders) {
        if (
          !order.product_type ||
          !order.transaction_type ||
          !order.quantity ||
          !order.price ||
          !order.exchange ||
          !order.symbol_name ||
          !order.token
        ) {
          res.status(400).json({
            status: false,
            message:
              'Missing required fields in order: product_type, transaction_type, quantity, price, exchange, symbol_name, token',
            errorcode: 'VALIDATION_ERROR',
          });
          return;
        }
      }

      const { clientLocalIP, clientPublicIP, macAddress } =
        this.getClientInfo(req);

      const response = await this.angelOneService.estimateCharges(
        chargesData,
        authorizationToken,
        clientLocalIP,
        clientPublicIP,
        macAddress
      );

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({
        status: false,
        message: error.message || 'Failed to estimate charges',
        errorcode: 'CHARGES_ESTIMATION_ERROR',
      });
    }
  };
}

