/**
 * Dynamic Endpoint Discovery
 *
 * Automatically discovers and validates API endpoints by:
 * - Trying common API path variations
 * - Testing different API versions
 * - Checking alternate domains (www vs non-www, http vs https)
 * - Caching working endpoints for future use
 */

import { resilientFetch, fetchWithFailover } from './resilient-fetcher';

export interface EndpointCandidate {
  url: string;
  priority: number; // Lower = higher priority
  description: string;
}

export interface DiscoveryResult {
  workingUrl: string;
  candidates: EndpointCandidate[];
  tested: number;
  cached: boolean;
}

// Cache working endpoints (in-memory, could be persisted to localStorage/KV)
const endpointCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate common API endpoint variations
 */
export function generateEndpointCandidates(
  baseUrl: string,
  resourcePath: string = ''
): EndpointCandidate[] {
  const candidates: EndpointCandidate[] = [];

  try {
    const parsed = new URL(baseUrl);
    const protocol = parsed.protocol.replace(':', '');
    const hostname = parsed.hostname;
    const basePath = parsed.pathname === '/' ? '' : parsed.pathname;

    // API version variations
    const apiVersions = ['', '/api', '/api/v1', '/api/v2', '/api/v3', '/v1', '/v2', '/v3'];

    // Common API path patterns
    const pathPatterns = [
      resourcePath,
      `/data${resourcePath}`,
      `/public${resourcePath}`,
      `/open${resourcePath}`,
      `/rest${resourcePath}`,
      `/json${resourcePath}`,
    ];

    // Domain variations
    const domainVariations = [
      hostname,
      hostname.startsWith('www.') ? hostname.substring(4) : `www.${hostname}`,
      hostname.replace('api.', ''),
      hostname.includes('api') ? hostname : `api.${hostname}`,
      hostname.replace('data.', ''),
      hostname.includes('data') ? hostname : `data.${hostname}`,
    ];

    // Protocol variations
    const protocols = [protocol, protocol === 'https' ? 'http' : 'https'];

    let priority = 0;

    // Generate all combinations
    for (const proto of protocols) {
      for (const domain of Array.from(new Set(domainVariations))) {
        for (const apiVersion of apiVersions) {
          for (const pathPattern of pathPatterns) {
            const url = `${proto}://${domain}${basePath}${apiVersion}${pathPattern}`;

            // Calculate priority (prefer original protocol, original domain, no api version)
            let p = priority++;
            if (proto === protocol) p -= 1000; // Prefer original protocol
            if (domain === hostname) p -= 500; // Prefer original domain
            if (apiVersion === '') p -= 100; // Prefer no API version prefix
            if (pathPattern === resourcePath) p -= 50; // Prefer direct path

            candidates.push({
              url,
              priority: p,
              description: `${proto}://${domain}${apiVersion}${pathPattern}`,
            });
          }
        }
      }
    }

    // Sort by priority (lower = better)
    candidates.sort((a, b) => a.priority - b.priority);

    // Remove duplicates
    const seen = new Set<string>();
    return candidates.filter((c) => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });
  } catch (error) {
    console.error('Failed to generate endpoint candidates:', error);
    return [{ url: baseUrl + resourcePath, priority: 0, description: 'Original' }];
  }
}

/**
 * Discover working endpoint from candidates
 */
export async function discoverEndpoint(
  cacheKey: string,
  candidates: EndpointCandidate[],
  validateFn?: (url: string) => Promise<boolean>
): Promise<DiscoveryResult> {
  // Check cache first
  const cached = endpointCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      workingUrl: cached.url,
      candidates,
      tested: 0,
      cached: true,
    };
  }

  // Test candidates in priority order
  let tested = 0;
  for (const candidate of candidates) {
    tested++;

    try {
      // Quick HEAD request to test endpoint
      const response = await resilientFetch(candidate.url, {
        method: 'HEAD',
        timeout: 5000,
        maxRetries: 1,
      });

      if (!response.ok) continue;

      // Additional validation if provided
      if (validateFn) {
        const isValid = await validateFn(candidate.url);
        if (!isValid) continue;
      }

      // Found working endpoint!
      endpointCache.set(cacheKey, {
        url: candidate.url,
        timestamp: Date.now(),
      });

      return {
        workingUrl: candidate.url,
        candidates,
        tested,
        cached: false,
      };
    } catch {
      // Continue to next candidate
      continue;
    }
  }

  // No working endpoint found
  throw new Error(
    `No working endpoint found for ${cacheKey} (tested ${tested} candidates)`
  );
}

/**
 * Discover API endpoint with automatic resource path detection
 */
export async function discoverAPIEndpoint(
  baseUrl: string,
  resourcePath: string,
  cacheKey: string = `${baseUrl}${resourcePath}`,
  validateFn?: (url: string) => Promise<boolean>
): Promise<string> {
  const candidates = generateEndpointCandidates(baseUrl, resourcePath);
  const result = await discoverEndpoint(cacheKey, candidates, validateFn);
  return result.workingUrl;
}

/**
 * Discover data portal endpoints (CKAN, Socrata, OpenDataSoft)
 */
export async function discoverDataPortalEndpoint(
  baseUrl: string,
  portalType: 'ckan' | 'socrata' | 'opendatasoft'
): Promise<string> {
  const cacheKey = `data-portal:${portalType}:${baseUrl}`;

  let candidates: EndpointCandidate[] = [];

  switch (portalType) {
    case 'ckan':
      // CKAN API endpoints
      candidates = [
        { url: `${baseUrl}/api/3/action/package_search`, priority: 0, description: 'CKAN API v3' },
        { url: `${baseUrl}/data/api/3/action/package_search`, priority: 1, description: 'CKAN API v3 (data prefix)' },
        { url: `${baseUrl}/api/action/package_search`, priority: 2, description: 'CKAN API (no version)' },
        { url: `${baseUrl}/api/2/search/package`, priority: 3, description: 'CKAN API v2' },
      ];
      break;

    case 'socrata':
      // Socrata (SODA API) endpoints
      candidates = [
        { url: `${baseUrl}/resource/`, priority: 0, description: 'Socrata SODA API' },
        { url: `${baseUrl}/api/views/`, priority: 1, description: 'Socrata API Views' },
        { url: `${baseUrl}/api/catalog/v1`, priority: 2, description: 'Socrata Catalog API' },
      ];
      break;

    case 'opendatasoft':
      // OpenDataSoft API endpoints
      candidates = [
        { url: `${baseUrl}/api/explore/v2.1/catalog/datasets`, priority: 0, description: 'ODS API v2.1' },
        { url: `${baseUrl}/api/v2/catalog/datasets`, priority: 1, description: 'ODS API v2' },
        { url: `${baseUrl}/api/records/1.0/search/`, priority: 2, description: 'ODS API v1' },
      ];
      break;
  }

  const result = await discoverEndpoint(
    cacheKey,
    candidates,
    async (url) => {
      // Validate by checking response is JSON and has expected structure
      try {
        const response = await resilientFetch(`${url}?limit=1`, {
          timeout: 5000,
          maxRetries: 1,
        });
        if (!response.ok) return false;

        const contentType = response.headers.get('content-type') || '';
        return contentType.includes('application/json');
      } catch {
        return false;
      }
    }
  );

  return result.workingUrl;
}

/**
 * Try common government API patterns
 */
export async function discoverGovernmentAPIEndpoint(
  domain: string,
  resource: 'grants' | 'tenders' | 'opportunities'
): Promise<string> {
  const cacheKey = `gov-api:${resource}:${domain}`;

  // Common patterns for Australian government APIs
  const patterns = [
    // Modern API patterns
    `/api/${resource}`,
    `/api/v1/${resource}`,
    `/api/v2/${resource}`,
    `/api/public/${resource}`,
    `/${resource}/api`,
    `/${resource}`,

    // Legacy patterns
    `/search/${resource}`,
    `/data/${resource}`,
    `/open-data/${resource}`,

    // JSON endpoints
    `/${resource}.json`,
    `/api/${resource}.json`,
  ];

  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const candidates = patterns.map((path, i) => ({
    url: `${baseUrl}${path}`,
    priority: i,
    description: path,
  }));

  const result = await discoverEndpoint(cacheKey, candidates);
  return result.workingUrl;
}

/**
 * Clear endpoint cache
 */
export function clearEndpointCache(): void {
  endpointCache.clear();
}

/**
 * Get cached endpoints
 */
export function getCachedEndpoints(): Array<{ key: string; url: string; age: number }> {
  const now = Date.now();
  return Array.from(endpointCache.entries()).map(([key, value]) => ({
    key,
    url: value.url,
    age: now - value.timestamp,
  }));
}

/**
 * Preload and cache common endpoints
 */
export async function preloadCommonEndpoints(): Promise<void> {
  const commonEndpoints = [
    {
      key: 'austender',
      baseUrl: 'https://api.tenders.gov.au',
      path: '/ocds/findByDates',
    },
    {
      key: 'grantconnect',
      baseUrl: 'https://www.grants.gov.au',
      path: '/api/go/opportunities',
    },
    {
      key: 'data-nsw',
      baseUrl: 'https://data.nsw.gov.au',
      path: '/data/api/3/action/package_search',
    },
    {
      key: 'data-qld',
      baseUrl: 'https://www.data.qld.gov.au',
      path: '/api/3/action/package_search',
    },
  ];

  await Promise.allSettled(
    commonEndpoints.map(async ({ key, baseUrl, path }) => {
      try {
        await discoverAPIEndpoint(baseUrl, path, key);
      } catch {
        // Ignore failures during preload
      }
    })
  );
}
