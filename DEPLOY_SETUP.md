# EXO ProTrack Deployment Guide

## Quick Deploy

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy `URL` and `anon` public key

#### Apply Database Schema

**Option A: Using Supabase CLI**
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to SQL Editor in Supabase Dashboard
2. Run migrations in order from `supabase/migrations/`
3. Run `supabase/schema.sql` for initial schema

#### Enable Edge Functions
```bash
supabase functions deploy create-test-users
supabase functions deploy create-bucket-qc-protocols-temp
```

---

### 2. Vercel Setup

1. Go to [Vercel Dashboard](https://vercel.com)
2. Import repository: `bioen07-del/ExoProTrack_new`
3. Configure Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

4. Deploy!

**Manual Deploy via CLI:**
```bash
cd exo-protrack
npm i -g vercel
vercel --prod
```

---

### 3. Environment Variables

Create `.env.local` in `exo-protrack/` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

### 4. GitHub Actions (Auto Deploy)

The CI/CD pipeline will:
1. Run linting and type checking on every PR
2. Build the application on merge to main
3. Auto-deploy to Vercel on main branch

**Required GitHub Secrets:**

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API Token |
| `VERCEL_ORG_ID` | Vercel Organization ID |
| `VERCEL_PROJECT_ID` | Vercel Project ID |
| `VITE_SUPABASE_URL` | Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

---

### 5. Creating Test Users

After Supabase is set up, you can create test users:

**Option A: Using Edge Function**
```bash
curl -X POST https://your-project.functions.supabase.co/create-test-users
```

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| admin@exoprotrack.test | Admin123! | Admin |
| production@exoprotrack.test | Test123! | Production |
| qc@exoprotrack.test | Test123! | QC |
| qa@exoprotrack.test | Test123! | QA |
| manager@exoprotrack.test | Test123! | Manager |

---

### 6. Production Checklist

- [ ] Supabase project created and configured
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Vercel project linked
- [ ] Environment variables set in Vercel
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] RLS policies reviewed

---

### 7. Monitoring

- **Vercel Dashboard**: Check deployment status and logs
- **Supabase Dashboard**: Monitor database usage and auth
- **Application**: Check browser console for errors
