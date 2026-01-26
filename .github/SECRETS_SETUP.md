# GitHub Actions Secrets - Complete Setup Guide
# ============================================

## Required Secrets for EXO ProTrack CI/CD

Add these secrets in GitHub Repository:
**Settings > Secrets and Variables > Actions > New repository secret**

### Supabase Secrets (REQUIRED)

| Secret Name | Value | Where to get |
|-------------|-------|--------------|
| `SUPABASE_ACCESS_TOKEN` | Personal Access Token | https://supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_ID` | `bxffrqcnzvnwwekvpurt` | Supabase Dashboard > Project Settings > General |
| `SUPABASE_DB_PASSWORD` | Database password | Set in Supabase Dashboard > Database |
| `VITE_SUPABASE_URL` | `https://bxffrqcnzvnwwekvpurt.supabase.co` | Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase Dashboard > Settings > API |

### Vercel Secrets (REQUIRED for Deployment)

| Secret Name | Value | Where to get |
|-------------|-------|--------------|
| `VERCEL_TOKEN` | API Token | https://vercel.com/settings/tokens |
| `VERCEL_ORG_ID` | `team_xxx` | Run: `vercel teams ls` |
| `VERCEL_PROJECT_ID` | `prj_xxx` | Vercel Dashboard > Project > Settings > General |

### Optional Secrets

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `SLACK_WEBHOOK_URL` | Webhook URL | Slack notifications on failure |
| `DISCORD_WEBHOOK_URL` | Webhook URL | Discord notifications on failure |

---

## Step-by-Step Setup Guide

### Step 1: Get Supabase Secrets

1. Go to https://supabase.com/dashboard
2. Select project `bxffrqcnzvnwwekvpurt`
3. **Project ID**: Copy from Settings > General
4. **API URL**: Copy from Settings > API > Project URL
5. **Anon Key**: Copy from Settings > API > anon public
6. **Create Personal Access Token**:
   - Go to Account > Tokens
   - Click "New Token"
   - Select scopes: `projects.read`, `projects.write`, `functions.read`, `functions.write`
   - Copy the token

### Step 2: Get Vercel Secrets

1. Go to https://vercel.com
2. **Create API Token**:
   - Settings > Tokens
   - Click "Create Token"
   - Name: `EXO ProTrack GitHub Actions`
   - Scope: Full Account
   - Copy the token

3. **Get Organization ID**:
   ```bash
   vercel login
   vercel teams ls
   ```
   Look for team starting with `team_`

4. **Get Project ID**:
   - Import project in Vercel Dashboard
   - Project > Settings > General
   - Copy "Project ID"

### Step 3: Add Secrets to GitHub

1. Go to https://github.com/bioen07-del/ExoProTrack_new
2. Navigate to **Settings > Secrets and Variables > Actions**
3. Click **New repository secret** for each secret:

```bash
# Copy these commands to add all secrets at once (requires GitHub CLI)
gh secret set SUPABASE_ACCESS_TOKEN --body "your-token-here"
gh secret set SUPABASE_PROJECT_ID --body "bxffrqcnzvnwwekvpurt"
gh secret set SUPABASE_DB_PASSWORD --body "your-db-password"
gh secret set VITE_SUPABASE_URL --body "https://bxffrqcnzvnwwekvpurt.supabase.co"
gh secret set VITE_SUPABASE_ANON_KEY --body "your-anon-key"
gh secret set VERCEL_TOKEN --body "your-vercel-token"
gh secret set VERCEL_ORG_ID --body "team_xxx"
gh secret set VERCEL_PROJECT_ID --body "prj_xxx"
```

### Step 4: Configure Vercel Environment

1. Go to Vercel Dashboard
2. Select project `ExoProTrack_new`
3. Navigate to **Settings > Environment Variables**
4. Add these variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://bxffrqcnzvnwwekvpurt.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Production, Preview, Development |

5. Click **Save**

### Step 5: Configure Supabase Database

**Option A: Using SQL Editor (Recommended)**

1. Go to Supabase Dashboard > SQL Editor
2. Open `supabase/schema-complete.sql`
3. Run the entire script

**Option B: Using Migrations**

```bash
# Requires Supabase CLI
supabase link --project-ref bxffrqcnzvnwwekvpurt
supabase db push
```

### Step 6: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy create-test-users --project-ref bxffrqcnzvnwwekvpurt
supabase functions deploy create-bucket-qc-protocols-temp --project-ref bxffrqcnzvnwwekvpurt
```

---

## GitHub Actions Workflows

### CI/CD Pipeline (ci-cd.yml)

**Triggers:**
- Push to `main` or `develop` branch
- Pull requests to `main`

**Jobs:**
1. `lint-and-typecheck` - Run ESLint and TypeScript
2. `build` - Build the application
3. `supabase-migration` - Apply database migrations
4. `deploy-vercel` - Deploy to Vercel
5. `notify-success` / `notify-failure` - Notifications

### Supabase Deploy (supabase-deploy.yml)

**Triggers:**
- Push changes to `supabase/migrations/`
- Manual dispatch

**Jobs:**
1. `migrate` - Apply database migrations
2. `deploy-edge-functions` - Deploy Edge Functions
3. `create-test-users` - Create test users

---

## Verification Checklist

- [ ] All GitHub Secrets added
- [ ] Vercel Environment Variables configured
- [ ] Supabase Database schema applied
- [ ] Edge Functions deployed
- [ ] First deployment completed
- [ ] Test login works

---

## Troubleshooting

### "Supabase link failed"
- Check `SUPABASE_ACCESS_TOKEN` is valid
- Verify `SUPABASE_PROJECT_ID` is correct

### "Vercel deployment failed"
- Check `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Ensure project is imported in Vercel

### "Database connection failed"
- Check `SUPABASE_DB_PASSWORD`
- Verify IP is allowed in Supabase Network settings

### "Build failed"
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify environment variables in Vercel

---

## Useful Commands

```bash
# Check GitHub Actions status
gh run list --workflow=ci-cd.yml

# Trigger workflow manually
gh workflow run ci-cd.yml --ref main

# Check deployment status
vercel list

# View logs
vercel logs <deployment-url>
```

---

**Last Updated:** 2026-01-26
**Project:** EXO ProTrack v3.5.0
