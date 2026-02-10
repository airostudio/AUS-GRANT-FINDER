# Deployment Guide

## Quick Deploy to Vercel

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel
- PostgreSQL database (Neon, Supabase, or Railway recommended)

### Step 1: Configure Vercel Project Settings

When setting up your Vercel project, use these settings:

**Build & Development Settings:**
- Framework Preset: `Other`
- Build Command: (leave empty - will use vercel.json)
- Output Directory: (leave empty - will use vercel.json)
- Install Command: (leave empty - will use vercel.json)
- Root Directory: `./` (use root of monorepo)

**OR use these commands if not using vercel.json:**
- Build Command: `pnpm turbo build --filter=@ausgrant/web`
- Install Command: `pnpm install --no-frozen-lockfile`
- Output Directory: `apps/web/.next`

### Step 2: Environment Variables

Add these environment variables in Vercel Dashboard (Project Settings → Environment Variables):

```bash
# CRITICAL: Enable Corepack for pnpm@8.x support
ENABLE_EXPERIMENTAL_COREPACK=1

# Database (Required for web app)
DATABASE_URL="postgresql://user:password@host:5432/database?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/database"

# Anthropic API (Required for AI features)
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Next.js
NEXT_PUBLIC_API_URL="https://your-api-domain.com"

# Optional: For production
NODE_ENV="production"
```

**⚠️ IMPORTANT:** The `ENABLE_EXPERIMENTAL_COREPACK=1` variable is REQUIRED. Without it, Vercel will use pnpm 6.x which is incompatible with this project (requires pnpm >=8.0.0).

### Step 3: Deploy

Push to your main branch or click "Deploy" in Vercel Dashboard.

```bash
git add .
git commit -m "chore: add Vercel deployment configuration"
git push origin claude/ausgrant-automate-setup-Z0Twc
```

## Deploy Backend API (Scraper Service)

The Python FastAPI backend needs to be deployed separately. Recommended options:

### Option 1: Railway

1. Create new project on Railway
2. Connect your GitHub repository
3. Set root directory: `apps/scraper`
4. Add environment variables:
   ```bash
   DATABASE_URL=postgresql://...
   ANTHROPIC_API_KEY=sk-ant-...
   PORT=8000
   ```
5. Add Procfile or use start command:
   ```bash
   python -m src.api.main
   ```

### Option 2: Render

1. Create new Web Service
2. Build Command: `pip install -r requirements.txt && playwright install chromium`
3. Start Command: `python -m src.api.main`
4. Add environment variables (same as above)

### Option 3: AWS/GCP/Azure

1. Use Docker container
2. Install Python, dependencies, and Playwright
3. Expose port 8000
4. Set environment variables

## Common Issues

### Issue: "ERR_PNPM_UNSUPPORTED_ENGINE - Expected version: >=8.0.0, Got: 6.35.1"

**Solution:** Vercel is using an old pnpm version. You MUST set this environment variable:

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add: `ENABLE_EXPERIMENTAL_COREPACK` = `1`
3. Apply to: Production, Preview, and Development
4. Redeploy the project

This enables Corepack which respects the `packageManager` field in package.json and uses pnpm@8.15.0.

### Issue: "node_modules missing"

**Solution:** The `vercel.json` and `.npmrc` files have been configured to handle this. If you still see this error:

1. Check that `vercel.json` exists in the root
2. Verify pnpm version in `package.json` (`"packageManager": "pnpm@8.15.0"`)
3. Ensure `ENABLE_EXPERIMENTAL_COREPACK=1` is set in Vercel environment variables
4. Clear Vercel cache and redeploy

### Issue: "Cannot find module '@ausgrant/ai-engine'"

**Solution:** Make sure the build command includes building dependencies:
```bash
pnpm turbo build --filter=@ausgrant/web
```

This will build `@ausgrant/ai-engine` and `@ausgrant/database` first (due to `dependsOn` in turbo.json).

### Issue: Prisma errors

**Solution:**
1. Ensure `DATABASE_URL` is set in environment variables
2. Prisma generate runs automatically via the build script in `packages/database`
3. If issues persist, add to vercel.json:
   ```json
   "buildCommand": "pnpm prisma generate --schema=packages/database/prisma/schema.prisma && pnpm turbo build --filter=@ausgrant/web"
   ```

### Issue: Python backend can't connect to database

**Solution:**
1. Check `DATABASE_URL` format (PostgreSQL connection string)
2. Ensure database allows connections from backend IP
3. For serverless databases, use connection pooling (e.g., pgBouncer)

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Vercel (Frontend)                     │
│     https://ausgrant-automate.vercel.app        │
│                                                 │
│  ┌─────────────────────────────────────┐       │
│  │      Next.js Web App                │       │
│  │   - Dashboard                       │       │
│  │   - Grant Browser                   │       │
│  │   - Application Builder             │       │
│  └─────────────┬───────────────────────┘       │
└────────────────┼───────────────────────────────┘
                 │ API Calls
                 ↓
┌─────────────────────────────────────────────────┐
│      Railway/Render (Backend)                   │
│     https://ausgrant-api.railway.app            │
│                                                 │
│  ┌─────────────────────────────────────┐       │
│  │    FastAPI Scraper Service          │       │
│  │   - /grants (list grants)           │       │
│  │   - /organizations (CRUD)           │       │
│  │   - /applications/generate          │       │
│  │   - /submissions/complete           │       │
│  └─────────────┬───────────────────────┘       │
└────────────────┼───────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│    Database (Neon/Supabase/Railway)             │
│                                                 │
│  - PostgreSQL with pgvector                     │
│  - Stores grants, organizations, applications   │
└─────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────┐
│         Anthropic Claude API                    │
│   - AI parsing of grant criteria               │
│   - Application generation                     │
│   - RAG-based context retrieval                │
└─────────────────────────────────────────────────┘
```

## Post-Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway/Render
- [ ] Database created and accessible
- [ ] Environment variables configured
- [ ] API connection working (test `/info` endpoint)
- [ ] Anthropic API key working
- [ ] Update `NEXT_PUBLIC_API_URL` in frontend to point to backend

## Testing Deployment

### Test Backend
```bash
curl https://your-api-domain.com/info
```

Should return system information and capabilities.

### Test Frontend
Visit `https://your-domain.vercel.app` and check:
1. Dashboard loads
2. Can view grants list
3. API connection status (should show connected)

### Test End-to-End
```bash
# Create organization
curl -X POST https://your-api-domain.com/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Org",
    "abn": "12345678901",
    "industry": "Technology",
    "years_in_operation": 5,
    "achievements": ["Test achievement"],
    "capabilities": ["Test capability"]
  }'

# List grants
curl https://your-api-domain.com/grants?limit=5

# Generate application (use real IDs from above)
curl -X POST "https://your-api-domain.com/submissions/complete?grant_id=GRANT_ID&organization_id=ORG_ID&mode=manual&auto_fill=false"
```

## Scaling Considerations

### Frontend (Vercel)
- Automatically scales with traffic
- Edge network for fast global access
- No configuration needed

### Backend (Railway/Render)
- Start with basic plan
- Monitor CPU and memory usage
- Scale up if needed (especially for Playwright form filling)
- Consider separating scraping service from API service

### Database
- Use connection pooling (Neon, Supabase provide this)
- Monitor query performance
- Add indexes for frequently queried fields
- Consider read replicas for heavy read workloads

## Cost Estimates

### Development (Free Tier)
- Vercel: Free (Hobby plan)
- Railway: $5/month free credit
- Neon Database: Free tier (0.5 GB storage)
- Anthropic API: Pay per use (~$0.01-0.10 per application)

### Production (Recommended)
- Vercel Pro: $20/month (better performance, analytics)
- Railway Pro: $5-20/month (depends on usage)
- Neon Pro: $19/month (3 GB storage, better performance)
- Anthropic API: ~$10-50/month (depends on volume)

**Total**: ~$50-110/month for production deployment

## Support

For deployment issues:
- Check build logs in Vercel/Railway dashboard
- Review this guide's "Common Issues" section
- Check GitHub issues for known problems
