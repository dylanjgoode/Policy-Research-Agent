import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  RunRow,
  PolicyRow,
  EvidenceRow,
  Run,
  Policy,
  Evidence,
  runRowToRun,
  policyRowToPolicy,
  evidenceRowToEvidence,
  RunStatus,
  Phase,
  SearchMode,
} from './types';

// Singleton Supabase client
let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}

export const supabase = {
  get client() {
    return getSupabase();
  },
};

// ============ Runs ============

export async function createRun(
  type: 'manual' | 'discovery',
  countries?: string[],
  searchMode?: SearchMode,
  searchQuery?: string
): Promise<Run> {
  const { data, error } = await getSupabase()
    .from('runs')
    .insert({
      type,
      status: 'running' as RunStatus,
      countries: countries || null,
      search_mode: searchMode || null,
      search_query: searchQuery || null,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create run: ${error.message}`);
  return runRowToRun(data as RunRow);
}

export async function updateRunPhase(runId: string, phase: Phase): Promise<void> {
  const { error } = await getSupabase()
    .from('runs')
    .update({ phase, updated_at: new Date().toISOString() })
    .eq('id', runId);

  if (error) throw new Error(`Failed to update run phase: ${error.message}`);
}

export async function updateRunStatus(
  runId: string,
  status: RunStatus,
  errorMessage?: string
): Promise<void> {
  const updates: Partial<RunRow> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed' || status === 'failed') {
    updates.completed_at = new Date().toISOString();
  }

  if (errorMessage) {
    updates.error_message = errorMessage;
  }

  const { error } = await getSupabase()
    .from('runs')
    .update(updates)
    .eq('id', runId);

  if (error) throw new Error(`Failed to update run status: ${error.message}`);
}

export async function updateRunCounts(
  runId: string,
  policiesFound: number,
  highValueCount: number
): Promise<void> {
  const { error } = await getSupabase()
    .from('runs')
    .update({
      policies_found: policiesFound,
      high_value_count: highValueCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (error) throw new Error(`Failed to update run counts: ${error.message}`);
}

export async function getRun(runId: string): Promise<Run | null> {
  const { data, error } = await getSupabase()
    .from('runs')
    .select()
    .eq('id', runId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get run: ${error.message}`);
  }

  return runRowToRun(data as RunRow);
}

export async function getRecentRuns(limit = 10): Promise<Run[]> {
  const { data, error } = await getSupabase()
    .from('runs')
    .select()
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to get runs: ${error.message}`);
  return (data as RunRow[]).map(runRowToRun);
}

export async function getActiveRun(): Promise<Run | null> {
  const { data, error } = await getSupabase()
    .from('runs')
    .select()
    .eq('status', 'running')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get active run: ${error.message}`);
  }

  return runRowToRun(data as RunRow);
}

// ============ Policies ============

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createPolicy(policy: Partial<PolicyRow>): Promise<Policy> {
  const slug = generateSlug(policy.name || 'policy');

  const { data, error } = await getSupabase()
    .from('policies')
    .insert({
      ...policy,
      slug,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create policy: ${error.message}`);
  return policyRowToPolicy(data as PolicyRow);
}

export async function updatePolicy(policyId: string, updates: Partial<PolicyRow>): Promise<Policy> {
  const { data, error } = await getSupabase()
    .from('policies')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', policyId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update policy: ${error.message}`);
  return policyRowToPolicy(data as PolicyRow);
}

export async function getPolicy(policyId: string): Promise<Policy | null> {
  const { data, error } = await getSupabase()
    .from('policies')
    .select()
    .eq('id', policyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get policy: ${error.message}`);
  }

  return policyRowToPolicy(data as PolicyRow);
}

export async function getPolicyBySlug(slug: string): Promise<Policy | null> {
  const { data, error } = await getSupabase()
    .from('policies')
    .select()
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get policy by slug: ${error.message}`);
  }

  return policyRowToPolicy(data as PolicyRow);
}

export async function getPolicies(filters?: {
  status?: string;
  irelandStatus?: string;
  opportunityValue?: string;
  sourceCountry?: string;
  limit?: number;
}): Promise<Policy[]> {
  let query = getSupabase()
    .from('policies')
    .select()
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.irelandStatus) query = query.eq('ireland_status', filters.irelandStatus);
  if (filters?.opportunityValue) query = query.eq('opportunity_value', filters.opportunityValue);
  if (filters?.sourceCountry) query = query.eq('source_country', filters.sourceCountry);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get policies: ${error.message}`);
  return (data as PolicyRow[]).map(policyRowToPolicy);
}

export async function getHighValuePolicies(limit = 3): Promise<Policy[]> {
  return getPolicies({
    status: 'active',
    opportunityValue: 'high',
    limit,
  });
}

// ============ Transactional Operations ============

export interface CreatePolicyWithEvidenceInput {
  policy: Partial<PolicyRow>;
  evidence: Partial<EvidenceRow>[];
}

export async function createPolicyWithEvidence(
  input: CreatePolicyWithEvidenceInput
): Promise<Policy> {
  const slug = generateSlug(input.policy.name || 'policy');

  // Prepare policy data with slug
  const policyData = {
    ...input.policy,
    slug,
  };

  // Prepare evidence data
  const evidenceData = input.evidence.map((e) => ({
    url: e.url,
    title: e.title,
    source_type: e.source_type,
    publication_date: e.publication_date,
    evidence_type: e.evidence_type,
    claim: e.claim,
    excerpt: e.excerpt,
    sentiment: e.sentiment,
    confidence: e.confidence,
    is_ireland_source: e.is_ireland_source || false,
    ireland_domain: e.ireland_domain,
  }));

  const { data, error } = await getSupabase().rpc('create_policy_with_evidence', {
    policy_data: policyData,
    evidence_data: evidenceData,
  });

  if (error) {
    throw new Error(`Failed to create policy with evidence: ${error.message}`);
  }

  // The RPC returns JSONB, convert to Policy
  return policyRowToPolicy(data as PolicyRow);
}

// ============ Evidence ============

export async function createEvidence(evidence: Partial<EvidenceRow>): Promise<Evidence> {
  const { data, error } = await getSupabase()
    .from('evidence')
    .insert(evidence)
    .select()
    .single();

  if (error) throw new Error(`Failed to create evidence: ${error.message}`);
  return evidenceRowToEvidence(data as EvidenceRow);
}

export async function createManyEvidence(items: Partial<EvidenceRow>[]): Promise<Evidence[]> {
  if (items.length === 0) return [];

  const { data, error } = await getSupabase()
    .from('evidence')
    .insert(items)
    .select();

  if (error) throw new Error(`Failed to create evidence: ${error.message}`);
  return (data as EvidenceRow[]).map(evidenceRowToEvidence);
}

export async function getEvidenceForPolicy(policyId: string): Promise<Evidence[]> {
  const { data, error } = await getSupabase()
    .from('evidence')
    .select()
    .eq('policy_id', policyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get evidence: ${error.message}`);
  return (data as EvidenceRow[]).map(evidenceRowToEvidence);
}
