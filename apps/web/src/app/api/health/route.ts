import { NextResponse } from 'next/server';
import { apiLogger, apiHealthTracker } from '@/lib/services/logger';

/**
 * API Health Check Endpoint
 *
 * GET /api/health
 *
 * Returns the health status of all API clients and recent error logs.
 * Use this for monitoring and debugging API connectivity issues.
 */
export async function GET() {
  try {
    const health = apiHealthTracker.getAllHealth();
    const recentErrors = apiLogger.getRecentErrors(60); // Last 60 minutes
    const recentLogs = apiLogger.getLogs(50);

    const summary = {
      timestamp: new Date().toISOString(),
      totalAPIs: Object.keys(health).length,
      availableAPIs: Object.values(health).filter((h) => h.available).length,
      unavailableAPIs: Object.values(health).filter((h) => !h.available).length,
      recentErrorCount: recentErrors.length,
    };

    return NextResponse.json({
      success: true,
      summary,
      health,
      recentErrors,
      recentLogs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
