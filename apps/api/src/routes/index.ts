// Route definitions
import { Router } from 'express';
import authRoutes from './authRoutes';
import portfolioRoutes from './portfolioRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/portfolio', portfolioRoutes);

export default router;
