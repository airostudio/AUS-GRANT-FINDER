import { Opportunity, determineOpportunityStatus } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * Brisbane City Council Open Data API Client
 *
 * Uses the Brisbane City Council OpenDataSoft platform for CURRENT opportunities only:
 * - Current tenders (if available):
 *   https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/current-tenders
 * - Active grant programs (must have published opportunities, not historical recipients)
 *
 * NOTE: Historical grant recipient data is NOT transformed into current opportunities.
 * Only real, published opportunities are returned.
 *
 * OpenDataSoft ODSQL API docs:
 * https://data.brisbane.qld.gov.au/api/explore/v2.1/
 */
export class BrisbaneCouncilClient implements APIClient {
  name = 'Brisbane Council';
  private tendersBaseUrl: string;
  private grantsBaseUrl: string;

  constructor() {
    // Try current-tenders dataset first
    this.tendersBaseUrl =
      'https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/current-tenders';
    // For grants, would need a dataset of current opportunities, not historical recipients
    this.grantsBaseUrl =
      process.env.BRISBANE_GRANTS_API_URL ||
      'https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/current-grants-opportunities';
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if tenders dataset is available
      const response = await fetch(`${this.tendersBaseUrl}/records?limit=1`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      // Brisbane data is relevant for QLD state or Brisbane council scope
      if (params.state && params.state !== 'qld') return [];
      if (params.scope === 'council' && params.council && params.council !== 'brisbane') return [];
      if (params.scope === 'state' && params.state !== 'qld') return [];

      const results: Opportunity[] = [];

      // Only fetch tenders for now
      // Grants would require a dataset of CURRENT published opportunities, not historical recipients
      if (params.opportunityType !== 'grants') {
        const tenders = await this.fetchTenders(params);
        results.push(...tenders);
      }

      return results;
    } catch (error) {
      console.error(`${this.name} fetch error:`, error);
      return [];
    }
  }

  // Grants would be fetched here if Brisbane publishes a dataset of CURRENT grant opportunities
  // Historical grant recipient data should NOT be transformed into current opportunities

  private async fetchTenders(params: SearchParams): Promise<Opportunity[]> {
    try {
      // Try the current-tenders dataset if available
      const response = await fetch(
        `${this.tendersBaseUrl}/records?limit=100`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return this.transformTenders(data, params);
    } catch {
      // Tender dataset may not exist - that's ok
      return [];
    }
  }

  // REMOVED: transformGrants method that was generating synthetic opportunities from historical data
  // Brisbane's "grants-recipients" dataset contains PAST recipients, not current opportunities
  // This should NOT be transformed into fake "current" grant opportunities

  private transformTenders(data: any, params: SearchParams): Opportunity[] {
    if (!data?.results && !data?.records) return [];

    const records = data.results || data.records || [];
    const opportunities: Opportunity[] = [];

    for (const record of records) {
      const fields = record.record?.fields || record.fields || record;
      const closeDate = this.parseDate(fields.close_date || fields.closing_date || fields.due_date || '');
      const openDate = this.parseDate(fields.open_date || fields.issue_date || fields.published_date || '');

      if (closeDate) {
        const close = new Date(closeDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (close < yesterday) continue;
      }

      const amount = Number(fields.estimated_value || fields.value || fields.amount || 0) || null;
      if (params.minAmount && amount !== null && amount < params.minAmount) continue;
      if (params.maxAmount && amount !== null && amount > params.maxAmount) continue;

      const title = fields.title || fields.tender_name || fields.description || 'Brisbane Council Tender';
      const status = closeDate ? determineOpportunityStatus(closeDate) : 'open';
      const tenderId = fields.tender_id || fields.id || Math.random().toString(36).substring(2, 8);

      opportunities.push({
        id: `brisbane-tender-${tenderId}`,
        title,
        type: 'tender',
        category: this.categorizeTender(title),
        amount,
        description: fields.description || `Brisbane City Council tender opportunity. Reference: ${tenderId}`,
        jurisdiction: 'council',
        state: 'qld',
        council: 'brisbane',
        openDate: openDate || new Date().toISOString().split('T')[0],
        closeDate: closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        url: fields.url || `https://www.brisbane.qld.gov.au/business-and-investment/working-with-council/tenders-and-contracts`,
        status,
      });
    }

    return opportunities;
  }

  private categorizeGrant(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('community')) return 'community';
    if (n.includes('art') || n.includes('cultur') || n.includes('heritage')) return 'arts';
    if (n.includes('environment') || n.includes('sustainab') || n.includes('green')) return 'environment';
    if (n.includes('sport') || n.includes('recreation') || n.includes('active')) return 'sport';
    if (n.includes('health') || n.includes('wellbeing')) return 'health';
    if (n.includes('business') || n.includes('economic')) return 'business';
    if (n.includes('education') || n.includes('youth') || n.includes('learn')) return 'education';
    return 'community';
  }

  private categorizeTender(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('construction') || t.includes('building') || t.includes('civil')) return 'construction';
    if (t.includes('it') || t.includes('digital') || t.includes('software') || t.includes('technology')) return 'it';
    if (t.includes('consult') || t.includes('advisory') || t.includes('professional')) return 'consulting';
    if (t.includes('maintenance') || t.includes('repair') || t.includes('operations')) return 'maintenance';
    if (t.includes('supply') || t.includes('goods') || t.includes('equipment')) return 'goods';
    return 'services';
  }

  // REMOVED: Helper methods for synthetic grant data generation
  // buildCategoryFilter, nextGrantCloseDate, nextGrantOpenDate
  // These were used to create fake opportunities from historical data

  private parseDate(value: any): string {
    if (!value) return '';
    const s = String(value);
    // Handle various date formats
    if (s.includes('T')) return s.split('T')[0];
    if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
    try {
      return new Date(s).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
}
