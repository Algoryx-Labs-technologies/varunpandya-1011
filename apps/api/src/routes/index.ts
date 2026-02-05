// Route definitions
import { Router } from 'express';
import authRoutes from './authRoutes';
import portfolioRoutes from './portfolioRoutes';
import brokerageRoutes from './brokerageRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/brokerage', brokerageRoutes);

export default router;
