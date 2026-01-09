import { searchSuccessEvidence, searchCriticisms } from '../perplexity';
import {
  PolicySignal,
  VettedPolicy,
  Evidence,
  EvidenceType,
  SourceType,
  Sentiment,
} from '../types';

function extractEvidenceFromResponse(
  content: string,
  citations: { url: string; title?: string }[],
  policyName: string,
  evidenceType: EvidenceType,
  sentiment: Sentiment
): Evidence[] {
  const evidence: Evidence[] = [];

  // Create evidence entries from citations
  for (const citation of citations) {
    // Try to extract relevant claim from content
    const urlDomain = new URL(citation.url).hostname;

    // Determine source type
    let sourceType: SourceType = 'news';
    if (urlDomain.includes('oecd')) sourceType = 'oecd_report';
    else if (urlDomain.includes('gov') || urlDomain.includes('government')) sourceType = 'gov_doc';
    else if (urlDomain.includes('edu') || urlDomain.includes('academic')) sourceType = 'academic';

    evidence.push({
      id: crypto.randomUUID(),
      policyId: '', // Will be set when saving
      url: citation.url,
      title: citation.title || null,
      sourceType,
      publicationDate: null,
      evidenceType,
      claim: content.slice(0, 500), // First 500 chars as claim
      excerpt: null,
      sentiment,
      confidence: 0.7,
      isIrelandSource: false,
      irelandDomain: null,
      createdAt: new Date().toISOString(),
    });
  }

  return evidence;
}

function calculateScore(evidence: Evidence[], type: 'success' | 'criticism'): number {
  if (evidence.length === 0) return 0;

  // Base score from number of evidence items
  const countScore = Math.min(evidence.length / 5, 1) * 0.5;

  // Quality score from source types
  const qualitySources = evidence.filter(
    (e) => e.sourceType === 'oecd_report' || e.sourceType === 'academic' || e.sourceType === 'gov_doc'
  );
  const qualityScore = Math.min(qualitySources.length / 3, 1) * 0.5;

  return Math.round((countScore + qualityScore) * 100) / 100;
}

export async function globalVetting(policies: PolicySignal[]): Promise<VettedPolicy[]> {
  console.log(`[GlobalVetting] Starting vetting for ${policies.length} policies`);

  const vettedPolicies: VettedPolicy[] = [];

  for (const policy of policies) {
    console.log(`[GlobalVetting] Vetting: ${policy.name} (${policy.sourceCountry})`);

    try {
      // Search for success evidence
      const successResult = await searchSuccessEvidence(policy.name, policy.sourceCountry);
      const successEvidence = extractEvidenceFromResponse(
        successResult.content,
        successResult.citations,
        policy.name,
        'success_metric',
        'positive'
      );

      // Adversarial search for criticisms
      const criticismResult = await searchCriticisms(policy.name, policy.sourceCountry);
      const criticismEvidence = extractEvidenceFromResponse(
        criticismResult.content,
        criticismResult.citations,
        policy.name,
        'criticism',
        'negative'
      );

      // Calculate scores
      const successScore = calculateScore(successEvidence, 'success');
      const criticismScore = calculateScore(criticismEvidence, 'criticism');

      vettedPolicies.push({
        ...policy,
        successEvidence,
        criticismEvidence,
        successScore,
        criticismScore,
      });

      console.log(
        `[GlobalVetting] ${policy.name}: success=${successScore}, criticism=${criticismScore}, ` +
          `evidence=${successEvidence.length + criticismEvidence.length}`
      );
    } catch (error) {
      console.error(`[GlobalVetting] Error vetting ${policy.name}:`, error);
      // Still include policy with zero scores
      vettedPolicies.push({
        ...policy,
        successEvidence: [],
        criticismEvidence: [],
        successScore: 0,
        criticismScore: 0,
      });
    }
  }

  // Filter out policies with no success evidence
  const filtered = vettedPolicies.filter((p) => p.successScore > 0);
  console.log(`[GlobalVetting] Complete. ${filtered.length}/${policies.length} policies passed vetting`);

  return filtered;
}
