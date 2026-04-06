/**
 * API Logger
 *
 * Centralized logging for API client errors and availability issues.
 * Logs are visible in Next.js console/Vercel logs for monitoring.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface APILog {
  timestamp: string;
  level: LogLevel;
  client: string;
  message: string;
  error?: string;
  url?: string;
}

class APILogger {
  private logs: APILog[] = [];
  private maxLogs = 100;

  log(level: LogLevel, client: string, message: string, error?: Error, url?: string) {
    const logEntry: APILog = {
      timestamp: new Date().toISOString(),
      level,
      client,
      message,
      error: error?.message,
      url,
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Log to console with appropriate level
    const prefix = `[${client}]`;
    const fullMessage = url ? `${message} (${url})` : message;

    switch (level) {
      case 'error':
        console.error(prefix, fullMessage, error || '');
        break;
      case 'warn':
        console.warn(prefix, fullMessage);
        break;
      case 'info':
        console.log(prefix, fullMessage);
        break;
    }
  }

  info(client: string, message: string) {
    this.log('info', client, message);
  }

  warn(client: string, message: string, url?: string) {
    this.log('warn', client, message, undefined, url);
  }

  error(client: string, message: string, error?: Error, url?: string) {
    this.log('error', client, message, error, url);
  }

  getLogs(limit?: number): APILog[] {
    return limit ? this.logs.slice(0, limit) : [...this.logs];
  }

  getRecentErrors(minutes: number = 60): APILog[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(
      (log) => log.level === 'error' && new Date(log.timestamp) > cutoff
    );
  }

  clear() {
    this.logs = [];
  }
}

export const apiLogger = new APILogger();

/**
 * API Health Tracker
 *
 * Tracks availability status of each API client.
 */
export interface APIHealth {
  name: string;
  available: boolean;
  lastChecked: string;
  lastSuccess?: string;
  lastError?: string;
  errorCount: number;
  successCount: number;
}

class APIHealthTracker {
  private health: Map<string, APIHealth> = new Map();

  recordCheck(clientName: string, available: boolean, error?: Error) {
    const now = new Date().toISOString();
    const existing = this.health.get(clientName);

    if (available) {
      this.health.set(clientName, {
        name: clientName,
        available: true,
        lastChecked: now,
        lastSuccess: now,
        lastError: existing?.lastError,
        errorCount: existing?.errorCount || 0,
        successCount: (existing?.successCount || 0) + 1,
      });
    } else {
      this.health.set(clientName, {
        name: clientName,
        available: false,
        lastChecked: now,
        lastSuccess: existing?.lastSuccess,
        lastError: now,
        errorCount: (existing?.errorCount || 0) + 1,
        successCount: existing?.successCount || 0,
      });

      // Log warning if API has been down for multiple consecutive checks
      if (existing && existing.errorCount >= 2) {
        apiLogger.warn(
          clientName,
          `API unavailable (${existing.errorCount + 1} consecutive failures)`
        );
      }
    }
  }

  getHealth(clientName?: string): APIHealth | APIHealth[] | undefined {
    if (clientName) {
      return this.health.get(clientName);
    }
    return Array.from(this.health.values());
  }

  getUnavailableAPIs(): APIHealth[] {
    return Array.from(this.health.values()).filter((h) => !h.available);
  }

  getAllHealth(): Record<string, APIHealth> {
    const result: Record<string, APIHealth> = {};
    this.health.forEach((health, name) => {
      result[name] = health;
    });
    return result;
  }

  clear() {
    this.health.clear();
  }
}

export const apiHealthTracker = new APIHealthTracker();
