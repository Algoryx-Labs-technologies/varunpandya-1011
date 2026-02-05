// Authentication routes

import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /api/auth/login
 * @desc Login to AngelOne API
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/generate-token
 * @desc Generate new tokens using refresh token
 * @access Private (requires Bearer token)
 */
router.post('/generate-token', authController.generateToken);

/**
 * @route GET /api/auth/profile
 * @desc Get user profile
 * @access Private (requires Bearer token)
 */
router.get('/profile', authController.getProfile);

export default router;

