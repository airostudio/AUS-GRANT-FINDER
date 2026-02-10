# 🚨 CRITICAL: Vercel Deployment Setup

## ⚠️ THIS MUST BE DONE BEFORE DEPLOYMENT WORKS

Your deployment is failing because Vercel doesn't know to use pnpm 8.x. Follow these exact steps:

---

## Step 1: Set Environment Variable in Vercel

### Go to Vercel Dashboard:
1. Open https://vercel.com/dashboard
2. Click on your project name
3. Click **"Settings"** tab (top navigation)
4. Click **"Environment Variables"** in the left sidebar

### Add the Critical Variable:
1. Click **"Add New"** button
2. Fill in:
   - **Key**: `ENABLE_EXPERIMENTAL_COREPACK`
   - **Value**: `1`
   - **Environments**: Check ALL three boxes:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
3. Click **"Save"**

### Why This is Required:
Without this variable, Vercel uses pnpm 6.35.1 (old version).
With this variable, Vercel enables Corepack which reads the `packageManager` field in package.json and uses pnpm 8.15.0.

---

## Step 2: Add Database URL (Required)

While you're in Environment Variables, also add:

1. Click **"Add New"** again
2. Fill in:
   - **Key**: `DATABASE_URL`
   - **Value**: Your PostgreSQL connection string
   - **Environments**: Check all three boxes
3. Click **"Save"**

Example value:
```
postgresql://user:password@host:5432/database
```

**Don't have a database yet?** Get a free one from:
- Neon: https://neon.tech (Recommended - has free tier with pgvector)
- Supabase: https://supabase.com
- Railway: https://railway.app

---

## Step 3: Add Anthropic API Key (Required for AI features)

1. Click **"Add New"** again
2. Fill in:
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: Your Anthropic API key (starts with `sk-ant-`)
   - **Environments**: Check all three boxes
3. Click **"Save"**

Get your API key from: https://console.anthropic.com/settings/keys

---

## Step 4: Redeploy

After adding all environment variables:

### Option A: Automatic (if auto-deploy is enabled)
- Just wait - Vercel will redeploy automatically when it detects the new commit

### Option B: Manual
1. Go to **"Deployments"** tab
2. Click on the most recent deployment
3. Click the **"..."** menu (three dots)
4. Click **"Redeploy"**
5. Check **"Use existing Build Cache"** (optional)
6. Click **"Redeploy"**

---

## ✅ Checklist - All Three Required:

- [ ] `ENABLE_EXPERIMENTAL_COREPACK=1` added to Vercel
- [ ] `DATABASE_URL` added to Vercel
- [ ] `ANTHROPIC_API_KEY` added to Vercel
- [ ] Redeployed project

---

## 🎯 What Should Happen Next:

Once you add `ENABLE_EXPERIMENTAL_COREPACK=1` and redeploy:

```
✅ Vercel enables Corepack
✅ Corepack reads packageManager field: "pnpm@8.15.0"
✅ Uses pnpm 8.15.0 instead of 6.35.1
✅ pnpm install succeeds
✅ Packages build in order (database → ai-engine → web)
✅ Deployment succeeds! 🎉
```

---

## 🆘 Still Not Working?

If you've added the environment variable and it's still failing:

1. **Double-check the variable name** - it must be EXACTLY:
   ```
   ENABLE_EXPERIMENTAL_COREPACK
   ```
   (No typos, no extra spaces)

2. **Make sure value is just** `1` (not "true" or "yes")

3. **Verify it's applied to all environments** (all 3 checkboxes)

4. **Try "Redeploy" with "Clear Cache"**:
   - Deployments tab → Latest deployment → ... → Redeploy
   - Uncheck "Use existing Build Cache"
   - Click Redeploy

5. **Check build logs** for the exact error message

---

## 📸 Visual Guide

When adding environment variable, your screen should look like:

```
┌─────────────────────────────────────────┐
│ Add New Environment Variable            │
├─────────────────────────────────────────┤
│ Key                                     │
│ ENABLE_EXPERIMENTAL_COREPACK            │
│                                         │
│ Value                                   │
│ 1                                       │
│                                         │
│ Environments                            │
│ ☑ Production                            │
│ ☑ Preview                               │
│ ☑ Development                           │
│                                         │
│        [Cancel]  [Save]                 │
└─────────────────────────────────────────┘
```

---

## 💡 Why Can't This Be Automated?

Environment variables must be set through Vercel's dashboard for security reasons. They cannot be committed to the repository (that would expose secrets like API keys).

The `ENABLE_EXPERIMENTAL_COREPACK` variable tells Vercel's build system to use Corepack BEFORE it starts installing dependencies. This can only be configured in the Vercel dashboard, not in code.

---

## 🎓 Summary

**The Error You're Seeing:**
```
ERR_PNPM_UNSUPPORTED_ENGINE Expected version: >=8.0.0 Got: 6.35.1
```

**The Cause:**
Vercel is using its default pnpm version (6.35.1) instead of the version specified in your package.json (8.15.0).

**The Fix:**
Set `ENABLE_EXPERIMENTAL_COREPACK=1` in Vercel Dashboard → Settings → Environment Variables.

**Why This Works:**
This tells Vercel to enable Corepack, which reads the `"packageManager": "pnpm@8.15.0"` field in your package.json and uses the correct version.

---

Once you complete Step 1, 2, 3, and 4, your deployment will succeed! 🚀
