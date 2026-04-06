import { Opportunity, determineOpportunityStatus } from '../data';
import { APIClient, SearchParams } from './types';
import { apiLogger } from './logger';

/**
 * AusTender OCDS API Client
 * GitHub: https://github.com/austender/austender-ocds-api
 * Docs: https://api.tenders.gov.au/ocds/
 *
 * Provides Australian Government procurement/tender data in Open Contracting
 * Data Standard (OCDS) format. Covers all Commonwealth tender opportunities
 * published on tenders.gov.au.
 */
export class AusTenderClient implements APIClient {
  name = 'AusTender';
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = process.env.AUSTENDER_API_URL || 'https://api.tenders.gov.au';
    this.apiKey = process.env.AUSTENDER_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Use a small date range to test connectivity
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - 7);
      const dateStr = testDate.toISOString().split('T')[0];
      const testUrl = `${this.baseUrl}/ocds/findByDates?publishedDateFrom=${dateStr}&publishedDateTo=${dateStr}&limit=1`;
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
      // AusTender covers federal tenders only
      if (params.opportunityType === 'grants') return [];

      // Build date range: default to next 90 days for upcoming + current
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 90);

      // Also look back 30 days to catch recently opened tenders
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 30);

      const publishedDateFrom = params.dateFrom || pastDate.toISOString().split('T')[0];
      const publishedDateTo = params.dateTo || futureDate.toISOString().split('T')[0];

      const queryParams = new URLSearchParams({
        publishedDateFrom,
        publishedDateTo,
        limit: '200',
      });

      const response = await fetch(
        `${this.baseUrl}/ocds/findByDates?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        apiLogger.error(
          this.name,
          `API returned ${response.status} ${response.statusText}`,
          undefined,
          `${this.baseUrl}/ocds/findByDates`
        );
        return [];
      }

      const data = await response.json();
      return this.transformToOpportunities(data, params);
    } catch (error) {
      apiLogger.error(
        this.name,
        'Failed to fetch opportunities',
        error instanceof Error ? error : new Error(String(error)),
        `${this.baseUrl}/ocds/findByDates`
      );
      return [];
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      Accept: 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private transformToOpportunities(data: any, params: SearchParams): Opportunity[] {
    if (!data?.releases || !Array.isArray(data.releases)) return [];

    const opportunities: Opportunity[] = [];

    for (const release of data.releases) {
      const tender = release.tender || {};
      const buyer = release.buyer || {};

      // Skip if no meaningful tender data
      if (!tender.title && !tender.id) continue;

      // Only include active tenders (not closed/cancelled)
      const tenderStatus = tender.status || '';
      if (tenderStatus === 'complete' || tenderStatus === 'cancelled' || tenderStatus === 'unsuccessful') {
        continue;
      }

      const closeDate = tender.tenderPeriod?.endDate
        ? tender.tenderPeriod.endDate.split('T')[0]
        : '';
      const openDate = tender.tenderPeriod?.startDate
        ? tender.tenderPeriod.startDate.split('T')[0]
        : (release.date ? release.date.split('T')[0] : new Date().toISOString().split('T')[0]);

      // Skip tenders that closed more than 1 day ago
      if (closeDate) {
        const close = new Date(closeDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (close < yesterday) continue;
      }

      const status = closeDate ? determineOpportunityStatus(closeDate) : 'open';
      const category = this.mapCategory(tender.mainProcurementCategory, tender.title || '');

      // Filter by category if specified
      if (params.categories && params.categories.length > 0) {
        const tenderCats = params.categories
          .filter((c) => !c.startsWith('grant-'))
          .map((c) => c.replace('tender-', ''));
        if (tenderCats.length > 0 && !tenderCats.includes(category)) continue;
      }

      const amount = tender.value?.amount || null;

      // Filter by amount
      if (params.minAmount && amount !== null && amount < params.minAmount) continue;
      if (params.maxAmount && amount !== null && amount > params.maxAmount) continue;

      const ocid = release.ocid || `at-${Date.now()}-${Math.random()}`;
      const tenderUrl = `https://www.tenders.gov.au/atm/show/${encodeURIComponent(tender.id || ocid)}`;

      opportunities.push({
        id: `austender-${ocid}`,
        title: tender.title || `Federal Tender ${tender.id || ''}`,
        type: 'tender',
        category,
        amount,
        minAmount: tender.minValue?.amount,
        maxAmount: tender.maxValue?.amount,
        description: tender.description || `Federal government procurement opportunity. Buyer: ${buyer.name || 'Commonwealth of Australia'}`,
        jurisdiction: 'federal',
        openDate,
        closeDate: closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        url: tenderUrl,
        status,
      });
    }

    return opportunities;
  }

  private mapCategory(procurementCategory?: string, title?: string): string {
    const cat = (procurementCategory || '').toLowerCase();
    const t = (title || '').toLowerCase();

    if (cat === 'goods') return 'goods';
    if (cat === 'works' || t.includes('construction') || t.includes('building')) return 'construction';
    if (cat === 'consultingservices' || t.includes('consult') || t.includes('advisory')) return 'consulting';
    if (t.includes(' it ') || t.includes('technology') || t.includes('software') || t.includes('digital') || t.includes('ict')) return 'it';
    if (t.includes('maintenance') || t.includes('repair') || t.includes('operation')) return 'maintenance';
    return 'services';
  }
}
