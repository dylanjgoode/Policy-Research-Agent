-- Evidence provenance + claim ledger

-- Add provenance fields to evidence
ALTER TABLE evidence
  ADD COLUMN publisher TEXT,
  ADD COLUMN retrieved_at TIMESTAMPTZ DEFAULT NOW();

-- Structured claims extracted from evidence
CREATE TABLE evidence_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
  claim TEXT NOT NULL,
  claim_type TEXT,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_claims_evidence_id ON evidence_claims(evidence_id);

-- Claim ledger for policy briefs
CREATE TABLE policy_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policy_claims_policy_id ON policy_claims(policy_id);

CREATE TABLE policy_claim_evidence (
  claim_id UUID REFERENCES policy_claims(id) ON DELETE CASCADE,
  evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
  PRIMARY KEY (claim_id, evidence_id)
);

CREATE INDEX idx_policy_claim_evidence_evidence_id ON policy_claim_evidence(evidence_id);

-- RLS
ALTER TABLE evidence_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_claim_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on evidence_claims" ON evidence_claims FOR ALL USING (true);
CREATE POLICY "Allow all on policy_claims" ON policy_claims FOR ALL USING (true);
CREATE POLICY "Allow all on policy_claim_evidence" ON policy_claim_evidence FOR ALL USING (true);

-- Replace policy+evidence RPC to include provenance + claim ledger
DROP FUNCTION IF EXISTS create_policy_with_evidence(JSONB, JSONB);

CREATE OR REPLACE FUNCTION create_policy_with_evidence(
  policy_data JSONB,
  evidence_data JSONB DEFAULT '[]'::JSONB,
  policy_claims_data JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  new_policy policies%ROWTYPE;
  evidence_item JSONB;
  evidence_ids UUID[] := ARRAY[]::UUID[];
  created_evidence_id UUID;
  claim_item JSONB;
  new_claim_id UUID;
  claim_evidence_index TEXT;
  claim_evidence_pos INT;
  result JSONB;
BEGIN
  -- Insert the policy
  INSERT INTO policies (
    run_id,
    name,
    slug,
    category,
    source_country,
    original_source_url,
    original_source_title,
    discovery_context,
    vetting_status,
    success_score,
    criticism_score,
    ireland_status,
    ireland_notes,
    opportunity_value,
    concept_hook,
    case_study_summary,
    gap_statement,
    pilot_proposal,
    risk_assessment,
    status
  )
  VALUES (
    (policy_data->>'run_id')::UUID,
    policy_data->>'name',
    policy_data->>'slug',
    policy_data->>'category',
    policy_data->>'source_country',
    policy_data->>'original_source_url',
    policy_data->>'original_source_title',
    policy_data->>'discovery_context',
    COALESCE(policy_data->>'vetting_status', 'pending'),
    (policy_data->>'success_score')::DECIMAL,
    (policy_data->>'criticism_score')::DECIMAL,
    COALESCE(policy_data->>'ireland_status', 'pending'),
    policy_data->>'ireland_notes',
    policy_data->>'opportunity_value',
    policy_data->>'concept_hook',
    policy_data->>'case_study_summary',
    policy_data->>'gap_statement',
    policy_data->>'pilot_proposal',
    (policy_data->'risk_assessment')::JSONB,
    COALESCE(policy_data->>'status', 'draft')
  )
  RETURNING * INTO new_policy;

  -- Insert all evidence items with the new policy_id
  FOR evidence_item IN SELECT * FROM jsonb_array_elements(evidence_data)
  LOOP
    INSERT INTO evidence (
      policy_id,
      url,
      title,
      publisher,
      retrieved_at,
      source_type,
      publication_date,
      evidence_type,
      claim,
      excerpt,
      sentiment,
      confidence,
      is_ireland_source,
      ireland_domain
    )
    VALUES (
      new_policy.id,
      evidence_item->>'url',
      NULLIF(evidence_item->>'title', ''),
      NULLIF(evidence_item->>'publisher', ''),
      CASE
        WHEN NULLIF(evidence_item->>'retrieved_at', '') IS NOT NULL
        THEN NULLIF(evidence_item->>'retrieved_at', '')::TIMESTAMPTZ
        ELSE NOW()
      END,
      evidence_item->>'source_type',
      CASE
        WHEN NULLIF(evidence_item->>'publication_date', '') IS NOT NULL
        THEN NULLIF(evidence_item->>'publication_date', '')::DATE
        ELSE NULL
      END,
      evidence_item->>'evidence_type',
      evidence_item->>'claim',
      evidence_item->>'excerpt',
      evidence_item->>'sentiment',
      (evidence_item->>'confidence')::DECIMAL,
      COALESCE((evidence_item->>'is_ireland_source')::BOOLEAN, false),
      evidence_item->>'ireland_domain'
    )
    RETURNING id INTO created_evidence_id;

    evidence_ids := array_append(evidence_ids, created_evidence_id);

    IF evidence_item->>'claim' IS NOT NULL AND evidence_item->>'claim' <> '' THEN
      INSERT INTO evidence_claims (
        evidence_id,
        claim,
        claim_type,
        confidence
      )
      VALUES (
        created_evidence_id,
        evidence_item->>'claim',
        evidence_item->>'evidence_type',
        (evidence_item->>'confidence')::DECIMAL
      );
    END IF;
  END LOOP;

  -- Insert policy claim ledger and map to evidence
  FOR claim_item IN SELECT * FROM jsonb_array_elements(policy_claims_data)
  LOOP
    INSERT INTO policy_claims (
      policy_id,
      claim_type,
      claim_text
    )
    VALUES (
      new_policy.id,
      claim_item->>'claim_type',
      claim_item->>'claim_text'
    )
    RETURNING id INTO new_claim_id;

    IF claim_item ? 'evidence_indexes' THEN
      FOR claim_evidence_index IN SELECT * FROM jsonb_array_elements_text(claim_item->'evidence_indexes')
      LOOP
        claim_evidence_pos := (claim_evidence_index)::INT + 1;
        IF claim_evidence_pos >= 1 AND claim_evidence_pos <= array_length(evidence_ids, 1) THEN
          INSERT INTO policy_claim_evidence (
            claim_id,
            evidence_id
          )
          VALUES (
            new_claim_id,
            evidence_ids[claim_evidence_pos]
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Return the created policy as JSONB
  SELECT jsonb_build_object(
    'id', new_policy.id,
    'run_id', new_policy.run_id,
    'name', new_policy.name,
    'slug', new_policy.slug,
    'category', new_policy.category,
    'source_country', new_policy.source_country,
    'original_source_url', new_policy.original_source_url,
    'original_source_title', new_policy.original_source_title,
    'discovery_context', new_policy.discovery_context,
    'vetting_status', new_policy.vetting_status,
    'success_score', new_policy.success_score,
    'criticism_score', new_policy.criticism_score,
    'ireland_status', new_policy.ireland_status,
    'ireland_notes', new_policy.ireland_notes,
    'opportunity_value', new_policy.opportunity_value,
    'concept_hook', new_policy.concept_hook,
    'case_study_summary', new_policy.case_study_summary,
    'gap_statement', new_policy.gap_statement,
    'pilot_proposal', new_policy.pilot_proposal,
    'risk_assessment', new_policy.risk_assessment,
    'status', new_policy.status,
    'created_at', new_policy.created_at,
    'updated_at', new_policy.updated_at
  ) INTO result;

  RETURN result;
END;
$$;
