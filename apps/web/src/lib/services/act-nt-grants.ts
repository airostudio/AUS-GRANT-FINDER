import { Opportunity, determineOpportunityStatus } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * ACT & NT Government Grants & Tenders Client
 *
 * ACT Data sources:
 * 1. ACT Tenders: https://www.act.gov.au/tenders-and-procurement
 * 2. ACT Grants: https://www.act.gov.au/funding-and-grants
 * 3. data.act.gov.au: https://www.data.act.gov.au/api/3/action/
 *
 * NT Data sources:
 * 1. NT Tenders: https://tenders.nt.gov.au/
 * 2. NT Grants: https://nt.gov.au/community/grants-and-funding
 * 3. data.nt.gov.au: https://data.nt.gov.au/api/3/action/
 */
export class ACTNTGrantsClient implements APIClient {
  name = 'ACT & NT Grants';
  private actCkanUrl: string;
  private ntCkanUrl: string;
  private actGrantsUrl: string;
  private ntGrantsUrl: string;

  constructor() {
    this.actCkanUrl = 'https://www.data.act.gov.au/api/3';
    this.ntCkanUrl = 'https://data.nt.gov.au/api/3';
    this.actGrantsUrl = 'https://www.act.gov.au/api/grants';
    this.ntGrantsUrl = 'https://nt.gov.au/api/grants';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.actCkanUrl}/action/site_read`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      const isACT = !params.state || params.state === 'act';
      const isNT = !params.state || params.state === 'nt';

      if (params.scope === 'australia') return [];
      if (!isACT && !isNT) return [];

      const results: Opportunity[] = [];

      const fetchTasks: Promise<Opportunity[]>[] = [];

      if (isACT) {
        fetchTasks.push(this.fetchACT(params));
      }
      if (isNT) {
        fetchTasks.push(this.fetchNT(params));
      }

      const settled = await Promise.allSettled(fetchTasks);
      for (const res of settled) {
        if (res.status === 'fulfilled') results.push(...res.value);
      }

      return results;
    } catch (error) {
      console.error(`${this.name} fetch error:`, error);
      return [];
    }
  }

  private async fetchACT(params: SearchParams): Promise<Opportunity[]> {
    try {
      const [grantsRes, ckanRes] = await Promise.allSettled([
        params.opportunityType !== 'tenders' ? this.fetchACTGrants(params) : Promise.resolve([]),
        this.fetchFromCkan(this.actCkanUrl, 'act', params),
      ]);

      const results: Opportunity[] = [];
      if (grantsRes.status === 'fulfilled') results.push(...grantsRes.value);
      if (ckanRes.status === 'fulfilled') results.push(...ckanRes.value);
      return results;
    } catch {
      return [];
    }
  }

  private async fetchNT(params: SearchParams): Promise<Opportunity[]> {
    try {
      const [grantsRes, ckanRes] = await Promise.allSettled([
        params.opportunityType !== 'tenders' ? this.fetchNTGrants(params) : Promise.resolve([]),
        this.fetchFromCkan(this.ntCkanUrl, 'nt', params),
      ]);

      const results: Opportunity[] = [];
      if (grantsRes.status === 'fulfilled') results.push(...grantsRes.value);
      if (ckanRes.status === 'fulfilled') results.push(...ckanRes.value);
      return results;
    } catch {
      return [];
    }
  }

  private async fetchACTGrants(params: SearchParams): Promise<Opportunity[]> {
    try {
      const response = await fetch(`${this.actGrantsUrl}?status=open&limit=50`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return this.transformResponse(data, 'act', params);
    } catch {
      return [];
    }
  }

  private async fetchNTGrants(params: SearchParams): Promise<Opportunity[]> {
    try {
      const response = await fetch(`${this.ntGrantsUrl}?status=open&limit=50`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return this.transformResponse(data, 'nt', params);
    } catch {
      return [];
    }
  }

  private async fetchFromCkan(ckanUrl: string, state: 'act' | 'nt', params: SearchParams): Promise<Opportunity[]> {
    try {
      if (params.opportunityType === 'tenders') return [];
      const queryParams = new URLSearchParams({
        q: 'grants funding',
        rows: '15',
        sort: 'metadata_modified desc',
      });
      const response = await fetch(`${ckanUrl}/action/package_search?${queryParams}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return this.transformCkanResponse(data, state, params);
    } catch {
      return [];
    }
  }

  private transformResponse(data: any, state: 'act' | 'nt', params: SearchParams): Opportunity[] {
    const items = data?.grants || data?.opportunities || data?.results || data?.data || [];
    if (!Array.isArray(items)) return [];

    const stateName = state === 'act' ? 'ACT' : 'Northern Territory';
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

      const amount = Number(item.amount || item.value || item.funding || 0) || null;
      if (params.minAmount && amount !== null && amount < params.minAmount) continue;
      if (params.maxAmount && amount !== null && amount > params.maxAmount) continue;

      const title = item.title || item.name || `${stateName} Government Grant`;
      const id = item.id || item.ref || Math.random().toString(36).substring(2, 10);
      const effectiveCloseDate = closeDate ||
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const status = determineOpportunityStatus(effectiveCloseDate);

      if (params.status && params.status !== 'all' && status !== params.status) continue;

      opportunities.push({
        id: `${state}-${id}`,
        title,
        type: 'grant',
        category: this.mapCategory(item.category || item.topic || ''),
        amount,
        description: item.description || item.summary ||
          `${stateName} Government grant. Agency: ${item.agency || `${stateName} Government`}`,
        jurisdiction: 'state',
        state,
        openDate: openDate || new Date().toISOString().split('T')[0],
        closeDate: effectiveCloseDate,
        url: item.url || (state === 'act' ? 'https://www.act.gov.au/funding-and-grants' : 'https://nt.gov.au/community/grants-and-funding'),
        status,
      });
    }

    return opportunities;
  }

  private transformCkanResponse(data: any, state: 'act' | 'nt', params: SearchParams): Opportunity[] {
    if (!data?.result?.results || !Array.isArray(data.result.results)) return [];
    const opportunities: Opportunity[] = [];

    for (const pkg of data.result.results) {
      const title = (pkg.title || '').toLowerCase();
      if (!title.includes('grant') && !title.includes('fund')) continue;

      const closeDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const modifiedDate = pkg.metadata_modified ? pkg.metadata_modified.split('T')[0] : '';
      const ckanDomain = state === 'act' ? 'www.data.act.gov.au' : 'data.nt.gov.au';

      opportunities.push({
        id: `${state}-ckan-${pkg.id || pkg.name}`,
        title: pkg.title || `${state.toUpperCase()} Government Grant`,
        type: 'grant',
        category: 'community',
        amount: null,
        description: pkg.notes || `${state.toUpperCase()} Government data resource. Updated: ${modifiedDate}.`,
        jurisdiction: 'state',
        state,
        openDate: modifiedDate || new Date().toISOString().split('T')[0],
        closeDate,
        url: `https://${ckanDomain}/dataset/${pkg.name || pkg.id}`,
        status: 'open',
      });

      if (opportunities.length >= 6) break;
    }

    return opportunities;
  }

  private mapCategory(value: string): string {
    const v = value.toLowerCase();
    if (v.includes('community') || v.includes('social')) return 'community';
    if (v.includes('business') || v.includes('innovation')) return 'business';
    if (v.includes('environment') || v.includes('sustainab')) return 'environment';
    if (v.includes('health') || v.includes('wellbeing')) return 'health';
    if (v.includes('education') || v.includes('youth')) return 'education';
    if (v.includes('art') || v.includes('cultur')) return 'arts';
    if (v.includes('sport') || v.includes('recreation')) return 'sport';
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
