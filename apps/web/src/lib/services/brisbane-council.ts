import { Opportunity } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * Brisbane City Council Grants API Client
 * URL: https://data.brisbane.qld.gov.au/explore/dataset/grants-recipients/api/
 *
 * Provides grants recipient data from Brisbane City Council since 2014-15.
 */
export class BrisbaneCouncilClient implements APIClient {
  name = 'Brisbane Council';
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.BRISBANE_API_URL ||
      'https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/grants-recipients';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/records?limit=1`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error(`${this.name} API is not available:`, error);
      return false;
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      // Only fetch grants for Brisbane Council
      if (params.opportunityType === 'tenders') {
        return [];
      }

      // Only fetch if scope is council and specifically Brisbane
      if (params.scope !== 'council' || params.council !== 'brisbane') {
        return [];
      }

      // Only fetch if state is QLD
      if (params.state && params.state !== 'qld') {
        return [];
      }

      // Build query parameters for Brisbane Open Data API
      const queryParams = new URLSearchParams();
      queryParams.append('limit', '100'); // Get up to 100 recent grants

      // Add filters
      if (params.categories) {
        const grantCategories = params.categories
          .filter((cat) => cat.startsWith('grant-'))
          .map((cat) => cat.replace('grant-', ''));

        // Map categories to Brisbane grant types
        const categoryFilter = this.mapCategories(grantCategories);
        if (categoryFilter) {
          queryParams.append('where', categoryFilter);
        }
      }

      // Fetch data from Brisbane Council API
      const response = await fetch(
        `${this.baseUrl}/records?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Brisbane Council API error: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Transform Brisbane data to our Opportunity format
      return this.transformToOpportunities(data, params);
    } catch (error) {
      console.error(`${this.name} fetch error:`, error);
      return [];
    }
  }

  private transformToOpportunities(
    data: any,
    params: SearchParams
  ): Opportunity[] {
    // Transform Brisbane API response to our Opportunity interface

    if (!data.records || !Array.isArray(data.records)) {
      return [];
    }

    // Note: Brisbane API returns historical grant recipients
    // We need to convert these to current opportunities
    // This is a simplified transformation

    const opportunities: Opportunity[] = [];

    // Create current grant opportunities based on historical programs
    const programs = this.extractPrograms(data.records);

    programs.forEach((program, index) => {
      // Filter by amount if specified
      if (params.minAmount && program.amount < params.minAmount) return;
      if (params.maxAmount && program.amount > params.maxAmount) return;

      opportunities.push({
        id: `brisbane-${program.id || index}`,
        title: program.name,
        type: 'grant' as const,
        category: program.category,
        amount: program.amount,
        minAmount: program.minAmount,
        maxAmount: program.maxAmount,
        description: program.description,
        jurisdiction: 'council' as const,
        state: 'qld',
        council: 'brisbane',
        openDate: program.openDate,
        closeDate: program.closeDate,
        url: program.url,
        status: this.determineStatus(program.closeDate),
      });
    });

    return opportunities;
  }

  private extractPrograms(records: any[]): any[] {
    // Extract unique grant programs from historical data
    const programMap = new Map();

    records.forEach((record) => {
      const fields = record.record?.fields || record.fields || {};
      const programName =
        fields.grant_program || fields.program || 'Community Grant';
      const category = this.categorizeGrant(programName);

      if (!programMap.has(programName)) {
        programMap.set(programName, {
          id: fields.id || programName.toLowerCase().replace(/\s+/g, '-'),
          name: programName,
          category: category,
          amount: fields.grant_amount || 10000,
          minAmount: 2000,
          maxAmount: 10000,
          description: this.generateDescription(programName, category),
          openDate: new Date().toISOString().split('T')[0],
          closeDate: this.calculateCloseDate(),
          url: `https://www.brisbane.qld.gov.au/community-support-and-safety/grants-and-sponsorship/applying-for-a-grant/community-grants`,
        });
      }
    });

    return Array.from(programMap.values());
  }

  private categorizeGrant(programName: string): string {
    const name = programName.toLowerCase();

    if (name.includes('community')) return 'community';
    if (name.includes('art') || name.includes('culture')) return 'arts';
    if (name.includes('environment') || name.includes('sustainability'))
      return 'environment';
    if (name.includes('sport') || name.includes('recreation')) return 'sport';
    if (name.includes('health')) return 'health';

    return 'community';
  }

  private generateDescription(programName: string, category: string): string {
    return `Brisbane City Council grant program supporting ${category} initiatives. ${programName} provides funding for local organizations and community groups.`;
  }

  private calculateCloseDate(): string {
    // Brisbane grants typically close in June
    const closeDate = new Date();
    closeDate.setMonth(5); // June (0-indexed)
    closeDate.setDate(12); // 12th June as per current program

    // If we're past June, set to next year
    if (closeDate < new Date()) {
      closeDate.setFullYear(closeDate.getFullYear() + 1);
    }

    return closeDate.toISOString().split('T')[0];
  }

  private mapCategories(categories: string[]): string | null {
    // Map our categories to Brisbane grant program types
    if (categories.length === 0) return null;

    const filters = categories.map((cat) => {
      switch (cat) {
        case 'community':
          return "grant_program LIKE '%community%'";
        case 'arts':
          return "grant_program LIKE '%art%' OR grant_program LIKE '%culture%'";
        case 'environment':
          return "grant_program LIKE '%environment%' OR grant_program LIKE '%sustainability%'";
        case 'sport':
          return "grant_program LIKE '%sport%' OR grant_program LIKE '%recreation%'";
        default:
          return null;
      }
    });

    const validFilters = filters.filter((f) => f !== null);
    return validFilters.length > 0 ? validFilters.join(' OR ') : null;
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
