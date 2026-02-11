'use client';

import { useEffect, useState } from 'react';
import { Opportunity } from '@/lib/data';
import {
  Calendar,
  DollarSign,
  MapPin,
  ExternalLink,
  Clock,
  Filter,
  Search,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

type TabType = 'current' | 'upcoming';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'grant' | 'tender'>('all');

  useEffect(() => {
    fetchOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunities, activeTab, searchTerm, selectedType]);

  const fetchOpportunities = async () => {
    setIsLoading(true);
    try {
      // Fetch all opportunities without filters
      const response = await fetch('/api/opportunities?status=all');
      const data = await response.json();

      if (data.success) {
        setOpportunities(data.opportunities);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterOpportunities = () => {
    let filtered = [...opportunities];

    // Filter by tab (current vs upcoming)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (activeTab === 'current') {
      // Current: open now and closing in the future
      filtered = filtered.filter((opp) => {
        const openDate = new Date(opp.openDate);
        const closeDate = new Date(opp.closeDate);
        return openDate <= today && closeDate >= today;
      });
    } else {
      // Upcoming: opens in the future
      filtered = filtered.filter((opp) => {
        const openDate = new Date(opp.openDate);
        return openDate > today;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (opp) =>
          opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          opp.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((opp) => opp.type === selectedType);
    }

    // Sort by close date (for current) or open date (for upcoming)
    filtered.sort((a, b) => {
      const dateA = new Date(activeTab === 'current' ? a.closeDate : a.openDate);
      const dateB = new Date(activeTab === 'current' ? b.closeDate : b.openDate);
      return dateA.getTime() - dateB.getTime();
    });

    setFilteredOpportunities(filtered);
  };

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

  const getDaysRemaining = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysUntilOpen = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (opportunity: Opportunity) => {
    if (activeTab === 'upcoming') {
      const daysUntil = getDaysUntilOpen(opportunity.openDate);
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
          Opens in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
        </span>
      );
    }

    const daysRemaining = getDaysRemaining(opportunity.closeDate);
    if (daysRemaining <= 7) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
          Closing Soon
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
        Open
      </span>
    );
  };

  const getJurisdictionLabel = (opportunity: Opportunity) => {
    if (opportunity.jurisdiction === 'federal') return 'Federal Government';
    if (opportunity.jurisdiction === 'state')
      return `${opportunity.state?.toUpperCase()} Government`;
    if (opportunity.jurisdiction === 'council') return opportunity.council || 'Local Council';
    return 'Government';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold">Government Opportunities</h1>
              <p className="text-muted-foreground mt-2">
                Explore grants and tenders from Australian governments
              </p>
            </div>
            <a
              href="/"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Wizard Search
            </a>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 border-b">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'current'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Current Opportunities
              </div>
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'upcoming'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Opportunities
              </div>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedType === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'border-2 hover:bg-accent'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedType('grant')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedType === 'grant'
                  ? 'bg-primary text-primary-foreground'
                  : 'border-2 hover:bg-accent'
              }`}
            >
              💰 Grants
            </button>
            <button
              onClick={() => setSelectedType('tender')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedType === 'tender'
                  ? 'bg-primary text-primary-foreground'
                  : 'border-2 hover:bg-accent'
              }`}
            >
              📋 Tenders
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading opportunities...</p>
          </div>
        )}

        {/* Results Count */}
        {!isLoading && (
          <div className="mb-6 flex items-center gap-2 text-muted-foreground">
            <Filter className="h-5 w-5" />
            <span>
              Showing {filteredOpportunities.length}{' '}
              {activeTab === 'current' ? 'current' : 'upcoming'}{' '}
              {filteredOpportunities.length === 1 ? 'opportunity' : 'opportunities'}
            </span>
          </div>
        )}

        {/* Opportunity List */}
        {!isLoading && filteredOpportunities.length === 0 && (
          <div className="p-12 border-2 border-dashed rounded-xl text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground mb-2">
              No {activeTab} opportunities found
            </p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or check back later
            </p>
          </div>
        )}

        {!isLoading && filteredOpportunities.length > 0 && (
          <div className="space-y-4">
            {filteredOpportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="p-6 border-2 rounded-xl hover:border-primary transition-all bg-white"
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
                      <div className="text-xs text-muted-foreground">
                        {activeTab === 'current' ? 'Opened' : 'Opens'}
                      </div>
                      <div className="font-semibold">{formatDate(opportunity.openDate)}</div>
                      {activeTab === 'upcoming' && (
                        <div className="text-xs text-muted-foreground">
                          {getDaysUntilOpen(opportunity.openDate)} days from now
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Closes</div>
                      <div className="font-semibold">{formatDate(opportunity.closeDate)}</div>
                      {activeTab === 'current' && (
                        <div className="text-xs text-muted-foreground">
                          {getDaysRemaining(opportunity.closeDate) > 0
                            ? `${getDaysRemaining(opportunity.closeDate)} days remaining`
                            : 'Closed'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
