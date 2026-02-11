# Deploying to Vercel

Complete guide for deploying AusGrant-Automate to Vercel with all environment variables configured.

---

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/airostudio/AUS-GRANT-FINDER)

---

## 📋 Prerequisites

- Vercel account (free tier works)
- GitHub repository connected to Vercel
- API keys for services you want to use (optional)

---

## 🔧 Environment Variables Setup

### **Method 1: Vercel Dashboard (Recommended)**

1. **Go to your project on Vercel**
   - Navigate to: https://vercel.com/dashboard
   - Select your project

2. **Open Settings**
   - Click "Settings" tab
   - Click "Environment Variables" in sidebar

3. **Add each variable below**
   - Click "Add New"
   - Enter Name and Value
   - Select Environment: Production, Preview, Development (or all)
   - Click "Save"

### **Method 2: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Set environment variables
vercel env add USE_MOCK_DATA production
vercel env add AUSTENDER_API_URL production
vercel env add ARC_API_URL production
# ... continue for all variables
```

### **Method 3: Using Script**

Use the provided script to set all variables at once:

```bash
# Make script executable
chmod +x scripts/setup-vercel-env.sh

# Run the script
./scripts/setup-vercel-env.sh
```

---

## 📊 Required Environment Variables

### **Core Configuration**

```bash
# USE_MOCK_DATA
# Description: Use mock data (true) or fetch from real APIs (false)
# Development: true
# Production: false (to use real APIs)
USE_MOCK_DATA=false
```

---

## 🔌 API Configuration

### **Federal Government APIs**

#### **AusTender (Federal Tenders)**

```bash
# AUSTENDER_API_URL
# Description: Base URL for AusTender OCDS API
# Default: https://api.tenders.gov.au
# Required: Yes (if using real APIs)
AUSTENDER_API_URL=https://api.tenders.gov.au

# AUSTENDER_API_KEY
# Description: API key for AusTender (if required)
# Required: No (check AusTender documentation)
# How to get: Visit https://github.com/austender/austender-ocds-api
AUSTENDER_API_KEY=your_austender_key_here
```

#### **ARC Grants (Research Funding)**

```bash
# ARC_API_URL
# Description: Base URL for Australian Research Council API
# Default: https://www.arc.gov.au/api/grants
# Required: Yes (if fetching research grants)
ARC_API_URL=https://www.arc.gov.au/api/grants

# ARC_API_KEY
# Description: API key for ARC (if required)
# Required: No (public API)
ARC_API_KEY=
```

#### **GrantConnect (Federal Grants)**

```bash
# GRANTCONNECT_API_URL
# Description: Base URL for GrantConnect API (when available)
# Required: No (no public API yet)
# Contact: GrantConnect@Finance.gov.au for bulk access
GRANTCONNECT_API_URL=

# GRANTCONNECT_API_KEY
# Description: API key for GrantConnect (when available)
# Required: No (pending API access)
GRANTCONNECT_API_KEY=
```

---

### **State Government APIs**

#### **NSW OpenGov API**

```bash
# DATA_NSW_API_URL
# Description: Base URL for NSW OpenGov API
# Default: https://data.nsw.gov.au/api
# Required: Yes (if fetching NSW data)
DATA_NSW_API_URL=https://data.nsw.gov.au/api

# NSW_OPENGOV_API_KEY
# Description: API key for NSW OpenGov
# Required: Yes (for NSW data)
# How to get: Apply at https://data.nsw.gov.au/
NSW_OPENGOV_API_KEY=your_nsw_api_key_here
```

#### **Queensland Data**

```bash
# DATA_QLD_API_URL
# Description: Base URL for Queensland Open Data API
# Default: https://www.data.qld.gov.au/api
# Required: Yes (if fetching QLD data)
DATA_QLD_API_URL=https://www.data.qld.gov.au/api

# QLD_API_KEY
# Description: API key for QLD data (if required)
# Required: No (open access datasets)
QLD_API_KEY=
```

#### **Victoria Data**

```bash
# DATA_VIC_API_URL
# Description: Base URL for Victoria government API
# Default: https://data.vic.gov.au/api
# Required: Yes (if fetching VIC data)
DATA_VIC_API_URL=https://data.vic.gov.au/api

# VIC_API_KEY
# Description: API key for VIC data (if required)
# Required: No
VIC_API_KEY=
```

---

### **Local Government APIs**

#### **Brisbane City Council**

```bash
# BRISBANE_API_URL
# Description: Base URL for Brisbane Council Open Data API
# Default: https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/grants-recipients
# Required: Yes (if fetching Brisbane grants)
BRISBANE_API_URL=https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/grants-recipients

# BRISBANE_API_KEY
# Description: API key for Brisbane data (if required)
# Required: No (public API)
BRISBANE_API_KEY=
```

---

## ⚙️ Performance & Optimization

### **Caching Configuration**

```bash
# ENABLE_API_CACHE
# Description: Enable API response caching
# Default: true
# Recommended: true (for production)
ENABLE_API_CACHE=true

# CACHE_DURATION_MINUTES
# Description: How long to cache API responses (in minutes)
# Default: 15
# Recommended: 15-30 minutes
CACHE_DURATION_MINUTES=15
```

### **Rate Limiting**

```bash
# MAX_REQUESTS_PER_SECOND
# Description: Maximum API requests per second
# Default: 10
# Recommended: 10 (to avoid overwhelming government APIs)
MAX_REQUESTS_PER_SECOND=10

# ENABLE_RATE_LIMITING
# Description: Enable rate limiting for API requests
# Default: true
# Recommended: true (for production)
ENABLE_RATE_LIMITING=true
```

---

## 🔒 Optional: Analytics & Monitoring

```bash
# NEXT_PUBLIC_VERCEL_ANALYTICS_ID
# Description: Vercel Analytics ID (auto-configured)
# Required: No (Vercel adds automatically if enabled)
# How to enable: Project Settings > Analytics

# SENTRY_DSN
# Description: Sentry error tracking DSN
# Required: No (optional error monitoring)
# How to get: Create project at https://sentry.io
SENTRY_DSN=your_sentry_dsn_here

# SENTRY_AUTH_TOKEN
# Description: Sentry auth token for releases
# Required: No
SENTRY_AUTH_TOKEN=
```

---

## 📝 Complete Environment Variable List

Copy this template and fill in your values:

```env
# ============================================
# CORE CONFIGURATION
# ============================================
USE_MOCK_DATA=false

# ============================================
# FEDERAL APIS
# ============================================

# AusTender
AUSTENDER_API_URL=https://api.tenders.gov.au
AUSTENDER_API_KEY=

# ARC Grants
ARC_API_URL=https://www.arc.gov.au/api/grants
ARC_API_KEY=

# GrantConnect (future)
GRANTCONNECT_API_URL=
GRANTCONNECT_API_KEY=

# ============================================
# STATE APIS
# ============================================

# NSW
DATA_NSW_API_URL=https://data.nsw.gov.au/api
NSW_OPENGOV_API_KEY=

# Queensland
DATA_QLD_API_URL=https://www.data.qld.gov.au/api
QLD_API_KEY=

# Victoria
DATA_VIC_API_URL=https://data.vic.gov.au/api
VIC_API_KEY=

# ============================================
# LOCAL GOVERNMENT APIS
# ============================================

# Brisbane City Council
BRISBANE_API_URL=https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/grants-recipients
BRISBANE_API_KEY=

# ============================================
# PERFORMANCE & OPTIMIZATION
# ============================================

# Caching
ENABLE_API_CACHE=true
CACHE_DURATION_MINUTES=15

# Rate Limiting
MAX_REQUESTS_PER_SECOND=10
ENABLE_RATE_LIMITING=true

# ============================================
# OPTIONAL: ANALYTICS & MONITORING
# ============================================

# Sentry (optional)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## 🎯 Deployment Steps

### **Step 1: Prepare Repository**

```bash
# Ensure code is committed
git add -A
git commit -m "Ready for Vercel deployment"
git push origin main
```

### **Step 2: Connect to Vercel**

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select "AUS-GRANT-FINDER" project
4. Framework Preset: **Next.js**
5. Root Directory: **apps/web**
6. Click "Deploy"

### **Step 3: Configure Environment Variables**

After initial deployment:

1. Go to Project Settings
2. Navigate to "Environment Variables"
3. Add all variables from the list above
4. Click "Save" for each

### **Step 4: Redeploy**

```bash
# Trigger a new deployment with environment variables
vercel --prod
```

Or through Vercel Dashboard:
- Go to Deployments
- Click "Redeploy" on latest deployment

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] App loads at your Vercel URL
- [ ] Home page displays correctly
- [ ] Wizard search works
- [ ] `/opportunities` page loads
- [ ] API calls return data (check Network tab)
- [ ] No console errors
- [ ] Mock data toggle works (`USE_MOCK_DATA=true` for testing)

---

## 🔍 Testing API Integration

### **Test with Mock Data First**

```bash
# Set in Vercel
USE_MOCK_DATA=true

# Deploy and verify app works
vercel --prod

# Check https://your-app.vercel.app/
# Should see 12 sample opportunities
```

### **Enable Real APIs Gradually**

```bash
# Start with one API
USE_MOCK_DATA=false
AUSTENDER_API_URL=https://api.tenders.gov.au

# Test and verify
# Then add more APIs one by one
```

---

## 🚨 Troubleshooting

### **Issue: "API calls failing"**

**Solution:**
1. Check environment variables are set correctly
2. Verify API URLs are accessible
3. Check API keys are valid
4. Set `USE_MOCK_DATA=true` as fallback

### **Issue: "Build failing"**

**Solution:**
1. Check Root Directory is set to `apps/web`
2. Verify `package.json` and `next.config.js` exist
3. Check build logs for specific errors

### **Issue: "Environment variables not working"**

**Solution:**
1. Ensure variables are set for correct environment (Production/Preview/Development)
2. Redeploy after adding variables
3. Clear Vercel cache: Deployments → ... → Redeploy

### **Issue: "Rate limiting errors"**

**Solution:**
```bash
# Reduce request rate
MAX_REQUESTS_PER_SECOND=5

# Increase cache duration
CACHE_DURATION_MINUTES=30
```

---

## 📊 Environment Variable Priority

**For Development:**
```bash
USE_MOCK_DATA=true  # Use sample data
# No API keys needed
```

**For Staging/Preview:**
```bash
USE_MOCK_DATA=false
# Add API keys for testing
AUSTENDER_API_KEY=test_key
```

**For Production:**
```bash
USE_MOCK_DATA=false
# Add all production API keys
AUSTENDER_API_KEY=prod_key
NSW_OPENGOV_API_KEY=prod_key
# Enable all optimizations
ENABLE_API_CACHE=true
ENABLE_RATE_LIMITING=true
```

---

## 🔐 Security Best Practices

1. **Never commit API keys** to Git
2. **Use Vercel Secrets** for sensitive data
3. **Rotate API keys** regularly
4. **Monitor API usage** for unusual patterns
5. **Set rate limits** to prevent abuse

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [API Integration Guide](./API_INTEGRATION.md)

---

## 🆘 Need Help?

- **Vercel Support**: https://vercel.com/support
- **Project Issues**: https://github.com/airostudio/AUS-GRANT-FINDER/issues
- **API Documentation**: See `docs/API_INTEGRATION.md`

---

**Last Updated:** 2026-02-11
