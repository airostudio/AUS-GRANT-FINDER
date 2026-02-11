# Australian Government APIs for Grants & Tenders

This document outlines all the API endpoints and data sources available for integrating real Australian government grant and tender opportunities.

---

## 🇦🇺 Federal Government APIs

### 1. **AusTender (Procurement/Tenders)**

**Description:** Australian Government's procurement information system for tenders and contracts.

**API:** AusTender OCDS API (Open Contracting Data Standard)
- **Repository:** https://github.com/austender/austender-ocds-api
- **Base URL:** API provides AusTender CN data in machine-readable format (JSON)
- **Documentation:** Available in GitHub repository
- **Authentication:** Check repository for requirements
- **Data Standard:** Compliant with Open Contracting Data Standard (OCDS)
- **Technology:** Built with AWS Serverless Technologies

**Key Features:**
- Contract notices and awards
- Procurement opportunities
- Contract values ($10,000+ for NCEs, $400,000+ for prescribed CCEs)
- Real-time tender monitoring

**Portal:** https://www.tenders.gov.au/

---

### 2. **GrantConnect (Federal Grants)**

**Description:** Commonwealth Government's whole-of-government grant information system.

**Current Access Methods:**
- **Web Portal:** https://www.grants.gov.au/
- **No Public API:** GrantConnect does not currently provide a public REST API
- **Alternative:** Web scraping or manual data export (requires registration)
- **Contact:** GrantConnect@Finance.gov.au for API access inquiries

**Data Available:**
- Current grant opportunities
- Forecast grants
- Awarded grants
- Daily updates

**Workaround Options:**
1. Register account and use web interface
2. Contact Finance department for bulk data access
3. Use data.gov.au datasets (may be delayed)

---

### 3. **Australian Research Council (ARC) Grants**

**Description:** Research funding data from ARC since 2001.

**API:** JSON API Available ✅
- **Portal:** https://www.arc.gov.au/funding-research/funding-outcomes/grants-dataset
- **Format:** JSON response
- **Authentication:** Public access (no key required)
- **Data Range:** All ARC-funded projects since 2001

**Features:**
- Grant dataset dashboard
- Downloadable Excel format
- Public API with JSON responses
- Project-level funding data since 2002

---

### 4. **Data.gov.au Platform**

**Description:** Central repository for Australian government datasets.

**Resources:**
- **Platform:** https://data.gov.au/
- **API Catalogue:** https://api.gov.au/
- **Datasets:** https://data.gov.au/data/dataset/

**Key APIs:**
- **ABS Data API:** https://www.abs.gov.au/about/data-services/application-programming-interfaces-apis/data-api-user-guide
  - Metadata in JSON format
  - SDMX 2.1 compliant

**Grant Datasets Available:**
- Various agencies publish grant data
- Updated as recently as 04/02/2026
- JSON formats available for many datasets

---

## 🏛️ State Government APIs

### 5. **NSW - OpenGov NSW API**

**Description:** NSW Government open data and information access.

**API:** OpenGov NSW API
- **Portal:** https://data.nsw.gov.au/
- **API Endpoint:** https://data.nsw.gov.au/data/dataset/opengov-nsw-api
- **Format:** JSON/XML
- **Authentication:** Check Data.NSW for API key requirements

**Features:**
- NSW Government agency data
- Annual reports
- GIPA Act information
- Planning Portal API available

**Planning Portal API:**
- **URL:** https://www.planningportal.nsw.gov.au/nsw-planning-portal-api-grant
- Requires API grant application

---

### 6. **Victoria - Open Data Catalogue**

**Description:** Victorian government API catalogue and open data.

**Resources:**
- Public catalogue of APIs
- Open datasets directory
- Heritage database access
- Museum collections

**Standards:**
- Compliant with National API Design Standards (2019)
- Approved by Australian Data and Digital Council (ADDC)

**Note:** Specific grant API endpoint not publicly documented yet. Check vic.gov.au for updates.

---

### 7. **Queensland - Data.QLD**

**Description:** Queensland Government open data portal.

**Portal:** https://www.data.qld.gov.au/
- **Grants Dataset:** https://www.data.qld.gov.au/dataset/grants-program-summary
- **Format:** Available for open use
- **Access:** Freely available through data.qld.gov.au

**Features:**
- Grant program summaries
- Historical grant data
- Regularly updated datasets

---

## 🏙️ Local Government APIs

### 8. **Brisbane City Council - Grants API**

**Description:** Grant recipients data for Brisbane since 2014-15.

**API:** Grants Recipients API ✅
- **Base URL:** https://data.brisbane.qld.gov.au/explore/dataset/grants-recipients/api/
- **Format:** JSON
- **Authentication:** Public access
- **Data Range:** 2014-15 to present

**Features:**
- Historical grant recipient data
- JSON schema available
- Community, art, environment, and seniors grants
- Updated regularly

**Current Programs (2026):**
- Lord Mayor's Community Fund: $2,000-$10,000
- Application deadline: 12 June 2026

**Contact:** (07) 3403 8888 for grant information

---

### 9. **Other Councils**

**Status:** Most councils don't provide public APIs.

**Alternative Approaches:**
1. **Web Scraping:** Collect data from council websites
2. **RSS Feeds:** Some councils provide RSS feeds
3. **Email Notifications:** Subscribe to grant mailing lists
4. **Manual Updates:** Regular website checks

**Major Councils to Check:**
- City of Sydney
- City of Melbourne
- Gold Coast City Council
- Adelaide City Council
- Perth City Council

---

## 📊 Implementation Priority

### ✅ **High Priority (APIs Available)**
1. **AusTender OCDS API** - Federal tenders
2. **ARC Grants JSON API** - Research grants
3. **Brisbane Council Grants API** - Local grants example
4. **Data.gov.au datasets** - Various government data

### ⚠️ **Medium Priority (Requires Setup)**
5. **OpenGov NSW API** - Requires API key
6. **Data.QLD datasets** - Open access datasets

### 🔄 **Low Priority (No Public API)**
7. **GrantConnect** - Contact Finance department or scrape
8. **Individual State Grant Programs** - Manual aggregation
9. **Other Council Websites** - Web scraping required

---

## 🔧 Technical Integration Notes

### API Response Standardization

All external APIs should be normalized to the `Opportunity` interface:

\`\`\`typescript
interface Opportunity {
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
\`\`\`

### Environment Variables Required

\`\`\`env
# Optional API Keys
AUSTENDER_API_KEY=
NSW_OPENGOV_API_KEY=
ARC_API_KEY=

# API Base URLs
AUSTENDER_API_URL=https://api.tenders.gov.au
ARC_API_URL=https://www.arc.gov.au/api
BRISBANE_API_URL=https://data.brisbane.qld.gov.au
DATA_NSW_API_URL=https://data.nsw.gov.au/api
DATA_QLD_API_URL=https://www.data.qld.gov.au/api
\`\`\`

### Rate Limiting

Implement rate limiting to avoid overwhelming government APIs:
- Max 10 requests per second per API
- Implement caching (15-minute cache for search results)
- Use batch requests where supported

### Error Handling

- Fallback to cached data if API is down
- Show partial results if some APIs fail
- Log API errors for monitoring

---

## 📝 Next Steps

1. ✅ Set up AusTender OCDS API integration
2. ✅ Integrate ARC Grants JSON API
3. ✅ Connect Brisbane Council API
4. 🔄 Request API access from GrantConnect
5. 🔄 Apply for NSW OpenGov API key
6. 🔄 Explore Data.QLD datasets
7. 🔄 Build web scrapers for councils without APIs

---

## 📚 Additional Resources

**Sources:**

- [GrantConnect Homepage](https://www.grants.gov.au/)
- [AusTender GitHub - OCDS API](https://github.com/austender/austender-ocds-api)
- [AusTender Portal](https://www.tenders.gov.au/)
- [ARC Grants Dataset](https://www.arc.gov.au/funding-research/funding-outcomes/grants-dataset)
- [Data.gov.au Platform](https://data.gov.au/)
- [API.gov.au Catalogue](https://api.gov.au/)
- [Brisbane Grants API](https://data.brisbane.qld.gov.au/explore/dataset/grants-recipients/api/)
- [Data.NSW - OpenGov API](https://data.nsw.gov.au/data/dataset/opengov-nsw-api)
- [Data.QLD Open Data](https://www.data.qld.gov.au/)
- [ABS Data API Guide](https://www.abs.gov.au/about/data-services/application-programming-interfaces-apis/data-api-user-guide)

---

**Last Updated:** 2026-02-11
