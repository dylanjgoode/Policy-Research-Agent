-- Atomic Policy + Evidence Creation
-- This function ensures policy and evidence are created together in a single transaction.
-- If any insert fails, the entire operation rolls back.

CREATE OR REPLACE FUNCTION create_policy_with_evidence(
  policy_data JSONB,
  evidence_data JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  new_policy policies%ROWTYPE;
  evidence_item JSONB;
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
      evidence_item->>'title',
      evidence_item->>'source_type',
      CASE
        WHEN evidence_item->>'publication_date' IS NOT NULL
        THEN (evidence_item->>'publication_date')::DATE
        ELSE NULL
      END,
      evidence_item->>'evidence_type',
      evidence_item->>'claim',
      evidence_item->>'excerpt',
      evidence_item->>'sentiment',
      (evidence_item->>'confidence')::DECIMAL,
      COALESCE((evidence_item->>'is_ireland_source')::BOOLEAN, false),
      evidence_item->>'ireland_domain'
    );
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
