#!/bin/bash
# Setup GitHub Secrets for CI/CD
# Run this script locally with: bash scripts/setup-secrets.sh

REPO="bioen07-del/ExoProTrack_new"

echo "Setting up GitHub Secrets for $REPO..."

# Vercel secrets
gh secret set VERCEL_TOKEN --repo $REPO --body "CbU18ME7ZaAojygqH1PeyYt0"
gh secret set VERCEL_ORG_ID --repo $REPO --body "bioen07s-projects"
gh secret set VERCEL_PROJECT_ID --repo $REPO --body "prj_9mJ1jHwKsx7wTruOOC3kgr3TtNR1"

# Supabase secrets
gh secret set VITE_SUPABASE_URL --repo $REPO --body "https://bxffrqcnzvnwwekvpurt.supabase.co"
gh secret set VITE_SUPABASE_ANON_KEY --repo $REPO --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZmZycWNuenZud3dla3ZwdXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTQzNDMsImV4cCI6MjA4NDkzMDM0M30.Tq31cL5X9MoPACtlc6KsiLun7Q64_OVfutWEG4UbZKM"

echo "Done! Secrets configured."
echo ""
echo "Now add environment variables to Vercel Dashboard:"
echo "https://vercel.com/bioen07s-projects/exo-pro-track-new/settings/environment-variables"
echo ""
echo "Add these variables for all environments (Production, Preview, Development):"
echo "  VITE_SUPABASE_URL = https://bxffrqcnzvnwwekvpurt.supabase.co"
echo "  VITE_SUPABASE_ANON_KEY = (the anon key)"
