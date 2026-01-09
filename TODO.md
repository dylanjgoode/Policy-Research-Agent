# Product Logic Improvements

## Completed

### 1. Thin Search Coverage
**Problem:** Only 2 keyword-stuffed queries per country, missing many policy domains.

**Solution:** Expanded to 8 structured queries per country:
- 6 domain-specific queries (R&D, startup grants, talent visas, regulatory sandboxes, cleantech, digital transformation)
- 2 country-specialization queries (e.g., Singapore fintech, Denmark green transition)
- Added country-specific agency names and recent year filters

**File:** `lib/pipeline/signal-hunter.ts`

---

### 2. Broken Claim Extraction
**Problem:** In `global-vetting.ts:39`, every citation from the same search gets identical content:
```typescript
claim: content.slice(0, 500), // First 500 chars as claim
```
This means if a search returns 5 citations, all 5 get the same "claim" text - the first 500 characters of the entire response. We're not extracting what each individual source actually says.

**Solution:** Added per-citation claim extraction by mapping `[n]` markers to the sentence that cites them, with a policy-name fallback.

**Files:** `lib/pipeline/global-vetting.ts`, `lib/pipeline/gap-analysis.ts`, `lib/pipeline/evidence-utils.ts`

---

### 3. Irish Source Search Uses Google Syntax
**Problem:** In `perplexity.ts:206`, the query uses `site:` operators:
```typescript
query: `site:gov.ie OR site:oireachtas.ie OR site:enterprise.gov.ie ... "${policyName}" OR "${category}" Ireland policy`
```
Perplexity's sonar-pro model doesn't reliably support Google-style `site:` operators. The search may return results from any domain, defeating the purpose of Ireland-specific searching.

**Impact:** Gap analysis may miss Irish sources or incorrectly determine Ireland status based on non-Irish results.

**Solution:**
- Removed `site:` operators from the query
- Moved domain restrictions into the system prompt
- Added post-processing to filter citations to Irish domains

**File:** `lib/perplexity.ts` → `searchIrishSources()`

---

### 4. Parallel Processing
**Problem:** In `global-vetting.ts:72` and `gap-analysis.ts:117`, policies were processed sequentially, making research runs slow.

**Solution:**
- Batch policies into groups of 3
- Run each batch in parallel with `Promise.all()`
- Add a 200ms delay between batches to respect rate limiting

**Files:** `lib/pipeline/global-vetting.ts`, `lib/pipeline/gap-analysis.ts`

---

### 5. Explicit Ireland Status Classification
**Problem:** In `gap-analysis.ts:45-66`, status was determined by regex patterns with high false positives.

**Solution:**
- Added explicit classification to the Irish search prompt
- Parsed `Classification` + `Reasoning` in `determineIrelandStatus()`
- Added conservative fallback when classification is missing

**Files:** `lib/pipeline/gap-analysis.ts`, `lib/perplexity.ts`

---

### 6. Scoring Ignores Content Quality
**Problem:** In `global-vetting.ts:52-64`, scores are based only on citation count and source types:
```typescript
const countScore = Math.min(evidence.length / 5, 1) * 0.5;
const qualityScore = Math.min(qualitySources.length / 3, 1) * 0.5;
```
A policy with 5 articles saying "this policy failed miserably" scores identically to 5 articles saying "this policy drove 40% GDP growth".

**Solution:** Added a Perplexity strength rubric (1-10) per claim, mapped to evidence confidence, and weighted scores by average confidence.

**Files:** `lib/perplexity.ts`, `lib/pipeline/global-vetting.ts`, `lib/pipeline/evidence-utils.ts`

---

## Pending

### 7. Discovery Mode Country Extraction is Fragile
**Problem:** In `signal-hunter.ts:166-167`, country extraction uses a narrow regex:
```typescript
const countryPatterns = /(?:in|from|by)\s+(\w+(?:\s+\w+)?)\s+(?:government|ministry|authority)/gi;
```
This misses common patterns like:
- "Singapore's Enterprise Board"
- "the Danish government"
- "South Korea announced"
- Any country mentioned without "government/ministry/authority" following

**Impact:** Discovery mode may fail to attribute policies to correct countries or miss them entirely.

**Proposed Fix:**
- Use a predefined list of country names to search for in content
- Have Perplexity explicitly list countries in structured output
- Modify the discovery system prompt to require "Country: X" format for each policy mentioned

**File:** `lib/pipeline/signal-hunter.ts` → `discoverGlobalPolicies()`

---

## Priority Order

1. **#5 Fragile Ireland Detection** - Core to product value; incorrect status = wrong opportunities
2. **#7 Discovery Country Extraction** - Only affects autonomous discovery mode
