import { searchSuccessEvidence, searchCriticisms } from '../perplexity';
import {
  PolicySignal,
  VettedPolicy,
  Evidence,
  EvidenceType,
  SourceType,
  Sentiment,
} from '../types';
import { extractCitationClaims } from './evidence-utils';

function extractEvidenceFromResponse(
  content: string,
  citations: { url: string; title?: string }[],
  policyName: string,
  evidenceType: EvidenceType,
  sentiment: Sentiment
): Evidence[] {
  const evidence: Evidence[] = [];
  const { claimByCitation, strengthByCitation, fallbackClaim } = extractCitationClaims(
    content,
    policyName
  );

  // Create evidence entries from citations
  for (const [index, citation] of citations.entries()) {
    // Try to extract relevant claim from content
    const urlDomain = new URL(citation.url).hostname;
    const claimFromContent = claimByCitation.get(index + 1);
    const strength = strengthByCitation.get(index + 1);
    const claim = (claimFromContent || fallbackClaim).slice(0, 500);
    const confidence = strength ? Math.min(Math.max(strength / 10, 0.1), 1) : 0.7;

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
      claim,
      excerpt: null,
      sentiment,
      confidence,
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
  const countRatio = Math.min(evidence.length / 5, 1);

  // Quality score from source types
  const qualitySources = evidence.filter(
    (e) => e.sourceType === 'oecd_report' || e.sourceType === 'academic' || e.sourceType === 'gov_doc'
  );
  const qualityRatio = Math.min(qualitySources.length / 3, 1);

  const totalConfidence = evidence.reduce((sum, item) => sum + (item.confidence ?? 0.7), 0);
  const averageConfidence = Math.min(Math.max(totalConfidence / evidence.length, 0), 1);

  const baseScore = countRatio * 0.5 + qualityRatio * 0.5;
  const confidenceFactor = 0.3 + 0.7 * averageConfidence;

  return Math.round(baseScore * confidenceFactor * 100) / 100;
}

export async function globalVetting(policies: PolicySignal[]): Promise<VettedPolicy[]> {
  console.log(`[GlobalVetting] Starting vetting for ${policies.length} policies`);

  const vettedPolicies: VettedPolicy[] = [];
  const BATCH_SIZE = 3;
  const BATCH_DELAY_MS = 200;

  const delay = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

  const vetPolicy = async (policy: PolicySignal): Promise<VettedPolicy> => {
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

      console.log(
        `[GlobalVetting] ${policy.name}: success=${successScore}, criticism=${criticismScore}, ` +
          `evidence=${successEvidence.length + criticismEvidence.length}`
      );
      return {
        ...policy,
        successEvidence,
        criticismEvidence,
        successScore,
        criticismScore,
      };
    } catch (error) {
      console.error(`[GlobalVetting] Error vetting ${policy.name}:`, error);
      // Still include policy with zero scores
      return {
        ...policy,
        successEvidence: [],
        criticismEvidence: [],
        successScore: 0,
        criticismScore: 0,
      };
    }
  };

  for (let i = 0; i < policies.length; i += BATCH_SIZE) {
    const batch = policies.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(policy => vetPolicy(policy)));
    vettedPolicies.push(...batchResults);

    if (i + BATCH_SIZE < policies.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  // Filter out policies with no success evidence
  const filtered = vettedPolicies.filter((p) => p.successScore > 0);
  console.log(`[GlobalVetting] Complete. ${filtered.length}/${policies.length} policies passed vetting`);

  return filtered;
}
