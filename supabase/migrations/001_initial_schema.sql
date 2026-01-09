-- Innovation Arbitrage Engine - Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Research runs (each research cycle)
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'discovery'
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    phase TEXT, -- signal_hunter, global_vetting, gap_analysis, report_generation
    countries TEXT[], -- Array of countries being researched (null for discovery runs)
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    policies_found INTEGER DEFAULT 0,
    high_value_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discovered policies
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES runs(id) ON DELETE SET NULL,

    -- Core identity
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    source_country TEXT NOT NULL,

    -- Phase 1: Signal Hunter
    original_source_url TEXT NOT NULL,
    original_source_title TEXT,
    discovery_context TEXT,

    -- Phase 2: Global Vetting
    vetting_status TEXT DEFAULT 'pending', -- pending, vetted, rejected
    success_score DECIMAL(3,2), -- 0.00-1.00
    criticism_score DECIMAL(3,2), -- 0.00-1.00

    -- Phase 3: Ireland Gap Analysis
    ireland_status TEXT DEFAULT 'pending', -- pending, exists, discussed_rejected, absent
    ireland_notes TEXT,
    opportunity_value TEXT, -- low, medium, high

    -- Phase 4: Report
    concept_hook TEXT,
    case_study_summary TEXT,
    gap_statement TEXT,
    pilot_proposal TEXT,
    risk_assessment JSONB,

    -- Metadata
    status TEXT DEFAULT 'draft', -- draft, active, archived
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence items (citations)
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,

    -- Source
    url TEXT NOT NULL,
    title TEXT,
    source_type TEXT NOT NULL, -- oecd_report, news, gov_doc, academic, blog, think_tank
    publication_date DATE,

    -- Content
    evidence_type TEXT NOT NULL, -- success_metric, criticism, unintended_consequence, adoption_rate
    claim TEXT NOT NULL,
    excerpt TEXT,

    -- Classification
    sentiment TEXT, -- positive, negative, neutral
    confidence DECIMAL(3,2),

    -- Ireland-specific
    is_ireland_source BOOLEAN DEFAULT FALSE,
    ireland_domain TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_type ON runs(type);
CREATE INDEX idx_runs_created_at ON runs(created_at DESC);

CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_ireland_status ON policies(ireland_status);
CREATE INDEX idx_policies_opportunity_value ON policies(opportunity_value);
CREATE INDEX idx_policies_source_country ON policies(source_country);
CREATE INDEX idx_policies_slug ON policies(slug);
CREATE INDEX idx_policies_created_at ON policies(created_at DESC);

CREATE INDEX idx_evidence_policy_id ON evidence(policy_id);
CREATE INDEX idx_evidence_type ON evidence(evidence_type);
CREATE INDEX idx_evidence_is_ireland ON evidence(is_ireland_source);

-- Row Level Security (enable but allow all for now - customize as needed)
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

-- Allow all operations (adjust for production)
CREATE POLICY "Allow all on runs" ON runs FOR ALL USING (true);
CREATE POLICY "Allow all on policies" ON policies FOR ALL USING (true);
CREATE POLICY "Allow all on evidence" ON evidence FOR ALL USING (true);
