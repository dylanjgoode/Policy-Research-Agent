-- Migration: Add activity logging for research runs
-- Purpose: Track detailed pipeline activity for Research Activity Reports

-- Add activity_summary JSONB column to runs table for quick access to aggregated metrics
ALTER TABLE runs ADD COLUMN IF NOT EXISTS activity_summary JSONB;

-- Create detailed activity log table for auditing and drill-down
CREATE TABLE IF NOT EXISTS run_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    phase TEXT NOT NULL,  -- signal_hunter, global_vetting, gap_analysis, report_generation
    event_type TEXT NOT NULL,  -- phase_started, phase_completed, query_sent, signal_found, etc.
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- Query details (for query_sent events)
    query_text TEXT,
    target_country TEXT,

    -- Result details
    item_name TEXT,  -- policy name, source name, etc.
    item_count INTEGER,

    -- Rejection/filtering details
    rejection_reason TEXT,

    -- API metrics
    api_call_duration_ms INTEGER,
    tokens_used INTEGER,
    cache_hit BOOLEAN DEFAULT FALSE,

    -- Arbitrary metadata for extensibility
    metadata JSONB
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_run_activities_run_id ON run_activities(run_id);
CREATE INDEX IF NOT EXISTS idx_run_activities_phase ON run_activities(phase);
CREATE INDEX IF NOT EXISTS idx_run_activities_event_type ON run_activities(event_type);
CREATE INDEX IF NOT EXISTS idx_run_activities_timestamp ON run_activities(timestamp);

-- Enable Row Level Security
ALTER TABLE run_activities ENABLE ROW LEVEL SECURITY;

-- Allow all operations (same policy as other tables in this app)
CREATE POLICY "Allow all on run_activities" ON run_activities FOR ALL USING (true);

-- Comment for documentation
COMMENT ON TABLE run_activities IS 'Detailed activity log for research pipeline execution';
COMMENT ON COLUMN run_activities.phase IS 'Pipeline phase: signal_hunter, global_vetting, gap_analysis, report_generation';
COMMENT ON COLUMN run_activities.event_type IS 'Event type: phase_started, phase_completed, query_sent, signal_found, signal_rejected, evidence_found, cache_hit, cache_miss, api_error, item_filtered';
COMMENT ON COLUMN runs.activity_summary IS 'Aggregated activity metrics: timing, funnel, API usage, outcome';
