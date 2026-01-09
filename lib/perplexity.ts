import { PerplexityResponse, PerplexityCitation } from './types';
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
      return cached;
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
  const citations: PerplexityCitation[] = (data.citations || []).map((c: string | { url: string; title?: string }) => {
    if (typeof c === 'string') {
      return { url: c };
    }
    return { url: c.url, title: c.title };
  });

  const result: PerplexityResponse = {
    content: data.choices?.[0]?.message?.content || '',
    citations,
    model: data.model,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
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
independent evaluations. Always cite specific numbers with their sources. Be factual and objective.`,
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
evaluations that identify problems. This is an adversarial check - we need to know the downsides.`,
  });
}

// Search Irish sources specifically
export async function searchIrishSources(
  policyName: string,
  category: string
): Promise<PerplexityResponse> {
  return perplexitySearchWithRetry({
    query: `site:gov.ie OR site:oireachtas.ie OR site:enterprise.gov.ie OR site:irishtimes.com OR site:siliconrepublic.com "${policyName}" OR "${category}" Ireland policy`,
    systemPrompt: `Search Irish legislative and government sources for evidence of the policy "${policyName}"
or similar policies in the category "${category}". Determine if:
1. This policy already exists in Ireland (provide details)
2. It was discussed but rejected (explain why)
3. It appears absent from Irish policy discourse
Be specific about what you find or don't find.`,
  });
}
