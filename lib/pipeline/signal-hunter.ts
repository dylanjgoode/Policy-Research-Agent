import { perplexitySearchWithRetry } from '../perplexity';
import { PolicySignal, PeerCountry, PerplexityCitation, SearchMode } from '../types';

export interface SignalHunterOptions {
  searchMode?: SearchMode;
  searchQuery?: string;
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

// Generate queries based on search mode
function generateQueriesForMode(
  country: string,
  options?: SignalHunterOptions
): { queries: string[]; systemPrompt: string } {
  const searchMode = options?.searchMode || 'broad';
  const searchQuery = options?.searchQuery || '';
  const context = COUNTRY_CONTEXT[country];
  const agencyMention = context?.agencies?.slice(0, 2).join(' OR ') || '';

  switch (searchMode) {
    case 'topic':
      // Single focused query for the user's specific topic
      return {
        queries: [
          `"${searchQuery}" policy program ${country} government ${agencyMention} ${RECENT_YEARS}`,
        ],
        systemPrompt: `You are a policy research analyst. Search for specific government policies and programs
related to "${searchQuery}" from ${country}. Focus on:
1. Named programs and initiatives (not vague concepts)
2. Government policies, legislation, or incentive schemes
3. Measurable outcomes and success metrics
Include program names, key features, and any available metrics. Be factual and cite sources.`,
      };

    case 'reverse':
      // Find implementations of a specific policy in this country
      return {
        queries: [
          `"${searchQuery}" ${country} implementation adoption results government program`,
        ],
        systemPrompt: `You are a policy research analyst. Search for whether ${country} has implemented
a policy similar to "${searchQuery}". Focus on:
1. Has this country adopted a similar program? What is it called locally?
2. What were the results and outcomes?
3. Any variations or adaptations made?
4. Criticism or challenges faced
Be factual and cite sources.`,
      };

    case 'broad':
    default:
      // Original behavior: domain + specialization queries
      return {
        queries: COUNTRY_QUERIES[country] || [],
        systemPrompt: `You are a policy research analyst. Search for specific innovation policy mechanisms,
legislative tools, or government programs from ${country}. Focus on quantifiable programs with
clear names (e.g., "R&D Tax Super-deduction", "Startup Visa Program", "Innovation Fund Grant").
Include program names, key features, and any available metrics. Be factual and cite sources.`,
      };
  }
}

export async function signalHunter(
  countries: string[],
  options?: SignalHunterOptions
): Promise<PolicySignal[]> {
  const searchMode = options?.searchMode || 'broad';
  console.log(`[SignalHunter] Starting scan (mode: ${searchMode}) for countries: ${countries.join(', ')}`);
  if (options?.searchQuery) {
    console.log(`[SignalHunter] Search query: "${options.searchQuery}"`);
  }

  const allPolicies: PolicySignal[] = [];
  const seenPolicies = new Set<string>();

  for (const country of countries) {
    const { queries, systemPrompt } = generateQueriesForMode(country, options);

    if (queries.length === 0) {
      console.warn(`[SignalHunter] No queries generated for country: ${country}`);
      continue;
    }

    console.log(`[SignalHunter] Scanning ${country} with ${queries.length} queries...`);

    for (const query of queries) {
      try {
        const result = await perplexitySearchWithRetry({
          query,
          systemPrompt,
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
          }
        }

        console.log(`[SignalHunter] Found ${policies.length} policies from query`);
      } catch (error) {
        console.error(`[SignalHunter] Error searching ${country}:`, error);
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
