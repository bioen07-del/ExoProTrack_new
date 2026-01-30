# ExoProTrack Development Cycle

## Project Context
- **Project**: ExoProTrack - pharmaceutical exosome monitoring system
- **Stack**: React + TypeScript + Vite + Supabase + Vercel
- **Repo**: github.com/bioen07-del/ExoProTrack_new
- **Live URL**: https://exo-pro-track-new.vercel.app
- **Supabase**: qtyglxlnhnjyweozslbg.supabase.co
- **CI/CD**: push to main -> GitHub Actions -> Vercel deploy

## Workflow Rules (STRICT)

### Communication Style
1. **TASK** - Read user's task, explain how I understood it
2. **PLAN** - Write a work plan with specific steps
3. **APPROVAL** - Wait for user's explicit "ok" / approval
4. **NEVER start coding without approval**

### Development Cycle
After approval, execute this cycle:

```
DEVELOP -> AUTO-DEPLOY -> VERIFY DEPLOY -> FIX IF NEEDED -> USER CHECK -> FEEDBACK -> PLAN -> WORK
```

Steps in detail:
1. **DEVELOP** - Write code, commit with descriptive messages, push to main
2. **AUTO-DEPLOY** - CI/CD triggers automatically (GitHub Actions -> Vercel)
3. **VERIFY DEPLOY** - Check Vercel deployment status, verify build succeeded
4. **FIX IF NEEDED** - If deploy failed or errors found, fix and redeploy
5. **USER CHECK** - Notify user that changes are live, wait for their review
6. **FEEDBACK** - User provides feedback / issues
7. **PLAN** - Plan fixes based on feedback
8. **WORK** - Back to step 1

### Key Principles
- **No action without approval** - Always present plan first
- **Every cycle ends with user verification** - User is the final judge
- **Explain before doing** - First explain understanding, then propose plan
- **Incremental delivery** - Small focused changes, not big bang releases

## Git Workflow
- Work on `main` branch (direct push for small fixes)
- Create feature branches for larger changes
- Commit messages in English, descriptive
- Always verify push succeeded

## Available Tools
- **Git**: commit, push, pull via `git -C` command
- **Supabase MCP**: SQL queries, migrations, schema management
- **WebFetch**: GitHub API for reading repo state
- **Browser**: Check live site via Vercel URL

## Test Users
- admin@exoprotrack.test / Admin123! (Admin)
- production@exoprotrack.test / Test123! (Production)
- qc@exoprotrack.test / Test123! (QC)
- qa@exoprotrack.test / Test123! (QA)
- manager@exoprotrack.test / Test123! (Manager)
