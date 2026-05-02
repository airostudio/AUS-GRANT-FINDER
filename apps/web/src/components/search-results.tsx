'use client';

import { Opportunity } from '@/lib/data';
import { Calendar, DollarSign, MapPin, ExternalLink, Clock, Globe } from 'lucide-react';
import { getJurisdictionPortals, getPortalLink } from '@/lib/government-links';

interface SearchResultsProps {
  opportunities: Opportunity[];
  isLoading: boolean;
  onStartNewSearch: () => void;
}

export function SearchResults({
  opportunities,
  isLoading,
  onStartNewSearch,
}: SearchResultsProps) {
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'Amount not specified';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (closeDateString: string) => {
    const closeDate = new Date(closeDateString);
    const today = new Date();
    const diffTime = closeDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (opportunity: Opportunity) => {
    const daysRemaining = getDaysRemaining(opportunity.closeDate);
    if (daysRemaining < 0) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
          Closed
        </span>
      );
    } else if (daysRemaining <= 7) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
          Closing Soon
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
          Open
        </span>
      );
    }
  };

  const getJurisdictionLabel = (opportunity: Opportunity) => {
    if (opportunity.jurisdiction === 'federal') return 'Federal Government';
    if (opportunity.jurisdiction === 'state')
      return `${opportunity.state?.toUpperCase()} Government`;
    if (opportunity.jurisdiction === 'council') return opportunity.council || 'Local Council';
    return 'Government';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
        <p className="text-lg text-muted-foreground">Searching opportunities...</p>
      </div>
    );
  }

  // Get unique jurisdictions from opportunities
  const jurisdictions = Array.from(
    new Set(
      opportunities.map((opp) => ({
        jurisdiction: opp.jurisdiction,
        state: opp.state,
        council: opp.council,
      }))
    )
  );

  // Get official portals to show
  const officialPortals = jurisdictions.flatMap((j) =>
    getJurisdictionPortals(j.jurisdiction, j.state, j.council)
  );

  // Remove duplicates
  const uniquePortals = Array.from(
    new Map(officialPortals.map((p) => [p.name, p])).values()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold">Search Results</h2>
          <p className="text-muted-foreground mt-1">
            Found {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'}
          </p>
        </div>
        <button
          onClick={onStartNewSearch}
          className="px-4 py-2 border-2 rounded-lg font-semibold hover:bg-accent transition-colors"
        >
          New Search
        </button>
      </div>

      {/* Official Government Portals */}
      {uniquePortals.length > 0 && (
        <div className="mb-6 p-4 border-2 border-blue-200 bg-blue-50 rounded-xl">
          <div className="flex items-start gap-2 mb-3">
            <Globe className="h-5 w-5 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900">Official Government Portals</h3>
              <p className="text-sm text-blue-700">
                Browse more opportunities on official government websites
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {uniquePortals.map((portal) => (
              <div key={portal.name} className="flex items-center gap-2">
                {portal.grantsUrl && (
                  <a
                    href={portal.grantsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition-colors flex items-center justify-between group"
                  >
                    <span className="font-medium text-blue-900">{portal.name}</span>
                    <ExternalLink className="h-4 w-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                )}
                {portal.tendersUrl && !portal.grantsUrl && (
                  <a
                    href={portal.tendersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition-colors flex items-center justify-between group"
                  >
                    <span className="font-medium text-blue-900">{portal.name}</span>
                    <ExternalLink className="h-4 w-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {opportunities.length === 0 ? (
        <div className="p-12 border-2 border-dashed rounded-xl text-center">
          <p className="text-xl text-muted-foreground mb-4">
            No opportunities found matching your criteria
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Try adjusting your filters or search for a different area
          </p>
          <button
            onClick={onStartNewSearch}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90"
          >
            Start New Search
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <div
              key={opportunity.id}
              className="p-6 border-2 rounded-xl hover:border-primary transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{opportunity.title}</h3>
                    {getStatusBadge(opportunity)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="px-2 py-1 bg-accent rounded text-xs font-medium">
                      {opportunity.type === 'grant' ? '💰 Grant' : '📋 Tender'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {getJurisdictionLabel(opportunity)}
                    </span>
                  </div>
                </div>
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  View Details
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <p className="text-muted-foreground mb-4">{opportunity.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">Funding Amount</div>
                    <div className="font-semibold">{formatCurrency(opportunity.amount)}</div>
                    {opportunity.minAmount && opportunity.maxAmount && (
                      <div className="text-xs text-muted-foreground">
                        ${opportunity.minAmount.toLocaleString()} - $
                        {opportunity.maxAmount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">Opens</div>
                    <div className="font-semibold">{formatDate(opportunity.openDate)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">Closes</div>
                    <div className="font-semibold">{formatDate(opportunity.closeDate)}</div>
                    <div className="text-xs text-muted-foreground">
                      {getDaysRemaining(opportunity.closeDate) > 0
                        ? `${getDaysRemaining(opportunity.closeDate)} days remaining`
                        : 'Closed'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
