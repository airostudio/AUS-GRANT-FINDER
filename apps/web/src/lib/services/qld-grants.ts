import { Opportunity, determineOpportunityStatus } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * Queensland Government Grants & Tenders Client
 *
 * Data sources:
 * 1. QLD Open Data Portal (CKAN): https://www.data.qld.gov.au/api/3/action/
 * 2. QLD Grants & Funding: https://www.qld.gov.au/about/how-government-works/grants
 * 3. QTenders (Queensland tenders): https://qtenders.epw.qld.gov.au/
 * 4. QLD Business & Industry Portal grants API
 */
export class QLDGrantsClient implements APIClient {
  name = 'QLD Grants';
  private ckanUrl: string;
  private grantsUrl: string;
  private qtendersUrl: string;
  private apiKey?: string;

  constructor() {
    this.ckanUrl = process.env.DATA_QLD_API_URL || 'https://www.data.qld.gov.au/api/3';
    this.grantsUrl = 'https://www.business.qld.gov.au/api/grants';
    this.qtendersUrl = 'https://qtenders.epw.qld.gov.au/qtenders/api';
    this.apiKey = process.env.QLD_API_KEY;
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
      if (params.state && params.state !== 'qld') return [];
      if (params.scope === 'australia') return [];

      const opportunities: Opportunity[] = [];

      const [grantsResults, tendersResults, ckanResults] = await Promise.allSettled([
        params.opportunityType !== 'tenders' ? this.fetchGrants(params) : Promise.resolve([]),
        params.opportunityType !== 'grants' ? this.fetchTenders(params) : Promise.resolve([]),
        this.fetchFromCkan(params),
      ]);

      if (grantsResults.status === 'fulfilled') opportunities.push(...grantsResults.value);
      if (tendersResults.status === 'fulfilled') opportunities.push(...tendersResults.value);
      if (ckanResults.status === 'fulfilled') opportunities.push(...ckanResults.value);

      return opportunities;
    } catch (error) {
      console.error(`${this.name} fetch error:`, error);
      return [];
    }
  }

  private async fetchGrants(params: SearchParams): Promise<Opportunity[]> {
    try {
      const queryParams = new URLSearchParams({ status: 'open', limit: '100' });
      const response = await fetch(`${this.grantsUrl}?${queryParams}`, {
        headers: {
          Accept: 'application/json',
          ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return this.transformResponse(data, 'grant', params);
    } catch {
      return [];
    }
  }

  private async fetchTenders(params: SearchParams): Promise<Opportunity[]> {
    try {
      const queryParams = new URLSearchParams({ status: 'open', limit: '100' });
      const response = await fetch(`${this.qtendersUrl}/opportunities?${queryParams}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return this.transformResponse(data, 'tender', params);
    } catch {
      return [];
    }
  }

  private async fetchFromCkan(params: SearchParams): Promise<Opportunity[]> {
    try {
      if (params.opportunityType === 'tenders') return [];
      const queryParams = new URLSearchParams({
        q: 'grants funding',
        fq: 'res_format:JSON',
        rows: '20',
        sort: 'metadata_modified desc',
      });
      const response = await fetch(`${this.ckanUrl}/action/package_search?${queryParams}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return this.transformCkanResponse(data, params);
    } catch {
      return [];
    }
  }

  private transformResponse(data: any, type: 'grant' | 'tender', params: SearchParams): Opportunity[] {
    const items = data?.grants || data?.tenders || data?.opportunities || data?.results || data?.data || [];
    if (!Array.isArray(items)) return [];

    const opportunities: Opportunity[] = [];
    for (const item of items) {
      const closeDate = this.parseDate(item.closing_date || item.close_date || item.closingDate || '');
      const openDate = this.parseDate(item.opening_date || item.open_date || item.openingDate || '');

      if (closeDate) {
        const close = new Date(closeDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (close < yesterday) continue;
      }

      const amount = Number(item.amount || item.value || item.grant_value || item.estimated_value || 0) || null;
      if (params.minAmount && amount !== null && amount < params.minAmount) continue;
      if (params.maxAmount && amount !== null && amount > params.maxAmount) continue;

      const title = item.title || item.name || `QLD Government ${type === 'grant' ? 'Grant' : 'Tender'}`;
      const id = item.id || item.ref || Math.random().toString(36).substring(2, 10);
      const effectiveCloseDate = closeDate ||
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const status = determineOpportunityStatus(effectiveCloseDate);

      if (params.status && params.status !== 'all' && status !== params.status) continue;

      opportunities.push({
        id: `qld-${id}`,
        title,
        type,
        category: this.mapCategory(item.category || item.topic || '', type),
        amount,
        description: item.description || item.summary ||
          `Queensland Government ${type}. Agency: ${item.agency || item.department || 'Queensland Government'}`,
        jurisdiction: 'state',
        state: 'qld',
        openDate: openDate || new Date().toISOString().split('T')[0],
        closeDate: effectiveCloseDate,
        url: item.url || item.link ||
          (type === 'grant' ? 'https://www.qld.gov.au/about/how-government-works/grants' : 'https://qtenders.epw.qld.gov.au/'),
        status,
      });
    }

    return opportunities;
  }

  private transformCkanResponse(data: any, params: SearchParams): Opportunity[] {
    if (!data?.result?.results || !Array.isArray(data.result.results)) return [];
    const opportunities: Opportunity[] = [];

    for (const pkg of data.result.results) {
      const title = (pkg.title || '').toLowerCase();
      if (!title.includes('grant') && !title.includes('funding')) continue;

      const closeDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const modifiedDate = pkg.metadata_modified ? pkg.metadata_modified.split('T')[0] : '';

      opportunities.push({
        id: `qld-ckan-${pkg.id || pkg.name}`,
        title: pkg.title || 'QLD Government Grant Dataset',
        type: 'grant',
        category: this.mapCategory(pkg.topic || '', 'grant'),
        amount: null,
        description: pkg.notes || `Queensland Government data resource. Updated: ${modifiedDate}.`,
        jurisdiction: 'state',
        state: 'qld',
        openDate: modifiedDate || new Date().toISOString().split('T')[0],
        closeDate,
        url: `https://www.data.qld.gov.au/dataset/${pkg.name || pkg.id}`,
        status: 'open',
      });

      if (opportunities.length >= 10) break;
    }

    return opportunities;
  }

  private mapCategory(value: string, type: 'grant' | 'tender'): string {
    const v = value.toLowerCase();
    if (v.includes('community') || v.includes('social')) return 'community';
    if (v.includes('business') || v.includes('industry') || v.includes('innovation')) return 'business';
    if (v.includes('environment') || v.includes('sustainab')) return 'environment';
    if (v.includes('health') || v.includes('wellbeing')) return 'health';
    if (v.includes('education') || v.includes('research')) return 'education';
    if (v.includes('art') || v.includes('cultur')) return 'arts';
    if (v.includes('sport') || v.includes('recreation')) return 'sport';
    if (type === 'tender') {
      if (v.includes('construction') || v.includes('building')) return 'construction';
      if (v.includes('it') || v.includes('digital') || v.includes('technology')) return 'it';
      if (v.includes('consult')) return 'consulting';
    }
    return type === 'tender' ? 'services' : 'community';
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
