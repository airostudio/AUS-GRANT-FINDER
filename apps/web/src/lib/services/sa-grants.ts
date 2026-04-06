import { Opportunity, determineOpportunityStatus } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * South Australia Government Grants & Tenders Client
 *
 * Data sources:
 * 1. SA Data Directory (CKAN): https://data.sa.gov.au/data/api/3/action/
 * 2. SA Grants & Subsidies: https://www.sa.gov.au/topics/business-and-trade/grants
 * 3. SA Tenders & Contracts: https://www.tenders.sa.gov.au/
 * 4. SA Office for Recreation, Sport and Racing grants
 * 5. Arts SA grants: https://www.arts.sa.gov.au/funding/grants/
 */
export class SAGrantsClient implements APIClient {
  name = 'SA Grants';
  private ckanUrl: string;
  private tendersUrl: string;

  constructor() {
    this.ckanUrl = 'https://data.sa.gov.au/data/api/3';
    this.tendersUrl = 'https://www.tenders.sa.gov.au/api';
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
      if (params.state && params.state !== 'sa') return [];
      if (params.scope === 'australia') return [];

      const results: Opportunity[] = [];

      const [tendersRes, ckanRes] = await Promise.allSettled([
        params.opportunityType !== 'grants' ? this.fetchTenders(params) : Promise.resolve([]),
        this.fetchFromCkan(params),
      ]);

      if (tendersRes.status === 'fulfilled') results.push(...tendersRes.value);
      if (ckanRes.status === 'fulfilled') results.push(...ckanRes.value);

      return results;
    } catch (error) {
      console.error(`${this.name} fetch error:`, error);
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
      return this.transformTenders(data, params);
    } catch {
      return [];
    }
  }

  private async fetchFromCkan(params: SearchParams): Promise<Opportunity[]> {
    try {
      const queryParams = new URLSearchParams({
        q: 'grants funding',
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

  private transformTenders(data: any, params: SearchParams): Opportunity[] {
    const items = data?.tenders || data?.results || data?.data || [];
    if (!Array.isArray(items)) return [];

    const opportunities: Opportunity[] = [];

    for (const item of items) {
      const closeDate = this.parseDate(item.closing_date || item.close_date || '');
      const openDate = this.parseDate(item.opening_date || item.open_date || item.published || '');

      if (closeDate) {
        const close = new Date(closeDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (close < yesterday) continue;
      }

      const amount = Number(item.value || item.estimated_value || item.amount || 0) || null;
      if (params.minAmount && amount !== null && amount < params.minAmount) continue;
      if (params.maxAmount && amount !== null && amount > params.maxAmount) continue;

      const title = item.title || item.description || 'SA Government Tender';
      const id = item.id || item.ref || item.tender_id || Math.random().toString(36).substring(2, 10);
      const effectiveCloseDate = closeDate ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const status = determineOpportunityStatus(effectiveCloseDate);

      if (params.status && params.status !== 'all' && status !== params.status) continue;

      opportunities.push({
        id: `sa-tender-${id}`,
        title,
        type: 'tender',
        category: this.mapTenderCategory(title),
        amount,
        description: item.description || `SA Government tender opportunity. Agency: ${item.agency || 'SA Government'}`,
        jurisdiction: 'state',
        state: 'sa',
        openDate: openDate || new Date().toISOString().split('T')[0],
        closeDate: effectiveCloseDate,
        url: item.url || `https://www.tenders.sa.gov.au/`,
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
      if (params.opportunityType === 'tenders') continue;

      const closeDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const modifiedDate = pkg.metadata_modified ? pkg.metadata_modified.split('T')[0] : '';

      opportunities.push({
        id: `sa-ckan-${pkg.id || pkg.name}`,
        title: pkg.title || 'SA Government Grant',
        type: 'grant',
        category: 'community',
        amount: null,
        description: pkg.notes || `South Australian Government data resource. Updated: ${modifiedDate}.`,
        jurisdiction: 'state',
        state: 'sa',
        openDate: modifiedDate || new Date().toISOString().split('T')[0],
        closeDate,
        url: `https://data.sa.gov.au/data/dataset/${pkg.name || pkg.id}`,
        status: 'open',
      });

      if (opportunities.length >= 8) break;
    }

    return opportunities;
  }

  private mapTenderCategory(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('construction') || t.includes('building') || t.includes('civil')) return 'construction';
    if (t.includes('it') || t.includes('digital') || t.includes('software') || t.includes('ict')) return 'it';
    if (t.includes('consult') || t.includes('advisory') || t.includes('professional')) return 'consulting';
    if (t.includes('maintenance') || t.includes('repair') || t.includes('operation')) return 'maintenance';
    if (t.includes('supply') || t.includes('goods') || t.includes('equipment')) return 'goods';
    return 'services';
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
