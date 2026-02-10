export interface PortalMapping {
  portalId: string;
  name: string;
  baseUrl: string;
  loginUrl?: string;
  applicationUrl: string;
  fields: FieldMapping[];
  navigation: NavigationStep[];
}

export interface FieldMapping {
  criteriaId: string;
  selector: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file';
  maxLength?: number;
  required: boolean;
  validation?: string;
}

export interface NavigationStep {
  step: number;
  description: string;
  url?: string;
  action: 'click' | 'navigate' | 'wait';
  selector?: string;
  verificationSelector?: string;
}

export interface ApplicationData {
  grantId: string;
  responses: Map<string, string>;
  attachments: Map<string, string>;
  metadata: Record<string, any>;
}

export interface FillOptions {
  portal: string;
  mode: 'automatic' | 'semi-automatic' | 'manual';
  headless?: boolean;
  screenshots?: boolean;
  dryRun?: boolean;
}

export interface SubmissionResult {
  success: boolean;
  referenceNumber?: string;
  screenshots: string[];
  errors: string[];
  timestamp: Date;
}
