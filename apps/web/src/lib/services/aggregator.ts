import { Opportunity } from '../data';
import { APIClient, SearchParams, APIResponse } from './types';
import { AusTenderClient } from './austender';
import { ARCGrantsClient } from './arc-grants';
import { BrisbaneCouncilClient } from './brisbane-council';
import { GrantConnectClient } from './grant-connect';
import { NSWGrantsClient } from './nsw-grants';
import { QLDGrantsClient } from './qld-grants';
import { VICGrantsClient } from './vic-grants';
import { SAGrantsClient } from './sa-grants';
import { WAGrantsClient } from './wa-grants';
import { TASGrantsClient } from './tas-grants';
import { ACTNTGrantsClient } from './act-nt-grants';

/**
 * Opportunity Aggregator
 *
 * Orchestrates data fetching from all Australian government grant and tender sources:
 *
 * Federal:
 *   - AusTender (tenders.gov.au) - Commonwealth procurement via OCDS API
 *   - GrantConnect (grants.gov.au) - Commonwealth grants portal
 *   - ARC Grants (arc.gov.au) - Australian Research Council
 *
 * State & Territory:
 *   - NSW: data.nsw.gov.au + nsw.gov.au/grants-and-funding
 *   - QLD: data.qld.gov.au + qtenders.epw.qld.gov.au + business.qld.gov.au
 *   - VIC: data.vic.gov.au + business.vic.gov.au + buyingfor.vic.gov.au
 *   - SA:  data.sa.gov.au + tenders.sa.gov.au
 *   - WA:  data.wa.gov.au + tenders.wa.gov.au
 *   - TAS: grants.tas.gov.au + tenders.tas.gov.au
 *   - ACT: data.act.gov.au + act.gov.au/funding-and-grants
 *   - NT:  data.nt.gov.au + nt.gov.au/community/grants-and-funding
 *
 * Local Government:
 *   - Brisbane City Council (data.brisbane.qld.gov.au)
 */
export class OpportunityAggregator {
  private allClients: APIClient[];
  private cacheEnabled: boolean;
  private cache: Map<string, { data: Opportunity[]; timestamp: number }>;
  private cacheDuration: number = 15 * 60 * 1000; // 15 minutes

  constructor(options: { useMockData?: boolean; cacheEnabled?: boolean } = {}) {
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cache = new Map();

    // All real API clients - no mock fallback
    this.allClients = [
      // Federal
      new AusTenderClient(),
      new GrantConnectClient(),
      new ARCGrantsClient(),
      // States & Territories
      new NSWGrantsClient(),
      new QLDGrantsClient(),
      new VICGrantsClient(),
      new SAGrantsClient(),
      new WAGrantsClient(),
      new TASGrantsClient(),
      new ACTNTGrantsClient(),
      // Local Government
      new BrisbaneCouncilClient(),
    ];
  }

  /**
   * Fetch opportunities from all relevant API sources based on search params
   */
  async fetchOpportunities(params: SearchParams): Promise<APIResponse> {
    // Check cache first
    const cacheKey = this.getCacheKey(params);
    if (this.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        return {
          success: true,
          source: 'cache',
          count: cached.data.length,
          opportunities: cached.data,
        };
      }
    }

    // Select relevant clients based on search scope
    const relevantClients = this.selectClients(params);

    try {
      // Fetch from all relevant API clients in parallel
      const results = await Promise.allSettled(
        relevantClients.map((client) => this.fetchFromClient(client, params))
      );

      const allOpportunities: Opportunity[] = [];
      const successfulSources: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allOpportunities.push(...result.value);
          successfulSources.push(relevantClients[index].name);
        } else if (result.status === 'rejected') {
          console.error(
            `Failed to fetch from ${relevantClients[index].name}:`,
            result.reason
          );
        }
      });

      // Remove duplicates based on ID
      const uniqueOpportunities = this.deduplicateOpportunities(allOpportunities);

      // Filter based on params (API clients do pre-filtering, this is a safety net)
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
        source: successfulSources.length > 0 ? successfulSources.join(', ') : 'no-results',
        count: sorted.length,
        opportunities: sorted,
      };
    } catch (error) {
      console.error('Error aggregating opportunities:', error);
      return {
        success: false,
        source: 'error',
        count: 0,
        opportunities: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Select only the clients relevant to the search parameters
   * to avoid unnecessary API calls
   */
  private selectClients(params: SearchParams): APIClient[] {
    const { scope, state, council } = params;

    // Australia-wide: include federal + all state clients
    if (!scope || scope === 'australia') {
      return this.allClients;
    }

    const selected: APIClient[] = [];

    // Always include federal clients (relevant at all scopes)
    selected.push(
      this.allClients[0], // AusTender
      this.allClients[1], // GrantConnect
      this.allClients[2], // ARC
    );

    if (scope === 'state' && state) {
      const stateClient = this.getStateClient(state);
      if (stateClient) selected.push(stateClient);
    }

    if (scope === 'council' && state) {
      const stateClient = this.getStateClient(state);
      if (stateClient) selected.push(stateClient);

      // Include council-specific clients
      if (council === 'brisbane' || state === 'qld') {
        const brisbaneClient = this.allClients.find((c) => c.name === 'Brisbane Council');
        if (brisbaneClient) selected.push(brisbaneClient);
      }
    }

    return selected;
  }

  private getStateClient(state: string): APIClient | undefined {
    const stateClientMap: Record<string, string> = {
      nsw: 'NSW Grants',
      qld: 'QLD Grants',
      vic: 'VIC Grants',
      sa: 'SA Grants',
      wa: 'WA Grants',
      tas: 'TAS Grants',
      act: 'ACT & NT Grants',
      nt: 'ACT & NT Grants',
    };

    const clientName = stateClientMap[state];
    return this.allClients.find((c) => c.name === clientName);
  }

  /**
   * Fetch from a single API client with error handling
   */
  private async fetchFromClient(
    client: APIClient,
    params: SearchParams
  ): Promise<Opportunity[]> {
    try {
      return await client.fetchOpportunities(params);
    } catch (error) {
      console.error(`Error fetching from ${client.name}:`, error);
      return [];
    }
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
      const categoryIds = params.categories.map((cat) =>
        cat.replace(/^(grant|tender)-/, '')
      );
      results = results.filter((opp) => categoryIds.includes(opp.category));
    }

    // Filter by funding amount
    if (params.minAmount !== undefined) {
      results = results.filter(
        (opp) => opp.amount === null || opp.amount >= params.minAmount!
      );
    }
    if (params.maxAmount !== undefined) {
      results = results.filter(
        (opp) => opp.amount === null || opp.amount <= params.maxAmount!
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
    if (params.status && params.status !== 'all') {
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
      if (seen.has(opp.id)) return false;
      seen.add(opp.id);
      return true;
    });
  }

  /**
   * Sort opportunities by close date (soonest first), then open ones before closing-soon
   */
  private sortOpportunities(opportunities: Opportunity[]): Opportunity[] {
    return opportunities.sort((a, b) => {
      const dateA = new Date(a.closeDate).getTime();
      const dateB = new Date(b.closeDate).getTime();
      return dateA - dateB;
    });
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
   * Get list of all configured API clients
   */
  getClients(): string[] {
    return this.allClients.map((client) => client.name);
  }
}
