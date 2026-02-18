/**
 * API Server
 * Main entry point for the API service
 */
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import brokerageRoutes from './routes/brokerage.routes';
import { validateConfig } from './config/angelone.config';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'API service is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/brokerage', brokerageRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: false,
    message: 'Endpoint not found',
    errorcode: 'NOT_FOUND',
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    status: false,
    message: err.message || 'Internal server error',
    errorcode: 'INTERNAL_ERROR',
  });
});

// Start server
async function startServer() {
  try {
    // Validate configuration
    validateConfig();

    app.listen(PORT, () => {
      console.log(`🚀 API server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
      console.log(`💰 Brokerage endpoints: http://localhost:${PORT}/api/brokerage`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

