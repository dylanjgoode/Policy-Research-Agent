import { searchIrishSources } from '../perplexity';
import {
  VettedPolicy,
  AnalyzedPolicy,
  Evidence,
  IrelandStatus,
  OpportunityValue,
} from '../types';
import { extractCitationClaims } from './evidence-utils';

// Irish domains to identify
const IRISH_DOMAINS = [
  'gov.ie',
  'oireachtas.ie',
  'enterprise.gov.ie',
  'dbei.gov.ie',
  'irishtimes.com',
  'independent.ie',
  'rte.ie',
  'siliconrepublic.com',
  'businesspost.ie',
  'thejournal.ie',
];

function isIrishDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const domain of IRISH_DOMAINS) {
      if (hostname.includes(domain)) {
        return domain;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function determineIrelandStatus(
  content: string,
  citations: { url: string; title?: string }[]
): { status: IrelandStatus; notes: string } {
  const extractReasoning = (text: string): string | null => {
    const match = text.match(/Reasoning\s*:\s*([\s\S]*)/i);
    if (!match) return null;
    const firstLine = match[1].split('\n').map((line) => line.trim()).find(Boolean);
    return firstLine ? firstLine.slice(0, 300) : null;
  };

  const parseClassification = (text: string): IrelandStatus | null => {
    const labeledMatch = text.match(/(?:classification|status)\s*[:\-]\s*([A-Z_\s]+)/i);
    const rawLabel = labeledMatch ? labeledMatch[1] : null;

    const normalize = (value: string): string =>
      value.toLowerCase().replace(/[\s_-]+/g, ' ').trim();

    if (rawLabel) {
      const normalized = normalize(rawLabel);
      if (normalized.includes('discussed') || normalized.includes('rejected')) {
        return 'discussed_rejected';
      }
      if (normalized.includes('exists')) return 'exists';
      if (normalized.includes('absent')) return 'absent';
    }

    const fallbackMatch = text.match(/^(exists|absent|discussed(?:\s+but\s+rejected)?)/im);
    if (!fallbackMatch) return null;

    const fallbackLabel = normalize(fallbackMatch[1]);
    if (fallbackLabel.startsWith('discussed')) return 'discussed_rejected';
    if (fallbackLabel.startsWith('exists')) return 'exists';
    if (fallbackLabel.startsWith('absent')) return 'absent';
    return null;
  };

  const explicitStatus = parseClassification(content);
  if (explicitStatus) {
    const reasoning = extractReasoning(content);
    const defaultNotes =
      explicitStatus === 'exists'
        ? 'This policy appears to exist in Ireland based on Irish sources.'
        : explicitStatus === 'discussed_rejected'
          ? 'This policy appears to have been discussed in Ireland but not adopted.'
          : 'No evidence of this policy concept in Irish policy discourse.';
    return {
      status: explicitStatus,
      notes: reasoning || defaultNotes,
    };
  }

  // Fallback: rely on Irish citation presence without inferring adoption.
  const irishCitations = citations.filter((c) => isIrishDomain(c.url));
  if (irishCitations.length === 0) {
    return {
      status: 'absent',
      notes: 'No Irish sources found for this policy concept.',
    };
  }

  return {
    status: 'discussed_rejected',
    notes: 'Irish sources mention the topic but no explicit adoption was classified.',
  };
}

function calculateOpportunityValue(
  irelandStatus: IrelandStatus,
  successScore: number,
  criticismScore: number
): OpportunityValue {
  // If policy exists in Ireland, low opportunity
  if (irelandStatus === 'exists') {
    return 'low';
  }

  // If discussed and rejected, medium opportunity (worth revisiting)
  if (irelandStatus === 'discussed_rejected') {
    return 'medium';
  }

  // For absent policies, calculate based on evidence quality
  if (irelandStatus === 'absent') {
    // High success + low criticism = high opportunity
    if (successScore >= 0.5 && criticismScore < 0.5) {
      return 'high';
    }
    // Moderate success = medium opportunity
    if (successScore >= 0.3) {
      return 'medium';
    }
  }

  return 'low';
}

export async function gapAnalysis(policies: VettedPolicy[]): Promise<AnalyzedPolicy[]> {
  console.log(`[GapAnalysis] Starting Ireland gap analysis for ${policies.length} policies`);

  const analyzedPolicies: AnalyzedPolicy[] = [];
  const BATCH_SIZE = 3;
  const BATCH_DELAY_MS = 200;

  const delay = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

  const analyzePolicy = async (policy: VettedPolicy): Promise<AnalyzedPolicy> => {
    console.log(`[GapAnalysis] Analyzing: ${policy.name}`);

    try {
      // Search Irish sources
      const irishResult = await searchIrishSources(policy.name, policy.category);
      const { claimByCitation, fallbackClaim } = extractCitationClaims(
        irishResult.content,
        policy.name
      );

      // Extract Irish-specific evidence
      const irelandEvidence: Evidence[] = irishResult.citations.map((citation, index) => {
        const irelandDomain = isIrishDomain(citation.url);
        const claimFromContent = claimByCitation.get(index + 1);
        const claim = (claimFromContent || fallbackClaim).slice(0, 500);
        return {
          id: crypto.randomUUID(),
          policyId: '',
          url: citation.url,
          title: citation.title || null,
          sourceType: irelandDomain?.includes('gov') || irelandDomain?.includes('oireachtas')
            ? 'gov_doc' as const
            : 'news' as const,
          publicationDate: null,
          evidenceType: 'adoption_rate' as const,
          claim,
          excerpt: null,
          sentiment: 'neutral' as const,
          confidence: 0.7,
          isIrelandSource: irelandDomain !== null,
          irelandDomain,
          createdAt: new Date().toISOString(),
        };
      });

      // Determine Ireland status
      const { status: irelandStatus, notes: irelandNotes } = determineIrelandStatus(
        irishResult.content,
        irishResult.citations
      );

      // Calculate opportunity value
      const opportunityValue = calculateOpportunityValue(
        irelandStatus,
        policy.successScore,
        policy.criticismScore
      );

      console.log(
        `[GapAnalysis] ${policy.name}: status=${irelandStatus}, opportunity=${opportunityValue}`
      );
      return {
        ...policy,
        irelandStatus,
        irelandNotes,
        irelandEvidence,
        opportunityValue,
      };
    } catch (error) {
      console.error(`[GapAnalysis] Error analyzing ${policy.name}:`, error);
      // Include with pending status
      return {
        ...policy,
        irelandStatus: 'pending',
        irelandNotes: 'Gap analysis failed - manual review required',
        irelandEvidence: [],
        opportunityValue: null,
      };
    }
  };

  for (let i = 0; i < policies.length; i += BATCH_SIZE) {
    const batch = policies.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(policy => analyzePolicy(policy)));
    analyzedPolicies.push(...batchResults);

    if (i + BATCH_SIZE < policies.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  // Filter to only high-value opportunities for report generation
  const highValue = analyzedPolicies.filter(
    (p) => p.opportunityValue === 'high' || p.opportunityValue === 'medium'
  );

  console.log(
    `[GapAnalysis] Complete. ${highValue.length}/${policies.length} policies are opportunities`
  );

  return analyzedPolicies;
}
