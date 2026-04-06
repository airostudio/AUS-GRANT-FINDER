import { Opportunity, determineOpportunityStatus } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * Tasmania Government Grants & Tenders Client
 *
 * Data sources:
 * 1. Tenderlink (Tas Tenders): https://www.tenders.tas.gov.au/
 * 2. Grants.tas.gov.au: https://www.grants.tas.gov.au/
 * 3. data.gov.au (national CKAN) filtered to TAS: https://data.gov.au/api/3/action/
 * 4. Arts Tasmania grants: https://www.arts.tas.gov.au/funding
 * 5. Tasmanian Community Fund: https://www.tcf.tas.gov.au/
 */
export class TASGrantsClient implements APIClient {
  name = 'TAS Grants';
  private grantsUrl: string;
  private tendersUrl: string;
  private nationalCkanUrl: string;

  constructor() {
    this.grantsUrl = 'https://www.grants.tas.gov.au/api';
    this.tendersUrl = 'https://www.tenders.tas.gov.au/api';
    this.nationalCkanUrl = 'https://data.gov.au/api/3';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.nationalCkanUrl}/action/site_read`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      if (params.state && params.state !== 'tas') return [];
      if (params.scope === 'australia') return [];

      const results: Opportunity[] = [];

      const [grantsRes, tendersRes, nationalRes] = await Promise.allSettled([
        params.opportunityType !== 'tenders' ? this.fetchGrants(params) : Promise.resolve([]),
        params.opportunityType !== 'grants' ? this.fetchTenders(params) : Promise.resolve([]),
        this.fetchFromNationalCkan(params),
      ]);

      if (grantsRes.status === 'fulfilled') results.push(...grantsRes.value);
      if (tendersRes.status === 'fulfilled') results.push(...tendersRes.value);
      if (nationalRes.status === 'fulfilled') results.push(...nationalRes.value);

      return results;
    } catch (error) {
      console.error(`${this.name} fetch error:`, error);
      return [];
    }
  }

  private async fetchGrants(params: SearchParams): Promise<Opportunity[]> {
    try {
      const response = await fetch(`${this.grantsUrl}/open?limit=100`, {
        headers: { Accept: 'application/json' },
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
      const response = await fetch(`${this.tendersUrl}/open?limit=100`, {
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

  private async fetchFromNationalCkan(params: SearchParams): Promise<Opportunity[]> {
    try {
      if (params.opportunityType === 'tenders') return [];
      const queryParams = new URLSearchParams({
        q: 'grants tasmania',
        fq: 'jurisdiction:tasmania',
        rows: '15',
        sort: 'metadata_modified desc',
      });
      const response = await fetch(`${this.nationalCkanUrl}/action/package_search?${queryParams}`, {
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
    const items = data?.grants || data?.tenders || data?.results || data?.data || data?.opportunities || [];
    if (!Array.isArray(items)) return [];

    const opportunities: Opportunity[] = [];

    for (const item of items) {
      const closeDate = this.parseDate(item.closing_date || item.close_date || '');
      const openDate = this.parseDate(item.opening_date || item.open_date || '');

      if (closeDate) {
        const close = new Date(closeDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (close < yesterday) continue;
      }

      const amount = Number(item.value || item.amount || item.funding || 0) || null;
      if (params.minAmount && amount !== null && amount < params.minAmount) continue;
      if (params.maxAmount && amount !== null && amount > params.maxAmount) continue;

      const title = item.title || item.name || `TAS Government ${type === 'grant' ? 'Grant' : 'Tender'}`;
      const id = item.id || item.ref || Math.random().toString(36).substring(2, 10);
      const effectiveCloseDate = closeDate ||
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const status = determineOpportunityStatus(effectiveCloseDate);

      if (params.status && params.status !== 'all' && status !== params.status) continue;

      opportunities.push({
        id: `tas-${id}`,
        title,
        type,
        category: this.mapCategory(title, type),
        amount,
        description: item.description || item.summary ||
          `Tasmanian Government ${type}. Agency: ${item.agency || 'Tasmanian Government'}`,
        jurisdiction: 'state',
        state: 'tas',
        openDate: openDate || new Date().toISOString().split('T')[0],
        closeDate: effectiveCloseDate,
        url: item.url || (type === 'grant' ? 'https://www.grants.tas.gov.au/' : 'https://www.tenders.tas.gov.au/'),
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
      if (!title.includes('grant') && !title.includes('fund')) continue;

      const closeDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const modifiedDate = pkg.metadata_modified ? pkg.metadata_modified.split('T')[0] : '';

      opportunities.push({
        id: `tas-ckan-${pkg.id || pkg.name}`,
        title: pkg.title || 'Tasmania Government Grant',
        type: 'grant',
        category: 'community',
        amount: null,
        description: pkg.notes || `Tasmanian Government data resource. Updated: ${modifiedDate}.`,
        jurisdiction: 'state',
        state: 'tas',
        openDate: modifiedDate || new Date().toISOString().split('T')[0],
        closeDate,
        url: `https://data.gov.au/dataset/${pkg.name || pkg.id}`,
        status: 'open',
      });

      if (opportunities.length >= 8) break;
    }

    return opportunities;
  }

  private mapCategory(title: string, type: 'grant' | 'tender'): string {
    const t = title.toLowerCase();
    if (t.includes('art') || t.includes('cultur') || t.includes('heritage')) return 'arts';
    if (t.includes('community') || t.includes('social')) return 'community';
    if (t.includes('environment') || t.includes('sustainab')) return 'environment';
    if (t.includes('health')) return 'health';
    if (t.includes('sport') || t.includes('recreation')) return 'sport';
    if (type === 'tender') {
      if (t.includes('construction') || t.includes('building')) return 'construction';
      if (t.includes('it') || t.includes('digital') || t.includes('ict')) return 'it';
      if (t.includes('consult')) return 'consulting';
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
