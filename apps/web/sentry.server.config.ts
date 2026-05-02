/**
 * Sentry Server Configuration
 *
 * Captures server-side errors (API routes, Server Components, etc.)
 * Optional: App works without Sentry configured.
 *
 * To enable:
 * 1. Set SENTRY_DSN in Vercel environment variables (server-side only)
 * 2. Get DSN from: https://sentry.io/settings/projects/your-project/keys/
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod

    // Enable profiling (captures function performance)
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Error filtering
    ignoreErrors: [
      // Ignore API timeout errors (these are expected)
      'AbortError',
      'TimeoutError',
      // Ignore validation errors (user input errors, not bugs)
      'ValidationError',
    ],

    // Add context to errors
    beforeSend(event, hint) {
      // Add API client name if available
      if (hint.originalException && typeof hint.originalException === 'object') {
        const err = hint.originalException as any;
        if (err.clientName) {
          event.tags = event.tags || {};
          event.tags.apiClient = err.clientName;
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Sentry Server] Would send error:', event);
        return null; // Don't actually send in development
      }

      return event;
    },
  });
} else {
  console.log('[Sentry Server] Not configured (SENTRY_DSN not set)');
}
