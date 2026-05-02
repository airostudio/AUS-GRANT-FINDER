/**
 * Official Government Grant and Tender Portal Links
 *
 * Centralized source of truth for official government websites
 * where users can browse and apply for grants and tenders.
 */

export interface GovernmentPortal {
  name: string;
  grantsUrl?: string;
  tendersUrl?: string;
  description: string;
}

/**
 * Federal Government Portals
 */
export const FEDERAL_PORTALS: GovernmentPortal[] = [
  {
    name: 'GrantConnect',
    grantsUrl: 'https://www.grants.gov.au/',
    description: 'Australian Government grants portal - find and apply for federal grants',
  },
  {
    name: 'AusTender',
    tendersUrl: 'https://www.tenders.gov.au/',
    description: 'Commonwealth procurement and tender opportunities',
  },
  {
    name: 'business.gov.au',
    grantsUrl: 'https://business.gov.au/grants-and-programs',
    description: 'Business grants and programs from the Australian Government',
  },
  {
    name: 'Australian Research Council',
    grantsUrl: 'https://www.arc.gov.au/funding-research/find-funding-opportunities',
    description: 'Research funding opportunities and grants',
  },
];

/**
 * State Government Portals
 */
export const STATE_PORTALS: Record<string, GovernmentPortal[]> = {
  nsw: [
    {
      name: 'NSW Government Grants',
      grantsUrl: 'https://www.nsw.gov.au/grants-and-funding',
      description: 'Find grants and funding from the NSW Government',
    },
    {
      name: 'NSW eTendering',
      tendersUrl: 'https://tenders.nsw.gov.au/',
      description: 'NSW Government procurement and tenders',
    },
    {
      name: 'Service NSW Business',
      grantsUrl: 'https://www.service.nsw.gov.au/campaign/business-support',
      description: 'Business grants and support programs',
    },
  ],
  vic: [
    {
      name: 'Business Victoria Grants',
      grantsUrl: 'https://business.vic.gov.au/grants-and-programs',
      description: 'Victorian Government grants and programs',
    },
    {
      name: 'Buying for Victoria',
      tendersUrl: 'https://www.buyingfor.vic.gov.au/',
      description: 'Victorian Government procurement and tenders',
    },
  ],
  qld: [
    {
      name: 'Business Queensland Grants',
      grantsUrl: 'https://www.business.qld.gov.au/starting-business/grants-assistance',
      description: 'Queensland Government grants and assistance',
    },
    {
      name: 'QTenders',
      tendersUrl: 'https://www.qtenders.hpw.qld.gov.au/',
      description: 'Queensland Government procurement',
    },
  ],
  wa: [
    {
      name: 'WA Government Grants',
      grantsUrl: 'https://www.wa.gov.au/government/publications/grants-wa',
      description: 'Western Australian Government grants',
    },
    {
      name: 'WA Tenders',
      tendersUrl: 'https://www.tenders.wa.gov.au/',
      description: 'Western Australian Government procurement',
    },
  ],
  sa: [
    {
      name: 'SA Grants and Funding',
      grantsUrl: 'https://www.sa.gov.au/topics/business-and-trade/grants-and-loans',
      description: 'South Australian Government grants',
    },
    {
      name: 'SA Tenders and Contracts',
      tendersUrl: 'https://www.tenders.sa.gov.au/',
      description: 'South Australian Government procurement',
    },
  ],
  tas: [
    {
      name: 'Tasmania Grants',
      grantsUrl: 'https://www.grants.tas.gov.au/',
      description: 'Tasmanian Government grants portal',
    },
    {
      name: 'Tasmanian Government Tenders',
      tendersUrl: 'https://www.tenders.tas.gov.au/',
      description: 'Tasmanian Government procurement',
    },
  ],
  act: [
    {
      name: 'ACT Grants and Funding',
      grantsUrl: 'https://www.act.gov.au/funding-and-grants',
      description: 'ACT Government funding opportunities',
    },
    {
      name: 'ACT Government Procurement',
      tendersUrl: 'https://www.procurement.act.gov.au/',
      description: 'ACT Government tenders',
    },
  ],
  nt: [
    {
      name: 'NT Grants and Funding',
      grantsUrl: 'https://nt.gov.au/community/grants-and-funding',
      description: 'Northern Territory Government grants',
    },
    {
      name: 'NT Government Tenders',
      tendersUrl: 'https://www.tenders.nt.gov.au/',
      description: 'Northern Territory Government procurement',
    },
  ],
};

/**
 * Council/Local Government Portals
 */
export const COUNCIL_PORTALS: Record<string, GovernmentPortal> = {
  brisbane: {
    name: 'Brisbane City Council Grants',
    grantsUrl: 'https://www.brisbane.qld.gov.au/community-and-safety/grants-and-sponsorships',
    tendersUrl: 'https://www.brisbane.qld.gov.au/business-and-investment/tenders-and-contracts',
    description: 'Brisbane City Council grants, sponsorships and tenders',
  },
  sydney: {
    name: 'City of Sydney Grants',
    grantsUrl: 'https://www.cityofsydney.nsw.gov.au/grants-sponsorships',
    tendersUrl: 'https://www.cityofsydney.nsw.gov.au/business/tenders',
    description: 'City of Sydney grants and tenders',
  },
  melbourne: {
    name: 'City of Melbourne Grants',
    grantsUrl: 'https://www.melbourne.vic.gov.au/community/grants',
    tendersUrl: 'https://www.melbourne.vic.gov.au/business/tenders',
    description: 'City of Melbourne community grants and business tenders',
  },
  perth: {
    name: 'City of Perth Grants',
    grantsUrl: 'https://www.perth.wa.gov.au/live-and-work/grants-and-donations',
    description: 'City of Perth grants and donations',
  },
  adelaide: {
    name: 'City of Adelaide Grants',
    grantsUrl: 'https://www.cityofadelaide.com.au/community/grants/',
    description: 'City of Adelaide community grants',
  },
  hobart: {
    name: 'City of Hobart Grants',
    grantsUrl: 'https://www.hobartcity.com.au/Community/Grants-and-funding',
    description: 'City of Hobart grants and funding',
  },
  canberra: {
    name: 'ACT Government Grants',
    grantsUrl: 'https://www.act.gov.au/funding-and-grants',
    description: 'ACT community grants and funding',
  },
  darwin: {
    name: 'City of Darwin Grants',
    grantsUrl: 'https://www.darwin.nt.gov.au/council/grants',
    description: 'City of Darwin grants and sponsorships',
  },
};

/**
 * Get official portal links for a jurisdiction
 */
export function getJurisdictionPortals(
  jurisdiction: 'federal' | 'state' | 'council',
  state?: string,
  council?: string
): GovernmentPortal[] {
  if (jurisdiction === 'federal') {
    return FEDERAL_PORTALS;
  }

  if (jurisdiction === 'state' && state) {
    return STATE_PORTALS[state.toLowerCase()] || [];
  }

  if (jurisdiction === 'council' && council) {
    const councilPortal = COUNCIL_PORTALS[council.toLowerCase()];
    if (councilPortal) {
      return [councilPortal];
    }
    // Fallback to state portals if council not found
    if (state) {
      return STATE_PORTALS[state.toLowerCase()] || [];
    }
  }

  return [];
}

/**
 * Get relevant link for opportunity type
 */
export function getPortalLink(
  portal: GovernmentPortal,
  type: 'grant' | 'tender'
): string | undefined {
  if (type === 'grant') {
    return portal.grantsUrl;
  }
  return portal.tendersUrl || portal.grantsUrl;
}

/**
 * Get display name for jurisdiction
 */
export function getJurisdictionName(
  jurisdiction: 'federal' | 'state' | 'council',
  state?: string,
  council?: string
): string {
  if (jurisdiction === 'federal') {
    return 'Australian Government';
  }

  if (jurisdiction === 'state' && state) {
    const stateNames: Record<string, string> = {
      nsw: 'New South Wales',
      vic: 'Victoria',
      qld: 'Queensland',
      wa: 'Western Australia',
      sa: 'South Australia',
      tas: 'Tasmania',
      act: 'Australian Capital Territory',
      nt: 'Northern Territory',
    };
    return `${stateNames[state.toLowerCase()] || state.toUpperCase()} Government`;
  }

  if (jurisdiction === 'council' && council) {
    return council.charAt(0).toUpperCase() + council.slice(1) + ' Council';
  }

  return 'Government';
}
