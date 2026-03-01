/**
 * API Server
 * Main entry point for the API service
 */
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import brokerageRoutes from './routes/brokerage.routes';
import portfolioRoutes from './routes/portfolio.routes';
import marginRoutes from './routes/margin.routes';
import marketDataRoutes from './routes/marketData.routes';
import orderRoutes from './routes/order.routes';
import { validateConfig } from './config/angelone.config';
import { requestLogger } from './middleware/requestLogger';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

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
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/margin', marginRoutes);
app.use('/api/market-data', marketDataRoutes);
app.use('/api/order', orderRoutes);

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
      console.log(`📊 Portfolio endpoints: http://localhost:${PORT}/api/portfolio`);
      console.log(`💵 Margin endpoints: http://localhost:${PORT}/api/margin`);
      console.log(`📈 Market data endpoints: http://localhost:${PORT}/api/market-data`);
      console.log(`📋 Order endpoints: http://localhost:${PORT}/api/order`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

