/**
 * Community Grants Hub Client
 *
 * Data source: https://www.communitygrants.gov.au/grants
 *
 * The Community Grants Hub is administered by the Department of Social Services
 * and provides access to community grants across various Australian Government programs.
 *
 * This client attempts to fetch grant data via:
 * 1. JSON API endpoint (if available)
 * 2. Search endpoint with JSON response
 * 3. HTML scraping as fallback (respectful, following robots.txt)
 *
 * All grants from this source are federal jurisdiction, primarily focused on:
 * - Community organizations
 * - Not-for-profit organizations
 * - Local government (community projects)
 * - Social services
 * - Indigenous programs
 */

import { Opportunity, determineOpportunityStatus } from '../data';
import { SearchParams } from './types';
import { ResilientAPIClient } from './base-client';
import { apiLogger } from './logger';

export class CommunityGrantsHubClient extends ResilientAPIClient {
  constructor() {
    super({
      name: 'Community Grants Hub',
      baseUrl: process.env.COMMUNITY_GRANTS_API_URL || 'https://www.communitygrants.gov.au',
      alternateUrls: [
        'https://communitygrants.gov.au',
        'https://www.communitygrants.gov.au/api',
      ],
      apiKey: process.env.COMMUNITY_GRANTS_API_KEY,
      defaultTimeout: 20000,
      enableEndpointDiscovery: true,
      enableCaching: true,
      cacheTTL: 30 * 60 * 1000, // 30 minutes (community grants change less frequently)
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Try to access the grants page
      const response = await this.resilientGet('/grants', {
        timeout: 10000,
        maxRetries: 2,
        useCache: false,
      });

      return !!response;
    } catch (error) {
      // Try alternate health check - just ping the domain
      try {
        const response = await fetch(`${this.baseUrl}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      } catch {
        apiLogger.error(
          this.name,
          'Health check failed - site unreachable',
          error instanceof Error ? error : new Error(String(error)),
          this.baseUrl
        );
        return false;
      }
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      // Community Grants Hub is for grants only
      if (params.opportunityType === 'tenders') return [];

      // Federal and community-focused
      if (params.scope === 'council' && !params.categories?.some(cat =>
        cat.includes('community') || cat.includes('social')
      )) {
        return [];
      }

      const opportunities: Opportunity[] = [];

      // Try multiple data fetching strategies
      const strategies = [
        () => this.fetchFromAPI(params),
        () => this.fetchFromSearch(params),
        () => this.fetchFromListingPage(params),
      ];

      for (const strategy of strategies) {
        try {
          const results = await strategy();
          if (results.length > 0) {
            opportunities.push(...results);
            break; // Stop if we got results
          }
        } catch (error) {
          apiLogger.warn(
            this.name,
            `Strategy failed: ${strategy.name}`
          );
          // Continue to next strategy
        }
      }

      return opportunities;
    } catch (error) {
      apiLogger.error(
        this.name,
        'Failed to fetch opportunities',
        error instanceof Error ? error : new Error(String(error)),
        this.baseUrl
      );
      return [];
    }
  }

  /**
   * Strategy 1: Try JSON API endpoint
   */
  private async fetchFromAPI(params: SearchParams): Promise<Opportunity[]> {
    try {
      // Try common API patterns
      const endpoints = [
        '/api/grants',
        '/api/v1/grants',
        '/api/opportunities',
        '/grants/api',
        '/grants.json',
      ];

      for (const endpoint of endpoints) {
        try {
          const data = await this.resilientGet(endpoint, {
            queryParams: {
              status: 'open',
              limit: '100',
            },
            timeout: 15000,
            maxRetries: 1,
          });

          const opportunities = this.transformAPIResponse(data, params);
          if (opportunities.length > 0) {
            apiLogger.info(this.name, `Found API endpoint: ${endpoint}`);
            return opportunities;
          }
        } catch {
          // Try next endpoint
          continue;
        }
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Strategy 2: Try search endpoint
   */
  private async fetchFromSearch(params: SearchParams): Promise<Opportunity[]> {
    try {
      const searchEndpoints = [
        '/grants/search',
        '/search/grants',
        '/api/search',
      ];

      for (const endpoint of searchEndpoints) {
        try {
          const data = await this.resilientGet(endpoint, {
            queryParams: {
              q: 'community',
              status: 'open',
              limit: '100',
            },
            timeout: 15000,
            maxRetries: 1,
          });

          const opportunities = this.transformSearchResponse(data, params);
          if (opportunities.length > 0) {
            apiLogger.info(this.name, `Found search endpoint: ${endpoint}`);
            return opportunities;
          }
        } catch {
          continue;
        }
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Strategy 3: Scrape listing page (last resort)
   * Note: This would require HTML parsing - placeholder for now
   */
  private async fetchFromListingPage(params: SearchParams): Promise<Opportunity[]> {
    try {
      // This would require HTML parsing library
      // For now, return empty and log that manual integration needed
      apiLogger.warn(
        this.name,
        'HTML scraping not implemented - manual API discovery needed'
      );
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Transform API response to opportunities
   */
  private transformAPIResponse(data: any, params: SearchParams): Opportunity[] {
    const items = data?.grants || data?.opportunities || data?.results || data?.data || [];
    if (!Array.isArray(items)) return [];

    const opportunities: Opportunity[] = [];

    for (const item of items) {
      const opp = this.transformGrantItem(item, params);
      if (opp && this.validateOpportunity(opp)) {
        opportunities.push(opp);
      }
    }

    return opportunities;
  }

  /**
   * Transform search response to opportunities
   */
  private transformSearchResponse(data: any, params: SearchParams): Opportunity[] {
    // Search responses might be nested differently
    const items =
      data?.results?.grants ||
      data?.results?.items ||
      data?.results ||
      data?.grants ||
      [];

    if (!Array.isArray(items)) return [];

    const opportunities: Opportunity[] = [];

    for (const item of items) {
      const opp = this.transformGrantItem(item, params);
      if (opp && this.validateOpportunity(opp)) {
        opportunities.push(opp);
      }
    }

    return opportunities;
  }

  /**
   * Transform single grant item to Opportunity
   */
  private transformGrantItem(item: any, params: SearchParams): Opportunity | null {
    try {
      // Extract dates
      const closeDate = this.parseDate(
        item.closing_date ||
        item.closeDate ||
        item.close_date ||
        item.deadline ||
        item.applicationDeadline ||
        ''
      );

      const openDate = this.parseDate(
        item.opening_date ||
        item.openDate ||
        item.open_date ||
        item.startDate ||
        item.published_date ||
        ''
      );

      // Skip expired opportunities
      if (closeDate && this.isExpired(closeDate)) {
        return null;
      }

      // Extract amount
      const amount = this.extractAmount(
        item.funding_amount ||
        item.amount ||
        item.grant_amount ||
        item.value ||
        item.funding
      );

      // Filter by amount if specified
      if (params.minAmount && amount !== null && amount < params.minAmount) {
        return null;
      }
      if (params.maxAmount && amount !== null && amount > params.maxAmount) {
        return null;
      }

      // Extract title
      const title = item.title || item.name || item.grant_name || 'Community Grant Opportunity';

      // Extract description
      const description = this.extractText(
        item.description ||
        item.summary ||
        item.overview ||
        item.purpose ||
        ''
      ) || 'Community grant opportunity from the Australian Government Community Grants Hub.';

      // Determine category
      const category = this.categorizeGrant(item.category || item.program_type || title);

      // Filter by category if specified
      if (params.categories && params.categories.length > 0) {
        const grantCats = params.categories
          .filter((c) => !c.startsWith('tender-'))
          .map((c) => c.replace('grant-', ''));
        if (grantCats.length > 0 && !grantCats.includes(category)) {
          return null;
        }
      }

      // Build URL
      const url =
        item.url ||
        item.link ||
        item.grant_url ||
        (item.id ? `https://www.communitygrants.gov.au/grants/${item.id}` : null) ||
        'https://www.communitygrants.gov.au/grants';

      // Determine status
      const effectiveCloseDate = closeDate ||
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const status = determineOpportunityStatus(effectiveCloseDate);

      // Filter by status
      if (params.status && params.status !== 'all' && status !== params.status) {
        return null;
      }

      return {
        id: `community-grants-${item.id || item.grant_id || Math.random().toString(36).substr(2, 9)}`,
        title,
        type: 'grant',
        category,
        amount,
        minAmount: this.extractAmount(item.min_amount || item.minimum_funding) ?? undefined,
        maxAmount: this.extractAmount(item.max_amount || item.maximum_funding) ?? undefined,
        description,
        jurisdiction: 'federal',
        openDate: openDate || new Date().toISOString().split('T')[0],
        closeDate: effectiveCloseDate,
        url,
        status,
      };
    } catch (error) {
      apiLogger.warn(
        this.name,
        'Failed to transform grant item - invalid data format'
      );
      return null;
    }
  }

  /**
   * Extract amount from various formats
   */
  private extractAmount(value: any): number | null {
    if (!value) return null;

    // If already a number
    if (typeof value === 'number') return value;

    // If string, try to parse
    if (typeof value === 'string') {
      // Remove currency symbols, commas, spaces
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  /**
   * Categorize grant based on title/category
   */
  private categorizeGrant(categoryOrTitle: string): string {
    const text = categoryOrTitle.toLowerCase();

    if (text.includes('community') || text.includes('social')) return 'community';
    if (text.includes('indigenous') || text.includes('aboriginal') || text.includes('torres strait')) return 'community';
    if (text.includes('environment') || text.includes('sustainability') || text.includes('climate')) return 'environment';
    if (text.includes('health') || text.includes('wellbeing') || text.includes('mental')) return 'health';
    if (text.includes('sport') || text.includes('recreation') || text.includes('active')) return 'sport';
    if (text.includes('arts') || text.includes('culture') || text.includes('heritage')) return 'arts';
    if (text.includes('education') || text.includes('youth') || text.includes('training')) return 'education';
    if (text.includes('business') || text.includes('economic') || text.includes('employment')) return 'business';
    if (text.includes('infrastructure') || text.includes('facility') || text.includes('building')) return 'infrastructure';

    return 'community'; // Default for Community Grants Hub
  }
}
