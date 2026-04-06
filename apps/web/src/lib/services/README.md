# API Services

Real-time data fetching from Australian government grant and tender sources.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   OpportunityAggregator                  │
│  • Orchestrates all API clients                         │
│  • Selects relevant clients based on search scope       │
│  • Deduplicates and sorts results                       │
│  • Tracks health via apiHealthTracker                   │
└─────────────────┬───────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────▼────┐      ┌────▼────┐
    │ Federal │      │  State  │      ┌──────────┐
    │ Clients │      │ Clients │      │  Local   │
    └─────────┘      └─────────┘      │  Clients │
         │                │            └──────────┘
    • AusTender      • NSW Grants     • Brisbane
    • GrantConnect   • QLD Grants       Council
    • ARC Grants     • VIC Grants
                     • SA Grants
                     • WA Grants
                     • TAS Grants
                     • ACT & NT Grants
```

## Data Sources

### Federal (Commonwealth)

| Client | Source | Format | Coverage |
|--------|--------|--------|----------|
| **AusTender** | api.tenders.gov.au/ocds | OCDS JSON | All federal tenders (ATM & CN) |
| **GrantConnect** | grants.gov.au | JSON API | All federal grants |
| **ARC Grants** | arc.gov.au/jsonapi | Drupal JSON:API | Research grants |

### State & Territory

Each state client fetches from:
1. **CKAN Open Data Portal** (data.{state}.gov.au/api/3/action/)
2. **State grants portal** (business.{state}.gov.au, etc.)
3. **State tenders portal** (tenders.{state}.gov.au, qtenders, etc.)

### Local Government

- **Brisbane City Council**: OpenDataSoft API (data.brisbane.qld.gov.au)
  - Grants recipients dataset (historical → current programs)
  - Current tenders dataset

## Error Handling & Monitoring

### Graceful Degradation

**API failures do not block the system.** Each client:
1. Returns empty array `[]` on error
2. Logs error via `apiLogger`
3. Updates health status via `apiHealthTracker`

```typescript
// Example: If AusTender is down, other APIs still work
const results = await aggregator.fetchOpportunities(params);
// Result includes opportunities from 10 other sources
// warnings: "1 API(s) unavailable: AusTender"
```

### Logging System

**`apiLogger`** — Centralized logging for all API operations

```typescript
import { apiLogger } from '@/lib/services/logger';

// Log levels
apiLogger.info('ClientName', 'Successfully fetched 42 opportunities');
apiLogger.warn('ClientName', 'API slow to respond', url);
apiLogger.error('ClientName', 'Connection timeout', error, url);

// Get recent errors (monitoring)
const errors = apiLogger.getRecentErrors(60); // Last 60 minutes
const logs = apiLogger.getLogs(50); // Last 50 log entries
```

**Logs visible in:**
- Next.js console (local development)
- Vercel Function Logs (production)
- `/api/health` endpoint

### Health Tracking

**`apiHealthTracker`** — Real-time API availability status

```typescript
import { apiHealthTracker } from '@/lib/services/logger';

// Check specific API
const austenderHealth = apiHealthTracker.getHealth('AusTender');
// {
//   name: 'AusTender',
//   available: true,
//   lastChecked: '2026-04-06T10:30:00Z',
//   lastSuccess: '2026-04-06T10:30:00Z',
//   errorCount: 0,
//   successCount: 142
// }

// Get all unavailable APIs
const downAPIs = apiHealthTracker.getUnavailableAPIs();
// [{ name: 'ARC Grants', available: false, errorCount: 3, ... }]

// Full health report
const allHealth = apiHealthTracker.getAllHealth();
```

### Health Check Endpoint

**`GET /api/health`** — Monitor API status

```bash
curl https://your-domain.vercel.app/api/health
```

Response:
```json
{
  "success": true,
  "summary": {
    "timestamp": "2026-04-06T10:30:00.000Z",
    "totalAPIs": 11,
    "availableAPIs": 10,
    "unavailableAPIs": 1,
    "recentErrorCount": 3
  },
  "health": {
    "AusTender": { "available": true, "successCount": 142, ... },
    "ARC Grants": { "available": false, "errorCount": 3, ... }
  },
  "recentErrors": [...],
  "recentLogs": [...]
}
```

**Use cases:**
- Monitoring dashboard integration
- Alerting via Vercel Log Drains
- Debugging API connectivity issues
- Performance metrics

## Response Format

```typescript
interface APIResponse {
  success: boolean;
  source: string;           // "AusTender, GrantConnect, NSW Grants"
  count: number;            // Total opportunities returned
  opportunities: Opportunity[];
  error?: string;           // Critical error (rare)
  warnings?: string;        // "2 API(s) unavailable: ARC Grants, SA Grants"
}
```

## Caching

- **Cache duration:** 15 minutes
- **Cache key:** JSON.stringify(searchParams)
- **Bypass:** Clear cache via `aggregator.clearCache()`

Cached results served from in-memory Map (per Next.js server instance).

## Environment Variables

API keys are optional for most endpoints. Configure in Vercel:

```bash
# Federal
AUSTENDER_API_URL=https://api.tenders.gov.au
AUSTENDER_API_KEY=<if-required>
GRANTCONNECT_API_URL=https://www.grants.gov.au
GRANTCONNECT_API_KEY=<if-required>
ARC_API_URL=https://www.arc.gov.au/jsonapi/node/funding_opportunity

# State portals
DATA_NSW_API_URL=https://data.nsw.gov.au/data/api/3
NSW_OPENGOV_API_KEY=<if-required>
DATA_QLD_API_URL=https://www.data.qld.gov.au/api/3
QLD_API_KEY=<if-required>
DATA_VIC_API_URL=https://www.data.vic.gov.au/data/api/3
VIC_API_KEY=<if-required>

# Local government
BRISBANE_API_URL=https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/grants-recipients
```

## Adding New API Clients

1. Create client file: `apps/web/src/lib/services/your-client.ts`
2. Implement `APIClient` interface
3. Add logging: `import { apiLogger } from './logger'`
4. Handle errors gracefully (return `[]`, don't throw)
5. Register in `aggregator.ts` constructor
6. Export in `index.ts`

```typescript
import { APIClient, SearchParams } from './types';
import { Opportunity, determineOpportunityStatus } from '../data';
import { apiLogger } from './logger';

export class YourClient implements APIClient {
  name = 'Your Client';
  private baseUrl = 'https://api.example.gov.au';

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      apiLogger.error(this.name, 'Health check failed', error, this.baseUrl);
      return false;
    }
  }

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    try {
      // Your implementation
      const data = await this.fetchFromAPI();
      return this.transform(data);
    } catch (error) {
      apiLogger.error(this.name, 'Fetch failed', error, this.baseUrl);
      return []; // Graceful degradation
    }
  }
}
```

## Performance

- **Parallel fetching:** All API clients execute concurrently via `Promise.allSettled`
- **Smart selection:** Only relevant clients are called (e.g., NSW search doesn't hit QLD API)
- **Timeouts:** All HTTP requests timeout after 5-15 seconds (no hanging)
- **Health checks:** Fast HEAD/minimal GET requests

## Testing

```bash
# Run TypeScript checks
npm run type-check

# Test API endpoints locally
curl http://localhost:3000/api/opportunities?scope=australia&opportunityType=grants
curl http://localhost:3000/api/health

# Check logs
# Open Next.js dev console - all API activity logged with [ClientName] prefix
```
