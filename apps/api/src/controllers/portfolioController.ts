// Portfolio controller

import { Request, Response } from 'express';
import { AngelOneService } from '../services/angelOneService';
import { ConvertPositionRequest } from '../types/portfolio';

export class PortfolioController {
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
   * Get holding endpoint handler
   */
  getHolding = async (req: Request, res: Response): Promise<void> => {
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

      const { clientLocalIP, clientPublicIP, macAddress } =
        this.getClientInfo(req);

      const response = await this.angelOneService.getHolding(
        authorizationToken,
        clientLocalIP,
        clientPublicIP,
        macAddress
      );

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({
        status: false,
        message: error.message || 'Failed to fetch holding',
        errorcode: 'HOLDING_FETCH_ERROR',
      });
    }
  };

  /**
   * Get all holdings endpoint handler
   */
  getAllHolding = async (req: Request, res: Response): Promise<void> => {
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

      const { clientLocalIP, clientPublicIP, macAddress } =
        this.getClientInfo(req);

      const response = await this.angelOneService.getAllHolding(
        authorizationToken,
        clientLocalIP,
        clientPublicIP,
        macAddress
      );

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({
        status: false,
        message: error.message || 'Failed to fetch all holdings',
        errorcode: 'HOLDINGS_FETCH_ERROR',
      });
    }
  };

  /**
   * Get position endpoint handler
   */
  getPosition = async (req: Request, res: Response): Promise<void> => {
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

      const { clientLocalIP, clientPublicIP, macAddress } =
        this.getClientInfo(req);

      const response = await this.angelOneService.getPosition(
        authorizationToken,
        clientLocalIP,
        clientPublicIP,
        macAddress
      );

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({
        status: false,
        message: error.message || 'Failed to fetch position',
        errorcode: 'POSITION_FETCH_ERROR',
      });
    }
  };

  /**
   * Convert position endpoint handler
   */
  convertPosition = async (req: Request, res: Response): Promise<void> => {
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

      const positionData: ConvertPositionRequest = req.body;

      // Validate required fields
      if (
        !positionData.exchange ||
        !positionData.symboltoken ||
        !positionData.oldproducttype ||
        !positionData.newproducttype ||
        !positionData.tradingsymbol ||
        !positionData.transactiontype ||
        positionData.quantity === undefined ||
        !positionData.type
      ) {
        res.status(400).json({
          status: false,
          message:
            'Missing required fields: exchange, symboltoken, oldproducttype, newproducttype, tradingsymbol, transactiontype, quantity, type',
          errorcode: 'VALIDATION_ERROR',
        });
        return;
      }

      const { clientLocalIP, clientPublicIP, macAddress } =
        this.getClientInfo(req);

      const response = await this.angelOneService.convertPosition(
        positionData,
        authorizationToken,
        clientLocalIP,
        clientPublicIP,
        macAddress
      );

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({
        status: false,
        message: error.message || 'Failed to convert position',
        errorcode: 'POSITION_CONVERT_ERROR',
      });
    }
  };
}

