export function extractCitationClaims(
  content: string,
  policyName: string
): {
  claimByCitation: Map<number, string>;
  strengthByCitation: Map<number, number>;
  fallbackClaim: string;
} {
  const segments = splitContentIntoSegments(content);
  const { claimByCitation, strengthByCitation } = buildCitationClaimData(segments);
  const fallbackClaim = getFallbackClaim(segments, content, policyName);

  return { claimByCitation, strengthByCitation, fallbackClaim };
}

export function derivePublisher(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname || null;
  } catch {
    return null;
  }
}

export function normalizeSnippet(snippet?: string | null, maxLength = 280): string | null {
  if (!snippet) return null;
  const cleaned = snippet.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3)}...` : cleaned;
}

function splitContentIntoSegments(content: string): string[] {
  const lines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const segments: string[] = [];
  for (const line of lines) {
    const parts = line.match(/[^.!?]+[.!?]*/g);
    if (!parts) {
      segments.push(line);
      continue;
    }
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) {
        segments.push(trimmed);
      }
    }
  }

  return segments;
}

function buildCitationClaimData(
  segments: string[]
): { claimByCitation: Map<number, string>; strengthByCitation: Map<number, number> } {
  const claimByCitation = new Map<number, string>();
  const strengthByCitation = new Map<number, number>();

  let lastIndices: number[] | null = null;

  for (const segment of segments) {
    const matches = [...segment.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)];
    const strength = parseStrengthFromSegment(segment);
    if (matches.length === 0) {
      if (strength !== null && lastIndices) {
        for (const index of lastIndices) {
          if (!strengthByCitation.has(index)) {
            strengthByCitation.set(index, strength);
          }
        }
      }
      continue;
    }

    const indices = new Set<number>();
    for (const match of matches) {
      const parts = match[1].split(',');
      for (const part of parts) {
        const index = Number(part.trim());
        if (!Number.isNaN(index)) {
          indices.add(index);
        }
      }
    }

    if (indices.size === 0) {
      continue;
    }

    const cleaned = segment
      .replace(/\s*\[(\d+(?:\s*,\s*\d+)*)\]/g, '')
      .replace(/\b(?:evidence\s*)?strength\s*:\s*\d{1,2}\s*\/\s*10\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) {
      continue;
    }

    for (const index of indices) {
      if (!claimByCitation.has(index)) {
        claimByCitation.set(index, cleaned);
      }
      if (strength !== null && !strengthByCitation.has(index)) {
        strengthByCitation.set(index, strength);
      }
    }

    lastIndices = [...indices];
  }

  return { claimByCitation, strengthByCitation };
}

function getFallbackClaim(
  segments: string[],
  content: string,
  policyName: string
): string {
  const normalizedName = policyName.trim().toLowerCase();
  const segmentWithName = normalizedName
    ? segments.find((segment) => segment.toLowerCase().includes(normalizedName))
    : undefined;
  const firstSegment = segmentWithName || segments[0];
  if (firstSegment) {
    return firstSegment;
  }
  return content.slice(0, 500);
}

function parseStrengthFromSegment(segment: string): number | null {
  const match = segment.match(/\b(?:evidence\s*)?strength\s*:\s*(\d{1,2})\s*\/\s*10\b/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  if (Number.isNaN(value)) {
    return null;
  }

  return Math.min(Math.max(value, 1), 10);
}
