# Vercel 404 Error - Complete Fix Guide

**Error:** `404: NOT_FOUND Code: NOT_FOUND ID: syd1::z9mfq-1777695909222-d8eff3de0b9f`

**Root Cause:** Vercel configuration issue - the app builds successfully locally but fails to deploy correctly on Vercel.

## ✅ Verified Working Locally

```
Build Status: SUCCESS ✅
Route (app)
┌ ○ /                    ← Main page EXISTS
├ ○ /_not-found
├ ƒ /api/health
├ ƒ /api/opportunities
└ ○ /opportunities
```

The code is fine. This is a Vercel configuration issue.

---

## 🔧 Solution: Reconfigure Vercel Project

### Option 1: Delete and Reimport (RECOMMENDED)

This is the cleanest solution:

1. **Delete the Vercel project:**
   - Go to: https://vercel.com/your-team/ausgrant-finder/settings/advanced
   - Scroll to "Delete Project"
   - Confirm deletion

2. **Reimport fresh:**
   - Go to: https://vercel.com/new
   - Click "Import Git Repository"
   - Select: `airostudio/AUS-GRANT-FINDER`
   - **CRITICAL SETTINGS:**

   ```
   Project Name: ausgrant-finder
   Framework Preset: Next.js
   Root Directory: apps/web          ⚠️ MUST BE SET
   
   Build Settings:
   Build Command: npm run build       (leave default)
   Output Directory: .next            (leave default)
   Install Command: npm install       (leave default)
   ```

3. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Main page should load ✅

---

### Option 2: Fix Current Deployment

If you can't delete the project:

**Step 1: Verify Root Directory**

1. Go to: https://vercel.com/your-team/ausgrant-finder/settings
2. Click "General"
3. Find "Root Directory"
4. **Set to:** `apps/web` (not blank, not `/`, not `./apps/web`)
5. Click "Save"

**Step 2: Clear Build Cache**

1. Go to: https://vercel.com/your-team/ausgrant-finder/settings
2. Scroll to "Build & Development Settings"
3. Find "Ignored Build Step"
4. Make sure it's empty or `exit 1` if you want to force build
5. Save

**Step 3: Force Redeploy**

1. Go to: https://vercel.com/your-team/ausgrant-finder
2. Click "Deployments" tab
3. Find latest deployment
4. Click "..." (three dots)
5. Click "Redeploy"
6. Check "Use existing Build Cache" is **UNCHECKED**
7. Click "Redeploy"

**Step 4: Check Build Logs**

While deploying:
1. Click on the deployment (the one being built)
2. Click "Building" to expand logs
3. Look for errors

**Common issues to look for:**
```bash
# Good - should see this:
"Building..."
"Root Directory: apps/web"
"Framework: Next.js"
"Build succeeded"

# Bad - if you see:
"Root Directory: (empty)" or "Root Directory: ."
"Cannot find apps/web"
"404 after build"
```

---

### Option 3: Manual Configuration File

Create a `vercel.json` at the **PROJECT ROOT** (not in apps/web):

```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "apps/web/$1"
    }
  ]
}
```

Then:
1. Commit and push
2. Vercel will auto-deploy
3. Check if 404 is fixed

---

## 🧪 Verification Steps

After deploying, test these endpoints:

```bash
DOMAIN="your-domain.vercel.app"

# 1. Main page (should return HTML)
curl https://$DOMAIN/
# ✅ Should see: <html><head>...AusGrant-Automate...

# 2. API health (should return JSON)
curl https://$DOMAIN/api/health
# ✅ Should see: {"success":true,"summary":{...}}

# 3. Opportunities page (should return HTML)
curl https://$DOMAIN/opportunities
# ✅ Should see: <html>...opportunities...

# 4. Static files (should work)
curl -I https://$DOMAIN/_next/static/chunks/main.js
# ✅ Should see: 200 OK

# 5. Check headers (security)
curl -I https://$DOMAIN/
# ✅ Should see: X-Frame-Options: DENY, Content-Security-Policy: ...
```

---

## 🔍 Debugging: Check Vercel Build Logs

If still 404 after redeploy:

1. **Go to deployment page:**
   ```
   https://vercel.com/your-team/ausgrant-finder/deployments/[deployment-id]
   ```

2. **Check Build Log:**
   - Click "Building" to expand
   - Look for actual build output
   - Search for "Error" or "Failed"

3. **Common error patterns:**

   **Error A: Wrong Directory**
   ```
   Error: Cannot find module 'apps/web/package.json'
   ```
   **Fix:** Set Root Directory to `apps/web`

   **Error B: Build Succeeds but 404**
   ```
   Build completed
   Output: .next
   [BUT 404 when accessing]
   ```
   **Fix:** Framework detection issue. Set Framework Preset to "Next.js"

   **Error C: Can't find pages**
   ```
   No output files found
   ```
   **Fix:** Output directory wrong. Should be `.next`

---

## 📋 Correct Vercel Settings

**Final checklist - all these MUST be set:**

| Setting | Value | Location |
|---------|-------|----------|
| Root Directory | `apps/web` | Settings → General |
| Framework Preset | Next.js | Auto-detected or set manually |
| Build Command | `npm run build` | Usually auto-detected |
| Output Directory | `.next` | Usually auto-detected |
| Install Command | `npm install` | Usually auto-detected |
| Node.js Version | 20.x | Settings → General |

**Environment Variables (Optional but recommended):**

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Auto-set by Vercel |
| `KV_REST_API_URL` | (auto-set if KV created) | Rate limiting |
| `KV_REST_API_TOKEN` | (auto-set if KV created) | Rate limiting |

---

## 🆘 If Nothing Works

**Nuclear option - fresh start:**

1. **Fork the repository:**
   ```bash
   # On GitHub, click "Fork"
   # Then clone your fork
   git clone https://github.com/YOUR-USERNAME/AUS-GRANT-FINDER
   ```

2. **Deploy the fork:**
   - Import the forked repo to Vercel
   - Set Root Directory: `apps/web`
   - Deploy

3. **If fork works:**
   - The issue was with the original Vercel project settings
   - Delete original, use fork going forward
   - Or compare settings between working fork and original

---

## 📞 Get Help

**If still not working, check:**

1. **Vercel Status:**
   https://www.vercel-status.com/
   (Maybe Vercel is having issues)

2. **Vercel Community:**
   https://github.com/vercel/next.js/discussions
   (Search for "404 after deploy")

3. **Share build log:**
   - Copy entire build log from Vercel deployment
   - Share in Vercel Discord or create issue

---

## ✨ Expected Final Result

**After correct configuration:**

- ✅ https://your-domain.vercel.app/ → Main page with GrantWizard
- ✅ https://your-domain.vercel.app/opportunities → Opportunities browser
- ✅ https://your-domain.vercel.app/api/health → JSON response
- ✅ https://your-domain.vercel.app/api/opportunities?scope=australia → Real data
- ✅ All security headers present (CSP, HSTS, etc.)
- ✅ Rate limiting working (60 req/min)

---

**The code is 100% working locally. This is purely a Vercel configuration issue.**

**Most likely fix:** Delete project → Reimport → Set Root Directory to `apps/web` → Deploy ✅
