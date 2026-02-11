'use client';

import { useState } from 'react';
import {
  AUSTRALIAN_STATES,
  getCouncilsByState,
  GRANT_TYPES,
  TENDER_TYPES,
  type State,
  type Council,
  type Opportunity,
} from '@/lib/data';
import {
  ChevronRight,
  MapPin,
  Building2,
  FileText,
  Search,
  DollarSign,
  Calendar,
  Filter,
} from 'lucide-react';
import { SearchResults } from './search-results';

type GeographicScope = 'australia' | 'state' | 'council';
type OpportunityType = 'grants' | 'tenders' | 'both';

interface WizardState {
  scope: GeographicScope | null;
  opportunityType: OpportunityType | null;
  selectedState: State | null;
  selectedCouncil: Council | null;
  selectedCategories: string[];
  minAmount: string;
  maxAmount: string;
  showAdvancedFilters: boolean;
}

export function GrantWizard() {
  const [wizardState, setWizardState] = useState<WizardState>({
    scope: null,
    opportunityType: null,
    selectedState: null,
    selectedCouncil: null,
    selectedCategories: [],
    minAmount: '',
    maxAmount: '',
    showAdvancedFilters: false,
  });

  const [currentStep, setCurrentStep] = useState<
    'scope' | 'state' | 'council' | 'type' | 'category' | 'results'
  >('scope');

  const [searchResults, setSearchResults] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const resetWizard = () => {
    setWizardState({
      scope: null,
      opportunityType: null,
      selectedState: null,
      selectedCouncil: null,
      selectedCategories: [],
      minAmount: '',
      maxAmount: '',
      showAdvancedFilters: false,
    });
    setCurrentStep('scope');
    setSearchResults([]);
  };

  const handleScopeSelect = (scope: GeographicScope) => {
    setWizardState({ ...wizardState, scope });
    if (scope === 'australia') {
      setCurrentStep('type');
    } else if (scope === 'state' || scope === 'council') {
      setCurrentStep('state');
    }
  };

  const handleStateSelect = (state: State) => {
    setWizardState({ ...wizardState, selectedState: state, selectedCouncil: null });
    if (wizardState.scope === 'council') {
      setCurrentStep('council');
    } else {
      setCurrentStep('type');
    }
  };

  const handleCouncilSelect = (council: Council) => {
    setWizardState({ ...wizardState, selectedCouncil: council });
    setCurrentStep('type');
  };

  const handleTypeSelect = (type: OpportunityType) => {
    setWizardState({ ...wizardState, opportunityType: type });
    setCurrentStep('category');
  };

  const handleCategoryToggle = (categoryId: string) => {
    const categories = wizardState.selectedCategories.includes(categoryId)
      ? wizardState.selectedCategories.filter((id) => id !== categoryId)
      : [...wizardState.selectedCategories, categoryId];
    setWizardState({ ...wizardState, selectedCategories: categories });
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setCurrentStep('results');

    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (wizardState.scope) params.append('scope', wizardState.scope);
      if (wizardState.selectedState)
        params.append('state', wizardState.selectedState.id);
      if (wizardState.selectedCouncil)
        params.append('council', wizardState.selectedCouncil.id);
      if (wizardState.opportunityType)
        params.append('opportunityType', wizardState.opportunityType);
      if (wizardState.selectedCategories.length > 0)
        params.append('categories', wizardState.selectedCategories.join(','));
      if (wizardState.minAmount)
        params.append('minAmount', wizardState.minAmount);
      if (wizardState.maxAmount)
        params.append('maxAmount', wizardState.maxAmount);

      params.append('status', 'all'); // Show all opportunities including closed ones

      // Call API
      const response = await fetch(`/api/opportunities?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.opportunities);
      } else {
        console.error('Search failed:', data);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching opportunities:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Breadcrumb navigation
  const getBreadcrumbs = () => {
    const crumbs = [];
    if (wizardState.scope) {
      crumbs.push(
        wizardState.scope === 'australia'
          ? 'Australia-wide'
          : wizardState.scope === 'state'
            ? 'State-wide'
            : 'Council'
      );
    }
    if (wizardState.selectedState) {
      crumbs.push(wizardState.selectedState.name);
    }
    if (wizardState.selectedCouncil) {
      crumbs.push(wizardState.selectedCouncil.name);
    }
    if (wizardState.opportunityType) {
      crumbs.push(
        wizardState.opportunityType === 'both'
          ? 'Grants & Tenders'
          : wizardState.opportunityType === 'grants'
            ? 'Grants'
            : 'Tenders'
      );
    }
    return crumbs;
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Breadcrumbs */}
      {getBreadcrumbs().length > 0 && currentStep !== 'results' && (
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={resetWizard}
            className="hover:text-foreground transition-colors"
          >
            Start
          </button>
          {getBreadcrumbs().map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">{crumb}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step: Geographic Scope */}
      {currentStep === 'scope' && (
        <div>
          <h2 className="text-3xl font-bold mb-2">Where are you looking?</h2>
          <p className="text-muted-foreground mb-8">
            Select the geographic scope for your search
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleScopeSelect('australia')}
              className="p-8 border-2 rounded-xl hover:border-primary hover:bg-accent transition-all text-left group"
            >
              <MapPin className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Australia-wide</h3>
              <p className="text-sm text-muted-foreground">
                Search all federal government opportunities across Australia
              </p>
            </button>

            <button
              onClick={() => handleScopeSelect('state')}
              className="p-8 border-2 rounded-xl hover:border-primary hover:bg-accent transition-all text-left group"
            >
              <Building2 className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">State-wide</h3>
              <p className="text-sm text-muted-foreground">
                Search opportunities from state governments
              </p>
            </button>

            <button
              onClick={() => handleScopeSelect('council')}
              className="p-8 border-2 rounded-xl hover:border-primary hover:bg-accent transition-all text-left group"
            >
              <FileText className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Local Council</h3>
              <p className="text-sm text-muted-foreground">
                Search opportunities from local government areas
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Step: State Selection */}
      {currentStep === 'state' && (
        <div>
          <h2 className="text-3xl font-bold mb-2">Select a State or Territory</h2>
          <p className="text-muted-foreground mb-8">
            Choose the state or territory you want to explore
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {AUSTRALIAN_STATES.map((state) => (
              <button
                key={state.id}
                onClick={() => handleStateSelect(state)}
                className="p-6 border-2 rounded-xl hover:border-primary hover:bg-accent transition-all"
              >
                <div className="text-4xl mb-2">{state.abbr}</div>
                <div className="text-sm font-medium">{state.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Council Selection */}
      {currentStep === 'council' && wizardState.selectedState && (
        <div>
          <h2 className="text-3xl font-bold mb-2">
            Select a Council in {wizardState.selectedState.name}
          </h2>
          <p className="text-muted-foreground mb-8">
            Choose a local government area
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
            {getCouncilsByState(wizardState.selectedState.id).map((council) => (
              <button
                key={council.id}
                onClick={() => handleCouncilSelect(council)}
                className="p-6 border-2 rounded-xl hover:border-primary hover:bg-accent transition-all text-left"
              >
                <div className="font-medium">{council.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Opportunity Type */}
      {currentStep === 'type' && (
        <div>
          <h2 className="text-3xl font-bold mb-2">What are you looking for?</h2>
          <p className="text-muted-foreground mb-8">
            Select the type of opportunities you want to find
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleTypeSelect('grants')}
              className="p-8 border-2 rounded-xl hover:border-primary hover:bg-accent transition-all text-left"
            >
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Grants</h3>
              <p className="text-sm text-muted-foreground">
                Find government grants and funding opportunities
              </p>
            </button>

            <button
              onClick={() => handleTypeSelect('tenders')}
              className="p-8 border-2 rounded-xl hover:border-primary hover:bg-accent transition-all text-left"
            >
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-2">Tenders</h3>
              <p className="text-sm text-muted-foreground">
                Find government procurement and tender opportunities
              </p>
            </button>

            <button
              onClick={() => handleTypeSelect('both')}
              className="p-8 border-2 rounded-xl hover:border-primary hover:bg-accent transition-all text-left"
            >
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Both</h3>
              <p className="text-sm text-muted-foreground">
                Search both grants and tenders
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Step: Category Selection & Advanced Filters */}
      {currentStep === 'category' && (
        <div>
          <h2 className="text-3xl font-bold mb-2">Refine Your Search</h2>
          <p className="text-muted-foreground mb-8">
            Select categories and set filters (all optional)
          </p>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() =>
              setWizardState({
                ...wizardState,
                showAdvancedFilters: !wizardState.showAdvancedFilters,
              })
            }
            className="mb-6 px-4 py-2 border-2 rounded-lg font-semibold hover:bg-accent transition-colors flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {wizardState.showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
          </button>

          {/* Advanced Filters */}
          {wizardState.showAdvancedFilters && (
            <div className="mb-8 p-6 border-2 rounded-xl bg-accent/50">
              <h3 className="text-lg font-semibold mb-4">Funding Amount Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Minimum Amount (AUD)
                  </label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="e.g. 10000"
                      value={wizardState.minAmount}
                      onChange={(e) =>
                        setWizardState({ ...wizardState, minAmount: e.target.value })
                      }
                      className="flex-1 px-4 py-2 border-2 rounded-lg focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximum Amount (AUD)
                  </label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="e.g. 100000"
                      value={wizardState.maxAmount}
                      onChange={(e) =>
                        setWizardState({ ...wizardState, maxAmount: e.target.value })
                      }
                      className="flex-1 px-4 py-2 border-2 rounded-lg focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grant Categories */}
          {(wizardState.opportunityType === 'grants' ||
            wizardState.opportunityType === 'both') && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Grant Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {GRANT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleCategoryToggle(`grant-${type.id}`)}
                    className={`p-4 border-2 rounded-lg transition-all text-left ${
                      wizardState.selectedCategories.includes(`grant-${type.id}`)
                        ? 'border-primary bg-accent'
                        : 'hover:border-primary hover:bg-accent'
                    }`}
                  >
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="text-sm font-medium">{type.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tender Categories */}
          {(wizardState.opportunityType === 'tenders' ||
            wizardState.opportunityType === 'both') && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Tender Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TENDER_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleCategoryToggle(`tender-${type.id}`)}
                    className={`p-4 border-2 rounded-lg transition-all text-left ${
                      wizardState.selectedCategories.includes(`tender-${type.id}`)
                        ? 'border-primary bg-accent'
                        : 'hover:border-primary hover:bg-accent'
                    }`}
                  >
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="text-sm font-medium">{type.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleSearch}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Search className="h-5 w-5" />
              Search Opportunities
            </button>
            <button
              onClick={handleSearch}
              className="px-8 py-3 border-2 rounded-lg font-semibold hover:bg-accent transition-colors"
            >
              Skip - Show All
            </button>
          </div>
        </div>
      )}

      {/* Step: Results */}
      {currentStep === 'results' && (
        <SearchResults
          opportunities={searchResults}
          isLoading={isLoading}
          onStartNewSearch={resetWizard}
        />
      )}
    </div>
  );
}
