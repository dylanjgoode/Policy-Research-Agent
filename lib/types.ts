// Core types for Innovation Arbitrage Engine

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RunType = 'manual' | 'discovery';
export type Phase = 'signal_hunter' | 'global_vetting' | 'gap_analysis' | 'report_generation';

export type VettingStatus = 'pending' | 'vetted' | 'rejected';
export type IrelandStatus = 'pending' | 'exists' | 'discussed_rejected' | 'absent';
export type OpportunityValue = 'low' | 'medium' | 'high' | null;

export type EvidenceType = 'success_metric' | 'criticism' | 'unintended_consequence' | 'adoption_rate';
export type SourceType = 'oecd_report' | 'news' | 'gov_doc' | 'academic' | 'blog' | 'think_tank';
export type Sentiment = 'positive' | 'negative' | 'neutral';

// Search modes for research (legacy - now only 'reverse' is used)
export type SearchMode = 'reverse';

export interface ResearchOptions {
  interpretation: PolicyInterpretation;
}

// Structured levers for policy analysis
export interface PolicyLevers {
  targetGroup: string;      // e.g., "Early-stage startups", "R&D-intensive SMEs"
  mechanism: string;        // e.g., "Tax credit", "Direct grant", "Regulatory exemption"
  sector: string | null;    // e.g., "Cleantech", "Fintech", or null if sector-agnostic
  intendedOutcome: string;  // e.g., "Increase private R&D spending"
}

// Policy interpretation from AI analysis of user's idea
export interface PolicyInterpretation {
  policyName: string;
  alsoKnownAs: string[];    // Synonyms/aliases for the policy
  category: string;
  summary: string;
  originalInput: string;
  levers: PolicyLevers;
}

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
  'United Kingdom',
] as const;

// All searchable countries including Ireland
export const SEARCHABLE_COUNTRIES = ['Ireland', ...PEER_COUNTRIES] as const;
export type SearchableCountry = typeof SEARCHABLE_COUNTRIES[number];

export type PeerCountry = typeof PEER_COUNTRIES[number];

// Database row types (snake_case - matches Supabase)
export interface RunRow {
  id: string;
  type: RunType;
  status: RunStatus;
  phase: Phase | null;
  countries: string[] | null;
  search_mode: SearchMode | null;
  search_query: string | null;
  interpretation: PolicyInterpretation | null;
  started_at: string | null;
  completed_at: string | null;
  policies_found: number;
  high_value_count: number;
  error_message: string | null;
  activity_summary: ActivitySummary | null;
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
  publisher: string | null;
  retrieved_at: string | null;
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
  searchMode: SearchMode | null;
  searchQuery: string | null;
  interpretation: PolicyInterpretation | null;
  startedAt: string | null;
  completedAt: string | null;
  policiesFound: number;
  highValueCount: number;
  errorMessage: string | null;
  activitySummary: ActivitySummary | null;
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
  publisher: string | null;
  retrievedAt: string | null;
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

export interface EvidenceClaimRow {
  id: string;
  evidence_id: string;
  claim: string;
  claim_type: string | null;
  confidence: number | null;
  created_at: string;
}

export interface EvidenceClaim {
  id: string;
  evidenceId: string;
  claim: string;
  claimType: string | null;
  confidence: number | null;
  createdAt: string;
}

export interface PolicyClaimRow {
  id: string;
  policy_id: string;
  claim_type: string;
  claim_text: string;
  created_at: string;
}

export interface PolicyClaim {
  id: string;
  policyId: string;
  claimType: string;
  claimText: string;
  createdAt: string;
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
  fromCache?: boolean;
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
    searchMode: row.search_mode,
    searchQuery: row.search_query,
    interpretation: row.interpretation,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    policiesFound: row.policies_found,
    highValueCount: row.high_value_count,
    errorMessage: row.error_message,
    activitySummary: row.activity_summary,
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
    publisher: row.publisher,
    retrievedAt: row.retrieved_at,
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

export function evidenceClaimRowToEvidenceClaim(row: EvidenceClaimRow): EvidenceClaim {
  return {
    id: row.id,
    evidenceId: row.evidence_id,
    claim: row.claim,
    claimType: row.claim_type,
    confidence: row.confidence,
    createdAt: row.created_at,
  };
}

export function policyClaimRowToPolicyClaim(row: PolicyClaimRow): PolicyClaim {
  return {
    id: row.id,
    policyId: row.policy_id,
    claimType: row.claim_type,
    claimText: row.claim_text,
    createdAt: row.created_at,
  };
}

// Activity logging types for Research Activity Report
export type ActivityEventType =
  | 'phase_started'
  | 'phase_completed'
  | 'query_sent'
  | 'signal_found'
  | 'signal_rejected'
  | 'evidence_found'
  | 'cache_hit'
  | 'cache_miss'
  | 'api_error'
  | 'item_filtered';

export type ActivityOutcome =
  | 'policies_found'
  | 'no_implementations'
  | 'no_evidence'
  | 'error';

export interface ActivityEvent {
  id?: string;
  runId: string;
  phase: Phase;
  eventType: ActivityEventType;
  timestamp: string;
  queryText?: string;
  targetCountry?: string;
  itemName?: string;
  itemCount?: number;
  rejectionReason?: string;
  apiCallDurationMs?: number;
  tokensUsed?: number;
  cacheHit?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PhaseTimingInfo {
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
}

export interface FunnelMetrics {
  signalsFound: number;
  signalsVetted: number;
  signalsAnalyzed: number;
  policiesReported: number;
}

export interface ApiMetrics {
  totalCalls: number;
  cacheHits: number;
  cacheMisses: number;
  totalTokensUsed: number;
}

export interface SourceMetrics {
  total: number;
  byType: Partial<Record<SourceType, number>>;
  byCountry: Record<string, number>;
}

export interface RejectionMetrics {
  atVetting: number;
  atGapAnalysis: number;
  lowOpportunity: number;
}

export interface ActivitySummary {
  timing: {
    totalDurationMs: number;
    phaseTimings: Partial<Record<Phase, PhaseTimingInfo>>;
  };
  funnel: FunnelMetrics;
  apiMetrics: ApiMetrics;
  sourcesDiscovered: SourceMetrics;
  rejections: RejectionMetrics;
  outcome: ActivityOutcome;
  outcomeReason: string;
}

export interface ActivityCollector {
  runId: string;
  emit: (event: Omit<ActivityEvent, 'runId' | 'timestamp' | 'id'>) => void;
  getSummary: () => ActivitySummary;
  finalize: () => Promise<void>;
}

export interface RunWithActivity extends Run {
  activitySummary: ActivitySummary | null;
}

// Database row type for run_activities table
export interface RunActivityRow {
  id: string;
  run_id: string;
  phase: Phase;
  event_type: ActivityEventType;
  timestamp: string;
  query_text: string | null;
  target_country: string | null;
  item_name: string | null;
  item_count: number | null;
  rejection_reason: string | null;
  api_call_duration_ms: number | null;
  tokens_used: number | null;
  cache_hit: boolean;
  metadata: Record<string, unknown> | null;
}

export function activityRowToEvent(row: RunActivityRow): ActivityEvent {
  return {
    id: row.id,
    runId: row.run_id,
    phase: row.phase,
    eventType: row.event_type,
    timestamp: row.timestamp,
    queryText: row.query_text ?? undefined,
    targetCountry: row.target_country ?? undefined,
    itemName: row.item_name ?? undefined,
    itemCount: row.item_count ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    apiCallDurationMs: row.api_call_duration_ms ?? undefined,
    tokensUsed: row.tokens_used ?? undefined,
    cacheHit: row.cache_hit,
    metadata: row.metadata ?? undefined,
  };
}
