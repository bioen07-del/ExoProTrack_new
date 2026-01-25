# Инструкция по деплою EXO ProTrack

**Версия:** 1.0  
**Дата:** 25.01.2026

---

## Содержание

1. [Общая архитектура](#общая-архитектура)
2. [Подготовка к деплою](#подготовка-к-деплою)
3. [Вариант 1: Деплой на Vercel](#вариант-1-деплой-на-vercel)
4. [Вариант 2: Деплой на Railway](#вариант-2-деплой-на-railway)
5. [Вариант 3: Оба варианта вместе](#вариант-3-оба-варианта-вместе)
6. [Настройка Supabase](#настройка-supabase)
7. [Настройка домена](#настройка-домена)
8. [Troubleshooting](#troubleshooting)
9. [Безопасность](#безопасность)

---

## Общая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Пользователь                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel / Railway                         │
│                 (Frontend - React App)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Supabase                                 │
│              (Database + Auth + Realtime)                    │
└─────────────────────────────────────────────────────────────┘
```

**Рекомендуемая конфигурация:**
- **Frontend:** Vercel (оптимизирован для React/Vite)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)

---

## Подготовка к деплою

### Шаг 1: Подготовьте код

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd "проект Minimax"

# Перейдите в директорию проекта
cd exo-protrack

# Установите зависимости
pnpm install
```

### Шаг 2: Настройте окружение

```bash
# Скопируйте файл переменных окружения
cp .env.example .env.local

# Отредактируйте файл
nano .env.local
```

Заполните следующие переменные:

```env
# Supabase (обязательно)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Опционально
VITE_GA_ID=
VITE_SENTRY_DSN=
VITE_VAPID_PUBLIC_KEY=
```

### Шаг 3: Проверьте сборку

```bash
# Соберите проект локально
pnpm build

# Если сборка успешна, запустите preview
pnpm preview
```

---

## Вариант 1: Деплой на Vercel

### Шаг 1: Создайте аккаунт Vercel

1. Перейдите на [vercel.com](https://vercel.com)
2. Зарегистрируйтесь (можно через GitHub)
3. Подтвердите email

### Шаг 2: Установите Vercel CLI

```bash
# Установите глобально
npm i -g vercel

# Или используйте npx
npx vercel --version
```

### Шаг 3: Войдите в аккаунт

```bash
vercel login
```

### Шаг 4: Разверните проект

```bash
# Перейдите в директорию с проектом
cd exo-protrack

# Запустите деплой
vercel

# Для production деплоя
vercel --prod
```

### Шаг 5: Настройте Environment Variables

Через веб-интерфейс:

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте переменные:

| Name | Value | Type |
|------|-------|------|
| VITE_SUPABASE_URL | `https://xxx.supabase.co` | Production |
| VITE_SUPABASE_ANON_KEY | `your-anon-key` | Production |

Через CLI:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

### Шаг 6: Настройте домен (опционально)

1. В Vercel Dashboard → **Settings** → **Domains**
2. Добавьте ваш домен
3. Настройте DNS у вашего регистратора

---

## Вариант 2: Деплой на Railway

### Шаг 1: Создайте аккаунт Railway

1. Перейдите на [railway.app](https://railway.app)
2. Зарегистрируйтесь
3. Подтвердите email

### Шаг 2: Установите Railway CLI

```bash
# Установите глобально
npm i -g @railway/cli

# Проверьте установку
railway --version
```

### Шаг 3: Войдите в аккаунт

```bash
railway login
```

### Шаг 4: Инициализируйте проект

```bash
# Перейдите в директорию проекта
cd "C:\Users\bioen\Yandex.Disk\ИНБИОФАРМА\IT - проекты\EXO_ProTrack\проект Minimax"

# Инициализируйте Railway проект
railway init
```

### Шаг 5: Настройте переменные окружения

Создайте файл `railway.json` в корне проекта:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build",
    "outputDirectory": "dist"
  },
  "deploy": {
    "startCommand": "pnpm serve dist -l $PORT",
    "restartPolicy": "always"
  },
  "root": "exo-protrack"
}
```

Добавьте переменные через Railway Dashboard:

1. Перейдите в **Variables**
2. Добавьте:

| Variable | Value |
|----------|-------|
| NODE_ENV | production |
| VITE_SUPABASE_URL | `https://xxx.supabase.co` |
| VITE_SUPABASE_ANON_KEY | `your-anon-key` |

### Шаг 6: Разверните

```bash
# Разверните на Railway
railway up

# Для production
railway up --detach
```

### Шаг 7: Откройте приложение

```bash
railway open
```

---

## Вариант 3: Оба варианта вместе

Рекомендуемая конфигурация для лучшей производительности:

### Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare                           │
│              (CDN + SSL + DDoS Protection)                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│        Vercel           │   │       Railway           │
│    (Frontend App)       │   │   (Alternative Dev)    │
└─────────────────────────┘   └─────────────────────────┘
          │                               │
          └───────────────┬───────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                                │
│              (Database + Auth + Realtime)                    │
└─────────────────────────────────────────────────────────────┘
```

### Деплой на Vercel (production)

```bash
# Настройте удаленный репозиторий
git remote add vercel https://github.com/your-username/exo-protrack.git

# Деплой на Vercel
cd exo-protrack
vercel --prod
```

### Деплой на Railway (staging/development)

```bash
# Используйте тот же код
cd "C:\Users\bioen\Yandex.Disk\ИНБИОФАРМА\IT - проекты\EXO_ProTrack\проект Minimax"
railway up --detach
```

---

## Настройка Supabase

### Шаг 1: Создайте Supabase проект

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь создания базы данных

### Шаг 2: Получите credentials

1. Перейдите в **Settings** → **API**
2. Скопируйте:
   - Project URL
   - `anon` public ключ

### Шаг 3: Настройте CORS

В Supabase Dashboard:
1. Перейдите в **Settings** → **API**
2. Найдите **CORS**
3. Добавьте ваши домены:
   - `http://localhost:5173` (для разработки)
   - `https://your-domain.vercel.app` (production)
   - `https://your-domain.railway.app` (production)

### Шаг 4: Настройте RLS (Row Level Security)

Убедитесь, что RLS политики настроены корректно для ваших таблиц.

---

## Настройка домена

### Для Vercel

1. **Добавьте домен:**
   ```
   Vercel Dashboard → Settings → Domains → Add Domain
   ```

2. **Настройте DNS у регистратора:**
   ```
   Type: CNAME
   Name: www или @
   Value: cname.vercel-dns.com
   TTL: Auto
   ```

### Для Railway

1. **Добавьте домен:**
   ```
   Railway Dashboard → Settings → Domains → Add Domain
   ```

2. **Настройте DNS:**
   ```
   Type: CNAME
   Name: www или @
   Value: your-app.up.railway.app
   TTL: Auto
   ```

### Для Cloudflare (рекомендуется)

1. Добавьте сайт в Cloudflare
2. Настройте DNS проксирование
3. Включите SSL (Flexible или Full)
4. Настройте Page Rules для redirect на https

---

## Troubleshooting

### Ошибка сборки

```bash
# Очистите кэш и пересоберите
cd exo-protrack
pnpm clean
pnpm install
pnpm build
```

### Ошибка CORS

1. Проверьте настройки CORS в Supabase
2. Убедитесь, что добавили все домены
3. Проверьте формат URL (без trailing slash)

### Проблемы с аутентификацией

1. Проверьте Environment Variables
2. Убедитесь, что используете правильный `anon` ключ
3. Проверьте RLS политики

### PWA не работает

1. Убедитесь, что используете HTTPS
2. Проверьте service worker registration
3. Проверьте manifest.json

### Медленная загрузка

1. Оптимизируйте изображения
2. Включите сжатие на сервере
3. Используйте CDN для статики

---

## Безопасность

### 1. Environment Variables

- **НЕ** коммитьте `.env.local` в git
- Используйте secrets для sensitive данных
- Регулярно меняйте API ключи

### 2. Supabase

- Включите RLS на всех таблицах
- Ограничьте права для `anon` ключа
- Настройте CORS для нужных доменов

### 3. HTTP Headers

Vercel автоматически добавляет:
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff

### 4. SSL/TLS

- Всегда используйте HTTPS
- Настройте HSTS
- Используйте современные TLS версии

---

## Мониторинг

### Vercel Analytics

1. В Vercel Dashboard → **Settings** → **Analytics**
2. Включите Web Vitals tracking

### Supabase Monitoring

1. **Database** → **Logs** - просмотр логов
2. **Database** → **Performance** - мониторинг запросов

### Error Tracking (опционально)

Добавьте Sentry:

```bash
npm install @sentry/react
```

```typescript
// main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
});
```

---

## Rollback

### Vercel

1. Откройте Vercel Dashboard
2. Перейдите в **Deployments**
3. Нажмите на предыдущий деплой
4. Нажмите **Redeploy**

### Railway

1. Откройте Railway Dashboard
2. Перейдите в **Deployments**
3. Нажмите на предыдущий деплой
4. Нажмите **Rollback**

---

## Контакты

**Техническая поддержка:** support@exo.ru  
**Документация:** `/docs`

---

**Дата создания:** 25.01.2026  
**Версия:** 1.0
