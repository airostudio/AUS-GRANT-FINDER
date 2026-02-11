# Quick Reference - Environment Variables

Essential environment variables for AusGrant-Automate deployment.

---

## 🚀 Quick Start (Copy & Paste)

### **Minimal Setup (Mock Data)**

```env
USE_MOCK_DATA=true
```

That's it! App will use sample data.

---

### **Production Setup (Real APIs)**

```env
# Core
USE_MOCK_DATA=false

# Federal APIs
AUSTENDER_API_URL=https://api.tenders.gov.au
ARC_API_URL=https://www.arc.gov.au/api/grants
BRISBANE_API_URL=https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/grants-recipients

# Performance
ENABLE_API_CACHE=true
CACHE_DURATION_MINUTES=15
MAX_REQUESTS_PER_SECOND=10
```

---

## 📋 All Variables (Alphabetical)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `ARC_API_KEY` | - | No | ARC API key (public API) |
| `ARC_API_URL` | https://www.arc.gov.au/api/grants | Yes* | ARC API base URL |
| `AUSTENDER_API_KEY` | - | No | AusTender API key |
| `AUSTENDER_API_URL` | https://api.tenders.gov.au | Yes* | AusTender API URL |
| `BRISBANE_API_KEY` | - | No | Brisbane API key (public) |
| `BRISBANE_API_URL` | https://data.brisbane... | Yes* | Brisbane API URL |
| `CACHE_DURATION_MINUTES` | 15 | No | Cache duration |
| `DATA_NSW_API_URL` | https://data.nsw.gov.au/api | No | NSW API URL |
| `DATA_QLD_API_URL` | https://www.data.qld.gov.au/api | No | QLD API URL |
| `DATA_VIC_API_URL` | https://data.vic.gov.au/api | No | VIC API URL |
| `ENABLE_API_CACHE` | true | No | Enable caching |
| `ENABLE_RATE_LIMITING` | true | No | Enable rate limits |
| `MAX_REQUESTS_PER_SECOND` | 10 | No | Rate limit |
| `NSW_OPENGOV_API_KEY` | - | Yes** | NSW API key |
| `QLD_API_KEY` | - | No | QLD API key |
| `USE_MOCK_DATA` | false | **YES** | Use mock/real data |
| `VIC_API_KEY` | - | No | VIC API key |

\* Required when `USE_MOCK_DATA=false`
\*\* Required for NSW data

---

## 🔑 API Keys - Where to Get Them

| Service | How to Get API Key |
|---------|-------------------|
| **AusTender** | https://github.com/austender/austender-ocds-api |
| **NSW OpenGov** | Apply at https://data.nsw.gov.au/ |
| **GrantConnect** | Email: GrantConnect@Finance.gov.au |

---

## ⚡ Quick Commands

### **Vercel CLI**

```bash
# Install
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Set one variable
vercel env add USE_MOCK_DATA production

# List all variables
vercel env ls

# Deploy
vercel --prod
```

### **Automated Setup**

```bash
# Run setup script
./scripts/setup-vercel-env.sh
```

---

## 🎯 Common Configurations

### **Development**
```env
USE_MOCK_DATA=true
```

### **Staging**
```env
USE_MOCK_DATA=false
AUSTENDER_API_URL=https://api.tenders.gov.au
ENABLE_API_CACHE=true
```

### **Production**
```env
USE_MOCK_DATA=false
AUSTENDER_API_URL=https://api.tenders.gov.au
ARC_API_URL=https://www.arc.gov.au/api/grants
BRISBANE_API_URL=https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/grants-recipients
NSW_OPENGOV_API_KEY=your_key_here
ENABLE_API_CACHE=true
CACHE_DURATION_MINUTES=15
MAX_REQUESTS_PER_SECOND=10
ENABLE_RATE_LIMITING=true
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "No data showing" | Set `USE_MOCK_DATA=true` |
| "API errors" | Check API URLs and keys |
| "Build failed" | Verify Root Directory = `apps/web` |
| "Env vars not working" | Redeploy after adding variables |

---

## 📚 Full Documentation

- **Complete Guide**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **API Documentation**: [API_INTEGRATION.md](./API_INTEGRATION.md)
- **Environment Template**: [apps/web/.env.example](../apps/web/.env.example)

---

**Last Updated:** 2026-02-11
