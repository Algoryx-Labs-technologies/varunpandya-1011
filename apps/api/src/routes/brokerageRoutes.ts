// Brokerage routes

import { Router } from 'express';
import { BrokerageController } from '../controllers/brokerageController';

const router = Router();
const brokerageController = new BrokerageController();

/**
 * @route POST /api/brokerage/estimate-charges
 * @desc Estimate brokerage charges and taxes for trades
 * @access Private (requires Bearer token)
 */
router.post('/estimate-charges', brokerageController.estimateCharges);

export default router;

