import { NextRequest, NextResponse } from 'next/server';
import { MOCK_OPPORTUNITIES, type Opportunity } from '@/lib/data';

export interface SearchParams {
  scope?: 'australia' | 'state' | 'council';
  state?: string;
  council?: string;
  opportunityType?: 'grants' | 'tenders' | 'both';
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: 'open' | 'closing-soon' | 'all';
}

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

  // Filter opportunities based on search criteria
  let results = [...MOCK_OPPORTUNITIES];

  // Filter by geographic scope
  if (params.scope === 'australia') {
    results = results.filter((opp) => opp.jurisdiction === 'federal');
  } else if (params.scope === 'state' && params.state) {
    results = results.filter(
      (opp) =>
        (opp.jurisdiction === 'state' && opp.state === params.state) ||
        opp.jurisdiction === 'federal'
    );
  } else if (params.scope === 'council' && params.council) {
    results = results.filter(
      (opp) =>
        (opp.jurisdiction === 'council' && opp.council === params.council) ||
        (opp.jurisdiction === 'state' && opp.state === params.state) ||
        opp.jurisdiction === 'federal'
    );
  }

  // Filter by opportunity type
  if (params.opportunityType && params.opportunityType !== 'both') {
    const oppType: 'grant' | 'tender' =
      params.opportunityType === 'grants' ? 'grant' : 'tender';
    results = results.filter((opp) => opp.type === oppType);
  }

  // Filter by categories
  if (params.categories && params.categories.length > 0) {
    const categoryIds = params.categories.map((cat) => {
      // Remove 'grant-' or 'tender-' prefix
      return cat.replace(/^(grant|tender)-/, '');
    });
    results = results.filter((opp) => categoryIds.includes(opp.category));
  }

  // Filter by funding amount
  if (params.minAmount !== undefined) {
    results = results.filter(
      (opp) => opp.amount !== null && opp.amount >= params.minAmount!
    );
  }
  if (params.maxAmount !== undefined) {
    results = results.filter(
      (opp) => opp.amount !== null && opp.amount <= params.maxAmount!
    );
  }

  // Filter by date range
  if (params.dateFrom) {
    results = results.filter((opp) => opp.closeDate >= params.dateFrom!);
  }
  if (params.dateTo) {
    results = results.filter((opp) => opp.openDate <= params.dateTo!);
  }

  // Filter by status
  if (params.status !== 'all') {
    results = results.filter((opp) => opp.status === params.status);
  }

  // Sort by close date (soonest first)
  results.sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime());

  return NextResponse.json({
    success: true,
    count: results.length,
    opportunities: results,
  });
}
