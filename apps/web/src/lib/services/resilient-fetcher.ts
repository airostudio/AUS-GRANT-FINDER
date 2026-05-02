/**
 * Resilient HTTP Fetcher
 *
 * Provides robust HTTP fetching with:
 * - Exponential backoff retry
 * - Circuit breaker pattern
 * - Request timeouts
 * - Response validation
 * - Automatic endpoint failover
 */

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'HEAD';
  headers?: HeadersInit;
  body?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  validateResponse?: (response: Response) => Promise<boolean>;
  circuitBreakerThreshold?: number;
}

export interface EndpointHealth {
  url: string;
  successCount: number;
  failureCount: number;
  lastSuccess?: number;
  lastFailure?: number;
  circuitOpen: boolean;
  circuitOpenUntil?: number;
}

const DEFAULT_TIMEOUT = 15000; // 15 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second base delay
const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening circuit
const CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minute

/**
 * Circuit Breaker implementation
 * Opens after consecutive failures, prevents cascading failures
 */
class CircuitBreaker {
  private health = new Map<string, EndpointHealth>();

  getHealth(url: string): EndpointHealth {
    const baseUrl = this.getBaseUrl(url);
    if (!this.health.has(baseUrl)) {
      this.health.set(baseUrl, {
        url: baseUrl,
        successCount: 0,
        failureCount: 0,
        circuitOpen: false,
      });
    }
    return this.health.get(baseUrl)!;
  }

  recordSuccess(url: string): void {
    const health = this.getHealth(url);
    health.successCount++;
    health.lastSuccess = Date.now();
    health.failureCount = 0; // Reset failure count on success

    // Close circuit if it was open
    if (health.circuitOpen) {
      health.circuitOpen = false;
      health.circuitOpenUntil = undefined;
    }
  }

  recordFailure(url: string, threshold: number = CIRCUIT_BREAKER_THRESHOLD): void {
    const health = this.getHealth(url);
    health.failureCount++;
    health.lastFailure = Date.now();

    // Open circuit if failure threshold reached
    if (health.failureCount >= threshold) {
      health.circuitOpen = true;
      health.circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_TIME;
    }
  }

  isCircuitOpen(url: string): boolean {
    const health = this.getHealth(url);

    // Check if circuit should be reset
    if (health.circuitOpen && health.circuitOpenUntil && Date.now() > health.circuitOpenUntil) {
      health.circuitOpen = false;
      health.circuitOpenUntil = undefined;
      health.failureCount = 0; // Reset for retry
    }

    return health.circuitOpen;
  }

  getAllHealth(): EndpointHealth[] {
    return Array.from(this.health.values());
  }

  private getBaseUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return url;
    }
  }
}

const globalCircuitBreaker = new CircuitBreaker();

/**
 * Resilient fetch with retry logic and circuit breaker
 */
export async function resilientFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    method = 'GET',
    headers,
    body,
    timeout = DEFAULT_TIMEOUT,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    validateResponse,
    circuitBreakerThreshold = CIRCUIT_BREAKER_THRESHOLD,
  } = options;

  // Check circuit breaker
  if (globalCircuitBreaker.isCircuitOpen(url)) {
    const health = globalCircuitBreaker.getHealth(url);
    const resetIn = health.circuitOpenUntil ? Math.ceil((health.circuitOpenUntil - Date.now()) / 1000) : 0;
    throw new Error(`Circuit breaker OPEN for ${url} (resets in ${resetIn}s)`);
  }

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Validate response if validator provided
      if (validateResponse) {
        const isValid = await validateResponse(response.clone());
        if (!isValid) {
          throw new Error(`Response validation failed for ${url}`);
        }
      }

      // Record success
      globalCircuitBreaker.recordSuccess(url);

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;

      // Don't retry if max retries reached
      if (attempt > maxRetries) {
        globalCircuitBreaker.recordFailure(url, circuitBreakerThreshold);
        break;
      }

      // Don't retry on non-retriable errors
      if (!isRetriableError(lastError)) {
        globalCircuitBreaker.recordFailure(url, circuitBreakerThreshold);
        throw lastError;
      }

      // Exponential backoff: delay * 2^attempt
      const delayMs = retryDelay * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }
  }

  // All retries exhausted
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

/**
 * Fetch with automatic endpoint failover
 * Tries multiple URL variations until one succeeds
 */
export async function fetchWithFailover(
  urls: string[],
  options: FetchOptions = {}
): Promise<{ response: Response; workingUrl: string }> {
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const response = await resilientFetch(url, options);
      return { response, workingUrl: url };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next URL
    }
  }

  throw lastError || new Error(`All endpoints failed: ${urls.join(', ')}`);
}

/**
 * Fetch JSON with automatic parsing and validation
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchOptions & { validateJSON?: (data: any) => boolean } = {}
): Promise<T> {
  const { validateJSON, ...fetchOptions } = options;

  const response = await resilientFetch(url, {
    ...fetchOptions,
    headers: {
      Accept: 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Validate JSON structure if validator provided
  if (validateJSON && !validateJSON(data)) {
    throw new Error(`JSON validation failed for ${url}`);
  }

  return data as T;
}

/**
 * Check if error should trigger a retry
 */
function isRetriableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Timeout errors - retry
  if (message.includes('timeout') || message.includes('aborted')) {
    return true;
  }

  // Network errors - retry
  if (message.includes('fetch') || message.includes('network')) {
    return true;
  }

  // DNS errors - retry
  if (message.includes('enotfound') || message.includes('getaddrinfo')) {
    return true;
  }

  // Connection errors - retry
  if (message.includes('econnrefused') || message.includes('econnreset')) {
    return true;
  }

  // Circuit breaker - don't retry (already open)
  if (message.includes('circuit breaker open')) {
    return false;
  }

  // 5xx server errors - retry
  if (message.match(/http 5\d\d/i)) {
    return true;
  }

  // 429 rate limit - retry with backoff
  if (message.includes('429')) {
    return true;
  }

  // 4xx client errors (except 429) - don't retry
  if (message.match(/http 4\d\d/i)) {
    return false;
  }

  // Default: retry
  return true;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get circuit breaker health status
 */
export function getCircuitBreakerHealth(): EndpointHealth[] {
  return globalCircuitBreaker.getAllHealth();
}

/**
 * Reset circuit breaker for a specific endpoint
 */
export function resetCircuitBreaker(url: string): void {
  const health = globalCircuitBreaker.getHealth(url);
  health.circuitOpen = false;
  health.circuitOpenUntil = undefined;
  health.failureCount = 0;
}
