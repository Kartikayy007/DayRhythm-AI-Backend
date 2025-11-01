import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { z } from 'zod';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

const EventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.number().min(0).max(24),
  endTime: z.number().min(0).max(24),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  emoji: z.string().optional(),
  colorHex: z.string().optional(),
  category: z.string().optional(),
  participants: z.array(z.string()).optional(),
  isCompleted: z.boolean().optional(),
  notificationSettings: z.object({
    enabled: z.boolean(),
    minutesBefore: z.array(z.number()),
    notificationIds: z.array(z.string())
  }).optional()
});

const BatchEventSchema = z.object({
  events: z.array(EventSchema),
  clearExisting: z.boolean().optional() // Option to clear existing events before batch insert
});

// Extended Request type with user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Get all events for the authenticated user
 * Optionally filter by date range
 */
export const getEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { startDate, endDate, date } = req.query;

    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    // Apply date filters if provided
    if (date) {
      query = query.eq('date', date as string);
    } else {
      if (startDate) {
        query = query.gte('date', startDate as string);
      }
      if (endDate) {
        query = query.lte('date', endDate as string);
      }
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

    // Transform snake_case to camelCase for iOS app compatibility
    const transformedEvents = events.map(event => ({
      id: event.id,
      userId: event.user_id,
      title: event.title,
      description: event.description,
      startTime: event.start_time,
      endTime: event.end_time,
      date: event.date,
      emoji: event.emoji,
      colorHex: event.color_hex,
      category: event.category,
      participants: event.participants || [],
      isCompleted: event.is_completed || false,
      notificationSettings: event.notification_settings || {
        enabled: false,
        minutesBefore: [],
        notificationIds: []
      },
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }));

    res.json({
      success: true,
      events: transformedEvents,
      count: transformedEvents.length
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Create a new event
 */
export const createEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const validationResult = EventSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues
      });
    }

    const eventData = validationResult.data;

    const dbEvent = {
      user_id: userId,
      title: eventData.title,
      description: eventData.description || null,
      start_time: eventData.startTime,
      end_time: eventData.endTime,
      date: eventData.date,
      emoji: eventData.emoji || null,
      color_hex: eventData.colorHex || null,
      category: eventData.category || null,
      participants: eventData.participants || [],
      is_completed: eventData.isCompleted || false,
      notification_settings: eventData.notificationSettings || {
        enabled: false,
        minutesBefore: [],
        notificationIds: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newEvent, error } = await supabase
      .from('events')
      .insert(dbEvent)
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return res.status(500).json({ error: 'Failed to create event' });
    }

    const transformedEvent = {
      id: newEvent.id,
      userId: newEvent.user_id,
      title: newEvent.title,
      description: newEvent.description,
      startTime: newEvent.start_time,
      endTime: newEvent.end_time,
      date: newEvent.date,
      emoji: newEvent.emoji,
      colorHex: newEvent.color_hex,
      category: newEvent.category,
      participants: newEvent.participants,
      isCompleted: newEvent.is_completed,
      notificationSettings: newEvent.notification_settings,
      createdAt: newEvent.created_at,
      updatedAt: newEvent.updated_at
    };

    res.status(201).json({
      success: true,
      event: transformedEvent
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update an existing event
 */
export const updateEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Validate request body
    const validationResult = EventSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues
      });
    }

    const updates = validationResult.data;

    // Prepare update data (convert camelCase to snake_case)
    const dbUpdates: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
    if (updates.colorHex !== undefined) dbUpdates.color_hex = updates.colorHex;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.participants !== undefined) dbUpdates.participants = updates.participants;
    if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;
    if (updates.notificationSettings !== undefined) {
      dbUpdates.notification_settings = updates.notificationSettings;
    }

    const { data: updatedEvent, error } = await supabase
      .from('events')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId) // Ensure user owns this event
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return res.status(500).json({ error: 'Failed to update event' });
    }

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Transform response back to camelCase
    const transformedEvent = {
      id: updatedEvent.id,
      userId: updatedEvent.user_id,
      title: updatedEvent.title,
      description: updatedEvent.description,
      startTime: updatedEvent.start_time,
      endTime: updatedEvent.end_time,
      date: updatedEvent.date,
      emoji: updatedEvent.emoji,
      colorHex: updatedEvent.color_hex,
      category: updatedEvent.category,
      participants: updatedEvent.participants,
      isCompleted: updatedEvent.is_completed,
      notificationSettings: updatedEvent.notification_settings,
      createdAt: updatedEvent.created_at,
      updatedAt: updatedEvent.updated_at
    };

    res.json({
      success: true,
      event: transformedEvent
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete an event
 */
export const deleteEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Ensure user owns this event

    if (error) {
      console.error('Error deleting event:', error);
      return res.status(500).json({ error: 'Failed to delete event' });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Batch create/update events
 * Useful for initial sync or bulk operations
 */
export const batchSyncEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const validationResult = BatchEventSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues
      });
    }

    const { events, clearExisting } = validationResult.data;

    // Optionally clear existing events
    if (clearExisting) {
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error clearing existing events:', deleteError);
        return res.status(500).json({ error: 'Failed to clear existing events' });
      }
    }

    // Prepare events for batch insert
    const dbEvents = events.map(event => ({
      user_id: userId,
      title: event.title,
      description: event.description || null,
      start_time: event.startTime,
      end_time: event.endTime,
      date: event.date,
      emoji: event.emoji || null,
      color_hex: event.colorHex || null,
      category: event.category || null,
      participants: event.participants || [],
      is_completed: event.isCompleted || false,
      notification_settings: event.notificationSettings || {
        enabled: false,
        minutesBefore: [],
        notificationIds: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Batch insert new events
    const { data: newEvents, error } = await supabase
      .from('events')
      .insert(dbEvents)
      .select();

    if (error) {
      console.error('Error batch syncing events:', error);
      return res.status(500).json({ error: 'Failed to sync events' });
    }

    // Transform response back to camelCase
    const transformedEvents = newEvents.map(event => ({
      id: event.id,
      userId: event.user_id,
      title: event.title,
      description: event.description,
      startTime: event.start_time,
      endTime: event.end_time,
      date: event.date,
      emoji: event.emoji,
      colorHex: event.color_hex,
      category: event.category,
      participants: event.participants,
      isCompleted: event.is_completed,
      notificationSettings: event.notification_settings,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }));

    res.json({
      success: true,
      events: transformedEvents,
      count: transformedEvents.length,
      message: clearExisting ? 'Events replaced successfully' : 'Events synced successfully'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete all events for the authenticated user
 * Useful for account cleanup or data reset
 */
export const deleteAllEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting all events:', error);
      return res.status(500).json({ error: 'Failed to delete events' });
    }

    res.json({
      success: true,
      message: 'All events deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};