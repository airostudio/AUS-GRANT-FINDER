import { NextRequest, NextResponse } from 'next/server';
import { OpportunityAggregator } from '@/lib/services';
import type { SearchParams } from '@/lib/services';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse search parameters
  const params: SearchParams = {
    scope: (searchParams.get('scope') as SearchParams['scope']) || undefined,
    state: searchParams.get('state') || undefined,
    council: searchParams.get('council') || undefined,
    opportunityType:
      (searchParams.get('opportunityType') as SearchParams['opportunityType']) || undefined,
    categories: searchParams.get('categories')?.split(',') || undefined,
    minAmount: searchParams.get('minAmount')
      ? Number(searchParams.get('minAmount'))
      : undefined,
    maxAmount: searchParams.get('maxAmount')
      ? Number(searchParams.get('maxAmount'))
      : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    status: (searchParams.get('status') as SearchParams['status']) || 'open',
  };

  try {
    const aggregator = new OpportunityAggregator({
      cacheEnabled: true,
    });

    // Fetch opportunities from all available sources
    const response = await aggregator.fetchOpportunities(params);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in opportunities API:', error);

    return NextResponse.json(
      {
        success: false,
        source: 'error',
        count: 0,
        opportunities: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
