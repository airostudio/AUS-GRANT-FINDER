import { Opportunity, determineOpportunityStatus } from '../data';
import { APIClient, SearchParams } from './types';

/**
 * Australian Research Council (ARC) Grants Client
 *
 * ARC provides two data sources:
 * 1. Current funding opportunities: https://www.arc.gov.au/funding-research/current-grants-opportunities
 *    - Fetched via ARC's Drupal JSON:API endpoint
 * 2. Historical grants dataset (2001-present): available as JSON download
 *    - https://www.arc.gov.au/funding-research/funding-outcomes/grants-dataset
 *
 * All ARC grants are federal jurisdiction and categorised as education/research.
 */
export class ARCGrantsClient implements APIClient {
  name = 'ARC Grants';
  private currentOpportunitiesUrl: string;

  constructor() {
    // ARC's Drupal JSON:API for funding opportunities nodes
    this.currentOpportunitiesUrl =
      process.env.ARC_API_URL ||
      'https://www.arc.gov.au/jsonapi/node/funding_opportunity?filter[status]=1&sort=-created&page[limit]=50';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.currentOpportunitiesUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      // ARC only provides grants, skip for tender-only queries
      if (params.opportunityType === 'tenders') return [];

      // ARC is federal only
      if (params.scope === 'council') return [];

      // If categories are specified and none are education-related, skip
      if (params.categories && params.categories.length > 0) {
        const hasRelevantCategory = params.categories.some((cat) =>
          cat.includes('education') || cat.includes('research') || cat.includes('community')
        );
        if (!hasRelevantCategory) return [];
      }

      const opportunities = await this.fetchCurrentOpportunities(params);
      return opportunities;
    } catch (error) {
      console.error(`${this.name} fetch error:`, error);
      return [];
    }
  }

  private async fetchCurrentOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      const response = await fetch(this.currentOpportunitiesUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.api+json, application/json',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error(`ARC API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      return this.transformDrupalJsonApi(data, params);
    } catch (error) {
      console.error(`ARC current opportunities fetch error:`, error);
      return [];
    }
  }

  private transformDrupalJsonApi(data: any, params: SearchParams): Opportunity[] {
    // Handle Drupal JSON:API format
    if (!data?.data || !Array.isArray(data.data)) return [];

    const opportunities: Opportunity[] = [];

    for (const node of data.data) {
      const attrs = node.attributes || {};

      // Get dates from various possible field names
      const closeDate = this.extractDate(
        attrs.field_closing_date ||
        attrs.field_close_date ||
        attrs.field_end_date ||
        attrs.field_deadline
      );

      const openDate = this.extractDate(
        attrs.field_open_date ||
        attrs.field_opening_date ||
        attrs.field_start_date ||
        attrs.created
      );

      // Skip closed opportunities
      if (closeDate) {
        const close = new Date(closeDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (close < yesterday) continue;
      }

      const title = attrs.title || attrs.field_title || 'ARC Funding Opportunity';
      const description = this.extractText(
        attrs.body?.value ||
        attrs.field_summary?.value ||
        attrs.field_description?.value ||
        attrs.field_summary
      );

      const amount = attrs.field_total_funding || attrs.field_grant_value || null;
      const minAmount = attrs.field_minimum_grant || attrs.field_min_amount;
      const maxAmount = attrs.field_maximum_grant || attrs.field_max_amount;

      // Determine URL
      const urlAlias = attrs.path?.alias || '';
      const url = urlAlias
        ? `https://www.arc.gov.au${urlAlias}`
        : `https://www.arc.gov.au/funding-research/current-grants-opportunities`;

      // Filter by amount
      if (params.minAmount && amount !== null && amount < params.minAmount) continue;
      if (params.maxAmount && amount !== null && amount > params.maxAmount) continue;

      const effectiveCloseDate = closeDate ||
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const status = determineOpportunityStatus(effectiveCloseDate);

      opportunities.push({
        id: `arc-${node.id || node.attributes?.drupal_internal__nid || Math.random()}`,
        title,
        type: 'grant',
        category: 'education',
        amount: amount ? Number(amount) : null,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        description: description || 'Australian Research Council funding opportunity for research excellence.',
        jurisdiction: 'federal',
        openDate: openDate || new Date().toISOString().split('T')[0],
        closeDate: effectiveCloseDate,
        url,
        status,
      });
    }

    return opportunities;
  }

  private extractDate(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') {
      // Handle ISO dates like "2026-03-15T00:00:00+00:00"
      return value.split('T')[0];
    }
    if (typeof value === 'object' && value.value) {
      return String(value.value).split('T')[0];
    }
    return '';
  }

  private extractText(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') {
      // Strip HTML tags
      return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
    }
    return '';
  }
}
