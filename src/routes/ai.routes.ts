import { Router } from 'express';
import {
  generateDayInsights,
  parseNaturalLanguage,
  parseNaturalLanguageGemini,
  parseScheduleFromImage,
  parseScheduleFromImages,
  generateAnalytics,
  generateTaskInsight
} from '../controllers/ai.controller';
import { verifySupabaseToken } from '../middleware/supabaseAuth';

const router = Router();


router.post('/test-parse', parseNaturalLanguage);


router.use(verifySupabaseToken);

/**
 * Generate AI insights for a user's day
 * POST /api/ai/insights
 * Body: { date: "2025-10-25" }
 */
router.post('/insights', generateDayInsights);

/**
 * Parse natural language into structured events (Groq/Llama)
 * POST /api/ai/parse-schedule
 * Body: { prompt: "Meeting at 3pm and dinner at 7pm" }
 */
router.post('/parse-schedule', parseNaturalLanguage);

/**
 * Parse natural language into structured events (Gemini Pro - Premium)
 * POST /api/ai/parse-schedule-pro
 * Body: { prompt: "Meeting at 3pm and dinner at 7pm" }
 */
router.post('/parse-schedule-pro', parseNaturalLanguageGemini);

/**
 * Parse schedule from image using Gemini Vision
 * POST /api/ai/parse-schedule-image
 * Body: { image: "base64_string", prompt: "Optional context" }
 */
router.post('/parse-schedule-image', parseScheduleFromImage);

/**
 * Parse schedule from multiple images using Gemini Vision (up to 3 images)
 * POST /api/ai/parse-schedule-images
 * Body: { images: ["base64_string1", "base64_string2", ...], prompt: "Optional context" }
 */
router.post('/parse-schedule-images', parseScheduleFromImages);

/**
 * Generate productivity analytics for a date range
 * POST /api/ai/analytics
 * Body: { startDate: "2025-10-01", endDate: "2025-10-31" }
 */
router.post('/analytics', generateAnalytics);

/**
 * Generate AI insight for a single task
 * POST /api/ai/task-insight
 * Body: { title, description, startTime, endTime, category }
 */
router.post('/task-insight', generateTaskInsight);

export default router;
