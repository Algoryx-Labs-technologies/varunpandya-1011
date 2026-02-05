// Authentication controller

import { Request, Response } from 'express';
import { AngelOneService } from '../services/angelOneService';
import { LoginRequest, GenerateTokenRequest } from '../types/auth';

export class AuthController {
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
   * Login endpoint handler
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const loginData: LoginRequest = req.body;
      const { clientLocalIP, clientPublicIP, macAddress } =
        this.getClientInfo(req);

      // Validate required fields
      if (!loginData.clientcode || !loginData.password || !loginData.totp) {
        res.status(400).json({
          status: false,
          message: 'Missing required fields: clientcode, password, totp',
          errorcode: 'VALIDATION_ERROR',
        });
        return;
      }

      const response = await this.angelOneService.login(
        loginData,
        clientLocalIP,
        clientPublicIP,
        macAddress
      );

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({
        status: false,
        message: error.message || 'Login failed',
        errorcode: 'LOGIN_ERROR',
      });
    }
  };

  /**
   * Generate token endpoint handler
   */
  generateToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const tokenData: GenerateTokenRequest = req.body;
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

      if (!tokenData.refreshToken) {
        res.status(400).json({
          status: false,
          message: 'Missing required field: refreshToken',
          errorcode: 'VALIDATION_ERROR',
        });
        return;
      }

      const { clientLocalIP, clientPublicIP, macAddress } =
        this.getClientInfo(req);

      const response = await this.angelOneService.generateToken(
        tokenData,
        authorizationToken,
        clientLocalIP,
        clientPublicIP,
        macAddress
      );

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({
        status: false,
        message: error.message || 'Token generation failed',
        errorcode: 'TOKEN_GENERATION_ERROR',
      });
    }
  };

  /**
   * Get profile endpoint handler
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
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

      const response = await this.angelOneService.getProfile(
        authorizationToken,
        clientLocalIP,
        clientPublicIP,
        macAddress
      );

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({
        status: false,
        message: error.message || 'Failed to fetch profile',
        errorcode: 'PROFILE_FETCH_ERROR',
      });
    }
  };
}

