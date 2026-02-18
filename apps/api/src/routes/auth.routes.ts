/**
 * Authentication Routes
 * Handles AngelOne authentication endpoints
 */
import { Router, Request, Response } from 'express';
import { angelOneService } from '../services/angelone.service';
import { LoginRequest, GenerateTokenRequest } from '../types/angelone.types';

const router = Router();

/**
 * POST /api/auth/login
 * Login with client code, password, and TOTP
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { clientcode, password, totp, state } = req.body;

    // Validate required fields
    if (!clientcode || !password || !totp) {
      return res.status(400).json({
        status: false,
        message: 'Missing required fields: clientcode, password, and totp are required',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const loginRequest: LoginRequest = {
      clientcode,
      password,
      totp,
      ...(state && { state }),
    };

    const response = await angelOneService.login(loginRequest);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'VALIDATION_ERROR' ? 400 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Login failed',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * POST /api/auth/generate-token
 * Generate new tokens using refresh token
 */
router.post('/generate-token', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const authorizationToken = req.headers.authorization?.replace('Bearer ', '');

    // Validate required fields
    if (!refreshToken) {
      return res.status(400).json({
        status: false,
        message: 'Missing required field: refreshToken is required',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const response = await angelOneService.generateToken(refreshToken, authorizationToken);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'VALIDATION_ERROR' ? 400 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Token generation failed',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * GET /api/auth/profile
 * Get user profile (requires JWT token)
 */
router.get('/profile', async (req: Request, res: Response) => {
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
    const response = await angelOneService.getProfile(jwtToken);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch profile',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * GET /api/auth/rms
 * Get RMS limit - fund, cash and margin information (requires JWT token)
 */
router.get('/rms', async (req: Request, res: Response) => {
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
    const response = await angelOneService.getRMSLimit(jwtToken);
    res.json(response);
  } catch (error: any) {
    const statusCode = error.errorcode === 'UNAUTHORIZED' ? 401 : 500;
    res.status(statusCode).json({
      status: false,
      message: error.message || 'Failed to fetch RMS limit',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate session (requires JWT token)
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Missing or invalid authorization token',
        errorcode: 'UNAUTHORIZED',
      });
    }

    const { clientcode } = req.body;

    // Validate required fields
    if (!clientcode) {
      return res.status(400).json({
        status: false,
        message: 'Missing required field: clientcode is required',
        errorcode: 'VALIDATION_ERROR',
      });
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    const response = await angelOneService.logout(jwtToken, clientcode);
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
      message: error.message || 'Logout failed',
      errorcode: error.errorcode || 'UNKNOWN_ERROR',
      data: error.data,
    });
  }
});

export default router;

