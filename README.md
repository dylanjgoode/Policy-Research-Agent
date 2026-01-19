# Policy Research Engine

A research tool that helps you find out if your policy idea has been tried elsewhere—and what happened when it was. Describe an idea in plain language, and get back evidence from peer economies showing where it exists, how it performed, and whether Ireland has considered it.

## The Problem

You have a policy idea. Before investing months in developing it, you need answers:
- Has this been tried somewhere else?
- Did it work? What went wrong?
- Has Ireland already considered (and rejected) this?
- What would a pilot look like?

This tool automates that research. It searches government sources, think tanks, and news across peer economies to find evidence of your policy concept—including the criticisms and failures that are harder to find manually.

## User Flow

### 1. Describe Your Idea
Start with a plain-text description of the policy concept you want to research. No jargon required.

> *"A program where the government co-invests in angel deals to increase early-stage funding"*

> *"Tax incentives for companies that hire people returning from emigration"*

> *"Something like Estonia's e-residency but for startups"*

### 2. Review the AI Interpretation
The system extracts structure from your input:
- **Policy Name**: The canonical name to search for (e.g., "Government Co-Investment Fund")
- **Also Known As**: Alternate names used in different countries
- **Category**: R&D Incentives, Talent Visa, Startup Support, Tax Incentive, etc.
- **Policy Levers**: Target group, mechanism, sector, intended outcome

You can edit any of these before proceeding. Adding aliases helps find policies that go by different names in different countries.

### 3. Select Countries to Search
Choose which peer economies to research:
- Singapore, Denmark, Israel, Estonia, Finland
- Netherlands, New Zealand, South Korea, UK

Ireland is included by default for the gap analysis.

### 4. Get Your Research Back
The tool runs a four-phase search:

| Phase | What It Does |
|-------|--------------|
| **Signal Hunter** | Searches for evidence that this policy (or something like it) exists in selected countries |
| **Global Vetting** | For each match, finds success metrics AND searches for criticisms and failures |
| **Gap Analysis** | Searches Irish sources (gov.ie, oireachtas.ie) to see if this has been considered here |
| **Report Generation** | Synthesizes findings into a structured brief |

### 5. Review the Evidence
For each policy found, you get:
- **Where it exists**: Which countries have implemented something similar
- **How it performed**: Success metrics with source links
- **What went wrong**: Criticisms, unintended consequences, failures
- **Ireland status**: Does it exist here? Was it discussed and rejected?
- **Pilot proposal**: If it doesn't exist in Ireland, what would implementation look like?

Every claim links back to its source.

### Activity Report

When a run completes, you get a detailed activity report showing:
- **Research funnel**: How many signals were found → vetted → analyzed → reported
- **Phase timeline**: What happened in each phase and how long it took
- **Filtering summary**: Why signals were rejected at each stage
- **Outcome explanation**: Clear statement of what was found (or why nothing was found)

This helps you understand not just what was found, but what was searched and why certain results were filtered out.

## What You Learn

The research answers three questions:

1. **Does this exist?** Where has this policy (or something like it) been implemented?
2. **Did it work?** What's the evidence—both positive and negative?
3. **What about Ireland?** Has this been tried, discussed, or rejected here?

## Ireland Status Categories

- **Absent**: No evidence of this policy in Ireland
- **Discussed/Rejected**: Was considered but not implemented—worth researching why
- **Exists**: Already implemented in Ireland
- **Pending**: Gap analysis hasn't completed yet

## Dashboard

The home screen shows:
- Policies discovered across all research runs
- High-value opportunities (absent from Ireland + strong evidence elsewhere)
- Recent research runs with status

## Managing Research

- **Stop a run**: Cancel mid-search if you realize the scope is wrong
- **Clone a run**: Re-run the same query against different countries
- **Multiple concurrent runs**: Research several ideas in parallel

## Peer Countries

The tool searches small open economies with strong policy documentation:

| Country | Known For |
|---------|-----------|
| Singapore | Sandbox regulations, startup incentives, sovereign funds |
| Denmark | Green transition, flexicurity, active labor market policies |
| Israel | R&D incentives, defense-to-civilian tech transfer |
| Estonia | Digital governance, e-residency, startup visas |
| Finland | Education innovation, basic income experiments |
| Netherlands | IP box regimes, scale-up support |
| New Zealand | Regulatory innovation, wellbeing budgets |
| South Korea | Industrial policy, startup ecosystem development |
| UK | Scale-up visas, R&D tax credits |

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

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI/Search**: Perplexity API (sonar-pro model)
- **Caching**: Upstash Redis (optional)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
