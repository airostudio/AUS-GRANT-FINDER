/**
 * Base API Client with Resilient Fetching
 *
 * Provides a robust foundation for all API clients with:
 * - Automatic endpoint discovery and failover
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Response caching
 * - Health monitoring
 */

import { Opportunity } from '../data';
import { APIClient, SearchParams } from './types';
import { resilientFetch, fetchJSON, fetchWithFailover } from './resilient-fetcher';
import { discoverAPIEndpoint, generateEndpointCandidates } from './endpoint-discovery';
import { apiLogger } from './logger';

export interface BaseClientConfig {
  name: string;
  baseUrl: string;
  alternateUrls?: string[];
  apiKey?: string;
  defaultTimeout?: number;
  enableEndpointDiscovery?: boolean;
  enableCaching?: boolean;
  cacheTTL?: number;
}

export abstract class ResilientAPIClient implements APIClient {
  name: string;
  protected baseUrl: string;
  protected alternateUrls: string[];
  protected apiKey?: string;
  protected timeout: number;
  protected enableEndpointDiscovery: boolean;
  protected enableCaching: boolean;
  protected cacheTTL: number;

  // In-memory cache for responses
  private responseCache = new Map<string, { data: any; timestamp: number }>();

  constructor(config: BaseClientConfig) {
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.alternateUrls = config.alternateUrls || [];
    this.apiKey = config.apiKey;
    this.timeout = config.defaultTimeout || 15000;
    this.enableEndpointDiscovery = config.enableEndpointDiscovery ?? true;
    this.enableCaching = config.enableCaching ?? true;
    this.cacheTTL = config.cacheTTL || 15 * 60 * 1000; // 15 minutes default
  }

  /**
   * Check if API is available - must be implemented by subclasses
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Fetch opportunities - must be implemented by subclasses
   */
  abstract fetchOpportunities(params: SearchParams): Promise<Opportunity[]>;

  /**
   * Resilient HTTP fetch with automatic failover
   */
  protected async resilientGet<T = any>(
    path: string,
    options: {
      queryParams?: Record<string, string>;
      headers?: HeadersInit;
      timeout?: number;
      maxRetries?: number;
      useCache?: boolean;
    } = {}
  ): Promise<T> {
    const {
      queryParams = {},
      headers = {},
      timeout = this.timeout,
      maxRetries = 3,
      useCache = this.enableCaching,
    } = options;

    // Build query string
    const query = new URLSearchParams(queryParams).toString();
    const fullPath = query ? `${path}?${query}` : path;

    // Check cache
    if (useCache) {
      const cached = this.getFromCache(fullPath);
      if (cached !== null) {
        return cached as T;
      }
    }

    // Build URL candidates
    const urls = [
      `${this.baseUrl}${fullPath}`,
      ...this.alternateUrls.map((base) => `${base}${fullPath}`),
    ];

    try {
      // Try with failover
      const { response, workingUrl } = await fetchWithFailover(urls, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...this.getAuthHeaders(),
          ...headers,
        },
        timeout,
        maxRetries,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the response
      if (useCache) {
        this.setCache(fullPath, data);
      }

      // Update base URL if different URL worked
      if (workingUrl !== `${this.baseUrl}${fullPath}`) {
        const newBase = workingUrl.replace(fullPath, '');
        apiLogger.info(this.name, `Switched to working endpoint: ${newBase}`);
        this.baseUrl = newBase;
      }

      return data as T;
    } catch (error) {
      apiLogger.error(
        this.name,
        'Failed to fetch after trying all endpoints',
        error instanceof Error ? error : new Error(String(error)),
        urls.join(', ')
      );
      throw error;
    }
  }

  /**
   * Discover and use best endpoint automatically
   */
  protected async discoverAndFetch<T = any>(
    resourcePath: string,
    options: {
      queryParams?: Record<string, string>;
      headers?: HeadersInit;
      validateResponse?: (data: any) => boolean;
    } = {}
  ): Promise<T> {
    const { queryParams = {}, headers = {}, validateResponse } = options;

    try {
      // Try endpoint discovery if enabled
      if (this.enableEndpointDiscovery) {
        const workingUrl = await discoverAPIEndpoint(
          this.baseUrl,
          resourcePath,
          `${this.name}:${resourcePath}`,
          async (url) => {
            try {
              const testResponse = await resilientFetch(`${url}?limit=1`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                timeout: 5000,
                maxRetries: 1,
              });
              return testResponse.ok;
            } catch {
              return false;
            }
          }
        );

        // Update base URL to working endpoint base
        this.baseUrl = workingUrl.replace(resourcePath, '');
        apiLogger.info(this.name, `Discovered working endpoint: ${this.baseUrl}`);
      }
    } catch (error) {
      apiLogger.warn(
        this.name,
        'Endpoint discovery failed, using configured URL'
      );
    }

    // Fetch using resilient method
    return this.resilientGet<T>(resourcePath, {
      queryParams,
      headers,
    });
  }

  /**
   * Get authentication headers
   */
  protected getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['X-Api-Key'] = this.apiKey;
    }
    return headers;
  }

  /**
   * Parse date from various formats
   */
  protected parseDate(value: any): string {
    if (!value) return '';
    const s = String(value);

    // Already in YYYY-MM-DD format
    if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;

    // ISO format with time
    if (s.includes('T')) return s.split('T')[0];

    // Try to parse as date
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {
      // Ignore parse errors
    }

    return '';
  }

  /**
   * Extract text from HTML or rich text
   */
  protected extractText(value: any, maxLength: number = 500): string {
    if (!value) return '';

    let text = String(value);

    // Strip HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Truncate
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }

    return text;
  }

  /**
   * Validate opportunity data
   */
  protected validateOpportunity(opp: Partial<Opportunity>): opp is Opportunity {
    // Must have ID and title
    if (!opp.id || !opp.title) return false;

    // Must have type
    if (opp.type !== 'grant' && opp.type !== 'tender') return false;

    // Must have valid dates
    if (!opp.openDate || !opp.closeDate) return false;

    // Must have jurisdiction
    if (!opp.jurisdiction) return false;

    return true;
  }

  /**
   * Check if date is in the past
   */
  protected isExpired(dateStr: string): boolean {
    try {
      const date = new Date(dateStr);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return date < yesterday;
    } catch {
      return false;
    }
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    if (!this.enableCaching) return null;

    const cached = this.responseCache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.responseCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    if (!this.enableCaching) return;

    this.responseCache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Limit cache size (keep last 100 entries)
    if (this.responseCache.size > 100) {
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) this.responseCache.delete(firstKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.responseCache.size,
      keys: Array.from(this.responseCache.keys()),
    };
  }
}
