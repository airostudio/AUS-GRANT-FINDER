# Build Checklist - Pre-Deployment Verification

This checklist helps identify and resolve potential build issues before deploying to Vercel.

## ✅ Package Configuration

### Root Package (monorepo)
- [x] `package.json` exists with correct packageManager field
  - ✅ `"packageManager": "pnpm@8.15.0"`
- [x] `turbo.json` configured correctly
  - ✅ Build dependencies defined: `"dependsOn": ["^build"]`
- [x] `.npmrc` configured for Vercel
  - ✅ shamefully-hoist=true
  - ✅ use-node-version=20.11.0

### Web App (`apps/web`)
- [x] `package.json` has all required dependencies
  - ✅ next, react, react-dom
  - ✅ All @radix-ui components
  - ✅ tailwindcss, postcss, autoprefixer
- [x] `next.config.js` properly configured
  - ✅ transpilePackages includes internal packages
  - ✅ No syntax errors
- [x] TypeScript configuration (`tsconfig.json`)
  - ✅ Extends proper base config
  - ✅ Paths configured (@/*)
- [x] Source files exist
  - ✅ src/app/layout.tsx
  - ✅ src/app/page.tsx
  - ✅ src/app/globals.css
- [x] Build script defined
  - ✅ `"build": "next build"`

### AI Engine Package (`packages/ai-engine`)
- [x] `package.json` configuration
  - ✅ Build script: `"build": "tsc"`
  - ✅ Main entry: `"main": "./src/index.ts"`
  - ✅ Types entry: `"types": "./src/index.ts"`
- [x] `tsconfig.json` exists and valid
  - ✅ outDir: "./dist"
  - ✅ rootDir: "./src"
- [x] Source files exist
  - ✅ src/index.ts (exports all modules)
  - ✅ src/grant-writer.ts
  - ✅ src/rag-engine.ts
  - ✅ src/types.ts
- [x] Dependencies installed
  - ✅ @anthropic-ai/sdk
  - ✅ pgvector

### Database Package (`packages/database`)
- [x] `package.json` configuration
  - ✅ Build script: `"build": "prisma generate"`
  - ✅ Main entry: `"main": "./src/index.ts"`
- [x] Prisma schema exists
  - ✅ packages/database/prisma/schema.prisma
  - ✅ Uses postgresql provider
  - ✅ vector extension configured
- [x] Source files exist
  - ✅ src/index.ts (exports Prisma client)
- [x] Dependencies installed
  - ✅ @prisma/client
  - ✅ prisma (devDependency)
  - ✅ pgvector

## ⚙️ Vercel Configuration

### Files
- [x] `vercel.json` exists in root
  - ✅ buildCommand configured
  - ✅ installCommand includes Corepack setup
  - ✅ outputDirectory points to apps/web/.next
- [x] `.vercelignore` exists
  - ✅ Excludes node_modules, .env, Python files
- [x] `.npmrc` in root
  - ✅ Proper pnpm configuration

### Environment Variables (CRITICAL!)
Must be set in Vercel Dashboard:

- [ ] **ENABLE_EXPERIMENTAL_COREPACK=1** (REQUIRED!)
  - ⚠️ Without this, build will fail with pnpm version error
- [ ] DATABASE_URL (required if using Prisma in build)
- [ ] ANTHROPIC_API_KEY (required for AI features)
- [ ] NEXT_PUBLIC_API_URL (optional, for backend API)

## 🔍 Common Build Issues to Check

### 1. Dependency Issues

**Symptom:** "Cannot find module" errors
**Check:**
```bash
# Verify all internal packages are listed in transpilePackages
grep "transpilePackages" apps/web/next.config.js

# Check if packages are properly exported
cat packages/ai-engine/src/index.ts
cat packages/database/src/index.ts
```

**Fix:** Add missing packages to transpilePackages in next.config.js

### 2. TypeScript Compilation Errors

**Symptom:** Type errors during build
**Check:**
```bash
# Test TypeScript compilation
cd packages/ai-engine && pnpm tsc --noEmit
cd packages/database && pnpm tsc --noEmit
cd apps/web && pnpm tsc --noEmit
```

**Fix:** Resolve type errors in source files

### 3. Prisma Client Not Generated

**Symptom:** "Cannot find @prisma/client" or "PrismaClient is not a constructor"
**Check:**
```bash
# Verify Prisma schema is valid
cd packages/database
pnpm prisma validate

# Check if client was generated
ls -la node_modules/.prisma/client/
```

**Fix:**
- Ensure DATABASE_URL is set (even a dummy value for build)
- Run `prisma generate` before build
- Check that build script includes Prisma generation

### 4. Missing CSS/Asset Files

**Symptom:** Build fails with "Cannot find module './globals.css'"
**Check:**
```bash
# Verify CSS file exists
ls -la apps/web/src/app/globals.css

# Check Tailwind configuration
ls -la apps/web/tailwind.config.ts
ls -la apps/web/postcss.config.js
```

**Fix:** Create missing files or update import paths

### 5. Environment Variable Issues

**Symptom:** Build fails or runtime errors related to missing env vars
**Check:**
```bash
# Search for process.env usage
grep -r "process.env" apps/web/src

# Check if .env.example exists
cat .env.example
```

**Fix:**
- Set required variables in Vercel Dashboard
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Provide fallback values for optional variables

### 6. Turbo Cache Issues

**Symptom:** Build succeeds locally but fails in Vercel
**Check:** Turbo configuration in turbo.json

**Fix:** Clear Vercel cache and redeploy:
```bash
# In Vercel Dashboard:
# Deployments → [...] → Redeploy → Clear cache and redeploy
```

### 7. pnpm Version Mismatch

**Symptom:** "ERR_PNPM_UNSUPPORTED_ENGINE Expected version: >=8.0.0 Got: 6.35.1"
**Check:**
```bash
# Verify packageManager field
grep "packageManager" package.json

# Check if ENABLE_EXPERIMENTAL_COREPACK is set in Vercel
```

**Fix:** Set `ENABLE_EXPERIMENTAL_COREPACK=1` in Vercel environment variables

### 8. Next.js Configuration Issues

**Symptom:** Build completes but app doesn't work correctly
**Check:**
```bash
# Verify next.config.js syntax
node -c apps/web/next.config.js

# Check for common issues
grep -E "(experimental|serverActions|transpilePackages)" apps/web/next.config.js
```

**Fix:** Update next.config.js with correct syntax and options

## 🧪 Local Build Testing

Before deploying, test the build locally:

```bash
# Install dependencies
pnpm install

# Test individual package builds
pnpm turbo build --filter=@ausgrant/ai-engine
pnpm turbo build --filter=@ausgrant/database
pnpm turbo build --filter=@ausgrant/web

# Test full monorepo build
pnpm turbo build

# Check build outputs
ls -la apps/web/.next
ls -la packages/ai-engine/dist
```

## 📋 Pre-Deploy Checklist

Before pushing to trigger deployment:

- [ ] All environment variables set in Vercel Dashboard
- [ ] `ENABLE_EXPERIMENTAL_COREPACK=1` is set
- [ ] Database connection string is valid (if using Prisma)
- [ ] Local build succeeds without errors
- [ ] TypeScript compilation passes in all packages
- [ ] No console errors in development mode
- [ ] Git changes committed and pushed
- [ ] Vercel project is connected to correct branch

## 🚨 Emergency Rollback

If deployment fails and you need to rollback:

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click [...] → Promote to Production
4. Fix issues locally and redeploy

## 📊 Build Performance Optimization

To speed up builds:

1. **Enable Turbo Cache**
   - Turborepo caches build outputs
   - Already configured in turbo.json

2. **Minimize transpilePackages**
   - Only include packages that need transpilation
   - Currently: @ausgrant/ai-engine, @ausgrant/database

3. **Use Incremental TypeScript Compilation**
   - Already enabled with `"incremental": true` in tsconfig.json

4. **Optimize Dependencies**
   - Remove unused dependencies
   - Use exact versions in package.json for faster installs

## 🔧 Debugging Build Failures

When a build fails in Vercel:

1. **Check Build Logs**
   - Go to Vercel Dashboard → Deployments → Failed Deployment
   - Click "View Function Logs"
   - Look for the first error (not just the last line)

2. **Common Error Patterns**
   - `Cannot find module`: Missing dependency or wrong path
   - `ERR_PNPM_`: pnpm version or configuration issue
   - `Type error`: TypeScript compilation failure
   - `Error: Command exited with 1`: Generic error, check logs above

3. **Reproduce Locally**
   ```bash
   # Clean install
   rm -rf node_modules .next
   pnpm install

   # Build with same command Vercel uses
   pnpm turbo build --filter=@ausgrant/web
   ```

4. **Check Vercel Environment**
   - Node.js version matches package.json engines
   - All environment variables are set
   - Correct branch is being deployed

## ✅ Current Status

Based on recent changes:

✅ **Resolved Issues:**
- ✅ pnpm version compatibility (Corepack enabled)
- ✅ Monorepo build configuration (vercel.json)
- ✅ Package build scripts added
- ✅ TypeScript configurations valid
- ✅ All required source files exist

⚠️ **Potential Issues:**
- ⚠️ DATABASE_URL must be set in Vercel (even dummy value for build)
- ⚠️ Verify ENABLE_EXPERIMENTAL_COREPACK=1 is set in Vercel
- ⚠️ Test that Prisma generation works during build

🎯 **Next Steps:**
1. Set ENABLE_EXPERIMENTAL_COREPACK=1 in Vercel Dashboard
2. Set DATABASE_URL in Vercel Dashboard
3. Push changes and monitor build logs
4. Verify successful deployment

## 📚 Resources

- [Vercel Monorepo Documentation](https://vercel.com/docs/monorepos)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma in Production](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [pnpm on Vercel](https://vercel.com/docs/deployments/configure-a-build#pnpm)
