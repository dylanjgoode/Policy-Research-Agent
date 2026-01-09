import { searchIrishSources } from '../perplexity';
import {
  VettedPolicy,
  AnalyzedPolicy,
  Evidence,
  IrelandStatus,
  OpportunityValue,
} from '../types';

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
  const lowerContent = content.toLowerCase();

  // Check for existence indicators
  const existsPatterns = [
    /ireland(?:'s| has| already| currently| operates| runs| offers)/i,
    /irish government(?:'s| has| introduced| launched| operates)/i,
    /enterprise ireland(?:'s| offers| provides| runs)/i,
    /ida ireland(?:'s| offers| provides)/i,
  ];

  for (const pattern of existsPatterns) {
    if (pattern.test(content)) {
      return {
        status: 'exists',
        notes: 'Similar policy or mechanism appears to exist in Ireland.',
      };
    }
  }

  // Check for discussed/rejected indicators
  const rejectedPatterns = [
    /ireland.{0,50}(?:rejected|declined|considered but|not adopted|chose not)/i,
    /(?:proposed|suggested).{0,50}ireland.{0,50}(?:not|never)/i,
    /ireland.{0,50}(?:debated|discussed).{0,50}(?:not|never|failed)/i,
  ];

  for (const pattern of rejectedPatterns) {
    if (pattern.test(content)) {
      return {
        status: 'discussed_rejected',
        notes: 'This policy concept has been discussed in Ireland but not adopted.',
      };
    }
  }

  // Check if we found any Irish sources at all
  const irishCitations = citations.filter((c) => isIrishDomain(c.url));

  if (irishCitations.length === 0) {
    return {
      status: 'absent',
      notes: 'No evidence of this policy concept in Irish policy discourse.',
    };
  }

  // Found Irish sources but no clear status
  if (lowerContent.includes('ireland') || lowerContent.includes('irish')) {
    return {
      status: 'discussed_rejected',
      notes: 'Some discussion found in Irish sources but no clear adoption.',
    };
  }

  return {
    status: 'absent',
    notes: 'This policy concept does not appear in Irish policy discourse.',
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

  for (const policy of policies) {
    console.log(`[GapAnalysis] Analyzing: ${policy.name}`);

    try {
      // Search Irish sources
      const irishResult = await searchIrishSources(policy.name, policy.category);

      // Extract Irish-specific evidence
      const irelandEvidence: Evidence[] = irishResult.citations.map((citation) => {
        const irelandDomain = isIrishDomain(citation.url);
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
          claim: irishResult.content.slice(0, 500),
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

      analyzedPolicies.push({
        ...policy,
        irelandStatus,
        irelandNotes,
        irelandEvidence,
        opportunityValue,
      });

      console.log(
        `[GapAnalysis] ${policy.name}: status=${irelandStatus}, opportunity=${opportunityValue}`
      );
    } catch (error) {
      console.error(`[GapAnalysis] Error analyzing ${policy.name}:`, error);
      // Include with pending status
      analyzedPolicies.push({
        ...policy,
        irelandStatus: 'pending',
        irelandNotes: 'Gap analysis failed - manual review required',
        irelandEvidence: [],
        opportunityValue: null,
      });
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
