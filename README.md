# Innovation Arbitrage Engine

Find high-value innovation policies from peer economies and assess their fit for Ireland. The app runs a four-phase research pipeline and surfaces opportunities with evidence chains.

## What you can do
- Run targeted research for selected peer countries.
- Browse ranked policies with success/criticism evidence.
- Review Ireland gap analysis and pilot proposals.
- Trigger weekly autonomous discovery via cron.

## Quick start
```bash
npm install
```

Create a `.env` file:
```bash
PERPLEXITY_API_KEY=pplx-xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Optional
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
CRON_SECRET=xxx
```

Set up Supabase:
1. Create a project at supabase.com
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor

Start the app:
```bash
npm run dev
```

Open `http://localhost:3000`.

## Usage
- Dashboard: view top opportunities and recent runs.
- Research: select peer countries and trigger a new run.
- Policies: drill into a policy to see evidence, gap analysis, and proposed pilots.

## Tech
Next.js (App Router), TypeScript, Supabase, Tailwind, Perplexity API, optional Upstash Redis.

## Scripts
- `npm run dev` start local dev server
- `npm run build` build for production
- `npm run start` run production server
- `npm run lint` run ESLint
