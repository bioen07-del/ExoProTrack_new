# CLAUDE.md - ExoProTrack Project Instructions

## Project
ExoProTrack - pharmaceutical exosome monitoring system (GMP-compliant).

## Stack
- Frontend: React 18 + TypeScript + Vite (in `exo-protrack/`)
- Backend: Supabase (PostgreSQL + GoTrue Auth + REST API)
- Deploy: Vercel (CI/CD via GitHub Actions)
- Live: https://exo-pro-track-new.vercel.app

## Development Workflow (MANDATORY)
1. Read task -> Explain understanding -> Write plan
2. Wait for user approval before ANY code changes
3. After approval: Develop -> Commit -> Push -> Verify deploy
4. Report to user for verification
5. Accept feedback -> Plan fixes -> Repeat

**NEVER write code or make changes without explicit user approval.**

## Git Commands
Use `git -C "C:/Users/volchkov.se/Yandex.Disk/CodingAI/AUTO/ExoProTrack_new"` prefix.
Do NOT use `gh` CLI (broken on this system). Use WebFetch for GitHub API reads.

## Supabase Access
Use MCP tools: `execute_sql`, `apply_migration`, `list_tables`, etc.
Project URL: https://qtyglxlnhnjyweozslbg.supabase.co

## Key Directories
- `exo-protrack/src/` - Frontend source code
- `exo-protrack/src/pages/` - Page components
- `exo-protrack/src/contexts/` - React contexts (Auth, etc.)
- `exo-protrack/src/api/` - API layer / Supabase client
- `supabase/` - SQL scripts and migrations
- `api/` - Vercel serverless functions
- `docs/` - Documentation and session reports

## Language
- Code: English
- Communication with user: Russian
- Commit messages: English
