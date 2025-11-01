import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
const groq = new Groq({ apiKey: env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || 'dummy_key');

/**
 * Generate AI insights for a user's day schedule
 * POST /api/ai/insights
 * Body: { date: "2025-10-25" }
 */
export async function generateDayInsights(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }

    
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch events from database'
      });
    }

    if (!events || events.length === 0) {
      return res.json({
        success: true,
        data: {
          insights: [
            "No events scheduled for this day. Consider planning your day for better productivity!",
            "A blank slate - perfect opportunity to set meaningful goals.",
            "Time blocking can help structure your unscheduled day.",
            "Consider adding at least 2-3 focused work blocks.",
            "Don't forget to schedule breaks and personal time."
          ],
          visualInsights: {
            energyHeatmap: [],
            focusBlocks: [],
            workLifeBalance: { work: 0, personal: 0, health: 0, other: 0 }
          }
        }
      });
    }

    
    const visualInsights = calculateVisualInsights(events);

    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a productivity assistant analyzing daily schedules. Provide exactly 5 actionable insights about time management, work-life balance, and productivity. Return ONLY a JSON array of 5 strings, no other text.'
        },
        {
          role: 'user',
          content: `Analyze this day schedule and provide 5 productivity insights:\n\n${JSON.stringify(events, null, 2)}\n\nReturn format: ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"]`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500
    });

    const content = completion.choices[0].message.content || '[]';
    let insights: string[];

    try {
      insights = JSON.parse(content);
    } catch {
      
      insights = [
        "Your schedule shows a good balance of activities.",
        "Consider adding buffer time between tasks.",
        "Mix focused work with breaks for optimal productivity.",
        "Track your energy levels to optimize task timing.",
        "Review your schedule weekly to identify patterns."
      ];
    }

    return res.json({
      success: true,
      data: {
        insights,
        visualInsights
      }
    });

  } catch (error) {
    console.error('AI insights error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate insights'
    });
  }
}

/**
 * Parse natural language into structured events
 * POST /api/ai/parse-schedule
 * Body: { prompt: "Meeting at 3pm tomorrow and gym at 6pm" }
 */
export async function parseNaturalLanguage(req: Request, res: Response) {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a string'
      });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const systemMessage = {
      role: 'system' as const,
      content: `You are a scheduling assistant. Today's date is ${todayStr}.

Return ONLY a JSON array of event objects:
[{
  "title": "Event title",
  "description": "Brief description",
  "startTime": 15.0,
  "endTime": 16.0,
  "date": "2025-10-25",
  "emoji": "📅",
  "colorHex": "#FF69B4"
}]

Rules:
- startTime/endTime in 24-hour decimal format (15.0 = 3pm, 15.5 = 3:30pm)
- date in YYYY-MM-DD format
- Choose relevant emojis and colors
- If duration not specified, default to 30 minutes
- Infer smart defaults from context`
    };

    const messages: any[] = [
      systemMessage,
      {
        role: 'user',
        content: `Parse this into structured events: "${prompt}"`
      }
    ];

    console.log(`📝 Processing prompt: "${prompt}"`);

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = completion.choices[0].message.content || '[]';
    let events: any[];

    try {
      events = JSON.parse(content);
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response'
      });
    }

    return res.json({
      success: true,
      data: { events }
    });

  } catch (error) {
    console.error('Natural language parsing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to parse natural language'
    });
  }
}

/**
 * Parse natural language using Gemini Pro model
 * POST /api/ai/parse-schedule-pro
 * Body: { prompt: "Meeting at 3pm tomorrow and gym at 6pm" }
 */
export async function parseNaturalLanguageGemini(req: Request, res: Response) {
  try {
    
    if (!env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'Gemini Pro API is not configured. Please add GEMINI_API_KEY to your environment variables.'
      });
    }

    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a string'
      });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const systemPrompt = `You are a scheduling assistant. Today's date is ${todayStr}.

Return ONLY a JSON array of event objects:
[{
  "title": "Event title",
  "description": "Brief description",
  "startTime": 15.0,
  "endTime": 16.0,
  "date": "2025-10-25",
  "emoji": "📅",
  "colorHex": "#FF69B4"
}]

Rules:
- startTime/endTime in 24-hour decimal format (15.0 = 3pm, 15.5 = 3:30pm)
- date in YYYY-MM-DD format
- Choose relevant emojis and colors
- If duration not specified, default to 30 minutes
- Infer smart defaults from context`;

    const fullPrompt = `${systemPrompt}\n\nParse this into structured events: "${prompt}"`;

    console.log(`🚀 Processing with Gemini Pro: "${prompt}"`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const content = response.text();

    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '');
    }

    let events: any[];
    try {
      events = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', content);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response'
      });
    }

    return res.json({
      success: true,
      data: { events }
    });

  } catch (error) {
    console.error('Gemini parsing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to parse natural language with Gemini'
    });
  }
}

/**
 * Parse schedule from image using Gemini Vision (multimodal)
 * POST /api/ai/parse-schedule-image
 * Body: {
 *   image: "base64_encoded_image_string",
 *   prompt: "Schedule my day based on this timetable"
 * }
 */
export async function parseScheduleFromImage(req: Request, res: Response) {
  try {
    
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.status(503).json({
        success: false,
        error: 'Gemini API is required for image processing. Please add GEMINI_API_KEY to your environment variables.'
      });
    }

    const { image, prompt } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Image (base64 encoded) is required'
      });
    }

    const userPrompt = prompt || 'Analyze this timetable/schedule image and extract all events, tasks, and time slots into a structured format.';

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');

    const systemPrompt = `You are a scheduling assistant that analyzes images of timetables, calendars, and schedules. Today's date is ${todayStr}.

Analyze the image carefully and extract all events, classes, meetings, or tasks visible in the image.

Return ONLY a JSON array of event objects:
[{
  "title": "Event title",
  "description": "Brief description from the image",
  "startTime": 15.0,
  "endTime": 16.0,
  "date": "2025-10-31",
  "emoji": "📅",
  "colorHex": "#FF69B4"
}]

Rules:
- startTime/endTime in 24-hour decimal format (15.0 = 3pm, 15.5 = 3:30pm)
- date in YYYY-MM-DD format (use today's date if not specified in image)
- Choose relevant emojis based on the event type
- Choose appropriate colors for each event
- If duration not specified in image, infer reasonable duration
- Extract ALL events visible in the image
- If the image shows a weekly schedule, include events for multiple days`;

    const fullPrompt = `${systemPrompt}\n\nUser request: ${userPrompt}`;

    console.log(`🖼️  Processing image with Gemini Vision`);

    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg' 
      }
    };

    const result = await model.generateContent([fullPrompt, imagePart]);
    const response = await result.response;
    const content = response.text();

    
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '');
    }

    let events: any[];
    try {
      events = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse Gemini Vision response:', content);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response. The image might not contain a clear schedule or timetable.'
      });
    }

    console.log(`✅ Extracted ${events.length} events from image`);

    return res.json({
      success: true,
      data: { events }
    });

  } catch (error) {
    console.error('Image parsing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to parse image. Please ensure the image contains a clear timetable or schedule.'
    });
  }
}

/**
 * Parse schedule from multiple images using Gemini Vision (multimodal)
 * POST /api/ai/parse-schedule-images
 * Body: {
 *   images: ["base64_encoded_image1", "base64_encoded_image2", ...],
 *   prompt: "Schedule my day based on these timetables" (optional)
 * }
 */
export async function parseScheduleFromImages(req: Request, res: Response) {
  try {
    
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.status(503).json({
        success: false,
        error: 'Gemini API is required for image processing. Please add GEMINI_API_KEY to your environment variables.'
      });
    }

    const { images, prompt } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one image (base64 encoded) is required'
      });
    }

    
    if (images.length > 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 3 images allowed'
      });
    }

    const userPrompt = prompt || 'Analyze these timetable/schedule images and extract all events, tasks, and time slots into a structured format.';

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    
    const base64Images = images.map((img: string) =>
      img.replace(/^data:image\/[a-z]+;base64,/, '')
    );

    const systemPrompt = `You are a scheduling assistant that analyzes images of timetables, calendars, and schedules. Today's date is ${todayStr}.

Analyze ALL ${images.length} image(s) carefully and extract all events, classes, meetings, or tasks visible across all images. Combine them into a single comprehensive schedule.

Return ONLY a JSON array of event objects:
[{
  "title": "Event title",
  "description": "Brief description from the image",
  "startTime": 15.0,
  "endTime": 16.0,
  "date": "2025-10-31",
  "emoji": "📅",
  "colorHex": "#FF69B4"
}]

Rules:
- startTime/endTime in 24-hour decimal format (15.0 = 3pm, 15.5 = 3:30pm)
- date in YYYY-MM-DD format (use today's date if not specified in images)
- Choose relevant emojis based on the event type
- Choose appropriate colors for each event
- If duration not specified in images, infer reasonable duration
- Extract ALL events visible across ALL images
- If images show different days/weeks, include events for those specific dates
- Avoid duplicates - if the same event appears in multiple images, include it only once`;

    const fullPrompt = `${systemPrompt}\n\nUser request: ${userPrompt}`;

    console.log(`🖼️  Processing ${images.length} images with Gemini Vision`);

    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    
    const imageParts = base64Images.map((base64Image: string) => ({
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg'
      }
    }));

    
    const result = await model.generateContent([fullPrompt, ...imageParts]);
    const response = await result.response;
    const content = response.text();

    
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '');
    }

    let events: any[];
    try {
      events = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse Gemini Vision response:', content);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response. The images might not contain clear schedules or timetables.'
      });
    }

    console.log(`✅ Extracted ${events.length} events from ${images.length} images`);

    return res.json({
      success: true,
      data: { events }
    });

  } catch (error) {
    console.error('Multi-image parsing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to parse images. Please ensure the images contain clear timetables or schedules.'
    });
  }
}

/**
 * Generate productivity analytics for a date range
 * POST /api/ai/analytics
 * Body: { startDate: "2025-10-01", endDate: "2025-10-31" }
 */
export async function generateAnalytics(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch events'
      });
    }

    if (!events || events.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: 'No events found in this date range.',
          totalEvents: 0,
          totalHours: 0,
          averageEventsPerDay: 0
        }
      });
    }

    const totalEvents = events.length;
    const totalHours = events.reduce((sum, e) => sum + (e.end_time - e.start_time), 0);
    const uniqueDates = new Set(events.map(e => e.date)).size;
    const averageEventsPerDay = totalEvents / uniqueDates;

    return res.json({
      success: true,
      data: {
        summary: `Analyzed ${totalEvents} events across ${uniqueDates} days`,
        totalEvents,
        totalHours: Math.round(totalHours * 10) / 10,
        averageEventsPerDay: Math.round(averageEventsPerDay * 10) / 10,
        dateRange: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate analytics'
    });
  }
}

/**
 * Generate AI insight for a single task
 * POST /api/ai/task-insight
 * Body: { title, description, startTime, endTime, category }
 */
export async function generateTaskInsight(req: Request, res: Response) {
  try {
    const { title, startTime, endTime, category } = req.body;

    if (!title || startTime === undefined || endTime === undefined) {
      return res.status(400).json({
        success: false,
        error: 'title, startTime, and endTime are required'
      });
    }

    const duration = endTime - startTime;
    const startHour = Math.floor(startTime);
    const startMinute = Math.round((startTime - startHour) * 60);

    const hour12 = startHour > 12 ? startHour - 12 : (startHour === 0 ? 12 : startHour);
    const period = startHour >= 12 ? 'PM' : 'AM';
    const timeString = `${hour12}:${startMinute.toString().padStart(2, '0')} ${period}`;
    const durationString = duration >= 1 ? `${duration.toFixed(1)} hours` : `${Math.round(duration * 60)} minutes`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a productivity insights assistant. Provide EXACTLY 2 concise, actionable bullet points.

Rules:
- Return ONLY 2 bullet points, each starting with "• "
- Each point must be ONE sentence (max 15 words)
- Focus on: timing, duration, or one specific tip
- Be direct and actionable
- No fluff, no explanations

Example format:
• Schedule 15min break after for recovery
• Morning hours boost focus 40% for this task type`
        },
        {
          role: 'user',
          content: `Task: ${title} | Duration: ${durationString} | Time: ${timeString} | Category: ${category || 'General'}

Give 2 bullet points about optimal timing or effectiveness.`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 80
    });

    const insight = completion.choices[0].message.content || generateFallbackTaskInsight(startHour, duration);

    return res.json({
      success: true,
      data: { insight: insight.trim() }
    });

  } catch (error) {
    console.error('Task insight error:', error);


    const { startTime = 9, endTime = 10 } = req.body;
    const startHour = Math.floor(startTime);
    const duration = endTime - startTime;

    return res.json({
      success: true,
      data: { insight: generateFallbackTaskInsight(startHour, duration) }
    });
  }
}

function generateFallbackTaskInsight(hour: number, duration: number): string {
  if (hour < 10) {
    return `• Morning energy peak - tackle hardest parts first\n• ${duration.toFixed(1)}h duration works well for deep focus`;
  } else if (hour < 14) {
    return `• Mid-day slot - break into 25min focused chunks\n• Good timing to build on morning momentum`;
  } else if (hour < 18) {
    return `• Afternoon energy dip - pair with quick snack break\n• ${duration.toFixed(1)}h duration fits well before evening wind-down`;
  } else {
    return `• Evening hours - minimize distractions for best results\n• Create comfortable environment to maintain engagement`;
  }
}

/**
 * Calculate visual insights metrics from events
 */
function calculateVisualInsights(events: any[]) {
  
  const energyHeatmap = events.map(event => {
    const startHour = event.start_time;
    const endHour = event.end_time;
    const category = event.category?.toLowerCase() || 'other';

    
    let optimalEnergy: 'high' | 'medium' | 'low';
    let actualTaskType: 'deep-work' | 'meetings' | 'admin' | 'creative' | 'other';

    
    if (startHour >= 9 && startHour < 12) {
      optimalEnergy = 'high'; 
    } else if ((startHour >= 6 && startHour < 9) || (startHour >= 16 && startHour < 19)) {
      optimalEnergy = 'medium'; 
    } else {
      optimalEnergy = 'low'; 
    }

    
    if (category.includes('work') || category.includes('coding') || category.includes('deep')) {
      actualTaskType = 'deep-work';
    } else if (category.includes('meeting') || category.includes('call')) {
      actualTaskType = 'meetings';
    } else if (category.includes('email') || category.includes('admin')) {
      actualTaskType = 'admin';
    } else if (category.includes('design') || category.includes('creative')) {
      actualTaskType = 'creative';
    } else {
      actualTaskType = 'other';
    }

    
    let alignment: 'optimal' | 'good' | 'poor';
    if (actualTaskType === 'deep-work' && optimalEnergy === 'high') {
      alignment = 'optimal';
    } else if (actualTaskType === 'meetings' && optimalEnergy === 'low') {
      alignment = 'poor';
    } else if (actualTaskType === 'deep-work' && optimalEnergy === 'low') {
      alignment = 'poor';
    } else if (optimalEnergy === 'high' && actualTaskType === 'admin') {
      alignment = 'poor';
    } else {
      alignment = 'good';
    }

    return {
      title: event.title,
      startTime: startHour,
      endTime: endHour,
      optimalEnergy,
      actualTaskType,
      alignment,
      category: event.category
    };
  });

  
  const focusBlocks = [];
  const sortedEvents = [...events].sort((a, b) => a.start_time - b.start_time);

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const duration = event.end_time - event.start_time;
    const nextEvent = sortedEvents[i + 1];

    
    const hasGap = nextEvent ? (nextEvent.start_time - event.end_time) >= 0.25 : true; 

    
    let quality: 'excellent' | 'good' | 'fragmented';
    if (duration >= 1.5) {
      quality = 'excellent'; 
    } else if (duration >= 0.5) {
      quality = 'good'; 
    } else {
      quality = 'fragmented'; 
    }

    focusBlocks.push({
      title: event.title,
      startTime: event.start_time,
      duration: duration,
      quality: quality,
      hasBreakAfter: hasGap,
      category: event.category
    });
  }

  
  const categoryTotals: { [key: string]: number } = {};

  events.forEach(event => {
    const category = event.category?.toLowerCase() || 'other';
    const duration = event.end_time - event.start_time;

    
    let broadCategory: string;
    if (category.includes('work') || category.includes('meeting') || category.includes('coding')) {
      broadCategory = 'work';
    } else if (category.includes('health') || category.includes('exercise') || category.includes('fitness')) {
      broadCategory = 'health';
    } else if (category.includes('personal') || category.includes('family') || category.includes('social')) {
      broadCategory = 'personal';
    } else {
      broadCategory = 'other';
    }

    categoryTotals[broadCategory] = (categoryTotals[broadCategory] || 0) + duration;
  });

  const totalHours = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  const workLifeBalance = {
    work: categoryTotals['work'] || 0,
    personal: categoryTotals['personal'] || 0,
    health: categoryTotals['health'] || 0,
    other: categoryTotals['other'] || 0,
    workPercentage: totalHours > 0 ? Math.round((categoryTotals['work'] || 0) / totalHours * 100) : 0,
    personalPercentage: totalHours > 0 ? Math.round((categoryTotals['personal'] || 0) / totalHours * 100) : 0,
    healthPercentage: totalHours > 0 ? Math.round((categoryTotals['health'] || 0) / totalHours * 100) : 0,
    otherPercentage: totalHours > 0 ? Math.round((categoryTotals['other'] || 0) / totalHours * 100) : 0,
    balanceScore: calculateBalanceScore(categoryTotals, totalHours)
  };

  return {
    energyHeatmap,
    focusBlocks,
    workLifeBalance
  };
}

/**
 * Calculate balance score (0-100)
 * Ideal: 60% work, 25% personal, 15% health
 */
function calculateBalanceScore(categoryTotals: { [key: string]: number }, totalHours: number): number {
  if (totalHours === 0) return 0;

  const workPct = ((categoryTotals['work'] || 0) / totalHours) * 100;
  const personalPct = ((categoryTotals['personal'] || 0) / totalHours) * 100;
  const healthPct = ((categoryTotals['health'] || 0) / totalHours) * 100;

  
  const idealWork = 60;
  const idealPersonal = 25;
  const idealHealth = 15;

  
  const workDev = Math.abs(workPct - idealWork);
  const personalDev = Math.abs(personalPct - idealPersonal);
  const healthDev = Math.abs(healthPct - idealHealth);

  const totalDeviation = workDev + personalDev + healthDev;

  
  const score = Math.max(0, 100 - totalDeviation);

  return Math.round(score);
}
