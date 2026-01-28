# Настройка CI/CD для EXO ProTrack

## Шаг 1: GitHub Secrets

Перейдите в: **GitHub → Repository → Settings → Secrets and variables → Actions**

Добавьте следующие секреты (New repository secret):

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | `CbU18ME7ZaAojygqH1PeyYt0` |
| `VERCEL_ORG_ID` | `bioen07s-projects` |
| `VERCEL_PROJECT_ID` | `prj_9mJ1jHwKsx7wTruOOC3kgr3TtNR1` |
| `VITE_SUPABASE_URL` | `https://bxffrqcnzvnwwekvpurt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (полный ключ) |

---

## Шаг 2: Vercel Environment Variables

Перейдите в: https://vercel.com/bioen07s-projects/exo-pro-track-new/settings/environment-variables

Добавьте переменные для **всех окружений** (Production, Preview, Development):

| Variable Name | Value |
|---------------|-------|
| `VITE_SUPABASE_URL` | `https://bxffrqcnzvnwwekvpurt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

---

## Шаг 3: Проверка работы

После настройки:

1. **Push в main** → автоматический деплой в production
2. **Создание PR** → preview деплой с комментарием в PR
3. **Локальная разработка** → `npm run dev` использует `.env.local`

---

## Файлы конфигурации

| Файл | Назначение |
|------|------------|
| `.github/workflows/deploy.yml` | GitHub Actions workflow |
| `.vercel/project.json` | Vercel project linking |
| `vercel.json` | Vercel build & routing config |
| `exo-protrack/.env.local` | Локальные переменные (не коммитится) |

---

## Команды

```bash
# Локальная разработка
cd exo-protrack && npm run dev

# Сборка
npm run build

# Ручной деплой (если нужно)
vercel --prod
```

---

## Мониторинг

- **Vercel Dashboard**: https://vercel.com/bioen07s-projects/exo-pro-track-new
- **Supabase Dashboard**: https://supabase.com/dashboard/project/bxffrqcnzvnwwekvpurt
- **Production URL**: https://exo-pro-track-new.vercel.app
