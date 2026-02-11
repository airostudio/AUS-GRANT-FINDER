import { Opportunity } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * AusTender OCDS API Client
 * GitHub: https://github.com/austender/austender-ocds-api
 *
 * Provides Australian Government procurement/tender data in Open Contracting Data Standard format.
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
      // Health check endpoint (example - adjust based on actual API)
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error(`${this.name} API is not available:`, error);
      return false;
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      // Only fetch tenders for AusTender
      if (params.opportunityType === 'grants') {
        return [];
      }

      // Build query parameters based on OCDS API structure
      const queryParams = new URLSearchParams();

      // Add jurisdiction filters
      if (params.scope === 'australia' || params.scope === 'state') {
        // Federal tenders available
        queryParams.append('jurisdiction', 'federal');
      }

      // Add category filters (map to procurement categories)
      if (params.categories) {
        const tenderCategories = params.categories
          .filter((cat) => cat.startsWith('tender-'))
          .map((cat) => cat.replace('tender-', ''));

        if (tenderCategories.length > 0) {
          queryParams.append('categories', tenderCategories.join(','));
        }
      }

      // Add amount filters
      if (params.minAmount) {
        queryParams.append('value_min', params.minAmount.toString());
      }
      if (params.maxAmount) {
        queryParams.append('value_max', params.maxAmount.toString());
      }

      // Add date filters
      if (params.dateFrom) {
        queryParams.append('publishedFrom', params.dateFrom);
      }
      if (params.dateTo) {
        queryParams.append('publishedTo', params.dateTo);
      }

      // Fetch data from AusTender API
      const response = await fetch(
        `${this.baseUrl}/contracts?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`AusTender API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform OCDS data to our Opportunity format
      return this.transformToOpportunities(data);
    } catch (error) {
      console.error(`${this.name} fetch error:`, error);
      return [];
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private transformToOpportunities(data: any): Opportunity[] {
    // Transform OCDS format to our Opportunity interface
    // This is a placeholder - adjust based on actual OCDS response structure

    if (!data.releases || !Array.isArray(data.releases)) {
      return [];
    }

    return data.releases.map((release: any, index: number) => {
      const contract = release.contracts?.[0] || {};
      const tender = release.tender || {};

      return {
        id: `austender-${release.ocid || index}`,
        title: tender.title || contract.title || 'Untitled Tender',
        type: 'tender' as const,
        category: this.mapCategory(tender.mainProcurementCategory),
        amount: contract.value?.amount || tender.value?.amount || null,
        minAmount: tender.minValue?.amount,
        maxAmount: tender.maxValue?.amount,
        description: tender.description || contract.description || '',
        jurisdiction: 'federal' as const,
        openDate: tender.tenderPeriod?.startDate || new Date().toISOString().split('T')[0],
        closeDate: tender.tenderPeriod?.endDate || new Date().toISOString().split('T')[0],
        url: release.url || `https://www.tenders.gov.au/atm/${release.ocid}`,
        status: this.determineStatus(tender.tenderPeriod?.endDate),
      };
    });
  }

  private mapCategory(procurementCategory?: string): string {
    // Map OCDS procurement categories to our categories
    const categoryMap: { [key: string]: string } = {
      goods: 'goods',
      services: 'services',
      works: 'construction',
      consultingServices: 'consulting',
    };

    return categoryMap[procurementCategory || ''] || 'services';
  }

  private determineStatus(closeDateStr?: string): 'open' | 'closing-soon' | 'closed' {
    if (!closeDateStr) return 'open';

    const closeDate = new Date(closeDateStr);
    const today = new Date();
    const diffDays = Math.ceil(
      (closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) return 'closed';
    if (diffDays <= 7) return 'closing-soon';
    return 'open';
  }
}
