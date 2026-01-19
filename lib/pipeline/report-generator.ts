import { perplexitySearchWithRetry } from '../perplexity';
import {
  AnalyzedPolicy,
  Policy,
  RiskAssessment,
  ActivityCollector,
} from '../types';
import { createPolicyWithEvidence } from '../db';

export interface ReportGeneratorOptions {
  activity?: ActivityCollector;
}

async function generateConceptHook(policy: AnalyzedPolicy): Promise<string> {
  try {
    const result = await perplexitySearchWithRetry({
      query: `Create a compelling one-sentence hook (max 25 words) for "${policy.name}" from ${policy.sourceCountry} that would grab an Irish policymaker's attention. Focus on the key benefit or innovation.`,
      systemPrompt: 'Return ONLY the hook sentence. No quotes, no explanation. Make it punchy and memorable.',
      temperature: 0.3,
      maxTokens: 100,
    });
    return result.content.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    return `${policy.name}: A proven ${policy.category.toLowerCase()} mechanism from ${policy.sourceCountry}.`;
  }
}

async function generateCaseStudy(policy: AnalyzedPolicy): Promise<string> {
  try {
    const successClaims = policy.successEvidence
      .slice(0, 3)
      .map((e) => e.claim)
      .join(' ');

    const result = await perplexitySearchWithRetry({
      query: `Summarize the success of "${policy.name}" in ${policy.sourceCountry} in 2-3 sentences. Include specific metrics if available. Context: ${successClaims}`,
      systemPrompt: 'Be concise and data-driven. Include specific numbers where possible. No fluff.',
      temperature: 0.2,
      maxTokens: 200,
    });
    return result.content.trim();
  } catch (error) {
    return `${policy.name} has shown positive results in ${policy.sourceCountry}. Further research recommended for specific metrics.`;
  }
}

async function generatePilotProposal(policy: AnalyzedPolicy): Promise<string> {
  try {
    const result = await perplexitySearchWithRetry({
      query: `Propose a realistic pilot program to test the "${policy.name}" concept in Ireland. Consider: Irish institutions (Enterprise Ireland, IDA, etc.), existing frameworks, realistic scope. 3-4 sentences max.`,
      systemPrompt: 'Be specific and actionable. Reference real Irish institutions. Focus on low-risk, achievable first steps.',
      temperature: 0.3,
      maxTokens: 250,
    });
    return result.content.trim();
  } catch (error) {
    return `A pilot could be launched in partnership with Enterprise Ireland, targeting a specific sector for 12-18 months to evaluate effectiveness.`;
  }
}

function generateRiskAssessment(policy: AnalyzedPolicy): RiskAssessment {
  const risks: RiskAssessment['risks'] = [];
  const mitigations: RiskAssessment['mitigations'] = [];

  // Always include implementation complexity
  risks.push({
    risk: 'Implementation complexity',
    severity: 'medium',
    likelihood: 'medium',
  });
  mitigations.push({
    risk: 'Implementation complexity',
    mitigation: 'Start with limited pilot scope, leverage existing agency infrastructure',
  });

  // Political risk based on criticism score
  const politicalSeverity = policy.criticismScore > 0.5 ? 'high' : policy.criticismScore > 0.3 ? 'medium' : 'low';
  risks.push({
    risk: 'Political resistance',
    severity: politicalSeverity,
    likelihood: 'medium',
  });
  mitigations.push({
    risk: 'Political resistance',
    mitigation: 'Build cross-party support, emphasize evidence base from peer economies',
  });

  // Budget constraints (always relevant)
  risks.push({
    risk: 'Budget constraints',
    severity: 'high',
    likelihood: 'high',
  });
  mitigations.push({
    risk: 'Budget constraints',
    mitigation: 'Explore EU funding mechanisms, consider revenue-neutral design',
  });

  // Add specific risk if high criticism
  if (policy.criticismScore > 0.4 && policy.criticismEvidence.length > 0) {
    const criticismClaim = policy.criticismEvidence[0].claim.slice(0, 100);
    risks.push({
      risk: 'Known issues from source country',
      severity: 'medium',
      likelihood: 'medium',
    });
    mitigations.push({
      risk: 'Known issues from source country',
      mitigation: `Learn from ${policy.sourceCountry}'s experience and design to avoid identified pitfalls`,
    });
  }

  return { risks, mitigations };
}

function generateGapStatement(policy: AnalyzedPolicy): string {
  switch (policy.irelandStatus) {
    case 'absent':
      return `Ireland currently has no equivalent to ${policy.name}. This represents an untapped opportunity for ${policy.category.toLowerCase()} policy innovation that peer economies have successfully implemented.`;
    case 'discussed_rejected':
      return `While ${policy.name} or similar concepts have been discussed in Ireland, no equivalent has been adopted. ${policy.irelandNotes || 'The evidence from ' + policy.sourceCountry + ' suggests revisiting this policy.'}`;
    case 'exists':
      return `Ireland has existing mechanisms in this space. However, the ${policy.sourceCountry} model may offer improvements or extensions worth considering.`;
    default:
      return `Analysis of Irish policy landscape pending. Initial research suggests this may be an opportunity.`;
  }
}

export async function generateReports(
  policies: AnalyzedPolicy[],
  options: ReportGeneratorOptions = {}
): Promise<Policy[]> {
  const { activity } = options;
  console.log(`[ReportGenerator] Generating reports for ${policies.length} policies`);

  const finalPolicies: Policy[] = [];

  for (const policy of policies) {
    console.log(`[ReportGenerator] Generating report: ${policy.name}`);

    try {
      // Emit query events for AI-generated content
      activity?.emit({
        phase: 'report_generation',
        eventType: 'query_sent',
        itemName: policy.name,
        metadata: { queryType: 'concept_hook' },
      });
      activity?.emit({
        phase: 'report_generation',
        eventType: 'query_sent',
        itemName: policy.name,
        metadata: { queryType: 'case_study' },
      });
      activity?.emit({
        phase: 'report_generation',
        eventType: 'query_sent',
        itemName: policy.name,
        metadata: { queryType: 'pilot_proposal' },
      });

      // Generate report components
      const startTime = Date.now();
      const [conceptHook, caseStudySummary, pilotProposal] = await Promise.all([
        generateConceptHook(policy),
        generateCaseStudy(policy),
        generatePilotProposal(policy),
      ]);
      const duration = Date.now() - startTime;

      activity?.emit({
        phase: 'report_generation',
        eventType: 'cache_miss', // Report generation queries are always fresh
        apiCallDurationMs: duration,
        itemName: policy.name,
        metadata: { generatedComponents: ['concept_hook', 'case_study', 'pilot_proposal'] },
      });

      const gapStatement = generateGapStatement(policy);
      const riskAssessment = generateRiskAssessment(policy);

      // Prepare all evidence items
      const allEvidence = [
        ...policy.successEvidence,
        ...policy.criticismEvidence,
        ...policy.irelandEvidence,
      ].map((e) => ({
        url: e.url!,
        title: e.title,
        publisher: e.publisher,
        retrieved_at: e.retrievedAt || new Date().toISOString(),
        source_type: e.sourceType!,
        publication_date: e.publicationDate,
        evidence_type: e.evidenceType!,
        claim: e.claim!,
        excerpt: e.excerpt,
        sentiment: e.sentiment,
        confidence: e.confidence,
        is_ireland_source: e.isIrelandSource || false,
        ireland_domain: e.irelandDomain,
      }));

      const successIndexes = policy.successEvidence.map((_, index) => index);
      const criticismOffset = policy.successEvidence.length;
      const irelandOffset = criticismOffset + policy.criticismEvidence.length;
      const irelandIndexes = policy.irelandEvidence.map((_, index) => irelandOffset + index);

      const gapEvidenceIndexes = irelandIndexes.length > 0 ? irelandIndexes : successIndexes;

      const policyClaims = [
        {
          claimType: 'case_study_summary',
          claimText: caseStudySummary,
          evidenceIndexes: successIndexes,
        },
        {
          claimType: 'gap_statement',
          claimText: gapStatement,
          evidenceIndexes: gapEvidenceIndexes,
        },
      ].filter((claim) => claim.claimText.trim().length > 0 && claim.evidenceIndexes.length > 0);

      // Create policy and evidence atomically (single transaction)
      const savedPolicy = await createPolicyWithEvidence({
        policy: {
          name: policy.name,
          category: policy.category,
          source_country: policy.sourceCountry,
          original_source_url: policy.sourceUrl,
          original_source_title: policy.sourceTitle,
          discovery_context: policy.description,
          vetting_status: 'vetted',
          success_score: policy.successScore,
          criticism_score: policy.criticismScore,
          ireland_status: policy.irelandStatus,
          ireland_notes: policy.irelandNotes,
          opportunity_value: policy.opportunityValue,
          concept_hook: conceptHook,
          case_study_summary: caseStudySummary,
          gap_statement: gapStatement,
          pilot_proposal: pilotProposal,
          risk_assessment: riskAssessment,
          status: policy.opportunityValue === 'high' ? 'active' : 'draft',
        },
        evidence: allEvidence,
        policyClaims,
      });

      finalPolicies.push(savedPolicy);

      // Emit signal_found to track successful report generation
      activity?.emit({
        phase: 'report_generation',
        eventType: 'signal_found',
        itemName: savedPolicy.name,
        targetCountry: policy.sourceCountry,
        metadata: {
          slug: savedPolicy.slug,
          opportunityValue: savedPolicy.opportunityValue,
          evidenceCount: allEvidence.length,
        },
      });

      console.log(`[ReportGenerator] Saved: ${savedPolicy.name} (${savedPolicy.slug})`);
    } catch (error) {
      console.error(`[ReportGenerator] Error generating report for ${policy.name}:`, error);
      activity?.emit({
        phase: 'report_generation',
        eventType: 'api_error',
        itemName: policy.name,
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  console.log(`[ReportGenerator] Complete. Generated ${finalPolicies.length} reports`);
  return finalPolicies;
}
