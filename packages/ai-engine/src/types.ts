export interface GrantCriteria {
  id: string;
  title: string;
  description: string;
  weight?: number;
  maxWords?: number;
}

export interface OrganizationData {
  name: string;
  abn: string;
  industry: string;
  yearsInOperation: number;
  employees: number;
  revenue: number;
  previousGrants?: string[];
  achievements: string[];
  capabilities: string[];
}

export interface GrantRequest {
  grantId: string;
  criteria: GrantCriteria[];
  organizationData: OrganizationData;
  guidelines?: string;
}

export interface GrantResponse {
  criteriaId: string;
  response: string;
  wordCount: number;
  confidence: number;
  evidence: string[];
}

export interface WriterConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
