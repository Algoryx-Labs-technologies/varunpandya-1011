// Route definitions
import { Router } from 'express';
import authRoutes from './authRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);

export default router;
