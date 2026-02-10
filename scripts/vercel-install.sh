#!/bin/bash
set -e

echo "🔧 Vercel Install Script - Ensuring pnpm 8.x"

# Check current pnpm version
CURRENT_PNPM_VERSION=$(pnpm -v 2>/dev/null || echo "0.0.0")
echo "Current pnpm version: $CURRENT_PNPM_VERSION"

# Check if we have pnpm 8.x or higher
MAJOR_VERSION=$(echo $CURRENT_PNPM_VERSION | cut -d. -f1)

if [ "$MAJOR_VERSION" -lt 8 ]; then
  echo "❌ pnpm version is too old ($CURRENT_PNPM_VERSION)"
  echo "📦 Installing pnpm@8.15.0 using npm..."

  # Install pnpm 8.x globally using npm (which is always available on Vercel)
  npm install -g pnpm@8.15.0

  echo "✅ pnpm 8.15.0 installed successfully"
  pnpm -v
else
  echo "✅ pnpm version is compatible ($CURRENT_PNPM_VERSION)"
fi

echo "📦 Installing dependencies..."
pnpm install --no-frozen-lockfile

echo "✅ Dependencies installed successfully!"
