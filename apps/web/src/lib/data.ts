export interface Council {
  id: string;
  name: string;
  state: string;
}

export interface State {
  id: string;
  name: string;
  abbr: string;
}

export const AUSTRALIAN_STATES: State[] = [
  { id: 'nsw', name: 'New South Wales', abbr: 'NSW' },
  { id: 'vic', name: 'Victoria', abbr: 'VIC' },
  { id: 'qld', name: 'Queensland', abbr: 'QLD' },
  { id: 'wa', name: 'Western Australia', abbr: 'WA' },
  { id: 'sa', name: 'South Australia', abbr: 'SA' },
  { id: 'tas', name: 'Tasmania', abbr: 'TAS' },
  { id: 'act', name: 'Australian Capital Territory', abbr: 'ACT' },
  { id: 'nt', name: 'Northern Territory', abbr: 'NT' },
];

// Sample councils - replace with real data from API or database
export const COUNCILS: Council[] = [
  // NSW
  { id: 'sydney', name: 'City of Sydney', state: 'nsw' },
  { id: 'parramatta', name: 'City of Parramatta', state: 'nsw' },
  { id: 'blacktown', name: 'Blacktown City Council', state: 'nsw' },
  { id: 'penrith', name: 'Penrith City Council', state: 'nsw' },
  { id: 'northern-beaches', name: 'Northern Beaches Council', state: 'nsw' },

  // VIC
  { id: 'melbourne', name: 'City of Melbourne', state: 'vic' },
  { id: 'greater-geelong', name: 'City of Greater Geelong', state: 'vic' },
  { id: 'casey', name: 'City of Casey', state: 'vic' },
  { id: 'monash', name: 'City of Monash', state: 'vic' },
  { id: 'yarra', name: 'City of Yarra', state: 'vic' },

  // QLD
  { id: 'brisbane', name: 'Brisbane City Council', state: 'qld' },
  { id: 'gold-coast', name: 'City of Gold Coast', state: 'qld' },
  { id: 'logan', name: 'Logan City Council', state: 'qld' },
  { id: 'townsville', name: 'Townsville City Council', state: 'qld' },
  { id: 'cairns', name: 'Cairns Regional Council', state: 'qld' },

  // WA
  { id: 'perth', name: 'City of Perth', state: 'wa' },
  { id: 'stirling', name: 'City of Stirling', state: 'wa' },
  { id: 'wanneroo', name: 'City of Wanneroo', state: 'wa' },
  { id: 'joondalup', name: 'City of Joondalup', state: 'wa' },

  // SA
  { id: 'adelaide', name: 'City of Adelaide', state: 'sa' },
  { id: 'onkaparinga', name: 'City of Onkaparinga', state: 'sa' },
  { id: 'salisbury', name: 'City of Salisbury', state: 'sa' },

  // TAS
  { id: 'hobart', name: 'City of Hobart', state: 'tas' },
  { id: 'launceston', name: 'City of Launceston', state: 'tas' },

  // ACT
  { id: 'canberra', name: 'ACT Government', state: 'act' },

  // NT
  { id: 'darwin', name: 'City of Darwin', state: 'nt' },
  { id: 'palmerston', name: 'City of Palmerston', state: 'nt' },
];

export const GRANT_TYPES = [
  { id: 'business', name: 'Business & Innovation', icon: '💼' },
  { id: 'community', name: 'Community & Social', icon: '🤝' },
  { id: 'arts', name: 'Arts & Culture', icon: '🎨' },
  { id: 'environment', name: 'Environment & Sustainability', icon: '🌿' },
  { id: 'infrastructure', name: 'Infrastructure & Construction', icon: '🏗️' },
  { id: 'education', name: 'Education & Research', icon: '📚' },
  { id: 'health', name: 'Health & Wellbeing', icon: '⚕️' },
  { id: 'sport', name: 'Sport & Recreation', icon: '⚽' },
];

export const TENDER_TYPES = [
  { id: 'goods', name: 'Goods & Supplies', icon: '📦' },
  { id: 'services', name: 'Professional Services', icon: '💡' },
  { id: 'construction', name: 'Construction & Building', icon: '🏗️' },
  { id: 'it', name: 'IT & Technology', icon: '💻' },
  { id: 'consulting', name: 'Consulting & Advisory', icon: '📊' },
  { id: 'maintenance', name: 'Maintenance & Operations', icon: '🔧' },
];

export function getCouncilsByState(stateId: string): Council[] {
  return COUNCILS.filter((council) => council.state === stateId);
}
