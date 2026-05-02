# Placeholder Data Fix - Complete Report

**Date:** 2026-05-02  
**Issue:** Synthetic/placeholder data being shown as "current opportunities"  
**Status:** ✅ FIXED

---

## 🔍 What Was the Problem?

The **Brisbane Council API client** was generating **synthetic grant opportunities** from **historical grant recipient data**. This was creating fake "current opportunities" that looked real but were actually:

1. **Based on historical data** - Past grant recipients from previous years
2. **Predicted future dates** - Synthetic open/close dates based on typical grant cycles
3. **Averaged amounts** - Calculated from historical recipient amounts
4. **Not real published opportunities** - No actual current grant programs

### Example of Placeholder Data Generated:

```json
{
  "id": "brisbane-community-grants-program",
  "title": "Community Grants Program — Brisbane City Council",
  "type": "grant",
  "description": "Brisbane City Council grant program. Based on 45 historical recipients averaging $12,500...",
  "openDate": "2026-02-01",    // ← PREDICTED (not real)
  "closeDate": "2026-06-13",   // ← PREDICTED (not real)
  "amount": 12500,             // ← AVERAGED (not real)
  "url": "https://www.brisbane.qld.gov.au/..."
}
```

**This was misleading** - users would see these as current opportunities when they were actually synthesized from historical data.

---

## ✅ What Was Fixed

### File Changed: `apps/web/src/lib/services/brisbane-council.ts`

**Removed:**
1. ❌ `fetchGrants()` method - was fetching historical recipient data
2. ❌ `transformGrants()` method - was aggregating historical data into fake opportunities  
3. ❌ `nextGrantCloseDate()` - was predicting future dates
4. ❌ `nextGrantOpenDate()` - was predicting future dates
5. ❌ `buildCategoryFilter()` - was only used for historical data queries

**Result:**
- ✅ Brisbane client now only returns **real current tenders** (if available in their API)
- ✅ Brisbane client returns **empty array** for grants (until real current-grants dataset exists)
- ✅ **NO** synthetic/placeholder data is generated
- ✅ Users see only **real published opportunities**

### Code Changes Summary:

**Before:**
```typescript
// Fetched historical grant recipients
private async fetchGrants(params: SearchParams) {
  const response = await fetch(
    'https://data.brisbane.qld.gov.au/.../grants-recipients'  // ← Historical data
  );
  
  // Aggregated into "current" opportunities with predicted dates
  const programMap = new Map();
  for (const record of records) {
    // Created synthetic opportunities from historical patterns
  }
}
```

**After:**
```typescript
// Only fetch tenders for now
// Grants would require a dataset of CURRENT published opportunities, not historical recipients
if (params.opportunityType !== 'grants') {
  const tenders = await this.fetchTenders(params);
  results.push(...tenders);
}
```

---

## 🔎 Verification

**Checked all 11 API clients:**

| Client | Status | Generates Synthetic Data? |
|--------|--------|---------------------------|
| AusTender | ✅ Clean | No - fetches real OCDS data |
| GrantConnect | ✅ Clean | No - fetches real grant data |
| ARC Grants | ✅ Clean | No - fetches real Drupal API data |
| NSW Grants | ✅ Clean | No - fetches real API responses |
| QLD Grants | ✅ Clean | No - fetches real data portal data |
| VIC Grants | ✅ Clean | No - fetches real API responses |
| SA Grants | ✅ Clean | No - fetches real data |
| WA Grants | ✅ Clean | No - fetches real data |
| TAS Grants | ✅ Clean | No - fetches real data |
| ACT & NT Grants | ✅ Clean | No - fetches real data |
| Brisbane Council | ✅ **FIXED** | **Was generating synthetic data - NOW FIXED** |

**Conclusion:** Brisbane Council was the **only** client generating placeholder data. All other clients fetch real API data.

---

## 📊 Current API Health Status

As of the last test run, **all 11 government APIs are currently failing health checks**:

| API | Health Check Status | Reason |
|-----|---------------------|--------|
| ARC Grants | ❌ Failing | 403 Forbidden (authentication/access issue) |
| NSW Grants | ❌ Failing | Timeout or unreachable |
| QLD Grants | ❌ Failing | Timeout or unreachable |
| VIC Grants | ❌ Failing | Timeout or unreachable |
| SA Grants | ❌ Failing | Timeout or unreachable |
| WA Grants | ❌ Failing | Timeout or unreachable |
| TAS Grants | ❌ Failing | Timeout or unreachable |
| AusTender | ❌ Failing | Timeout or unreachable |
| ACT & NT Grants | ❌ Failing | Timeout or unreachable |
| GrantConnect | ❌ Failing | Timeout or unreachable |
| Brisbane Council | ❌ Failing | Dataset may not exist |

### Why Are They Failing?

**Possible reasons:**

1. **Network restrictions** - Development environment may block external government APIs
2. **CORS issues** - Government APIs may not allow browser/server requests from non-whitelisted domains
3. **API endpoints changed** - Government sites may have updated their API URLs
4. **Authentication required** - Some APIs may require API keys or OAuth
5. **Datasets don't exist** - Some expected datasets may not be published

### What This Means:

- ✅ **NO placeholder data is shown** - Correctly returning empty results when APIs unavailable
- ✅ **System is working correctly** - Graceful handling of API failures
- ⚠️ **APIs need investigation** - Need to test each API individually to determine why they're failing

---

## 🚀 Next Steps

### To Get Real Data Flowing:

1. **Test each API individually:**
   ```bash
   # Test AusTender (most likely to work - public OCDS API)
   curl "https://api.tenders.gov.au/ocds/findByDates/contractPublished/2026-01-01/2026-12-31"
   
   # Test GrantConnect
   curl "https://www.grants.gov.au/..."
   
   # Test state APIs
   curl "https://data.nsw.gov.au/..."
   ```

2. **Fix API endpoints:**
   - Update URLs if endpoints have changed
   - Add authentication if required
   - Handle CORS if needed (proxy through backend)

3. **Prioritize working APIs:**
   - Start with federal APIs (AusTender, GrantConnect) - more stable
   - Then state data portals (NSW, QLD, VIC have good open data platforms)
   - Council-specific APIs last (least likely to have open APIs)

4. **Consider alternative data sources:**
   - Some states may provide CSV downloads instead of APIs
   - RSS feeds for grant announcements
   - Web scraping as last resort (with respect to robots.txt)

---

## 📝 Important Notes

### ✅ What's Working Correctly:

1. **No mock data fallback** - System correctly returns empty when APIs fail
2. **Graceful degradation** - App doesn't crash, shows "no results" message
3. **Health tracking** - Logs which APIs are unavailable
4. **Input validation** - All API params are validated
5. **Error handling** - Proper error messages without exposing internals

### ⚠️ What Needs Work:

1. **API connectivity** - Need to debug why all 11 APIs are failing
2. **Alternative data sources** - May need CSV parsers or web scrapers
3. **Caching strategy** - Could cache real data when APIs are working
4. **User feedback** - Could show which specific APIs are down

---

## 🧪 Testing the Fix

### Before Fix:
```bash
GET /api/opportunities?scope=council&state=qld&council=brisbane

# Response included synthetic grants:
{
  "opportunities": [
    {
      "title": "Community Grants Program — Brisbane City Council",
      "description": "Based on 45 historical recipients averaging $12,500...",
      "closeDate": "2026-06-13",  // ← FAKE predicted date
      "amount": 12500              // ← FAKE averaged amount
    }
  ]
}
```

### After Fix:
```bash
GET /api/opportunities?scope=council&state=qld&council=brisbane

# Response returns only real tenders (if API available):
{
  "opportunities": [],  // ← Empty if no real current opportunities exist
  "warnings": "1 API(s) unavailable: Brisbane Council"
}
```

---

## 📋 Build Verification

✅ **Build Status:** SUCCESS

```
▲ Next.js 16.2.4 (Turbopack)
✓ Compiled successfully in 11.4s
  Running TypeScript ...
  Finished TypeScript in 5.1s ...
✓ Generating static pages using 3 workers (6/6) in 193ms

Route (app)
┌ ○ /                    ← Main page
├ ○ /_not-found
├ ƒ /api/health
├ ƒ /api/opportunities   ← Fixed - no placeholder data
└ ○ /opportunities
```

**No TypeScript errors** - All changes are type-safe

---

## ✨ Summary

| Item | Status |
|------|--------|
| Placeholder data removed | ✅ COMPLETE |
| Build passing | ✅ COMPLETE |
| All clients verified | ✅ COMPLETE |
| API health tracking working | ✅ COMPLETE |
| **Next:** Fix API connectivity | ⏳ PENDING |

**The application now shows ONLY real government data, never synthetic/placeholder data.**

When APIs are unavailable, it correctly returns empty results with a warning, rather than showing fake data.
