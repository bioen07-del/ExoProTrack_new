# GitHub Actions Secrets Setup
# ============================================

# Add these secrets in GitHub Repository:
# Repository > Settings > Secrets and Variables > Actions > New repository secret

# --------------------------------------------
# Supabase Secrets (REQUIRED)
# --------------------------------------------

# Name: VITE_SUPABASE_URL
# Value: https://your-project-id.supabase.co
# Get from: Supabase Dashboard > Project Settings > API > URL

VITE_SUPABASE_URL=https://your-project.supabase.co

# Name: VITE_SUPABASE_ANON_KEY
# Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Get from: Supabase Dashboard > Project Settings > API > anon public

VITE_SUPABASE_ANON_KEY=your-anon-key-here

# --------------------------------------------
# Vercel Secrets (REQUIRED for auto-deploy)
# --------------------------------------------

# Name: VERCEL_TOKEN
# Value: Your Vercel API token
# Get from: Vercel Dashboard > Settings > Tokens > Create Token

VERCEL_TOKEN=your-vercel-token

# Name: VERCEL_ORG_ID
# Value: team_xxxxxxxxxxxxx
# Get from: Run: vercel teams ls
# Or: Vercel Dashboard > Settings > General > Team ID

VERCEL_ORG_ID=your-org-id

# Name: VERCEL_PROJECT_ID
# Value: prj_xxxxxxxxxxxxx
# Get from: Vercel Dashboard > Project > Settings > General > Project ID

VERCEL_PROJECT_ID=your-project-id

# --------------------------------------------
# Optional: Supabase Service Role Key
# --------------------------------------------
# Only needed if using server-side Supabase operations

# Name: SUPABASE_SERVICE_ROLE_KEY
# Value: Your service role key
# Get from: Supabase Dashboard > Project Settings > API > service_role

SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# --------------------------------------------
# Setup Instructions
# --------------------------------------------

# 1. Go to your GitHub repository
# 2. Navigate to Settings > Secrets and Variables > Actions
# 3. Click "New repository secret" for each variable above
# 4. Copy the secret name and value
# 5. Save!

# Verification:
# After adding secrets, push to main branch
# GitHub Actions will automatically run and deploy to Vercel
