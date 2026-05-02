/**
 * Sentry Edge Runtime Configuration
 *
 * Captures errors in Edge Middleware and Edge API routes.
 * Optional: App works without Sentry configured.
 *
 * To enable:
 * 1. Set SENTRY_DSN in Vercel environment variables
 * 2. Get DSN from: https://sentry.io/settings/projects/your-project/keys/
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring (lower rate for edge due to volume)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

    // Error filtering
    ignoreErrors: [
      // Rate limit errors are expected, not bugs
      'Rate limit exceeded',
      // Network errors in middleware
      'NetworkError',
    ],

    beforeSend(event) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Sentry Edge] Would send error:', event);
        return null;
      }
      return event;
    },
  });
} else {
  console.log('[Sentry Edge] Not configured (SENTRY_DSN not set)');
}
