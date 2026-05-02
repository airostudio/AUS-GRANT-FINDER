/**
 * AusTender OCDS API Client - Resilient Version
 *
 * Demonstrates the new resilient API client pattern with:
 * - Automatic endpoint discovery
 * - Retry logic and circuit breaker
 * - Response caching
 * - Multiple endpoint fallbacks
 */

import { Opportunity, determineOpportunityStatus } from '../data';
import { SearchParams } from './types';
import { ResilientAPIClient } from './base-client';
import { apiLogger } from './logger';

export class AusTenderResilientClient extends ResilientAPIClient {
  constructor() {
    super({
      name: 'AusTender',
      baseUrl: process.env.AUSTENDER_API_URL || 'https://api.tenders.gov.au',
      alternateUrls: [
        'https://www.tenders.gov.au/api',
        'https://api.tenders.gov.au',
        'https://tenders.gov.au/api',
      ],
      apiKey: process.env.AUSTENDER_API_KEY,
      defaultTimeout: 15000,
      enableEndpointDiscovery: true,
      enableCaching: true,
      cacheTTL: 15 * 60 * 1000, // 15 minutes
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Use a small date range to test connectivity
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - 7);
      const dateStr = testDate.toISOString().split('T')[0];

      const data = await this.resilientGet('/ocds/findByDates', {
        queryParams: {
          publishedDateFrom: dateStr,
          publishedDateTo: dateStr,
          limit: '1',
        },
        timeout: 5000,
        maxRetries: 2,
        useCache: false,
      });

      return !!data;
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

      // Fetch data using resilient client
      const data = await this.resilientGet('/ocds/findByDates', {
        queryParams: {
          publishedDateFrom,
          publishedDateTo,
          limit: '200',
        },
      });

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

  private transformToOpportunities(data: any, params: SearchParams): Opportunity[] {
    if (!data?.releases || !Array.isArray(data.releases)) {
      apiLogger.warn(this.name, 'Invalid response format - missing releases array');
      return [];
    }

    const opportunities: Opportunity[] = [];
    let filtered = 0;

    for (const release of data.releases) {
      const tender = release.tender || {};
      const buyer = release.buyer || {};

      // Skip if no meaningful tender data
      if (!tender.title && !tender.id) {
        filtered++;
        continue;
      }

      // Only include active tenders (not closed/cancelled)
      const tenderStatus = tender.status || '';
      if (
        tenderStatus === 'complete' ||
        tenderStatus === 'cancelled' ||
        tenderStatus === 'unsuccessful'
      ) {
        filtered++;
        continue;
      }

      const closeDate = this.parseDate(tender.tenderPeriod?.endDate || '');
      const openDate = this.parseDate(
        tender.tenderPeriod?.startDate || release.date || new Date().toISOString()
      );

      // Skip expired tenders
      if (closeDate && this.isExpired(closeDate)) {
        filtered++;
        continue;
      }

      const status = closeDate ? determineOpportunityStatus(closeDate) : 'open';
      const category = this.mapCategory(tender.mainProcurementCategory, tender.title || '');

      // Filter by category if specified
      if (params.categories && params.categories.length > 0) {
        const tenderCats = params.categories
          .filter((c) => !c.startsWith('grant-'))
          .map((c) => c.replace('tender-', ''));
        if (tenderCats.length > 0 && !tenderCats.includes(category)) {
          filtered++;
          continue;
        }
      }

      const amount = tender.value?.amount || null;

      // Filter by amount
      if (params.minAmount && amount !== null && amount < params.minAmount) {
        filtered++;
        continue;
      }
      if (params.maxAmount && amount !== null && amount > params.maxAmount) {
        filtered++;
        continue;
      }

      // Filter by status
      if (params.status && params.status !== 'all' && status !== params.status) {
        filtered++;
        continue;
      }

      const ocid = release.ocid || `at-${Date.now()}-${Math.random()}`;
      const tenderUrl = `https://www.tenders.gov.au/atm/show/${encodeURIComponent(
        tender.id || ocid
      )}`;

      const opportunity: Opportunity = {
        id: `austender-${ocid}`,
        title: tender.title || `Federal Tender ${tender.id || ''}`,
        type: 'tender',
        category,
        amount,
        minAmount: tender.minValue?.amount,
        maxAmount: tender.maxValue?.amount,
        description:
          this.extractText(tender.description) ||
          `Federal government procurement opportunity. Buyer: ${buyer.name || 'Commonwealth of Australia'}`,
        jurisdiction: 'federal',
        openDate: openDate || new Date().toISOString().split('T')[0],
        closeDate:
          closeDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        url: tenderUrl,
        status,
      };

      // Validate before adding
      if (this.validateOpportunity(opportunity)) {
        opportunities.push(opportunity);
      } else {
        filtered++;
      }
    }

    if (filtered > 0) {
      apiLogger.info(this.name, `Filtered out ${filtered} invalid/expired opportunities`);
    }

    return opportunities;
  }

  private mapCategory(procurementCategory?: string, title?: string): string {
    const cat = (procurementCategory || '').toLowerCase();
    const t = (title || '').toLowerCase();

    if (cat === 'goods') return 'goods';
    if (
      cat === 'works' ||
      t.includes('construction') ||
      t.includes('building')
    )
      return 'construction';
    if (
      cat === 'consultingservices' ||
      t.includes('consult') ||
      t.includes('advisory')
    )
      return 'consulting';
    if (
      t.includes(' it ') ||
      t.includes('technology') ||
      t.includes('software') ||
      t.includes('digital') ||
      t.includes('ict')
    )
      return 'it';
    if (t.includes('maintenance') || t.includes('repair') || t.includes('operation'))
      return 'maintenance';
    return 'services';
  }
}
