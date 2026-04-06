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

export interface Opportunity {
  id: string;
  title: string;
  type: 'grant' | 'tender';
  category: string;
  amount: number | null;
  minAmount?: number;
  maxAmount?: number;
  description: string;
  jurisdiction: 'federal' | 'state' | 'council';
  state?: string;
  council?: string;
  openDate: string;
  closeDate: string;
  url: string;
  status: 'open' | 'closing-soon' | 'closed';
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

// Comprehensive list of Australian councils
export const COUNCILS: Council[] = [
  // NSW - Major councils
  { id: 'sydney', name: 'City of Sydney', state: 'nsw' },
  { id: 'parramatta', name: 'City of Parramatta', state: 'nsw' },
  { id: 'blacktown', name: 'Blacktown City Council', state: 'nsw' },
  { id: 'penrith', name: 'Penrith City Council', state: 'nsw' },
  { id: 'northern-beaches', name: 'Northern Beaches Council', state: 'nsw' },
  { id: 'liverpool', name: 'Liverpool City Council', state: 'nsw' },
  { id: 'canterbury-bankstown', name: 'Canterbury-Bankstown Council', state: 'nsw' },
  { id: 'central-coast', name: 'Central Coast Council', state: 'nsw' },
  { id: 'wollongong', name: 'Wollongong City Council', state: 'nsw' },
  { id: 'newcastle', name: 'City of Newcastle', state: 'nsw' },
  { id: 'lake-macquarie', name: 'Lake Macquarie City Council', state: 'nsw' },
  { id: 'blue-mountains', name: 'Blue Mountains City Council', state: 'nsw' },
  { id: 'campbelltown', name: 'Campbelltown City Council', state: 'nsw' },
  { id: 'fairfield', name: 'Fairfield City Council', state: 'nsw' },
  { id: 'hawkesbury', name: 'Hawkesbury City Council', state: 'nsw' },
  { id: 'hornsby', name: 'Hornsby Shire Council', state: 'nsw' },
  { id: 'ku-ring-gai', name: 'Ku-ring-gai Council', state: 'nsw' },
  { id: 'ryde', name: 'City of Ryde', state: 'nsw' },
  { id: 'willoughby', name: 'Willoughby City Council', state: 'nsw' },
  { id: 'sutherland', name: 'Sutherland Shire Council', state: 'nsw' },

  // VIC - Major councils
  { id: 'melbourne', name: 'City of Melbourne', state: 'vic' },
  { id: 'greater-geelong', name: 'City of Greater Geelong', state: 'vic' },
  { id: 'casey', name: 'City of Casey', state: 'vic' },
  { id: 'monash', name: 'City of Monash', state: 'vic' },
  { id: 'yarra', name: 'City of Yarra', state: 'vic' },
  { id: 'greater-dandenong', name: 'City of Greater Dandenong', state: 'vic' },
  { id: 'cardinia', name: 'Cardinia Shire Council', state: 'vic' },
  { id: 'wyndham', name: 'Wyndham City Council', state: 'vic' },
  { id: 'whitehorse', name: 'City of Whitehorse', state: 'vic' },
  { id: 'brimbank', name: 'Brimbank City Council', state: 'vic' },
  { id: 'hume', name: 'Hume City Council', state: 'vic' },
  { id: 'moreland', name: 'Moreland City Council', state: 'vic' },
  { id: 'darebin', name: 'Darebin City Council', state: 'vic' },
  { id: 'port-phillip', name: 'City of Port Phillip', state: 'vic' },
  { id: 'stonnington', name: 'City of Stonnington', state: 'vic' },
  { id: 'glen-eira', name: 'City of Glen Eira', state: 'vic' },
  { id: 'kingston', name: 'City of Kingston', state: 'vic' },
  { id: 'bayside', name: 'City of Bayside', state: 'vic' },
  { id: 'boroondara', name: 'City of Boroondara', state: 'vic' },
  { id: 'manningham', name: 'City of Manningham', state: 'vic' },

  // QLD - Major councils
  { id: 'brisbane', name: 'Brisbane City Council', state: 'qld' },
  { id: 'gold-coast', name: 'City of Gold Coast', state: 'qld' },
  { id: 'logan', name: 'Logan City Council', state: 'qld' },
  { id: 'townsville', name: 'Townsville City Council', state: 'qld' },
  { id: 'cairns', name: 'Cairns Regional Council', state: 'qld' },
  { id: 'sunshine-coast', name: 'Sunshine Coast Council', state: 'qld' },
  { id: 'ipswich', name: 'Ipswich City Council', state: 'qld' },
  { id: 'moreton-bay', name: 'Moreton Bay Regional Council', state: 'qld' },
  { id: 'redland', name: 'Redland City Council', state: 'qld' },
  { id: 'toowoomba', name: 'Toowoomba Regional Council', state: 'qld' },
  { id: 'fraser-coast', name: 'Fraser Coast Regional Council', state: 'qld' },
  { id: 'mackay', name: 'Mackay Regional Council', state: 'qld' },
  { id: 'rockhampton', name: 'Rockhampton Regional Council', state: 'qld' },
  { id: 'bundaberg', name: 'Bundaberg Regional Council', state: 'qld' },
  { id: 'gladstone', name: 'Gladstone Regional Council', state: 'qld' },

  // WA - Major councils
  { id: 'perth', name: 'City of Perth', state: 'wa' },
  { id: 'stirling', name: 'City of Stirling', state: 'wa' },
  { id: 'wanneroo', name: 'City of Wanneroo', state: 'wa' },
  { id: 'joondalup', name: 'City of Joondalup', state: 'wa' },
  { id: 'cockburn', name: 'City of Cockburn', state: 'wa' },
  { id: 'gosnells', name: 'City of Gosnells', state: 'wa' },
  { id: 'armadale', name: 'City of Armadale', state: 'wa' },
  { id: 'canning', name: 'City of Canning', state: 'wa' },
  { id: 'bayswater', name: 'City of Bayswater', state: 'wa' },
  { id: 'fremantle', name: 'City of Fremantle', state: 'wa' },
  { id: 'mandurah', name: 'City of Mandurah', state: 'wa' },
  { id: 'rockingham', name: 'City of Rockingham', state: 'wa' },
  { id: 'swan', name: 'City of Swan', state: 'wa' },
  { id: 'melville', name: 'City of Melville', state: 'wa' },

  // SA - Major councils
  { id: 'adelaide', name: 'City of Adelaide', state: 'sa' },
  { id: 'onkaparinga', name: 'City of Onkaparinga', state: 'sa' },
  { id: 'salisbury', name: 'City of Salisbury', state: 'sa' },
  { id: 'playford', name: 'City of Playford', state: 'sa' },
  { id: 'tea-tree-gully', name: 'City of Tea Tree Gully', state: 'sa' },
  { id: 'charles-sturt', name: 'City of Charles Sturt', state: 'sa' },
  { id: 'marion', name: 'City of Marion', state: 'sa' },
  { id: 'port-adelaide-enfield', name: 'City of Port Adelaide Enfield', state: 'sa' },
  { id: 'mitcham', name: 'City of Mitcham', state: 'sa' },
  { id: 'campbelltown-sa', name: 'City of Campbelltown', state: 'sa' },
  { id: 'holdfast-bay', name: 'City of Holdfast Bay', state: 'sa' },

  // TAS - Major councils
  { id: 'hobart', name: 'City of Hobart', state: 'tas' },
  { id: 'launceston', name: 'City of Launceston', state: 'tas' },
  { id: 'glenorchy', name: 'City of Glenorchy', state: 'tas' },
  { id: 'clarence', name: 'Clarence City Council', state: 'tas' },
  { id: 'kingborough', name: 'Kingborough Council', state: 'tas' },
  { id: 'devonport', name: 'Devonport City Council', state: 'tas' },
  { id: 'burnie', name: 'City of Burnie', state: 'tas' },

  // ACT
  { id: 'canberra', name: 'ACT Government', state: 'act' },

  // NT - Major councils
  { id: 'darwin', name: 'City of Darwin', state: 'nt' },
  { id: 'palmerston', name: 'City of Palmerston', state: 'nt' },
  { id: 'litchfield', name: 'Litchfield Council', state: 'nt' },
  { id: 'alice-springs', name: 'Alice Springs Town Council', state: 'nt' },
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

export function determineOpportunityStatus(closeDateStr: string): 'open' | 'closing-soon' | 'closed' {
  const closeDate = new Date(closeDateStr);
  const today = new Date();
  const diffDays = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'closed';
  if (diffDays <= 7) return 'closing-soon';
  return 'open';
}
