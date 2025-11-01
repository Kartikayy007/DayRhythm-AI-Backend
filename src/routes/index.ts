import { Router } from 'express';
import aiRoutes from './ai.routes';
import eventsRoutes from './events.routes';

const router = Router();


router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'DayRhythm AI Backend is running',
    timestamp: new Date().toISOString(),
    service: 'AI & Analytics Service'
  });
});


router.use('/ai', aiRoutes);
router.use('/events', eventsRoutes);

export default router;
