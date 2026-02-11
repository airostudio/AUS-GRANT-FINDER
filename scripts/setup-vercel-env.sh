#!/bin/bash

# =============================================================================
# Vercel Environment Variables Setup Script
# =============================================================================
# This script automatically sets all environment variables for AusGrant-Automate
# on Vercel using the Vercel CLI.
#
# Prerequisites:
#   1. Install Vercel CLI: npm i -g vercel
#   2. Login to Vercel: vercel login
#   3. Link your project: vercel link
#
# Usage:
#   chmod +x scripts/setup-vercel-env.sh
#   ./scripts/setup-vercel-env.sh
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

print_error() {
    echo -e "${RED}✗ ${NC}$1"
}

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

print_success "Vercel CLI found"

# Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
    print_warning "Project not linked to Vercel"
    print_info "Running: vercel link"
    vercel link
fi

print_success "Project linked to Vercel"

# Ask for environment
echo ""
print_info "Which environment do you want to configure?"
echo "1) Production"
echo "2) Preview"
echo "3) Development"
echo "4) All environments"
read -p "Enter choice [1-4]: " env_choice

case $env_choice in
    1)
        ENV="production"
        ;;
    2)
        ENV="preview"
        ;;
    3)
        ENV="development"
        ;;
    4)
        ENV="production,preview,development"
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

print_info "Configuring environment: $ENV"
echo ""

# Function to add environment variable
add_env_var() {
    local name=$1
    local default_value=$2
    local description=$3
    local required=$4

    echo ""
    print_info "Setting: $name"
    if [ -n "$description" ]; then
        echo "   Description: $description"
    fi

    if [ -n "$default_value" ]; then
        read -p "   Value [$default_value]: " value
        value=${value:-$default_value}
    else
        if [ "$required" == "true" ]; then
            read -p "   Value (required): " value
            while [ -z "$value" ]; do
                print_warning "This value is required"
                read -p "   Value: " value
            done
        else
            read -p "   Value (optional, press Enter to skip): " value
        fi
    fi

    if [ -n "$value" ]; then
        echo "$value" | vercel env add "$name" $ENV
        print_success "Added $name"
    else
        print_warning "Skipped $name"
    fi
}

# =============================================================================
# Core Configuration
# =============================================================================

print_info "=== CORE CONFIGURATION ==="
add_env_var "USE_MOCK_DATA" "false" "Use mock data (true) or real APIs (false)" "true"

# =============================================================================
# Federal APIs
# =============================================================================

print_info ""
print_info "=== FEDERAL GOVERNMENT APIS ==="

# AusTender
print_info ""
print_info "--- AusTender (Federal Tenders) ---"
add_env_var "AUSTENDER_API_URL" "https://api.tenders.gov.au" "Base URL for AusTender OCDS API" "false"
add_env_var "AUSTENDER_API_KEY" "" "API key for AusTender (optional)" "false"

# ARC Grants
print_info ""
print_info "--- ARC Grants (Research Funding) ---"
add_env_var "ARC_API_URL" "https://www.arc.gov.au/api/grants" "Base URL for ARC API" "false"
add_env_var "ARC_API_KEY" "" "API key for ARC (optional - public API)" "false"

# GrantConnect
print_info ""
print_info "--- GrantConnect (Federal Grants) ---"
print_warning "GrantConnect does not have a public API yet"
print_info "Contact GrantConnect@Finance.gov.au for bulk access"
read -p "Do you have GrantConnect API access? (y/n): " has_gc_access
if [ "$has_gc_access" == "y" ]; then
    add_env_var "GRANTCONNECT_API_URL" "" "Base URL for GrantConnect API" "false"
    add_env_var "GRANTCONNECT_API_KEY" "" "API key for GrantConnect" "false"
fi

# =============================================================================
# State APIs
# =============================================================================

print_info ""
print_info "=== STATE GOVERNMENT APIS ==="

# NSW
print_info ""
print_info "--- NSW OpenGov API ---"
read -p "Configure NSW OpenGov API? (y/n): " config_nsw
if [ "$config_nsw" == "y" ]; then
    add_env_var "DATA_NSW_API_URL" "https://data.nsw.gov.au/api" "Base URL for NSW API" "false"
    add_env_var "NSW_OPENGOV_API_KEY" "" "API key for NSW (apply at data.nsw.gov.au)" "false"
fi

# Queensland
print_info ""
print_info "--- Queensland Open Data ---"
read -p "Configure Queensland API? (y/n): " config_qld
if [ "$config_qld" == "y" ]; then
    add_env_var "DATA_QLD_API_URL" "https://www.data.qld.gov.au/api" "Base URL for QLD API" "false"
    add_env_var "QLD_API_KEY" "" "API key for QLD (optional)" "false"
fi

# Victoria
print_info ""
print_info "--- Victoria Data ---"
read -p "Configure Victoria API? (y/n): " config_vic
if [ "$config_vic" == "y" ]; then
    add_env_var "DATA_VIC_API_URL" "https://data.vic.gov.au/api" "Base URL for VIC API" "false"
    add_env_var "VIC_API_KEY" "" "API key for VIC (optional)" "false"
fi

# =============================================================================
# Local Government APIs
# =============================================================================

print_info ""
print_info "=== LOCAL GOVERNMENT APIS ==="

# Brisbane
print_info ""
print_info "--- Brisbane City Council ---"
add_env_var "BRISBANE_API_URL" "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/grants-recipients" "Base URL for Brisbane API" "false"
add_env_var "BRISBANE_API_KEY" "" "API key for Brisbane (optional - public API)" "false"

# =============================================================================
# Performance & Optimization
# =============================================================================

print_info ""
print_info "=== PERFORMANCE & OPTIMIZATION ==="

add_env_var "ENABLE_API_CACHE" "true" "Enable API response caching" "false"
add_env_var "CACHE_DURATION_MINUTES" "15" "Cache duration in minutes" "false"
add_env_var "MAX_REQUESTS_PER_SECOND" "10" "Max API requests per second" "false"
add_env_var "ENABLE_RATE_LIMITING" "true" "Enable rate limiting" "false"

# =============================================================================
# Optional: Analytics & Monitoring
# =============================================================================

print_info ""
read -p "Configure optional analytics/monitoring? (y/n): " config_analytics
if [ "$config_analytics" == "y" ]; then
    print_info ""
    print_info "=== ANALYTICS & MONITORING ==="

    print_info ""
    print_info "--- Sentry Error Tracking ---"
    read -p "Configure Sentry? (y/n): " config_sentry
    if [ "$config_sentry" == "y" ]; then
        add_env_var "SENTRY_DSN" "" "Sentry DSN (from sentry.io)" "false"
        add_env_var "SENTRY_AUTH_TOKEN" "" "Sentry auth token" "false"
    fi
fi

# =============================================================================
# Completion
# =============================================================================

echo ""
print_success "=== ENVIRONMENT VARIABLES CONFIGURED ==="
echo ""
print_info "Next steps:"
echo "  1. Verify variables: vercel env ls"
echo "  2. Deploy: vercel --prod"
echo "  3. Check deployment: vercel logs"
echo ""
print_success "Setup complete!"
