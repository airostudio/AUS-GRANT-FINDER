import { Opportunity } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * Australian Research Council (ARC) Grants API Client
 * URL: https://www.arc.gov.au/funding-research/funding-outcomes/grants-dataset
 *
 * Provides research grant data from ARC since 2001 in JSON format.
 */
export class ARCGrantsClient implements APIClient {
  name = 'ARC Grants';
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.ARC_API_URL || 'https://www.arc.gov.au/api/grants';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'HEAD',
      });
      return response.ok;
    } catch (error) {
      console.error(`${this.name} API is not available:`, error);
      return false;
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      // Only fetch grants for ARC
      if (params.opportunityType === 'tenders') {
        return [];
      }

      // ARC is federal jurisdiction only
      if (
        params.scope === 'state' ||
        params.scope === 'council' ||
        params.state ||
        params.council
      ) {
        return [];
      }

      // Build query parameters
      const queryParams = new URLSearchParams();

      // Filter by research/education category
      if (params.categories) {
        const hasEducation = params.categories.some((cat) =>
          cat.includes('education')
        );
        if (!hasEducation) {
          // If user didn't select education/research, skip ARC data
          return [];
        }
      }

      // Add amount filters
      if (params.minAmount) {
        queryParams.append('minValue', params.minAmount.toString());
      }
      if (params.maxAmount) {
        queryParams.append('maxValue', params.maxAmount.toString());
      }

      // Add year filters based on dates
      if (params.dateFrom || params.dateTo) {
        const fromYear = params.dateFrom
          ? new Date(params.dateFrom).getFullYear()
          : 2001;
        const toYear = params.dateTo
          ? new Date(params.dateTo).getFullYear()
          : new Date().getFullYear();

        queryParams.append('yearFrom', fromYear.toString());
        queryParams.append('yearTo', toYear.toString());
      }

      // Fetch data from ARC API
      const response = await fetch(
        `${this.baseUrl}?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`ARC Grants API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform ARC data to our Opportunity format
      return this.transformToOpportunities(data);
    } catch (error) {
      console.error(`${this.name} fetch error:`, error);
      return [];
    }
  }

  private transformToOpportunities(data: any): Opportunity[] {
    // Transform ARC JSON response to our Opportunity interface
    // This is a placeholder - adjust based on actual ARC API response structure

    if (!data.grants || !Array.isArray(data.grants)) {
      return [];
    }

    return data.grants.map((grant: any, index: number) => {
      const fundingYear = grant.fundingYear || new Date().getFullYear();
      const startDate = `${fundingYear}-01-01`;
      const endDate = `${fundingYear}-12-31`;

      return {
        id: `arc-${grant.id || index}`,
        title: grant.projectTitle || grant.title || 'ARC Research Grant',
        type: 'grant' as const,
        category: 'education',
        amount: grant.fundingAmount || null,
        minAmount: grant.minimumFunding,
        maxAmount: grant.maximumFunding,
        description:
          grant.projectDescription ||
          grant.description ||
          'Australian Research Council research funding opportunity',
        jurisdiction: 'federal' as const,
        openDate: grant.openDate || startDate,
        closeDate: grant.closeDate || endDate,
        url:
          grant.url ||
          `https://www.arc.gov.au/grants/${grant.id || 'details'}`,
        status: this.determineStatus(grant.closeDate || endDate),
      };
    });
  }

  private determineStatus(closeDateStr: string): 'open' | 'closing-soon' | 'closed' {
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
