import { PerplexityResponse, PerplexityCitation, PolicyInterpretation } from './types';
import { redis } from './redis';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const RATE_LIMIT_DELAY = 200; // ms between requests
const CACHE_TTL = 86400; // 24 hours in seconds

let lastRequestTime = 0;

export interface PerplexitySearchOptions {
  query: string;
  systemPrompt?: string;
  model?: 'sonar' | 'sonar-pro' | 'sonar-reasoning';
  temperature?: number;
  maxTokens?: number;
  returnCitations?: boolean;
}

async function rateLimitDelay(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve =>
      setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

function getCacheKey(query: string, systemPrompt: string): string {
  const hash = Buffer.from(`${query}|${systemPrompt}`).toString('base64').slice(0, 48);
  return `perplexity:${hash}`;
}

export async function perplexitySearch(options: PerplexitySearchOptions): Promise<PerplexityResponse> {
  const {
    query,
    systemPrompt = 'You are a helpful research assistant. Be concise and factual.',
    model = 'sonar-pro',
    temperature = 0.1,
    maxTokens = 1024,
    returnCitations = true,
  } = options;

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY environment variable is required');
  }

  // Check cache first
  const cacheKey = getCacheKey(query, systemPrompt);
  try {
    const cached = await redis.get<PerplexityResponse>(cacheKey);
    if (cached) {
      console.log('[Perplexity] Cache hit for query:', query.slice(0, 50));
      return { ...cached, fromCache: true };
    }
  } catch (error) {
    // Cache miss or error - continue with API call
    console.log('[Perplexity] Cache miss, making API call');
  }

  // Rate limit
  await rateLimitDelay();

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature,
      max_tokens: maxTokens,
      return_citations: returnCitations,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Extract citations from response
  const citations: PerplexityCitation[] = (data.citations || []).map(
    (c: string | { url: string; title?: string; snippet?: string }) => {
      if (typeof c === 'string') {
        return { url: c };
      }
      return { url: c.url, title: c.title, snippet: c.snippet };
    }
  );

  const result: PerplexityResponse = {
    content: data.choices?.[0]?.message?.content || '',
    citations,
    model: data.model,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    fromCache: false,
  };

  // Cache the result
  try {
    await redis.setex(cacheKey, CACHE_TTL, result);
  } catch (error) {
    console.warn('[Perplexity] Failed to cache result:', error);
  }

  return result;
}

export async function perplexitySearchWithRetry(
  options: PerplexitySearchOptions,
  maxRetries = 3
): Promise<PerplexityResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Exponential backoff on retry
      if (attempt > 0) {
        const delay = RATE_LIMIT_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[Perplexity] Retry attempt ${attempt + 1}/${maxRetries}`);
      }

      return await perplexitySearch(options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth errors
      if (lastError.message.includes('401') || lastError.message.includes('403')) {
        throw lastError;
      }

      // Don't retry on rate limit - wait longer
      if (lastError.message.includes('429')) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  throw lastError || new Error('Failed after max retries');
}

// Convenience function for policy research
export async function searchPolicies(
  country: string,
  topic?: string
): Promise<PerplexityResponse> {
  const query = topic
    ? `${country} innovation policy "${topic}" government program initiative legislation`
    : `${country} innovation policy government program startup R&D tax incentive talent visa recent`;

  return perplexitySearchWithRetry({
    query,
    systemPrompt: `You are a policy research analyst. Search for specific innovation policy mechanisms,
legislative tools, or government programs from ${country}. Focus on quantifiable programs with
clear names (e.g., "R&D Tax Super-deduction", "Startup Visa Program", "Innovation Fund Grant").
Return specific policy names, not vague concepts. Be factual and cite sources.`,
  });
}

// Search for evidence of policy success
export async function searchSuccessEvidence(
  policyName: string,
  country: string
): Promise<PerplexityResponse> {
  return perplexitySearchWithRetry({
    query: `"${policyName}" ${country} success results metrics impact statistics adoption rate evaluation`,
    systemPrompt: `Find quantitative evidence of success for the policy "${policyName}" in ${country}.
Look for: adoption rates, economic impact metrics, number of beneficiaries, growth statistics,
independent evaluations. Always cite specific numbers with their sources. Be factual and objective.
Return 3-6 bullet points. Each bullet must be a single claim sentence with citation markers [n],
followed by "Strength: X/10" using this rubric:
1-2 anecdotal or unverified, 3-4 qualitative without data, 5-6 single-source quantitative metric,
7-8 multiple sources or official evaluation with metrics, 9-10 rigorous or peer-reviewed causal evidence.`,
  });
}

// Adversarial search for criticisms
export async function searchCriticisms(
  policyName: string,
  country: string
): Promise<PerplexityResponse> {
  return perplexitySearchWithRetry({
    query: `"${policyName}" ${country} criticism failure problems limitations "unintended consequences" evaluation negative`,
    systemPrompt: `Find criticisms, failures, or unintended consequences of the policy "${policyName}" in ${country}.
Be thorough in finding opposing viewpoints. Include academic critiques, media criticism, policy
evaluations that identify problems. This is an adversarial check - we need to know the downsides.
Return 3-6 bullet points. Each bullet must be a single claim sentence with citation markers [n],
followed by "Strength: X/10" using this rubric:
1-2 anecdotal or unverified, 3-4 qualitative without data, 5-6 single-source quantitative metric,
7-8 multiple sources or official evaluation with metrics, 9-10 rigorous or peer-reviewed causal evidence.`,
  });
}

const IRISH_SOURCE_DOMAINS = [
  'gov.ie',
  'oireachtas.ie',
  'enterprise.gov.ie',
  'irishtimes.com',
  'siliconrepublic.com',
  'dbei.gov.ie',
  'rte.ie',
  'independent.ie',
  'businesspost.ie',
  'thejournal.ie',
];

function getIrishDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const domain of IRISH_SOURCE_DOMAINS) {
      if (hostname.includes(domain)) {
        return domain;
      }
    }
  } catch {
    return null;
  }
  return null;
}

// Search Irish sources specifically
export async function searchIrishSources(
  policyName: string,
  category: string
): Promise<PerplexityResponse> {
  const result = await perplexitySearchWithRetry({
    query: `"${policyName}" OR "${category}" Ireland policy government program legislation`,
    systemPrompt: `Search exclusively Irish government and Irish news sources for evidence of the policy "${policyName}"
or similar policies in the category "${category}". Determine if:
1. This policy already exists in Ireland (provide details)
2. It was discussed but rejected (explain why)
3. It appears absent from Irish policy discourse
Focus exclusively on sources from: gov.ie, oireachtas.ie, enterprise.gov.ie, irishtimes.com, siliconrepublic.com,
dbei.gov.ie, rte.ie, independent.ie, businesspost.ie, thejournal.ie. If you cannot find sources there,
say so explicitly and do not infer.
Return a short answer in this format:
Classification: EXISTS | DISCUSSED_BUT_REJECTED | ABSENT
Reasoning: <1-3 sentences>`,
  });

  const irishCitations = result.citations.filter((citation) =>
    getIrishDomain(citation.url)
  );

  return {
    ...result,
    citations: irishCitations,
  };
}

// Interpret a user's policy idea using AI
export async function interpretPolicyIdea(ideaText: string): Promise<PolicyInterpretation> {
  const result = await perplexitySearchWithRetry({
    query: ideaText,
    systemPrompt: `You are a policy research analyst. The user has described a policy idea they want to research.

Your task is to extract a structured interpretation:

1. **policyName**: A concise canonical name (e.g., "R&D Tax Credit", "Startup Visa Program")
2. **alsoKnownAs**: 2-4 alternative names or synonyms this policy might be called in different countries
3. **category**: One of: R&D Incentives, Talent Visa, Startup Support, Innovation Fund, Tax Incentive, Digital Policy, Housing Policy, Healthcare Policy, Education Policy, Regulatory Sandbox, Other
4. **summary**: 2-3 sentences on what this policy involves and what problem it addresses
5. **levers**: The specific policy design elements:
   - targetGroup: Who benefits (e.g., "Early-stage startups", "R&D-intensive SMEs", "Foreign entrepreneurs")
   - mechanism: How it works (e.g., "Tax credit", "Direct grant", "Regulatory exemption", "Visa pathway")
   - sector: Specific sector if any, or null if sector-agnostic
   - intendedOutcome: What change it aims to create (e.g., "Increase private R&D spending")

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "policyName": "...",
  "alsoKnownAs": ["...", "..."],
  "category": "...",
  "summary": "...",
  "levers": {
    "targetGroup": "...",
    "mechanism": "...",
    "sector": null,
    "intendedOutcome": "..."
  }
}`,
    temperature: 0.3,
    maxTokens: 768,
    returnCitations: false,
  });

  // Parse JSON from response
  const content = result.content.trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse interpretation response: no JSON found');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      policyName: parsed.policyName || 'Unknown Policy',
      alsoKnownAs: Array.isArray(parsed.alsoKnownAs) ? parsed.alsoKnownAs : [],
      category: parsed.category || 'Other',
      summary: parsed.summary || ideaText,
      originalInput: ideaText,
      levers: {
        targetGroup: parsed.levers?.targetGroup || '',
        mechanism: parsed.levers?.mechanism || '',
        sector: parsed.levers?.sector || null,
        intendedOutcome: parsed.levers?.intendedOutcome || '',
      },
    };
  } catch (parseError) {
    throw new Error(`Failed to parse interpretation JSON: ${parseError}`);
  }
}
