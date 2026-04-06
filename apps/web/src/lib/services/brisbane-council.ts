import { Opportunity, determineOpportunityStatus } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * Brisbane City Council Open Data API Client
 *
 * Uses the Brisbane City Council OpenDataSoft platform:
 * - Grants recipients dataset (historical + current programs):
 *   https://data.brisbane.qld.gov.au/explore/dataset/grants-recipients/api/
 * - Active tenders:
 *   https://www.brisbane.qld.gov.au/business-and-investment/working-with-council/tenders-and-contracts
 *
 * OpenDataSoft ODSQL API docs:
 * https://data.brisbane.qld.gov.au/api/explore/v2.1/
 */
export class BrisbaneCouncilClient implements APIClient {
  name = 'Brisbane Council';
  private grantsBaseUrl: string;
  private tendersBaseUrl: string;

  constructor() {
    this.grantsBaseUrl =
      process.env.BRISBANE_API_URL ||
      'https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/grants-recipients';
    this.tendersBaseUrl =
      'https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/current-tenders';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.grantsBaseUrl}/records?limit=1`, {
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

      if (params.opportunityType !== 'tenders') {
        const grants = await this.fetchGrants(params);
        results.push(...grants);
      }

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

  private async fetchGrants(params: SearchParams): Promise<Opportunity[]> {
    try {
      const queryParams = new URLSearchParams({
        limit: '100',
        order_by: 'financial_year desc',
      });

      // Build ODSQL where clause for category filtering
      const whereFilters: string[] = [];

      if (params.categories) {
        const grantCats = params.categories
          .filter((c) => !c.startsWith('tender-'))
          .map((c) => c.replace('grant-', ''));

        if (grantCats.length > 0) {
          const catFilter = this.buildCategoryFilter(grantCats);
          if (catFilter) whereFilters.push(catFilter);
        }
      }

      if (whereFilters.length > 0) {
        queryParams.set('where', whereFilters.join(' AND '));
      }

      const response = await fetch(
        `${this.grantsBaseUrl}/records?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        console.error(`Brisbane grants API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return this.transformGrants(data, params);
    } catch (error) {
      console.error(`Brisbane grants fetch error:`, error);
      return [];
    }
  }

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

  private transformGrants(data: any, params: SearchParams): Opportunity[] {
    if (!data?.results && !data?.records) return [];

    const records = data.results || data.records || [];
    const programMap = new Map<string, {
      name: string;
      category: string;
      totalAmount: number;
      count: number;
      latestYear: string;
    }>();

    // Aggregate by program name to create current opportunities from historical data
    for (const record of records) {
      const fields = record.record?.fields || record.fields || record;
      const programName = fields.grant_program || fields.program_name || fields.grant_category || 'Community Grant';
      const amount = Number(fields.grant_amount || fields.amount || 0);
      const year = String(fields.financial_year || fields.year || '');
      const category = this.categorizeGrant(programName);

      if (!programMap.has(programName)) {
        programMap.set(programName, { name: programName, category, totalAmount: 0, count: 0, latestYear: year });
      }

      const prog = programMap.get(programName)!;
      prog.totalAmount += amount;
      prog.count += 1;
      if (year > prog.latestYear) prog.latestYear = year;
    }

    const opportunities: Opportunity[] = [];
    const currentYear = new Date().getFullYear();

    for (const [, prog] of programMap) {
      const avgAmount = prog.count > 0 ? Math.round(prog.totalAmount / prog.count) : 10000;

      // Filter by amount
      if (params.minAmount && avgAmount < params.minAmount) continue;
      if (params.maxAmount && avgAmount > params.maxAmount) continue;

      // Calculate next round close date (Brisbane grants typically open Feb-June)
      const closeDate = this.nextGrantCloseDate();
      const openDate = this.nextGrantOpenDate();
      const status = determineOpportunityStatus(closeDate);

      // Only include if status matches
      if (params.status && params.status !== 'all' && status !== params.status) continue;

      opportunities.push({
        id: `brisbane-${prog.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)}`,
        title: `${prog.name} — Brisbane City Council`,
        type: 'grant',
        category: prog.category,
        amount: avgAmount,
        minAmount: Math.round(avgAmount * 0.2),
        maxAmount: avgAmount,
        description: `Brisbane City Council grant program. Based on ${prog.count} historical recipients averaging $${avgAmount.toLocaleString()}. Program: ${prog.name}.`,
        jurisdiction: 'council',
        state: 'qld',
        council: 'brisbane',
        openDate,
        closeDate,
        url: 'https://www.brisbane.qld.gov.au/community-support-and-safety/grants-and-sponsorship/applying-for-a-grant/community-grants',
        status,
      });
    }

    return opportunities;
  }

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

  private buildCategoryFilter(categories: string[]): string | null {
    if (categories.length === 0) return null;
    const conditions = categories.flatMap((cat) => {
      switch (cat) {
        case 'community': return ["search(grant_program, 'community')"];
        case 'arts': return ["search(grant_program, 'art')", "search(grant_program, 'culture')"];
        case 'environment': return ["search(grant_program, 'environment')", "search(grant_program, 'sustainability')"];
        case 'sport': return ["search(grant_program, 'sport')", "search(grant_program, 'recreation')"];
        case 'health': return ["search(grant_program, 'health')"];
        default: return [];
      }
    });
    return conditions.length > 0 ? conditions.join(' OR ') : null;
  }

  private nextGrantCloseDate(): string {
    const d = new Date();
    // Brisbane grants typically close in June
    const year = d.getMonth() >= 5 ? d.getFullYear() + 1 : d.getFullYear();
    return `${year}-06-13`;
  }

  private nextGrantOpenDate(): string {
    const d = new Date();
    const year = d.getMonth() >= 5 ? d.getFullYear() + 1 : d.getFullYear();
    return `${year}-02-01`;
  }

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
