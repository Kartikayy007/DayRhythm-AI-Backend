import express, { Application } from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import routes from './routes';

const app: Application = express();


app.use(helmet());


app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use(generalLimiter);


app.use('/api', routes);


app.use(errorHandler);


const startServer = () => {
  try {
    app.listen(env.PORT, () => {
      console.log('\n🤖 DayRhythm AI Backend - AI & Analytics Service');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 API URL: http:
      console.log(`💚 Health: http:
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🧠 Powered by Groq AI');
      console.log('🗄️  Data from Supabase\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});


if (process.env.VERCEL !== '1') {
  startServer();
}


export default app;
