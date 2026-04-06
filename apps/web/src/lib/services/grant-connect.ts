import { Opportunity, determineOpportunityStatus } from '../data';
import { APIClient, SearchParams } from './types';
import { apiLogger } from './logger';

/**
 * GrantConnect (grants.gov.au) Federal Grants Client
 *
 * GrantConnect is the Australian Government's official grants portal.
 * Website: https://www.grants.gov.au
 *
 * The portal exposes grant opportunity data through:
 * 1. JSON search endpoint (used by the site's search UI)
 * 2. Individual grant detail pages
 *
 * All grants are federal jurisdiction (Commonwealth of Australia).
 *
 * To request bulk API access: GrantConnect@Finance.gov.au
 */
export class GrantConnectClient implements APIClient {
  name = 'GrantConnect';
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = process.env.GRANTCONNECT_API_URL || 'https://www.grants.gov.au';
    this.apiKey = process.env.GRANTCONNECT_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const testUrl = `${this.baseUrl}/api/go/opportunities?status=open&limit=1`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      apiLogger.error(
        this.name,
        'Health check failed',
        error instanceof Error ? error : new Error(String(error)),
        this.baseUrl
      );
      return false;
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      // GrantConnect is for grants only
      if (params.opportunityType === 'tenders') return [];

      const opportunities: Opportunity[] = [];

      // Try the JSON API endpoint
      const apiResults = await this.fetchFromApi(params);
      if (apiResults.length > 0) {
        opportunities.push(...apiResults);
        return opportunities;
      }

      // Try the public search endpoint as fallback
      const searchResults = await this.fetchFromSearch(params);
      opportunities.push(...searchResults);

      return opportunities;
    } catch (error) {
      apiLogger.error(
        this.name,
        'Failed to fetch opportunities',
        error instanceof Error ? error : new Error(String(error)),
        this.baseUrl
      );
      return [];
    }
  }

  private async fetchFromApi(params: SearchParams): Promise<Opportunity[]> {
    try {
      const queryParams = new URLSearchParams({
        status: 'open',
        limit: '100',
        sortField: 'closing_date',
        sortOrder: 'asc',
      });

      if (params.categories) {
        const grantCats = params.categories
          .filter((c) => !c.startsWith('tender-'))
          .map((c) => c.replace('grant-', ''));
        if (grantCats.length > 0) {
          queryParams.set('category', grantCats.join(','));
        }
      }

      if (params.minAmount) queryParams.set('value_min', params.minAmount.toString());
      if (params.maxAmount) queryParams.set('value_max', params.maxAmount.toString());

      const response = await fetch(
        `${this.baseUrl}/api/go/opportunities?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return this.transformApiResponse(data, params);
    } catch {
      return [];
    }
  }

  private async fetchFromSearch(params: SearchParams): Promise<Opportunity[]> {
    try {
      // Try GrantConnect's search endpoint
      const queryParams = new URLSearchParams({
        searchType: 'open',
        pageSize: '100',
      });

      const response = await fetch(
        `${this.baseUrl}/SearchGrant?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json, text/html',
            'User-Agent': 'AusGrant-Finder/1.0 (contact: admin@ausgrant.com.au)',
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) return [];

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        return this.transformSearchResponse(data, params);
      }

      // HTML response - attempt to extract structured data
      return [];
    } catch {
      return [];
    }
  }

  private transformApiResponse(data: any, params: SearchParams): Opportunity[] {
    const items = data?.opportunities || data?.results || data?.data || data?.items || [];
    if (!Array.isArray(items)) return [];

    const opportunities: Opportunity[] = [];

    for (const item of items) {
      const closeDate = this.parseDate(
        item.closing_date || item.closeDate || item.close_date || item.closingDate || ''
      );
      const openDate = this.parseDate(
        item.opening_date || item.openDate || item.open_date || item.openingDate || ''
      );

      if (closeDate) {
        const close = new Date(closeDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (close < yesterday) continue;
      }

      const amount = Number(item.grant_value || item.amount || item.value || item.funding || 0) || null;
      if (params.minAmount && amount !== null && amount < params.minAmount) continue;
      if (params.maxAmount && amount !== null && amount > params.maxAmount) continue;

      const title = item.title || item.opportunity_name || item.name || 'Federal Grant Opportunity';
      const id = item.id || item.opportunity_id || item.ref || Math.random().toString(36).substring(2, 10);

      const effectiveCloseDate = closeDate ||
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const status = determineOpportunityStatus(effectiveCloseDate);

      if (params.status && params.status !== 'all' && status !== params.status) continue;

      opportunities.push({
        id: `grantconnect-${id}`,
        title,
        type: 'grant',
        category: this.mapCategory(item.category || item.grant_category || ''),
        amount,
        minAmount: item.min_amount ? Number(item.min_amount) : undefined,
        maxAmount: item.max_amount ? Number(item.max_amount) : undefined,
        description: item.description || item.summary || item.overview ||
          `Federal government grant opportunity. Agency: ${item.agency || item.department || 'Commonwealth of Australia'}`,
        jurisdiction: 'federal',
        openDate: openDate || new Date().toISOString().split('T')[0],
        closeDate: effectiveCloseDate,
        url: item.url || item.link || `https://www.grants.gov.au/go/show?GOUUID=${id}`,
        status,
      });
    }

    return opportunities;
  }

  private transformSearchResponse(data: any, params: SearchParams): Opportunity[] {
    // Handle various search response formats
    return this.transformApiResponse(data, params);
  }

  private mapCategory(category: string): string {
    const c = category.toLowerCase();
    if (c.includes('community') || c.includes('social')) return 'community';
    if (c.includes('art') || c.includes('cultur') || c.includes('heritage')) return 'arts';
    if (c.includes('environment') || c.includes('sustainab') || c.includes('climate')) return 'environment';
    if (c.includes('health') || c.includes('wellbeing') || c.includes('medical')) return 'health';
    if (c.includes('education') || c.includes('research') || c.includes('training')) return 'education';
    if (c.includes('business') || c.includes('industry') || c.includes('innovation')) return 'business';
    if (c.includes('sport') || c.includes('recreation')) return 'sport';
    if (c.includes('infrastructure') || c.includes('construction')) return 'infrastructure';
    return 'community';
  }

  private parseDate(value: any): string {
    if (!value) return '';
    const s = String(value);
    if (s.includes('T')) return s.split('T')[0];
    if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch { /* ignore */ }
    return '';
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      Accept: 'application/json',
      'User-Agent': 'AusGrant-Finder/1.0',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['X-Api-Key'] = this.apiKey;
    }
    return headers;
  }
}
