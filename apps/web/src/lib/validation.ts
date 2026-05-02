/**
 * API Input Validation
 *
 * Validates and sanitizes user input from API requests.
 * Prevents DoS, injection, and invalid data from reaching business logic.
 */

import type { SearchParams } from './services/types';

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate search parameters from API request
 */
export function validateSearchParams(params: Record<string, unknown>): SearchParams {
  const validated: SearchParams = {};

  // Validate scope
  if (params.scope) {
    const scope = String(params.scope);
    if (!['australia', 'state', 'council'].includes(scope)) {
      throw new ValidationError(
        `Invalid scope: must be 'australia', 'state', or 'council'`,
        'scope',
        scope
      );
    }
    validated.scope = scope as 'australia' | 'state' | 'council';
  }

  // Validate state
  if (params.state) {
    const state = String(params.state).toLowerCase();
    const validStates = ['nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'act', 'nt'];
    if (!validStates.includes(state)) {
      throw new ValidationError(
        `Invalid state: must be one of ${validStates.join(', ')}`,
        'state',
        state
      );
    }
    validated.state = state;
  }

  // Validate council
  if (params.council) {
    const council = String(params.council).toLowerCase();
    // Basic validation - alphanumeric and hyphens only
    if (!/^[a-z0-9-]+$/.test(council)) {
      throw new ValidationError(
        'Invalid council: must contain only lowercase letters, numbers, and hyphens',
        'council',
        council
      );
    }
    if (council.length > 50) {
      throw new ValidationError(
        'Invalid council: name too long (max 50 characters)',
        'council',
        council
      );
    }
    validated.council = council;
  }

  // Validate opportunityType
  if (params.opportunityType) {
    const type = String(params.opportunityType);
    if (!['grants', 'tenders', 'both'].includes(type)) {
      throw new ValidationError(
        `Invalid opportunityType: must be 'grants', 'tenders', or 'both'`,
        'opportunityType',
        type
      );
    }
    validated.opportunityType = type as 'grants' | 'tenders' | 'both';
  }

  // Validate categories
  if (params.categories) {
    const categories = String(params.categories).split(',').filter(Boolean);
    if (categories.length > 20) {
      throw new ValidationError(
        'Too many categories: maximum 20 allowed',
        'categories',
        categories.length
      );
    }
    const validCategoryPattern = /^(grant|tender)-(business|community|arts|environment|infrastructure|education|health|sport|goods|services|construction|it|consulting|maintenance)$/;
    for (const cat of categories) {
      if (!validCategoryPattern.test(cat)) {
        throw new ValidationError(
          'Invalid category format',
          'categories',
          cat
        );
      }
    }
    validated.categories = categories;
  }

  // Validate minAmount
  if (params.minAmount !== undefined && params.minAmount !== null && params.minAmount !== '') {
    const minAmount = Number(params.minAmount);
    if (isNaN(minAmount)) {
      throw new ValidationError(
        'Invalid minAmount: must be a number',
        'minAmount',
        params.minAmount
      );
    }
    if (minAmount < 0) {
      throw new ValidationError(
        'Invalid minAmount: must be non-negative',
        'minAmount',
        minAmount
      );
    }
    if (minAmount > 1000000000) {
      // $1 billion max
      throw new ValidationError(
        'Invalid minAmount: exceeds maximum allowed value (1,000,000,000)',
        'minAmount',
        minAmount
      );
    }
    validated.minAmount = minAmount;
  }

  // Validate maxAmount
  if (params.maxAmount !== undefined && params.maxAmount !== null && params.maxAmount !== '') {
    const maxAmount = Number(params.maxAmount);
    if (isNaN(maxAmount)) {
      throw new ValidationError(
        'Invalid maxAmount: must be a number',
        'maxAmount',
        params.maxAmount
      );
    }
    if (maxAmount < 0) {
      throw new ValidationError(
        'Invalid maxAmount: must be non-negative',
        'maxAmount',
        maxAmount
      );
    }
    if (maxAmount > 1000000000) {
      throw new ValidationError(
        'Invalid maxAmount: exceeds maximum allowed value (1,000,000,000)',
        'maxAmount',
        maxAmount
      );
    }
    validated.maxAmount = maxAmount;
  }

  // Validate amount range
  if (validated.minAmount !== undefined && validated.maxAmount !== undefined) {
    if (validated.minAmount > validated.maxAmount) {
      throw new ValidationError(
        'Invalid amount range: minAmount cannot exceed maxAmount',
        'minAmount',
        `${validated.minAmount} > ${validated.maxAmount}`
      );
    }
  }

  // Validate dateFrom
  if (params.dateFrom) {
    const dateFrom = String(params.dateFrom);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      throw new ValidationError(
        'Invalid dateFrom: must be in YYYY-MM-DD format',
        'dateFrom',
        dateFrom
      );
    }
    const date = new Date(dateFrom);
    if (isNaN(date.getTime())) {
      throw new ValidationError(
        'Invalid dateFrom: not a valid date',
        'dateFrom',
        dateFrom
      );
    }
    // Don't allow dates more than 10 years in the past or future
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
    if (date < tenYearsAgo || date > tenYearsFromNow) {
      throw new ValidationError(
        'Invalid dateFrom: date must be within 10 years of current date',
        'dateFrom',
        dateFrom
      );
    }
    validated.dateFrom = dateFrom;
  }

  // Validate dateTo
  if (params.dateTo) {
    const dateTo = String(params.dateTo);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      throw new ValidationError(
        'Invalid dateTo: must be in YYYY-MM-DD format',
        'dateTo',
        dateTo
      );
    }
    const date = new Date(dateTo);
    if (isNaN(date.getTime())) {
      throw new ValidationError(
        'Invalid dateTo: not a valid date',
        'dateTo',
        dateTo
      );
    }
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
    if (date < tenYearsAgo || date > tenYearsFromNow) {
      throw new ValidationError(
        'Invalid dateTo: date must be within 10 years of current date',
        'dateTo',
        dateTo
      );
    }
    validated.dateTo = dateTo;
  }

  // Validate date range
  if (validated.dateFrom && validated.dateTo) {
    if (new Date(validated.dateFrom) > new Date(validated.dateTo)) {
      throw new ValidationError(
        'Invalid date range: dateFrom cannot be after dateTo',
        'dateFrom',
        `${validated.dateFrom} > ${validated.dateTo}`
      );
    }
  }

  // Validate status
  if (params.status) {
    const status = String(params.status);
    if (!['open', 'closing-soon', 'all'].includes(status)) {
      throw new ValidationError(
        `Invalid status: must be 'open', 'closing-soon', or 'all'`,
        'status',
        status
      );
    }
    validated.status = status as 'open' | 'closing-soon' | 'all';
  }

  return validated;
}

/**
 * Sanitize error message for production (prevent information disclosure)
 */
export function sanitizeErrorMessage(error: unknown, isDevelopment: boolean): string {
  if (isDevelopment) {
    // In development, show full error details
    return error instanceof Error ? error.message : String(error);
  }

  // In production, show generic messages
  if (error instanceof ValidationError) {
    // Validation errors are safe to show
    return error.message;
  }

  // Generic error message for production
  return 'An internal error occurred. Please try again later.';
}
