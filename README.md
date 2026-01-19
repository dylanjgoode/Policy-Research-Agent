# Innovation Arbitrage Engine

A research tool that discovers high-value innovation policies from peer economies and assesses their viability for Ireland. Think of it as a policy analyst that scans what's working in Singapore, Denmark, Estonia, and other small open economies—then tells you what Ireland is missing.

## The Problem

Policy teams spend weeks researching what peer countries are doing. They manually search government websites, read think-tank reports, and try to piece together whether a policy actually worked. Most never find the criticisms or unintended consequences until it's too late.

This tool automates that research. Describe a policy idea in plain language, and get back a structured brief with:
- Evidence of success (or failure) from countries that tried it
- Adversarial search for criticisms and unintended consequences
- Gap analysis against Irish policy landscape
- A concrete pilot proposal

## User Flow

### 1. Describe Your Idea
Start with a plain-text description of a policy concept you're curious about. No jargon required—just describe what you're looking for.

> *"Something like Estonia's e-residency but for startups—a way to let foreign founders set up Irish companies remotely"*

### 2. Review the AI Interpretation
The system extracts structure from your input:
- **Policy Name**: What to search for (e.g., "Digital Nomad Visa")
- **Also Known As**: Alternate names used in different countries
- **Category**: R&D Incentives, Talent Visa, Startup Support, etc.
- **Policy Levers**: Target group, mechanism, sector, intended outcome

You can edit any of these before proceeding. The levers help focus the research—if you're specifically interested in how a policy affects early-stage founders, make sure that's captured.

### 3. Select Countries to Scan
Choose which peer economies to research:
- Singapore, Denmark, Israel, Estonia, Finland
- Netherlands, New Zealand, South Korea, UK

Ireland is included by default for the gap analysis phase.

### 4. Watch the Pipeline Run
The research runs through four phases:

| Phase | What It Does |
|-------|--------------|
| **Signal Hunter** | Scans selected countries for relevant policy mechanisms using the policy name, aliases, and levers |
| **Global Vetting** | For each signal found, searches for success metrics AND runs an adversarial search for criticisms and failures |
| **Gap Analysis** | Searches Irish government sources (gov.ie, oireachtas.ie, enterprise.gov.ie) to see if similar policies exist |
| **Report Generation** | Creates structured briefs with pilot proposals |

### 5. Review Results
Each discovered policy gets a full brief:
- **Concept hook**: One-line summary of what it is
- **Evidence from source country**: What metrics show it worked (or didn't)
- **Criticism findings**: What went wrong, unintended consequences
- **Ireland gap statement**: Does this exist here? Was it discussed and rejected?
- **Pilot proposal**: Concrete next steps for an Irish implementation
- **Risk assessment**: What could go wrong and how to mitigate

Every claim links back to its source URL.

## Opportunity Scoring

Policies are scored based on the gap analysis:
- **High opportunity**: Policy is absent from Ireland + strong success evidence
- **Medium opportunity**: Policy was discussed but rejected, or partially implemented
- **Low opportunity**: Similar policy already exists in Ireland

## Dashboard

The home screen shows:
- Top high-value opportunities across all research runs
- Stats: total policies discovered, high-value count, countries analyzed
- Recent research runs with status

## Managing Research Runs

- **Stop a run**: Cancel mid-execution if you realize the scope is wrong
- **Clone a run**: Re-run the same policy query against different countries
- **Multiple concurrent runs**: Start several research topics in parallel

## Peer Countries

The tool focuses on small open economies with strong innovation track records:

| Country | Why It's Included |
|---------|-------------------|
| Singapore | Leading sandbox regulations, startup incentives |
| Denmark | Green transition policies, flexicurity model |
| Israel | R&D incentives, defense-to-civilian tech transfer |
| Estonia | Digital governance, e-residency, startup visas |
| Finland | Education innovation, basic income experiments |
| Netherlands | IP box regimes, scale-up support |
| New Zealand | Regulatory innovation, wellbeing budgets |
| South Korea | Industrial policy, chaebols → startup ecosystem |
| UK | Scale-up visas, R&D tax credits (as comparator) |

## Quick Setup

```bash
npm install
```

Create `.env`:
```bash
PERPLEXITY_API_KEY=pplx-xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Optional (caching)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

Set up the database:
1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations in the SQL editor (in order):
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_create_policy_with_evidence_fn.sql`
   - `supabase/migrations/003_evidence_provenance_and_claim_ledger.sql`
   - `supabase/migrations/004_run_interpretation.sql`
   - `supabase/migrations/005_run_activity_log.sql`

Start the app:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Autonomous Discovery Mode

Beyond targeted research, the app can run a weekly autonomous scan for emerging policy trends. This is triggered via Vercel Cron (Monday 6:00 AM UTC) and surfaces new signals without needing a specific query.

Configure in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/discover", "schedule": "0 6 * * 1" }]
}
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI/Search**: Perplexity API (sonar-pro model)
- **Caching**: Upstash Redis (optional)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Scripts

```bash
npm run dev      # Start local dev server
npm run build    # Build for production
npm run start    # Run production server
npm run lint     # Run ESLint
```
