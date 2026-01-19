-- Add interpretation JSONB column to runs table
-- This stores the full PolicyInterpretation so runs can be cloned

ALTER TABLE runs ADD COLUMN interpretation JSONB;

-- Add index for querying by interpretation (optional, for future use)
CREATE INDEX idx_runs_interpretation ON runs USING gin (interpretation);

-- Comment for clarity
COMMENT ON COLUMN runs.interpretation IS 'Full PolicyInterpretation object including levers and aliases, used for cloning runs';
