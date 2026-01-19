import { perplexitySearchWithRetry } from '../perplexity';
import { PolicySignal, PerplexityCitation, PolicyInterpretation, ActivityCollector } from '../types';

export interface SignalHunterOptions {
  interpretation: PolicyInterpretation;
  activity?: ActivityCollector;
}

// Policy domains to search across all countries
const POLICY_DOMAINS = [
  'R&D tax incentives and credits',
  'Startup grants and funding programs',
  'Tech talent and startup visa programs',
  'Regulatory sandbox initiatives',
  'Green technology and cleantech incentives',
  'Digital transformation and e-government',
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const RECENT_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].join(' ');

// Country-specific context for better search results
const COUNTRY_CONTEXT: Record<string, { agencies: string[]; specializations: string[] }> = {
  Singapore: {
    agencies: ['Enterprise Singapore', 'EDB', 'IMDA', 'A*STAR'],
    specializations: ['fintech hub', 'smart nation', 'biotech', 'maritime innovation'],
  },
  Denmark: {
    agencies: ['Innovation Fund Denmark', 'Danish Business Authority', 'Vaekstfonden'],
    specializations: ['green transition', 'life sciences', 'wind energy', 'circular economy'],
  },
  Israel: {
    agencies: ['Israel Innovation Authority', 'Chief Scientist Office', 'BIRD Foundation'],
    specializations: ['cybersecurity', 'agritech', 'defense tech', 'startup nation'],
  },
  Estonia: {
    agencies: ['Enterprise Estonia', 'e-Estonia', 'Startup Estonia'],
    specializations: ['e-residency', 'digital government', 'cybersecurity', 'fintech'],
  },
  Finland: {
    agencies: ['Business Finland', 'Finnvera', 'Sitra'],
    specializations: ['cleantech', 'gaming industry', 'health tech', 'circular economy'],
  },
  Netherlands: {
    agencies: ['RVO', 'Invest-NL', 'StartupDelta', 'Holland High Tech'],
    specializations: ['agrifood', 'water management', 'logistics', 'high-tech systems'],
  },
  'New Zealand': {
    agencies: ['Callaghan Innovation', 'NZTE', 'MBIE'],
    specializations: ['agritech', 'screen industry', 'space tech', 'Maori innovation'],
  },
  'South Korea': {
    agencies: ['KISED', 'KOTRA', 'TIPS Program', 'K-Startup Grand Challenge'],
    specializations: ['K-content', 'semiconductors', 'battery tech', 'smart manufacturing'],
  },
  'United Kingdom': {
    agencies: ['Innovate UK', 'British Business Bank', 'UKRI', 'Tech Nation'],
    specializations: ['fintech', 'life sciences', 'creative industries', 'clean growth'],
  },
  Ireland: {
    agencies: ['Enterprise Ireland', 'IDA Ireland', 'Science Foundation Ireland'],
    specializations: ['pharma', 'tech multinationals', 'fintech', 'medtech'],
  },
};

// Generate structured queries for each country
function generateCountryQueries(country: string): string[] {
  const context = COUNTRY_CONTEXT[country];
  if (!context) return [];

  const queries: string[] = [];
  const primaryAgency = context.agencies[0];
  const agencyMention = context.agencies.slice(0, 2).join(' OR ');

  // Domain-specific queries with country context
  for (const domain of POLICY_DOMAINS) {
    queries.push(
      `${country} government policy "${domain}" program initiative (${agencyMention}) ${RECENT_YEARS}`
    );
  }

  // Country specialization queries
  for (const specialization of context.specializations.slice(0, 2)) {
    queries.push(
      `${country} ${specialization} government incentive policy program ${primaryAgency} ${RECENT_YEARS}`
    );
  }

  return queries;
}

// Pre-generate queries for all countries
const COUNTRY_QUERIES: Record<string, string[]> = Object.fromEntries(
  Object.keys(COUNTRY_CONTEXT).map((country) => [country, generateCountryQueries(country)])
);

interface ExtractedPolicy {
  name: string;
  category: string;
  description: string;
}

async function extractPoliciesFromResponse(
  content: string,
  citations: PerplexityCitation[],
  country: string
): Promise<PolicySignal[]> {
  // Use Perplexity to extract structured policy data
  const extractionResult = await perplexitySearchWithRetry({
    query: `Extract specific named policy programs from this text. Return JSON array with objects containing: name (exact policy name), category (one of: R&D Incentives, Talent Visa, Startup Support, Innovation Fund, Tax Incentive, Digital Policy), description (one sentence). Only include specific named programs, not vague concepts.

Text to analyze:
${content}`,
    systemPrompt: 'You are a policy extraction specialist. Return ONLY a valid JSON array, no other text. Example: [{"name": "R&D Tax Credit", "category": "Tax Incentive", "description": "Tax credit for research activities"}]',
    temperature: 0,
    maxTokens: 1024,
  });

  try {
    // Try to parse JSON from response
    const jsonMatch = extractionResult.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[SignalHunter] No JSON array found in extraction response');
      return [];
    }

    const policies: ExtractedPolicy[] = JSON.parse(jsonMatch[0]);

    // Map to PolicySignal format
    return policies.map((p) => ({
      name: p.name,
      category: p.category || 'Innovation Policy',
      sourceCountry: country,
      sourceUrl: citations[0]?.url || '',
      sourceTitle: citations[0]?.title || null,
      description: p.description,
    }));
  } catch (error) {
    console.error('[SignalHunter] Failed to parse policies:', error);
    return [];
  }
}

// Generate queries for reverse lookup based on policy interpretation
function generateQueriesForInterpretation(
  country: string,
  interpretation: PolicyInterpretation
): { queries: string[]; systemPrompt: string } {
  const context = COUNTRY_CONTEXT[country];
  const agencyMention = context?.agencies?.slice(0, 2).join(' OR ') || '';
  const policyName = interpretation.policyName;
  const category = interpretation.category;
  const aliases = interpretation.alsoKnownAs || [];
  const levers = interpretation.levers;

  // Build name variants for broader search coverage
  const nameVariants = [policyName, ...aliases.slice(0, 2)];
  const nameQuery = nameVariants.map((n) => `"${n}"`).join(' OR ');

  // Multiple queries using enriched interpretation data
  const queries = [
    // Primary: search by policy name variants
    `(${nameQuery}) ${country} implementation adoption results government program`,
    // Secondary: search by category + agency
    `${category} policy ${country} ${agencyMention} program initiative ${RECENT_YEARS}`,
  ];

  // Add mechanism-specific query if we have lever data
  if (levers?.mechanism && levers?.targetGroup) {
    queries.push(
      `${levers.mechanism} ${levers.targetGroup} ${country} government policy program ${RECENT_YEARS}`
    );
  }

  // Build context from levers for the system prompt
  const leverContext = levers
    ? `
Policy design details:
- Target group: ${levers.targetGroup || 'Not specified'}
- Mechanism: ${levers.mechanism || 'Not specified'}
- Sector: ${levers.sector || 'Sector-agnostic'}
- Intended outcome: ${levers.intendedOutcome || 'Not specified'}`
    : '';

  const systemPrompt = `You are a policy research analyst. Search for whether ${country} has implemented
a policy similar to "${policyName}" (${category}).
${aliases.length > 0 ? `\nAlso known as: ${aliases.join(', ')}` : ''}

Context from user: "${interpretation.summary}"
${leverContext}

Focus on:
1. Has this country adopted a similar program? What is it called locally?
2. What were the results and outcomes?
3. Any variations or adaptations made?
4. Key metrics and evidence of success or failure

Be factual and cite sources.`;

  return { queries, systemPrompt };
}

export async function signalHunter(
  countries: string[],
  options: SignalHunterOptions
): Promise<PolicySignal[]> {
  const { interpretation, activity } = options;
  console.log(`[SignalHunter] Starting scan for policy: "${interpretation.policyName}"`);
  console.log(`[SignalHunter] Countries: ${countries.join(', ')}`);

  const allPolicies: PolicySignal[] = [];
  const seenPolicies = new Set<string>();

  for (const country of countries) {
    const { queries, systemPrompt } = generateQueriesForInterpretation(country, interpretation);

    console.log(`[SignalHunter] Scanning ${country} with ${queries.length} queries...`);

    for (const query of queries) {
      try {
        // Emit query_sent event
        activity?.emit({
          phase: 'signal_hunter',
          eventType: 'query_sent',
          queryText: query,
          targetCountry: country,
        });

        const startTime = Date.now();
        const result = await perplexitySearchWithRetry({
          query,
          systemPrompt,
        });
        const duration = Date.now() - startTime;

        // Emit cache hit/miss event
        activity?.emit({
          phase: 'signal_hunter',
          eventType: result.fromCache ? 'cache_hit' : 'cache_miss',
          apiCallDurationMs: duration,
          tokensUsed: result.usage.totalTokens,
          targetCountry: country,
        });

        const policies = await extractPoliciesFromResponse(
          result.content,
          result.citations,
          country
        );

        // Deduplicate by name
        for (const policy of policies) {
          const key = `${policy.name.toLowerCase()}-${policy.sourceCountry}`;
          if (!seenPolicies.has(key)) {
            seenPolicies.add(key);
            allPolicies.push(policy);

            // Emit signal_found event
            activity?.emit({
              phase: 'signal_hunter',
              eventType: 'signal_found',
              itemName: policy.name,
              targetCountry: country,
              metadata: { category: policy.category },
            });
          }
        }

        console.log(`[SignalHunter] Found ${policies.length} policies from query`);
      } catch (error) {
        console.error(`[SignalHunter] Error searching ${country}:`, error);
        activity?.emit({
          phase: 'signal_hunter',
          eventType: 'api_error',
          targetCountry: country,
          metadata: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    }
  }

  console.log(`[SignalHunter] Complete. Total policies found: ${allPolicies.length}`);
  return allPolicies;
}

// Discovery mode - broader scan not limited to specific countries
export async function discoverGlobalPolicies(): Promise<PolicySignal[]> {
  console.log('[SignalHunter] Starting global discovery scan...');

  const discoveryQueries = [
    'OECD innovation policy recommendations 2024 2025 best practices',
    'Nordic countries innovation policy new initiatives 2024',
    'Asia Pacific startup policy government programs 2024 2025',
    'European Union innovation policy new programs member states',
    'emerging economies innovation policy successful programs',
  ];

  const allPolicies: PolicySignal[] = [];
  const seenPolicies = new Set<string>();

  for (const query of discoveryQueries) {
    try {
      const result = await perplexitySearchWithRetry({
        query,
        systemPrompt: `You are a global policy research analyst. Identify specific, named innovation policies
from countries around the world that could be relevant for Ireland. Focus on:
1. Specific program names (not vague concepts)
2. Programs with measurable success
3. Policies from peer economies or innovative nations
Include the country of origin for each policy.`,
      });

      // Extract country mentions from content
      const countryPatterns = /(?:in|from|by)\s+(\w+(?:\s+\w+)?)\s+(?:government|ministry|authority)/gi;
      const matches = result.content.matchAll(countryPatterns);

      for (const match of matches) {
        const country = match[1];

        const policies = await extractPoliciesFromResponse(
          result.content,
          result.citations,
          country
        );

        for (const policy of policies) {
          const key = `${policy.name.toLowerCase()}-${policy.sourceCountry}`;
          if (!seenPolicies.has(key)) {
            seenPolicies.add(key);
            allPolicies.push(policy);
          }
        }
      }
    } catch (error) {
      console.error('[SignalHunter] Discovery error:', error);
    }
  }

  console.log(`[SignalHunter] Discovery complete. Found: ${allPolicies.length} policies`);
  return allPolicies;
}
