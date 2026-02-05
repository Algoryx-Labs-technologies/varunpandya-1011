// Main entry point for the API service

import express, { Express } from 'express';
import routes from './routes';
import { errorHandler } from './middleware';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;
