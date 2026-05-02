/**
 * Sentry Client Configuration
 *
 * Captures client-side errors and performance metrics.
 * Optional: App works without Sentry configured.
 *
 * To enable:
 * 1. Set NEXT_PUBLIC_SENTRY_DSN in Vercel environment variables
 * 2. Get DSN from: https://sentry.io/settings/projects/your-project/keys/
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session replay (captures user sessions for debugging)
    replaysSessionSampleRate: 0.01, // 1% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Error filtering
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random network errors
      'NetworkError',
      'Failed to fetch',
      // Ignore these common non-issues
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
    ],

    // Don't send data in development (comment this out to test Sentry locally)
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Sentry] Would send error:', event);
        return null; // Don't actually send in development
      }
      return event;
    },
  });
} else {
  console.log('[Sentry] Not configured (NEXT_PUBLIC_SENTRY_DSN not set)');
}
