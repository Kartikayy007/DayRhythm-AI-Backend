import { Router } from 'express';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  batchSyncEvents,
  deleteAllEvents
} from '../controllers/events.controller';
import { verifySupabaseToken } from '../middleware/supabaseAuth';

const router = Router();

// All routes require authentication
router.use(verifySupabaseToken);

/**
 * Get all events for the authenticated user
 * GET /api/events
 * Query params: ?date=2025-10-25 or ?startDate=2025-10-01&endDate=2025-10-31
 */
router.get('/', getEvents);

/**
 * Create a new event
 * POST /api/events
 * Body: { title, description?, startTime, endTime, date, emoji?, colorHex?, category?, participants?, isCompleted?, notificationSettings? }
 */
router.post('/', createEvent);

/**
 * Batch sync events (for initial sync or bulk operations)
 * POST /api/events/batch
 * Body: { events: [...], clearExisting?: boolean }
 */
router.post('/batch', batchSyncEvents);

/**
 * Update an existing event
 * PUT /api/events/:id
 * Body: { title?, description?, startTime?, endTime?, date?, emoji?, colorHex?, category?, participants?, isCompleted?, notificationSettings? }
 */
router.put('/:id', updateEvent);

/**
 * Delete a specific event
 * DELETE /api/events/:id
 */
router.delete('/:id', deleteEvent);

/**
 * Delete all events for the authenticated user
 * DELETE /api/events/all
 * Use with caution - this is irreversible
 */
router.delete('/all', deleteAllEvents);

export default router;