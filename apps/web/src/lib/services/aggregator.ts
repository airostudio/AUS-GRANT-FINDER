import { Opportunity, MOCK_OPPORTUNITIES } from '../data';
import { APIClient, SearchParams, APIResponse } from './types';
import { AusTenderClient } from './austender';
import { ARCGrantsClient } from './arc-grants';
import { BrisbaneCouncilClient } from './brisbane-council';

/**
 * Aggregator Service
 *
 * Combines data from multiple API sources and provides a unified interface.
 * Falls back to mock data if APIs are unavailable.
 */
export class OpportunityAggregator {
  private clients: APIClient[];
  private useMockData: boolean;
  private cacheEnabled: boolean;
  private cache: Map<string, { data: Opportunity[]; timestamp: number }>;
  private cacheDuration: number = 15 * 60 * 1000; // 15 minutes

  constructor(options: { useMockData?: boolean; cacheEnabled?: boolean } = {}) {
    this.useMockData = options.useMockData ?? false;
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cache = new Map();

    // Initialize all API clients
    this.clients = [
      new AusTenderClient(),
      new ARCGrantsClient(),
      new BrisbaneCouncilClient(),
    ];
  }

  /**
   * Fetch opportunities from all available sources
   */
  async fetchOpportunities(params: SearchParams): Promise<APIResponse> {
    // Check cache first
    const cacheKey = this.getCacheKey(params);
    if (this.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        console.log('Returning cached results');
        return {
          success: true,
          source: 'cache',
          count: cached.data.length,
          opportunities: cached.data,
        };
      }
    }

    // If mock data is enabled, return mock data
    if (this.useMockData) {
      return this.getMockData(params);
    }

    try {
      // Fetch from all available API clients in parallel
      const results = await Promise.allSettled(
        this.clients.map((client) => this.fetchFromClient(client, params))
      );

      // Combine results from all sources
      const allOpportunities: Opportunity[] = [];
      const sources: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allOpportunities.push(...result.value);
          sources.push(this.clients[index].name);
        } else if (result.status === 'rejected') {
          console.error(
            `Failed to fetch from ${this.clients[index].name}:`,
            result.reason
          );
        }
      });

      // If no results from APIs, fallback to mock data
      if (allOpportunities.length === 0) {
        console.log('No results from APIs, falling back to mock data');
        return this.getMockData(params);
      }

      // Remove duplicates based on ID
      const uniqueOpportunities = this.deduplicateOpportunities(allOpportunities);

      // Filter based on params
      const filtered = this.filterOpportunities(uniqueOpportunities, params);

      // Sort by close date (soonest first)
      const sorted = this.sortOpportunities(filtered);

      // Cache the results
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, {
          data: sorted,
          timestamp: Date.now(),
        });
      }

      return {
        success: true,
        source: sources.join(', '),
        count: sorted.length,
        opportunities: sorted,
      };
    } catch (error) {
      console.error('Error aggregating opportunities:', error);

      // Fallback to mock data on error
      return this.getMockData(params);
    }
  }

  /**
   * Fetch from a single API client with error handling
   */
  private async fetchFromClient(
    client: APIClient,
    params: SearchParams
  ): Promise<Opportunity[]> {
    try {
      // Check if client is available
      const isAvailable = await client.isAvailable();
      if (!isAvailable) {
        console.log(`${client.name} is not available, skipping`);
        return [];
      }

      console.log(`Fetching from ${client.name}...`);
      const opportunities = await client.fetchOpportunities(params);
      console.log(`${client.name} returned ${opportunities.length} opportunities`);

      return opportunities;
    } catch (error) {
      console.error(`Error fetching from ${client.name}:`, error);
      return [];
    }
  }

  /**
   * Get mock data as fallback
   */
  private getMockData(params: SearchParams): APIResponse {
    const filtered = this.filterOpportunities(MOCK_OPPORTUNITIES, params);
    const sorted = this.sortOpportunities(filtered);

    return {
      success: true,
      source: 'mock-data',
      count: sorted.length,
      opportunities: sorted,
    };
  }

  /**
   * Filter opportunities based on search parameters
   */
  private filterOpportunities(
    opportunities: Opportunity[],
    params: SearchParams
  ): Opportunity[] {
    let results = [...opportunities];

    // Filter by geographic scope
    if (params.scope === 'australia') {
      results = results.filter((opp) => opp.jurisdiction === 'federal');
    } else if (params.scope === 'state' && params.state) {
      results = results.filter(
        (opp) =>
          (opp.jurisdiction === 'state' && opp.state === params.state) ||
          opp.jurisdiction === 'federal'
      );
    } else if (params.scope === 'council' && params.council) {
      results = results.filter(
        (opp) =>
          (opp.jurisdiction === 'council' && opp.council === params.council) ||
          (opp.jurisdiction === 'state' && opp.state === params.state) ||
          opp.jurisdiction === 'federal'
      );
    }

    // Filter by opportunity type
    if (params.opportunityType && params.opportunityType !== 'both') {
      const oppType: 'grant' | 'tender' =
        params.opportunityType === 'grants' ? 'grant' : 'tender';
      results = results.filter((opp) => opp.type === oppType);
    }

    // Filter by categories
    if (params.categories && params.categories.length > 0) {
      const categoryIds = params.categories.map((cat) => {
        return cat.replace(/^(grant|tender)-/, '');
      });
      results = results.filter((opp) => categoryIds.includes(opp.category));
    }

    // Filter by funding amount
    if (params.minAmount !== undefined) {
      results = results.filter(
        (opp) => opp.amount !== null && opp.amount >= params.minAmount!
      );
    }
    if (params.maxAmount !== undefined) {
      results = results.filter(
        (opp) => opp.amount !== null && opp.amount <= params.maxAmount!
      );
    }

    // Filter by date range
    if (params.dateFrom) {
      results = results.filter((opp) => opp.closeDate >= params.dateFrom!);
    }
    if (params.dateTo) {
      results = results.filter((opp) => opp.openDate <= params.dateTo!);
    }

    // Filter by status
    if (params.status !== 'all') {
      results = results.filter((opp) => opp.status === params.status);
    }

    return results;
  }

  /**
   * Remove duplicate opportunities based on ID
   */
  private deduplicateOpportunities(opportunities: Opportunity[]): Opportunity[] {
    const seen = new Set<string>();
    return opportunities.filter((opp) => {
      if (seen.has(opp.id)) {
        return false;
      }
      seen.add(opp.id);
      return true;
    });
  }

  /**
   * Sort opportunities by close date (soonest first)
   */
  private sortOpportunities(opportunities: Opportunity[]): Opportunity[] {
    return opportunities.sort(
      (a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime()
    );
  }

  /**
   * Generate cache key from search parameters
   */
  private getCacheKey(params: SearchParams): string {
    return JSON.stringify(params);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get available API clients
   */
  getClients(): string[] {
    return this.clients.map((client) => client.name);
  }
}
