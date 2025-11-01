import express, { Application } from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import routes from './routes';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// Body parsing middleware (increased limit for image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// API routes
// In Vercel, requests are already routed to /api/*, so don't add /api prefix again
const routePrefix = process.env.VERCEL === '1' ? '/' : '/api';
app.use(routePrefix, routes);

// Global error handler
app.use(errorHandler);

// For local development
const startServer = () => {
  try {
    app.listen(env.PORT, () => {
      console.log('\nDayRhythm AI Backend - AI & Analytics Service');
      console.log('==============================================');
      console.log(`Server running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`API URL: http://localhost:${env.PORT}/api`);
      console.log(`Health: http://localhost:${env.PORT}/api/health`);
      console.log('==============================================');
      console.log('Powered by Groq AI & Gemini');
      console.log('Data from Supabase\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Start server only if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  startServer();
}

// Export for Vercel serverless deployment
export default app;
