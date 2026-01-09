// Core types for Innovation Arbitrage Engine

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RunType = 'manual' | 'discovery';
export type Phase = 'signal_hunter' | 'global_vetting' | 'gap_analysis' | 'report_generation';

export type VettingStatus = 'pending' | 'vetted' | 'rejected';
export type IrelandStatus = 'pending' | 'exists' | 'discussed_rejected' | 'absent';
export type OpportunityValue = 'low' | 'medium' | 'high' | null;

export type EvidenceType = 'success_metric' | 'criticism' | 'unintended_consequence' | 'adoption_rate';
export type SourceType = 'oecd_report' | 'news' | 'gov_doc' | 'academic' | 'blog' | 'think_tank';
export type Sentiment = 'positive' | 'negative' | 'neutral';

// Countries available for research
export const PEER_COUNTRIES = [
  'Singapore',
  'Denmark',
  'Israel',
  'Estonia',
  'Finland',
  'Netherlands',
  'New Zealand',
  'South Korea',
] as const;

export type PeerCountry = typeof PEER_COUNTRIES[number];

// Database row types (snake_case - matches Supabase)
export interface RunRow {
  id: string;
  type: RunType;
  status: RunStatus;
  phase: Phase | null;
  countries: string[] | null;
  started_at: string | null;
  completed_at: string | null;
  policies_found: number;
  high_value_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyRow {
  id: string;
  run_id: string | null;
  name: string;
  slug: string;
  category: string;
  source_country: string;
  original_source_url: string;
  original_source_title: string | null;
  discovery_context: string | null;
  vetting_status: VettingStatus;
  success_score: number | null;
  criticism_score: number | null;
  ireland_status: IrelandStatus;
  ireland_notes: string | null;
  opportunity_value: OpportunityValue;
  concept_hook: string | null;
  case_study_summary: string | null;
  gap_statement: string | null;
  pilot_proposal: string | null;
  risk_assessment: RiskAssessment | null;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface EvidenceRow {
  id: string;
  policy_id: string;
  url: string;
  title: string | null;
  source_type: SourceType;
  publication_date: string | null;
  evidence_type: EvidenceType;
  claim: string;
  excerpt: string | null;
  sentiment: Sentiment | null;
  confidence: number | null;
  is_ireland_source: boolean;
  ireland_domain: string | null;
  created_at: string;
}

// Application types (camelCase - for frontend use)
export interface Run {
  id: string;
  type: RunType;
  status: RunStatus;
  phase: Phase | null;
  countries: string[] | null;
  startedAt: string | null;
  completedAt: string | null;
  policiesFound: number;
  highValueCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Policy {
  id: string;
  runId: string | null;
  name: string;
  slug: string;
  category: string;
  sourceCountry: string;
  originalSourceUrl: string;
  originalSourceTitle: string | null;
  discoveryContext: string | null;
  vettingStatus: VettingStatus;
  successScore: number | null;
  criticismScore: number | null;
  irelandStatus: IrelandStatus;
  irelandNotes: string | null;
  opportunityValue: OpportunityValue;
  conceptHook: string | null;
  caseStudySummary: string | null;
  gapStatement: string | null;
  pilotProposal: string | null;
  riskAssessment: RiskAssessment | null;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  policyId: string;
  url: string;
  title: string | null;
  sourceType: SourceType;
  publicationDate: string | null;
  evidenceType: EvidenceType;
  claim: string;
  excerpt: string | null;
  sentiment: Sentiment | null;
  confidence: number | null;
  isIrelandSource: boolean;
  irelandDomain: string | null;
  createdAt: string;
}

export interface RiskAssessment {
  risks: {
    risk: string;
    severity: 'low' | 'medium' | 'high';
    likelihood: 'low' | 'medium' | 'high';
  }[];
  mitigations: {
    risk: string;
    mitigation: string;
  }[];
}

// Perplexity API types
export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityCitation {
  url: string;
  title?: string;
  snippet?: string;
}

export interface PerplexityResponse {
  content: string;
  citations: PerplexityCitation[];
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Pipeline types
export interface PolicySignal {
  name: string;
  category: string;
  sourceCountry: string;
  sourceUrl: string;
  sourceTitle: string | null;
  description: string;
}

export interface VettedPolicy extends PolicySignal {
  successEvidence: Evidence[];
  criticismEvidence: Evidence[];
  successScore: number;
  criticismScore: number;
}

export interface AnalyzedPolicy extends VettedPolicy {
  irelandStatus: IrelandStatus;
  irelandNotes: string;
  irelandEvidence: Evidence[];
  opportunityValue: OpportunityValue;
}

// Converters
export function runRowToRun(row: RunRow): Run {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    phase: row.phase,
    countries: row.countries,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    policiesFound: row.policies_found,
    highValueCount: row.high_value_count,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function policyRowToPolicy(row: PolicyRow): Policy {
  return {
    id: row.id,
    runId: row.run_id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    sourceCountry: row.source_country,
    originalSourceUrl: row.original_source_url,
    originalSourceTitle: row.original_source_title,
    discoveryContext: row.discovery_context,
    vettingStatus: row.vetting_status,
    successScore: row.success_score,
    criticismScore: row.criticism_score,
    irelandStatus: row.ireland_status,
    irelandNotes: row.ireland_notes,
    opportunityValue: row.opportunity_value,
    conceptHook: row.concept_hook,
    caseStudySummary: row.case_study_summary,
    gapStatement: row.gap_statement,
    pilotProposal: row.pilot_proposal,
    riskAssessment: row.risk_assessment,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function evidenceRowToEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    policyId: row.policy_id,
    url: row.url,
    title: row.title,
    sourceType: row.source_type,
    publicationDate: row.publication_date,
    evidenceType: row.evidence_type,
    claim: row.claim,
    excerpt: row.excerpt,
    sentiment: row.sentiment,
    confidence: row.confidence,
    isIrelandSource: row.is_ireland_source,
    irelandDomain: row.ireland_domain,
    createdAt: row.created_at,
  };
}
