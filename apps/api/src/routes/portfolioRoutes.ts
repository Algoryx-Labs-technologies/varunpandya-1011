// Portfolio routes

import { Router } from 'express';
import { PortfolioController } from '../controllers/portfolioController';

const router = Router();
const portfolioController = new PortfolioController();

/**
 * @route GET /api/portfolio/holding
 * @desc Get holding
 * @access Private (requires Bearer token)
 */
router.get('/holding', portfolioController.getHolding);

/**
 * @route GET /api/portfolio/holdings
 * @desc Get all holdings
 * @access Private (requires Bearer token)
 */
router.get('/holdings', portfolioController.getAllHolding);

/**
 * @route GET /api/portfolio/position
 * @desc Get position
 * @access Private (requires Bearer token)
 */
router.get('/position', portfolioController.getPosition);

/**
 * @route POST /api/portfolio/convert-position
 * @desc Convert position
 * @access Private (requires Bearer token)
 */
router.post('/convert-position', portfolioController.convertPosition);

export default router;

