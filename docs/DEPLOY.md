# Руководство по деплою EXO ProTrack

|**Версия:** 2.0  
|**Дата:** 25.01.2026  
|**Структура проекта:** React SPA в папке `exo-protrack/`

---

## Содержание

1. [Требования](#требования)
2. [Локальная разработка](#локальная-разработка)
3. [Деплой на Vercel](#деплой-на-vercel)
4. [Деплой на Railway](#деплой-на-railway)
5. [Деплой с Docker](#деплой-с-docker)
6. [Настройка домена](#настройка-домена)
7. [Environment Variables](#environment-variables)
8. [Troubleshooting](#troubleshooting)

---

## Требования

### Общие требования

- Node.js 18+ или Docker
- pnpm (рекомендуется) или npm/yarn
- Аккаунт Supabase с настроенным проектом

### Структура проекта

```
проект Minimax/
├── exo-protrack/          # React приложение
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── supabase/              # Database schema & functions
├── docs/                  # Документация
├── vercel.json            # Vercel config
├── railway.json           # Railway config
├── Dockerfile
└── docker-compose.yml
```

### Для локальной разработки

```bash
# Установка pnpm
npm install -g pnpm

# Клонирование репозитория
git clone https://github.com/bioen07-del/ExoProTrack_new.git
cd ExoProTrack_new/exo-protrack

# Установка зависимостей
pnpm install
```

---

## Локальная разработка

### Запуск development сервера

```bash
cd exo-protrack
pnpm dev
```

Приложение будет доступно по адресу `http://localhost:5173`

### Создание production сборки

```bash
cd exo-protrack
pnpm build
pnpm preview  # Предпросмотр production сборки
```

### Docker (альтернатива)

```bash
# Development
docker-compose up dev

# Production
docker-compose up app
```

---

## Деплой на Vercel

Vercel рекомендуется для frontend приложений.

### Шаг 1: Подготовка

1. Создайте аккаунт на [Vercel](https://vercel.com)
2. Установите Vercel CLI:
   ```bash
   npm i -g vercel
   ```

### Шаг 2: Подключение репозитория

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Нажмите **Add New** → **Project**
3. Выберите репозиторий `bioen07-del/ExoProTrack_new`
4. Vercel автоматически определит:
   - **Framework Preset:** Vite
   - **Build Command:** `cd exo-protrack && pnpm install && pnpm build`
   - **Output Directory:** `exo-protrack/dist`

### Шаг 3: Environment Variables

Добавьте в панели Vercel (Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | URL из Supabase (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Anon key из Supabase |

### Шаг 4: Деплой

Нажмите **Deploy** — Vercel автоматически соберёт и развернёт приложение.

#### Через CLI

```bash
# Войдите в аккаунт
vercel login

# Разверните проект
vercel --prod
```

---

## Деплой на Railway

Railway рекомендуется для полного стека (если нужны серверные функции).

### Шаг 1: Подготовка

1. Создайте аккаунт на [Railway](https://railway.app)
2. Установите Railway CLI:
   ```bash
   npm i -g @railway/cli
   railway login
   ```

### Шаг 2: Подключение репозитория

1. Откройте [Railway Dashboard](https://railway.app/dashboard)
2. Нажмите **New Project**
3. Выберите **Deploy from GitHub repo**
4. Выберите `bioen07-del/ExoProTrack_new`

### Шаг 3: Настройка конфигурации

Railway автоматически использует `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd exo-protrack && pnpm install && pnpm build",
    "outputDirectory": "exo-protrack/dist"
  },
  "deploy": {
    "startCommand": "cd exo-protrack && pnpm install -g serve && serve -s dist -l $PORT"
  }
}
```

### Шаг 4: Environment Variables

Добавьте в Railway (Service → Variables):

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `VITE_SUPABASE_URL` | URL из Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key из Supabase |

### Шаг 5: Деплой

Нажмите **Deploy** — Railway автоматически соберёт приложение.

#### Через CLI

```bash
# Инициализируйте проект
railway init

# Разверните
railway up
```

---

## Деплой с Docker

### Docker Hub

```bash
# Сборка образа
docker build -t exo-protrack:latest .

# Запуск
docker run -p 3000:3000 \
  -e VITE_SUPABASE_URL=your-url \
  -e VITE_SUPABASE_ANON_KEY=your-key \
  exo-protrack:latest
```

### Docker Compose

```bash
# Production
docker-compose up -d

# Development
docker-compose -f docker-compose.dev.yml up -d
```

### Kubernetes

Создайте deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: exo-protrack
spec:
  replicas: 2
  selector:
    matchLabels:
      app: exo-protrack
  template:
    metadata:
      labels:
        app: exo-protrack
    spec:
      containers:
      - name: exo-protrack
        image: exo-protrack:latest
        ports:
        - containerPort: 3000
        env:
        - name: VITE_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: exo-secrets
              key: supabase-url
        - name: VITE_SUPABASE_ANON_KEY
          valueFrom:
            secretKeyRef:
              name: exo-secrets
              key: supabase-anon-key
```

---

## Настройка домена

### Vercel

1. Откройте проект в Vercel Dashboard
2. Перейдите в **Settings** → **Domains**
3. Добавьте ваш домен
4. Настройте DNS записи (CNAME для www, A для apex)

### Railway

1. Откройте проект в Railway Dashboard
2. Перейдите в **Settings** → **Domains**
3. Добавьте домен
4. Настройте DNS на Railway IP

---

## Environment Variables

### Обязательные

| Variable | Описание | Пример |
|----------|----------|--------|
| `VITE_SUPABASE_URL` | URL Supabase проекта | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon ключ Supabase | `eyJhbGciOiJIUzI1NiIs...` |

### Опциональные

| Variable | Описание | Пример |
|----------|----------|--------|
| `VITE_GA_ID` | Google Analytics ID | `G-XXXXXXXXXX` |
| `VITE_SENTRY_DSN` | Sentry DSN | `https://xxx@sentry.io/xxx` |
| `VITE_VAPID_PUBLIC_KEY` | VAPID ключ для push | `your-public-key` |

### Получение Supabase credentials

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите проект
3. Перейдите в **Settings** → **API**
4. Скопируйте URL и anon key

---

## Troubleshooting

### Ошибка сборки

```bash
# Очистите кэш
cd exo-protrack
pnpm clean
pnpm install
pnpm build
```

### Проблемы с Supabase

1. Проверьте URL и anon key
2. Убедитесь, что CORS настроен в Supabase (Settings → API → CORS)
3. Проверьте RLS политики

### PWA не работает

1. Проверьте service worker registration
2. Убедитесь, что используется HTTPS
3. Проверьте manifest.json

### Медленная загрузка

1. Оптимизируйте изображения
2. Включите сжатие на сервере
3. Используйте CDN для статики

### Ошибки в консоли

```bash
# Development mode с подробным логированием
cd exo-protrack
pnpm dev --debug
```

---

## Мониторинг

### Vercel Analytics

Включите в Vercel Dashboard:
- **Settings** → **Analytics**

### Supabase Monitoring

- **Database** → **Logs**
- **Database** → **Performance**

---

## Rollback

### Vercel

1. Откройте Dashboard
2. Перейдите в **Deployments**
3. Нажмите на предыдущий деплой
4. Нажмите **Redeploy**

### Railway

1. Откройте Dashboard
2. Перейдите в **Deployments**
3. Нажмите на предыдущий деплой
4. Нажмите **Rollback**

---

## CI/CD с GitHub Actions

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        working-directory: ./exo-protrack
        run: pnpm install

      - name: Build
        working-directory: ./exo-protrack
        run: pnpm build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

---

## Безопасность

1. **Не коммитьте** `.env.local`
2. Используйте **secrets** для sensitive данных
3. Настройте **CSP** заголовки (уже в `vercel.json`)
4. Включите **HTTPS**
5. Настройте **CORS** в Supabase

---

## Контакты

**Документация:** `/docs`

---

**Дата создания:** 25.01.2026  
**Версия:** 2.0
