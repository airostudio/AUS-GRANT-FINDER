import { Opportunity, determineOpportunityStatus } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * NSW Government Grants Client
 *
 * Data sources:
 * 1. NSW Open Data Portal (CKAN): https://data.nsw.gov.au/data/api/3/action/
 * 2. NSW Grants & Funding Finder: https://www.nsw.gov.au/grants-and-funding
 * 3. Service NSW Grants API
 *
 * NSW CKAN API docs: https://docs.ckan.org/en/latest/api/
 * Dataset search: https://data.nsw.gov.au/data/api/3/action/package_search?q=grants&fq=res_format:JSON
 */
export class NSWGrantsClient implements APIClient {
  name = 'NSW Grants';
  private ckanUrl: string;
  private grantsFinderUrl: string;
  private apiKey?: string;

  constructor() {
    this.ckanUrl = process.env.DATA_NSW_API_URL || 'https://data.nsw.gov.au/data/api/3';
    this.grantsFinderUrl = 'https://www.nsw.gov.au/api/grants';
    this.apiKey = process.env.NSW_OPENGOV_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ckanUrl}/action/site_read`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      // NSW only
      if (params.state && params.state !== 'nsw') return [];
      if (params.scope === 'australia') return [];

      const opportunities: Opportunity[] = [];

      const [grantsFinderResults, ckanResults] = await Promise.allSettled([
        this.fetchFromGrantsFinder(params),
        this.fetchFromCkan(params),
      ]);

      if (grantsFinderResults.status === 'fulfilled') {
        opportunities.push(...grantsFinderResults.value);
      }
      if (ckanResults.status === 'fulfilled') {
        opportunities.push(...ckanResults.value);
      }

      return opportunities;
    } catch (error) {
      console.error(`${this.name} fetch error:`, error);
      return [];
    }
  }

  private async fetchFromGrantsFinder(params: SearchParams): Promise<Opportunity[]> {
    try {
      const queryParams = new URLSearchParams({
        status: 'open',
        limit: '100',
      });

      if (params.opportunityType && params.opportunityType !== 'both') {
        queryParams.set('type', params.opportunityType);
      }

      const response = await fetch(
        `${this.grantsFinderUrl}?${queryParams.toString()}`,
        {
          headers: {
            Accept: 'application/json',
            ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return this.transformGrantsResponse(data, params);
    } catch {
      return [];
    }
  }

  private async fetchFromCkan(params: SearchParams): Promise<Opportunity[]> {
    try {
      if (params.opportunityType === 'tenders') return [];

      const queryParams = new URLSearchParams({
        q: 'grants funding opportunities',
        fq: 'res_format:JSON',
        rows: '20',
        sort: 'metadata_modified desc',
      });

      const response = await fetch(
        `${this.ckanUrl}/action/package_search?${queryParams.toString()}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return this.transformCkanResponse(data, params);
    } catch {
      return [];
    }
  }

  private transformGrantsResponse(data: any, params: SearchParams): Opportunity[] {
    const items = data?.grants || data?.opportunities || data?.results || data?.data || [];
    if (!Array.isArray(items)) return [];

    const opportunities: Opportunity[] = [];

    for (const item of items) {
      const closeDate = this.parseDate(item.closing_date || item.close_date || item.endDate || '');
      const openDate = this.parseDate(item.opening_date || item.open_date || item.startDate || '');

      if (closeDate) {
        const close = new Date(closeDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (close < yesterday) continue;
      }

      const amount = Number(item.amount || item.funding || item.grant_value || item.value || 0) || null;
      if (params.minAmount && amount !== null && amount < params.minAmount) continue;
      if (params.maxAmount && amount !== null && amount > params.maxAmount) continue;

      const title = item.title || item.name || item.grant_name || 'NSW Government Grant';
      const id = item.id || item.ref || Math.random().toString(36).substring(2, 10);

      const effectiveCloseDate = closeDate ||
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const status = determineOpportunityStatus(effectiveCloseDate);

      if (params.status && params.status !== 'all' && status !== params.status) continue;

      opportunities.push({
        id: `nsw-${id}`,
        title,
        type: 'grant',
        category: this.mapCategory(item.category || item.topic || ''),
        amount,
        description: item.description || item.summary ||
          `NSW Government grant opportunity. Department: ${item.agency || item.department || 'NSW Government'}`,
        jurisdiction: 'state',
        state: 'nsw',
        openDate: openDate || new Date().toISOString().split('T')[0],
        closeDate: effectiveCloseDate,
        url: item.url || item.link || 'https://www.nsw.gov.au/grants-and-funding',
        status,
      });
    }

    return opportunities;
  }

  private transformCkanResponse(data: any, params: SearchParams): Opportunity[] {
    if (!data?.result?.results || !Array.isArray(data.result.results)) return [];

    const opportunities: Opportunity[] = [];

    for (const pkg of data.result.results) {
      // Only include packages that look like active grant opportunities
      const title = (pkg.title || '').toLowerCase();
      if (!title.includes('grant') && !title.includes('funding') && !title.includes('opportunit')) {
        continue;
      }

      const modifiedDate = pkg.metadata_modified ? pkg.metadata_modified.split('T')[0] : '';
      const closeDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      opportunities.push({
        id: `nsw-ckan-${pkg.id || pkg.name}`,
        title: pkg.title || 'NSW Government Grant Dataset',
        type: 'grant',
        category: this.mapCategory(pkg.topic || pkg.groups?.map((g: any) => g.name).join(' ') || ''),
        amount: null,
        description: pkg.notes || `NSW Government data resource. Updated: ${modifiedDate}. Visit data.nsw.gov.au for full details.`,
        jurisdiction: 'state',
        state: 'nsw',
        openDate: modifiedDate || new Date().toISOString().split('T')[0],
        closeDate,
        url: pkg.url || `https://data.nsw.gov.au/data/dataset/${pkg.name || pkg.id}`,
        status: 'open',
      });

      if (opportunities.length >= 10) break; // Limit CKAN results
    }

    return opportunities;
  }

  private mapCategory(value: string): string {
    const v = value.toLowerCase();
    if (v.includes('community') || v.includes('social')) return 'community';
    if (v.includes('business') || v.includes('industry') || v.includes('innovation')) return 'business';
    if (v.includes('environment') || v.includes('sustainab')) return 'environment';
    if (v.includes('health') || v.includes('wellbeing')) return 'health';
    if (v.includes('education') || v.includes('research')) return 'education';
    if (v.includes('art') || v.includes('cultur')) return 'arts';
    if (v.includes('sport') || v.includes('recreation')) return 'sport';
    if (v.includes('infrastructure') || v.includes('transport')) return 'infrastructure';
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
}
