# DayRhythm AI Backend

**Lightweight AI microservice for DayRhythm AI - Powered by Groq & Supabase**

## Overview

This is a **focused backend service** that handles AI-powered features for the DayRhythm AI iOS app:
- 🧠 AI insights generation
- 🗣️ Natural language schedule parsing
- 📊 Analytics processing

**What this backend does NOT do** (Supabase handles these):
- ❌ Authentication
- ❌ User management
- ❌ Database CRUD
- ❌ File storage

## Architecture

```
iOS App
  ├── Supabase → Auth, Database, Storage
  └── This Backend → AI Features (Groq)
```

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- **Supabase**: Get from https://app.supabase.com/project/_/settings/api
- **Groq**: Get from https://console.groq.com/keys

### 3. Run

```bash
npm run dev
```

Server runs on http://localhost:3000

**Test:**
```bash
curl http://localhost:3000/api/health
```

## API Endpoints

All endpoints require Supabase JWT in `Authorization: Bearer <token>` header.

### `POST /api/ai/insights`
Generate 5 productivity insights for a user's day.

**Request:**
```json
{
  "date": "2025-10-25"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      "Your morning is well-structured with focused work blocks.",
      "Consider adding breaks between back-to-back meetings.",
      "..."
    ]
  }
}
```

### `POST /api/ai/parse-schedule`
Convert natural language to structured events.

**Request:**
```json
{
  "prompt": "Meeting at 3pm and gym at 6pm tomorrow"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "title": "Meeting",
        "startTime": 15.0,
        "endTime": 16.0,
        "date": "2025-10-26",
        "emoji": "👥",
        "colorHex": "#4A90E2"
      },
      ...
    ]
  }
}
```

### `POST /api/ai/analytics`
Generate productivity stats for date range.

**Request:**
```json
{
  "startDate": "2025-10-01",
  "endDate": "2025-10-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "Analyzed 45 events across 20 days",
    "totalEvents": 45,
    "totalHours": 67.5,
    "averageEventsPerDay": 2.3
  }
}
```

## How It Works

1. **iOS app** authenticates user with Supabase SDK
2. **iOS app** gets JWT token from Supabase
3. **iOS app** calls this backend with JWT for AI features
4. **This backend** verifies JWT with Supabase
5. **This backend** queries Supabase database for user's events
6. **This backend** calls Groq AI for processing
7. **This backend** returns AI-generated insights to iOS

## Supabase Database Setup

This backend expects these tables in your Supabase project:

### Events Table

```sql
create table events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  start_time decimal not null,
  end_time decimal not null,
  date date not null,
  emoji text,
  color_hex text,
  created_at timestamp default now()
);

alter table events enable row level security;

create policy "Users can manage own events"
  on events
  using (auth.uid() = user_id);
```

**Setup:**
1. Go to your Supabase project
2. Database > SQL Editor
3. Paste schema above
4. Run query

## Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express.js
- **AI:** Groq (Llama 3.3 70B)
- **Auth:** Supabase JWT verification
- **Database:** Supabase (via SDK)

## Scripts

```bash
npm run dev    # Development with hot reload
npm run build  # Build for production
npm start      # Run production build
```

## Deployment

### Railway (Recommended)
```bash
# Push to GitHub, then:
# 1. Go to railway.app
# 2. Deploy from GitHub
# 3. Add environment variables
# Cost: ~$5/month
```

### Render
```bash
# 1. Connect GitHub repo
# 2. Build: npm run build
# 3. Start: npm start
# Cost: Free tier available
```

## Environment Variables

```env
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
GROQ_API_KEY=gsk_xxx

# Optional
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```

## Costs

**Free Tier (perfect for MVP):**
- Supabase: FREE (50k users, 500MB DB)
- Groq: FREE (14,400 requests/day)
- Hosting: $0-5/month
- **Total: $0-5/month**

**Production (1000 users):**
- Supabase Pro: $25/month
- Groq: Still FREE
- Hosting: $5/month
- **Total: ~$30/month**

## Documentation

- [CLAUDE.md](CLAUDE.md) - Complete architecture guide
- [.env.example](.env.example) - Environment template

## License

MIT

---

**Focus on AI features. Let Supabase handle the rest.**
