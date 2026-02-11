'use client';

import { useState } from 'react';
import {
  AUSTRALIAN_STATES,
  getCouncilsByState,
  GRANT_TYPES,
  TENDER_TYPES,
  type State,
  type Council,
} from '@/lib/data';
import { ChevronRight, MapPin, Building2, FileText, Search } from 'lucide-react';

type GeographicScope = 'australia' | 'state' | 'council';
type OpportunityType = 'grants' | 'tenders' | 'both';

interface WizardState {
  scope: GeographicScope | null;
  opportunityType: OpportunityType | null;
  selectedState: State | null;
  selectedCouncil: Council | null;
  selectedCategories: string[];
}

export function GrantWizard() {
  const [wizardState, setWizardState] = useState<WizardState>({
    scope: null,
    opportunityType: null,
    selectedState: null,
    selectedCouncil: null,
    selectedCategories: [],
  });

  const [currentStep, setCurrentStep] = useState<
    'scope' | 'state' | 'council' | 'type' | 'category' | 'results'
  >('scope');

  const resetWizard = () => {
    setWizardState({
      scope: null,
      opportunityType: null,
      selectedState: null,
      selectedCouncil: null,
      selectedCategories: [],
    });
    setCurrentStep('scope');
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

  const handleSearch = () => {
    setCurrentStep('results');
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
      {getBreadcrumbs().length > 0 && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Step: Category Selection */}
      {currentStep === 'category' && (
        <div>
          <h2 className="text-3xl font-bold mb-2">Select Categories (Optional)</h2>
          <p className="text-muted-foreground mb-8">
            Choose one or more categories to refine your search
          </p>

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
        <div>
          <h2 className="text-3xl font-bold mb-2">Search Results</h2>
          <p className="text-muted-foreground mb-8">
            Based on your selections, here&apos;s what we found
          </p>

          <div className="p-8 border-2 border-dashed rounded-xl text-center">
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              Your search is being processed
            </h3>
            <p className="text-muted-foreground mb-6">
              The Scout is now searching for opportunities matching your criteria
            </p>
            <div className="space-y-2 text-sm text-left max-w-md mx-auto bg-accent p-4 rounded-lg">
              <div className="font-semibold mb-2">Search Criteria:</div>
              {getBreadcrumbs().map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  <span>{crumb}</span>
                </div>
              ))}
              {wizardState.selectedCategories.length > 0 && (
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  <span>{wizardState.selectedCategories.length} categories selected</span>
                </div>
              )}
            </div>
            <button
              onClick={resetWizard}
              className="mt-6 px-6 py-2 border-2 rounded-lg font-semibold hover:bg-accent transition-colors"
            >
              Start New Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
