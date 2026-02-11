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

// Mock opportunity data for testing
export const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: '1',
    title: 'Community Development Grant Program 2026',
    type: 'grant',
    category: 'community',
    amount: 50000,
    minAmount: 10000,
    maxAmount: 50000,
    description:
      'Funding to support community organizations delivering programs that enhance social cohesion and community wellbeing.',
    jurisdiction: 'federal',
    openDate: '2026-01-15',
    closeDate: '2026-03-31',
    url: 'https://grants.gov.au/example1',
    status: 'open',
  },
  {
    id: '2',
    title: 'Small Business Innovation Fund',
    type: 'grant',
    category: 'business',
    amount: 100000,
    minAmount: 20000,
    maxAmount: 100000,
    description:
      'Support for small businesses developing innovative products or services with commercial potential.',
    jurisdiction: 'state',
    state: 'nsw',
    openDate: '2026-02-01',
    closeDate: '2026-04-15',
    url: 'https://example.nsw.gov.au/grant1',
    status: 'open',
  },
  {
    id: '3',
    title: 'Arts and Cultural Infrastructure Grants',
    type: 'grant',
    category: 'arts',
    amount: 200000,
    minAmount: 50000,
    maxAmount: 500000,
    description:
      'Capital funding for arts and cultural facilities, equipment, and infrastructure projects.',
    jurisdiction: 'state',
    state: 'vic',
    openDate: '2026-01-20',
    closeDate: '2026-03-20',
    url: 'https://example.vic.gov.au/arts-grant',
    status: 'closing-soon',
  },
  {
    id: '4',
    title: 'IT Services Tender - Case Management System',
    type: 'tender',
    category: 'it',
    amount: 750000,
    description:
      'Design, development, and implementation of a modern case management system for state government agency.',
    jurisdiction: 'state',
    state: 'qld',
    openDate: '2026-02-05',
    closeDate: '2026-03-25',
    url: 'https://qtenders.gov.au/example1',
    status: 'open',
  },
  {
    id: '5',
    title: 'Road Maintenance Services Contract',
    type: 'tender',
    category: 'maintenance',
    amount: 2000000,
    description:
      'Multi-year contract for road maintenance services including repairs, resurfacing, and line marking.',
    jurisdiction: 'council',
    state: 'nsw',
    council: 'sydney',
    openDate: '2026-01-10',
    closeDate: '2026-02-28',
    url: 'https://sydney.gov.au/tenders/example1',
    status: 'closing-soon',
  },
  {
    id: '6',
    title: 'Environmental Sustainability Grants',
    type: 'grant',
    category: 'environment',
    amount: 75000,
    minAmount: 15000,
    maxAmount: 75000,
    description:
      'Support for projects that reduce carbon emissions, improve energy efficiency, or protect biodiversity.',
    jurisdiction: 'federal',
    openDate: '2026-02-01',
    closeDate: '2026-05-31',
    url: 'https://environment.gov.au/grants/example1',
    status: 'open',
  },
  {
    id: '7',
    title: 'Professional Services Panel - Project Management',
    type: 'tender',
    category: 'consulting',
    amount: 5000000,
    description:
      'Establishment of a panel of project management consultants for government infrastructure projects.',
    jurisdiction: 'state',
    state: 'wa',
    openDate: '2026-01-25',
    closeDate: '2026-03-15',
    url: 'https://tenders.wa.gov.au/example1',
    status: 'open',
  },
  {
    id: '8',
    title: 'Sports Facilities Upgrade Grant',
    type: 'grant',
    category: 'sport',
    amount: 150000,
    minAmount: 30000,
    maxAmount: 150000,
    description:
      'Funding for upgrading local sports facilities including equipment, lighting, and amenities.',
    jurisdiction: 'council',
    state: 'vic',
    council: 'melbourne',
    openDate: '2026-01-15',
    closeDate: '2026-03-15',
    url: 'https://melbourne.vic.gov.au/grants/sport',
    status: 'closing-soon',
  },
  {
    id: '9',
    title: 'Construction Services - New Community Centre',
    type: 'tender',
    category: 'construction',
    amount: 8500000,
    description:
      'Design and construct a new multi-purpose community centre with sustainable building practices.',
    jurisdiction: 'council',
    state: 'qld',
    council: 'brisbane',
    openDate: '2026-02-10',
    closeDate: '2026-04-10',
    url: 'https://brisbane.qld.gov.au/tenders/example1',
    status: 'open',
  },
  {
    id: '10',
    title: 'Health and Wellbeing Program Grants',
    type: 'grant',
    category: 'health',
    amount: 40000,
    minAmount: 5000,
    maxAmount: 40000,
    description:
      'Support for community health and wellbeing programs targeting mental health, physical activity, or nutrition.',
    jurisdiction: 'state',
    state: 'sa',
    openDate: '2026-01-20',
    closeDate: '2026-04-20',
    url: 'https://health.sa.gov.au/grants',
    status: 'open',
  },
  {
    id: '11',
    title: 'Education and Research Collaboration Fund',
    type: 'grant',
    category: 'education',
    amount: 300000,
    minAmount: 100000,
    maxAmount: 500000,
    description:
      'Funding for collaborative research projects between universities and industry partners.',
    jurisdiction: 'federal',
    openDate: '2026-02-15',
    closeDate: '2026-06-15',
    url: 'https://education.gov.au/grants/research',
    status: 'open',
  },
  {
    id: '12',
    title: 'Supply of Office Furniture and Equipment',
    type: 'tender',
    category: 'goods',
    amount: 450000,
    description:
      'Supply and installation of office furniture and equipment for new government building.',
    jurisdiction: 'state',
    state: 'tas',
    openDate: '2026-01-30',
    closeDate: '2026-03-10',
    url: 'https://tenders.tas.gov.au/example1',
    status: 'closing-soon',
  },
];
