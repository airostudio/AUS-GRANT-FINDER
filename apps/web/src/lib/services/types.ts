import { Opportunity } from '../data';

export interface APIClient {
  fetchOpportunities(params: SearchParams): Promise<Opportunity[]>;
  name: string;
  isAvailable(): Promise<boolean>;
}

export interface SearchParams {
  scope?: 'australia' | 'state' | 'council';
  state?: string;
  council?: string;
  opportunityType?: 'grants' | 'tenders' | 'both';
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: 'open' | 'closing-soon' | 'all';
}

export interface APIResponse {
  success: boolean;
  source: string;
  count: number;
  opportunities: Opportunity[];
  error?: string;
}
