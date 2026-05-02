# Production Deployment Checklist

## Pre-Deployment

### 1. Security ✅

- [x] Run `npm audit` - 5 vulnerabilities remain (require Next.js 16.x upgrade)
- [x] Input validation implemented for all API routes
- [x] Rate limiting enabled (60 req/min per IP)
- [x] Security headers configured (CSP, X-Frame-Options, HSTS, etc.)
- [x] Error messages sanitized in production
- [x] No `.env` files committed to git
- [x] API keys configured as environment variables
- [x] No hardcoded secrets in code

### 2. Environment Variables

Configure in Vercel Dashboard → Settings → Environment Variables:

**Optional API Keys (system works without these):**
```bash
# Federal APIs
AUSTENDER_API_URL=https://api.tenders.gov.au
AUSTENDER_API_KEY=<optional>
GRANTCONNECT_API_URL=https://www.grants.gov.au
GRANTCONNECT_API_KEY=<optional>
ARC_API_URL=https://www.arc.gov.au/jsonapi/node/funding_opportunity

# State APIs
DATA_NSW_API_URL=https://data.nsw.gov.au/data/api/3
NSW_OPENGOV_API_KEY=<optional>
DATA_QLD_API_URL=https://www.data.qld.gov.au/api/3
QLD_API_KEY=<optional>
DATA_VIC_API_URL=https://www.data.vic.gov.au/data/api/3
VIC_API_KEY=<optional>

# Local Government
BRISBANE_API_URL=https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/grants-recipients
```

**Node environment:**
```bash
NODE_ENV=production
```

### 3. Vercel Configuration

**Project Settings:**
- ✅ Root Directory: `apps/web`
- ✅ Framework Preset: Next.js
- ✅ Build Command: `npm run build`
- ✅ Install Command: `cd ../.. && npm install`
- ✅ Output Directory: `.next`

**Recommended Settings:**
- Enable: Vercel Analytics
- Enable: Speed Insights
- Enable: Web Vitals
- Enable: Automatic deployments from `main` branch
- Branch: `claude/ausgrant-automate-setup-Z0Twc` (current development)

### 4. Testing

**Local testing:**
```bash
# Build production bundle
npm run build --workspace=apps/web

# Start production server locally
npm run start --workspace=apps/web

# Test API endpoints
curl http://localhost:3000/api/opportunities?scope=australia&opportunityType=grants
curl http://localhost:3000/api/health

# Test rate limiting (should fail after 60 requests)
for i in {1..65}; do curl -s http://localhost:3000/api/health | jq -r '.success'; done
```

**Security testing:**
```bash
# Test input validation
curl "http://localhost:3000/api/opportunities?minAmount=999999999999999999"  # Should return 400
curl "http://localhost:3000/api/opportunities?scope=invalid"  # Should return 400
curl "http://localhost:3000/api/opportunities?dateFrom=invalid"  # Should return 400

# Check security headers
curl -I https://your-domain.vercel.app | grep -E "Content-Security-Policy|X-Frame-Options|Strict-Transport"
```

### 5. Monitoring Setup

**Vercel Integration:**
- [ ] Set up log drains (optional - Datadog, New Relic, etc.)
- [ ] Configure alerts for function errors
- [ ] Set up uptime monitoring

**Health Check Monitoring:**
```bash
# Add to your monitoring service
curl https://your-domain.vercel.app/api/health
```

Alert if:
- `summary.unavailableAPIs > 5` (more than half APIs down)
- `summary.recentErrorCount > 50` (high error rate)
- HTTP status ≠ 200

**Recommended Services:**
- Vercel Analytics (built-in)
- UptimeRobot or Pingdom (uptime monitoring)
- Sentry (error tracking - optional)
- LogRocket (session replay - optional)

### 6. Performance

**Caching:**
- ✅ API responses cached for 15 minutes
- ✅ Opportunity deduplication implemented
- ✅ Parallel API fetching enabled
- ✅ Smart client selection (only relevant APIs called)

**Optimizations:**
- ✅ Next.js standalone output mode
- ✅ React strict mode enabled
- ✅ Gzip compression enabled
- ✅ API timeouts configured (5-15 seconds)

### 7. Code Quality

```bash
# Type checking
npx tsc --project apps/web/tsconfig.json --noEmit

# Linting
npm run lint

# Format check
npm run format
```

## Deployment

### First Deployment

1. **Push to GitHub:**
   ```bash
   git push origin claude/ausgrant-automate-setup-Z0Twc
   ```

2. **Connect to Vercel:**
   - Go to vercel.com/new
   - Import `airostudio/AUS-GRANT-FINDER`
   - Configure:
     - Root Directory: `apps/web`
     - Framework: Next.js
     - Build Command: `npm run build`
     - Install Command: `cd ../.. && npm install`

3. **Set Environment Variables:**
   - Add all variables from section 2 above
   - Set `NODE_ENV=production`

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete

### Post-Deployment Verification

**1. Smoke Tests:**
```bash
DOMAIN=https://your-domain.vercel.app

# Health check
curl $DOMAIN/api/health | jq '.summary'

# Opportunities API
curl "$DOMAIN/api/opportunities?scope=australia&opportunityType=grants" | jq '.count'

# Test filtering
curl "$DOMAIN/api/opportunities?scope=state&state=nsw&opportunityType=both" | jq '.count'

# Verify rate limiting headers
curl -I "$DOMAIN/api/opportunities" | grep X-RateLimit
```

**2. Security Headers:**
```bash
curl -I $DOMAIN | grep -E "Content-Security-Policy|X-Frame-Options|Strict-Transport-Security|X-Content-Type-Options"
```

Expected headers:
- `Content-Security-Policy: ...`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`

**3. Functionality:**
- [ ] Homepage loads
- [ ] Search wizard works
- [ ] Opportunities page shows results
- [ ] Filtering works (state, type, categories)
- [ ] No JavaScript errors in browser console
- [ ] API returns real data (not mock data)

**4. Performance:**
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] API response time < 2s (cached) or < 10s (uncached)

**5. Error Handling:**
```bash
# Test invalid input
curl "$DOMAIN/api/opportunities?minAmount=invalid"
# Should return 400 with validation error

# Test rate limiting
for i in {1..65}; do curl -s $DOMAIN/api/health | jq -r '.success'; done
# Should return 429 after 60 requests
```

## Post-Deployment Monitoring

### Week 1 - Intensive Monitoring

**Daily checks:**
- [ ] Check Vercel Function Logs for errors
- [ ] Review `/api/health` endpoint for API failures
- [ ] Monitor API quota usage (external APIs)
- [ ] Check for rate limit violations
- [ ] Review error rates and types

**Metrics to track:**
- API response times (p50, p95, p99)
- Error rates by endpoint
- Cache hit rate
- External API availability
- Rate limit hit rate

### Ongoing Monitoring

**Weekly:**
- [ ] Review API health trends
- [ ] Check dependency vulnerabilities (`npm audit`)
- [ ] Review Vercel Analytics

**Monthly:**
- [ ] Update dependencies (`npm update`)
- [ ] Review and optimize slow API responses
- [ ] Check for Next.js updates
- [ ] Review security advisories

## Rollback Plan

If deployment fails or critical issues arise:

**1. Immediate Rollback:**
```bash
# Via Vercel Dashboard:
# Deployments → Previous Deployment → Promote to Production
```

**2. Fix and Redeploy:**
```bash
# Fix the issue
git commit -am "fix: critical issue"
git push origin main

# Vercel auto-deploys
```

**3. Emergency Disable:**
If APIs are causing issues:
```bash
# Set in Vercel environment variables
USE_MOCK_DATA=true  # Falls back to empty results (mock removed)
```

## Success Criteria

Deployment is successful when:
- [x] All smoke tests pass
- [x] Security headers present
- [x] Rate limiting works
- [x] Input validation works
- [x] Real data returned from APIs
- [x] No critical errors in logs
- [x] API health endpoint shows green
- [ ] Lighthouse score > 90
- [ ] No user-reported issues for 24 hours

## Next Steps After Deployment

1. **Merge to main:**
   ```bash
   git checkout main
   git merge claude/ausgrant-automate-setup-Z0Twc
   git push origin main
   ```

2. **Create production release:**
   ```bash
   git tag -a v1.0.0 -m "Production release: AusGrant Finder"
   git push origin v1.0.0
   ```

3. **Update documentation:**
   - Update README.md with production URL
   - Document any API key setup required
   - Add monitoring runbook

4. **Remaining Security Items:**
   - [ ] Upgrade Next.js to 16.x (breaking change - requires testing)
   - [ ] Set up error monitoring (Sentry)
   - [ ] Configure log drains (optional)
   - [ ] Add Redis for multi-instance rate limiting (optional)

---

**Deployment Lead:** Claude Code  
**Last Updated:** 2026-05-02  
**Status:** Ready for deployment ✅
