'use client';

/**
 * Sentry Client Initialization
 *
 * Loads Sentry configuration for the browser.
 * Must be a client component to run in the browser.
 */

import { useEffect } from 'react';

export function SentryInit() {
  useEffect(() => {
    // Dynamically import Sentry client config
    // This runs once when the component mounts
    import('../../sentry.client.config').catch((err) => {
      console.error('Failed to load Sentry client config:', err);
    });
  }, []);

  return null; // This component doesn't render anything
}
