import { NextRequest, NextResponse } from 'next/server';
import { OpportunityAggregator } from '@/lib/services';
import { validateSearchParams, ValidationError, sanitizeErrorMessage } from '@/lib/validation';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Convert URLSearchParams to plain object for validation
    const rawParams: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    // Validate and sanitize input
    const validatedParams = validateSearchParams(rawParams);

    // Fetch opportunities from all available sources
    const aggregator = new OpportunityAggregator({
      cacheEnabled: true,
    });

    const response = await aggregator.fetchOpportunities(validatedParams);

    return NextResponse.json(response);
  } catch (error) {
    // Handle validation errors separately
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          source: 'validation-error',
          count: 0,
          opportunities: [],
          error: error.message,
          field: error.field,
        },
        { status: 400 }
      );
    }

    // Log error details server-side
    console.error('Error in opportunities API:', error);

    // Return sanitized error to client
    const clientMessage = sanitizeErrorMessage(error, isDevelopment);

    return NextResponse.json(
      {
        success: false,
        source: 'error',
        count: 0,
        opportunities: [],
        error: clientMessage,
      },
      { status: 500 }
    );
  }
}
