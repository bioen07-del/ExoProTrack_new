# EXO ProTrack — Отчёт о сессиях миграции и доработки

**Проект:** EXO ProTrack — Система мониторинга производства и прослеживаемости экзосом
**Репозиторий:** ExoProTrack_new
**Стек:** React 18 + TypeScript + Vite 6 + Supabase + Vercel
**Дата отчёта:** 30.01.2026
**Ветка разработки:** `claude/review-dev-status-3hpzP`

---

## 1. Состояние проекта ДО миграции

### 1.1 Исходная платформа
- Разработка велась на внешней платформе (space.minimax.io)
- Supabase Project ID: `swlzoqemroxdoenqxhnx` (старый)
- Деплой: `https://8dn7jsy4id7p.space.minimax.io` / `https://b5kr6utulx4l.space.minimax.io`
- Версия: 2.4.6

### 1.2 Что было реализовано (v1.0.0 → v2.4.6)
Полный функционал зафиксирован в `docs/CHANGELOG.md`. Ключевые модули:

| Модуль | Описание |
|--------|----------|
| Dashboard | Статусы CM/PackLot, графики ECharts, FEFO таблица, MTO заявки |
| CM Лоты | Полный lifecycle: создание → сбор → процессинг → QC → QA → постпроцессинг |
| Культуры | Каталог с инфекционным скринингом |
| Заявки | MTO/MTS, FEFO сортировка, резервирование |
| Готовая продукция | PackLot: розлив → QC продукта → отгрузка |
| QC/QA | Динамические тесты из frozen_spec, автоматические QC-запросы |
| Склад | Сырьё + готовая продукция |
| Администрирование | 10+ справочников с полным CRUD |
| Snapshot-архитектура | frozen_spec в product, request, cm_lot |
| Документы | Генерация COA и SDS |

### 1.3 Исходные проблемы
- Деплой привязан к minimax.io — нужна миграция на Vercel
- CI/CD отсутствует
- Автоматизированные тесты минимальны
- UI не модернизирован (нет анимаций, компонентная библиотека не создана)
- Radix UI, Framer Motion, Sonner установлены но не интегрированы

---

## 2. Миграция на Vercel + новый Supabase (Сессия 1-2)

### 2.1 Новая инфраструктура

| Компонент | Значение |
|-----------|----------|
| **Supabase Project** | `bxffrqcnzvnwwekvpurt` |
| **Supabase URL** | `https://bxffrqcnzvnwwekvpurt.supabase.co` |
| **Vercel URL** | `https://exo-pro-track-new.vercel.app` |
| **GitHub** | `bioen07-del/ExoProTrack_new` |
| **CI/CD** | GitHub Actions → Vercel auto-deploy |

### 2.2 Выполненные работы по инфраструктуре

#### 2.2.1 Исправлена авторизация Supabase
**Проблема:** Ошибка "Database error checking email" при создании пользователей.
**Решение:** Создана Vercel Serverless Function `/api/seed.ts`, использующая Supabase Admin API для создания тестовых пользователей.

**Тестовые пользователи:**

| Email | Пароль | Роль |
|-------|--------|------|
| admin@exoprotrack.test | Admin123! | Admin |
| production@exoprotrack.test | Test123! | Production |
| qc@exoprotrack.test | Test123! | QC |
| qa@exoprotrack.test | Test123! | QA |
| manager@exoprotrack.test | Test123! | Manager |

**URL создания пользователей:**
```
https://exo-pro-track-new.vercel.app/api/seed?key=exoprotrack2026
```

#### 2.2.2 Настроен Vercel деплой
**Файл:** `vercel.json`
```json
{
  "buildCommand": "cd exo-protrack && npm install --legacy-peer-deps && npm run build",
  "installCommand": "npm install && cd exo-protrack && npm install --legacy-peer-deps",
  "outputDirectory": "exo-protrack/dist",
  "rewrites": [
    { "source": "/sw.js", "destination": "/sw.js" },
    { "source": "/workbox-:hash.js", "destination": "/workbox-:hash.js" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

**Ключевые решения:**
- `/((?!api/).*)` — negative lookahead исключает `/api/` из SPA-rewrites
- Root `package.json` содержит только `@vercel/node` для serverless functions
- `/api/seed.ts` использует только `fetch` (без внешних npm-зависимостей — Vercel не бандлит их)

#### 2.2.3 Попытки автоматизации SQL (НЕ удалось)
Попробованные подходы для выполнения DDL из serverless functions:

| Метод | Результат |
|-------|-----------|
| `postgres` npm пакет (postgres.js) | 500 — Vercel не бандлит ESM-only пакет |
| `pg` npm пакет (node-postgres) | 500 — та же проблема бандлинга |
| Supabase pg-meta `/pg/query` | 403 — не доступен с service_role key |
| Supabase RPC `exec_sql` | 404 — функция не создана |
| Supabase `/pg-meta/default/query` | 404 — путь не существует |
| Supabase `/database/query` | 404 — путь не существует |

**Вывод:** Supabase Cloud не предоставляет REST API для произвольного SQL с service_role key. DDL выполняется только через SQL Editor в Supabase Dashboard.

**Удалённые файлы:** `/api/setup-db.ts` — удалён за ненадобностью.

---

## 3. Пересоздание БД (критическая миграция)

### 3.1 Обнаруженная проблема
После настройки RLS все страницы возвращали HTTP 400.
**Причина:** Несоответствие схемы БД и TypeScript-типов.

**Пример:**
```
{"code":"42703","message":"column product.product_code does not exist",
 "hint":"Perhaps you meant to reference the column \"product.product_id\""}
```

Существующие таблицы использовали UUID-ключи (`product_id`, `cell_type_id`) и колонки `code`, тогда как TypeScript-типы в `database.ts` ожидали текстовые ключи (`product_code`, `cell_type_code`) с полностью другими наборами колонок.

### 3.2 Решение: полное пересоздание 38 таблиц

Выполнено вручную в Supabase SQL Editor (единственный рабочий метод для DDL).

**Часть 1 — DROP (38 таблиц CASCADE):**
```sql
DROP TABLE IF EXISTS public.lyophilization_event CASCADE;
DROP TABLE IF EXISTS public.collection_vessel_item CASCADE;
DROP TABLE IF EXISTS public.sds_media CASCADE;
-- ... все 38 таблиц (кроме app_user) ...
```

**Часть 2 — CREATE (все таблицы по TypeScript-типам `database.ts`):**
Таблицы пересозданы с точным соответствием типам из `/exo-protrack/src/types/database.ts` (1917 строк):

| Группа | Таблицы |
|--------|---------|
| Справочники | cell_type, product, pack_format, qc_test_type, infection_type, cm_process_method, pack_process_method, base_media, media_additive |
| Среды | media_compatibility_spec, media_spec_additives, sds_component, sds_media |
| Производство | cm_lot, culture, collection_event, collection_vessel_item, container, processing_step |
| Продукция | request, request_line, request_line_raw_reserve, pack_lot, pack_processing_step |
| QC/QA | cm_qc_request, cm_qc_result, cm_qa_release_decision, infection_test_result |
| Прочее | warehouse_lot, shipment, shipment_line, lyophilization_event, notifications |
| Документы | document |

**Часть 3 — FK constraints:**
Добавлены все внешние ключи с `ON DELETE CASCADE` / `ON DELETE SET NULL`.

**Часть 4 — RLS + политики:**
```sql
-- Для каждой таблицы:
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select" ON public.<table> FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.<table> FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.<table> FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.<table> FOR DELETE TO authenticated USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;

-- Обновление кэша PostgREST:
NOTIFY pgrst, 'reload schema';
```

### 3.3 Ключевое архитектурное решение: текстовые PK
TypeScript-типы определяют текстовые первичные ключи вместо UUID:

| Таблица | PK (TypeScript) | Было в БД |
|---------|-----------------|-----------|
| product | `product_code TEXT` | `product_id UUID` + `code TEXT` |
| cell_type | `cell_type_code TEXT` | `cell_type_id UUID` + `code TEXT` |
| pack_format | `pack_format_code TEXT` | `pack_format_id UUID` + `code TEXT` |
| qc_test_type | `code TEXT` | `code TEXT` (совпадало) |

Все таблицы пересозданы с текстовыми PK — ровно как в `database.ts`.

---

## 4. Заполнение справочников

### 4.1 Источники данных
Значения извлечены из кодовой базы:
- `AdminPage.tsx` — определения полей форм, hardcoded enum значения
- `constants.ts` — статусы CM Lot, Request, Pack Lot, роли пользователей

### 4.2 Заполненные таблицы (9 справочников)

**cell_type (7 записей):**
MSC-BM, MSC-AT, MSC-UC, MSC-WJ, MSC-DP, iPSC, HEK293

**product (4 записи):**
EXO-MSC-001 (Экзосомы из МСК костного мозга), EXO-MSC-002 (Экзосомы из МСК жировой ткани), EXO-MSC-003 (Экзосомы из МСК пуповины), EXO-PRP-001 (Обогащённые PRP экзосомы)

**pack_format (6 записей):**
VIAL-1, VIAL-5, VIAL-10, BOTTLE-50, BOTTLE-100, CRYO-2 (purpose: raw/product)

**qc_test_type (8 записей):**
STERILITY, LAL, DLS, NTA, PROTEIN, PH, MYCOPLASMA, IDENTITY

**infection_type (5 записей):**
HBsAg, Anti-HBc, Anti-HCV, HIV, Syphilis

**cm_process_method (5 записей):**
CENTRIFUGE, FILTER-022, FILTER-01, ULTRACENTRIFUGE, CONCENTRATION

**pack_process_method (3 записи):**
LYOPHILIZE, FILTER-STERILE, CRYO-PRESERVE

**base_media (4 записи):**
DMEM-HG, DMEM-LG, IMDM, ALPHA-MEM

**media_additive (6 записей):**
FBS, PRP, L-GLUTAMINE, HEPES, PEN-STREP, GROWTH-FACTOR

---

## 5. Итоговое состояние после миграции

### 5.1 Что работает
- Авторизация через Supabase GoTrue Auth
- Все 16 страниц загружаются без ошибок (HTTP 200)
- RLS-политики на всех таблицах (authenticated access)
- CI/CD: push → GitHub Actions → Vercel auto-deploy
- Тестовые пользователи по 5 ролям
- Справочники заполнены реалистичными данными
- PWA (Service Worker, manifest)

### 5.2 Важные URL

| URL | Назначение |
|-----|-----------|
| `https://exo-pro-track-new.vercel.app` | Production |
| `https://exo-pro-track-new.vercel.app/api/seed?key=exoprotrack2026` | Пересоздание тестовых пользователей |
| `https://supabase.com/dashboard/project/bxffrqcnzvnwwekvpurt/sql` | SQL Editor (для DDL) |

### 5.3 Известные ограничения
1. **Serverless functions**: Vercel не бандлит внешние npm-зависимости (`pg`, `postgres`) в текущей конфигурации. Serverless работает только с `fetch`.
2. **SQL execution**: Автоматическое выполнение DDL невозможно через Supabase REST API — только через SQL Editor Dashboard.
3. **Service Worker**: Перехватывает `/api/` роуты в production builds. Для тестирования API — используйте инкогнито или удалите SW.
4. **Hardcoded service_role key**: В `/api/seed.ts` ключ захардкожен. Рекомендуется переместить в Vercel env vars (`SUPABASE_SERVICE_ROLE_KEY`).

---

## 6. Аудит UI/UX (текущая сессия 30.01.2026)

### 6.1 Обнаруженные проблемы

#### Двойная система лейаутов
- **Layout.tsx** (активен) — минимальный: `flex min-h-screen bg-slate-50`, Sidebar + Outlet
- **ModernLayout.tsx** (596 строк, НЕ используется) — продвинутый: Framer Motion, коллапсируемый sidebar, mobile bottom nav, page transitions, theme toggle, notification bell, search bar, offline indicator

#### 7 багов в ModernLayout.tsx (блокируют активацию)

| # | Файл:строка | Баг |
|---|-------------|-----|
| 1 | ModernLayout.tsx:26 | `import { useNotifications } from '@/services/notification-service'` — файл не существует. Нужен `useUnreadCount` из `@/hooks/use-notifications` |
| 2 | ModernLayout.tsx:489 | `useNotifications(userEmail)` — неверная сигнатура. Хук принимает `{unreadOnly?, limit?}`, email не нужен |
| 3 | ModernLayout.tsx:48-53 | Props `userRole/userName/userEmail` — никто не передаёт. Нужен `useAuth()` |
| 4 | ModernLayout.tsx:584 | `{children}` вместо `<Outlet />` — не работает с React Router nested routes |
| 5 | ModernLayout.tsx:30-38 | Неверные пути: `/cm-lots` → `/cm`, `/cultures` → `/culture`, `/pack-lots` → `/products`. Отсутствуют: `/qc`, `/qa`, `/scan`, `/admin` |
| 6 | ModernLayout.tsx:503 | `item.roles.includes(userRole)` — нужен `hasRole()` из AuthContext |
| 7 | ModernLayout.tsx:349 | `console.log('Toggle sidebar')` — нет реального переключения |

#### Другие UI-проблемы
- 165 вхождений hardcoded цветов (`bg-blue-100 text-blue-800`) вместо CSS-переменных
- 532 вхождения `bg-slate-*` / `text-slate-*` (не семантические)
- 74 вызова `alert()` / `confirm()` — нативные диалоги вместо toast/modal
- STATUS_LABELS / STATUS_COLORS дублируются в 6 файлах
- Единственный UI-компонент — `skeleton.tsx`; всё остальное inline Tailwind

#### Установленные но не интегрированные пакеты

| Пакет | Статус |
|-------|--------|
| 27 Radix UI компонентов | Только DropdownMenu в ThemeToggle |
| Framer Motion 11.11.0 | Только в ModernLayout + wizard-engine |
| Sonner 1.7.2 | Ни одного import |
| class-variance-authority (CVA) | Ни одного import |
| cmdk (command palette) | Ни одного import |
| vaul (drawer) | Ни одного import |

### 6.2 Готовая дизайн-система (index.css + tailwind.config.js)

**CSS-переменные (HSL):**
- `--primary` (EXO Green #1a8d5f), `--secondary` (Blue), `--accent` (Amber)
- `--success`, `--warning`, `--error`, `--info`
- `--background`, `--foreground`, `--card`, `--border`, `--input`, `--muted`
- `--sidebar-*` (3 переменные)
- `--chart-1..5`
- `--radius`, `--radius-sm..xl`, `--radius-full`

**CSS-компонентные классы:**
`.btn` (primary/secondary/outline/ghost + sm/md/lg + icon + loading), `.card` (elevated/interactive + header/title/content/footer), `.input` (error/with-icon + group), `.badge` (default/secondary/destructive/success/warning/info/outline + pulse), `.table` (container/header/body/row/head/cell/sticky), `.status-indicator` (success/warning/error/info/offline)

**Tailwind анимации (14):** accordion-down/up, fade-in/out, slide-up/down/left/right, scale-in/out, pulse-soft, bounce-soft, shimmer, pulse-glow

**Утилита `cn()`:** `src/lib/utils.ts` — `clsx` + `tailwind-merge` для умного мержа классов

**Тёмная тема:** Полная поддержка через `ThemeProvider` (light/dark/system + localStorage + prefers-color-scheme)

---

## 7. План Phase 2: UI/UX модернизация

Детальный план: `/root/.claude/plans/twinkly-knitting-barto.md`

### 7.1 Шаги реализации

| Шаг | Описание | Воздействие |
|-----|----------|-------------|
| 1 | Исправить 7 багов и активировать ModernLayout | Анимированный sidebar, mobile nav, page transitions |
| 2 | Интегрировать Sonner toast | Современные уведомления вместо alert() |
| 3 | Создать UI компонентную библиотеку (9 компонентов) | Button, Card, Input, Badge, Dialog, Select, Tabs, ConfirmDialog, StatusBadge |
| 4 | Мигрировать ключевые страницы | CmLotList, PackLotList, Dashboard — на новые компоненты |
| 5 | Удалить Railway, обновить документацию | Только Vercel + Supabase |

### 7.2 Новые файлы (план)

```
src/components/ui/button.tsx       — CVA + Radix Slot, variants, loading
src/components/ui/card.tsx         — Compound component (Header/Title/Content/Footer)
src/components/ui/input.tsx        — forwardRef, error state, RHF совместимость
src/components/ui/badge.tsx        — CVA, semantic variants
src/components/ui/status-badge.tsx — Badge + centralized status config
src/components/ui/dialog.tsx       — @radix-ui/react-dialog + Framer Motion
src/components/ui/select.tsx       — @radix-ui/react-select wrapper
src/components/ui/tabs.tsx         — @radix-ui/react-tabs + animated underline
src/components/ui/confirm-dialog.tsx — @radix-ui/react-alert-dialog, Promise-based
src/components/ui/sonner.tsx       — Toaster wrapper с темой
src/components/ui/index.ts         — barrel exports
src/lib/status-config.ts          — Centralized STATUS_LABELS/COLORS/VARIANTS
src/lib/toast.ts                  — showSuccess/Error/Warning/Info helpers
```

---

## 8. Статус по ROADMAP.md

| Фаза | Описание | Прогресс | Комментарий |
|------|----------|----------|-------------|
| 1 | Инфраструктура | ~80% | Auth, DB, RLS, CI/CD — готово. Осталось: env vars security |
| 2 | UI/UX | ~5% | ModernLayout написан, дизайн-система готова. Нужна активация и интеграция |
| 3 | Mobile/PWA | ~20% | SW + manifest есть, нужна оптимизация touch targets, offline mode |
| 4 | Уведомления | ~15% | Hooks и Realtime listener есть, Sonner не интегрирован |
| 5 | Визарды | ~5% | modern-wizard-engine.tsx существует, не используется |
| 6 | Производительность | ~10% | Code splitting (React.lazy) есть, нет мемоизации |
| 7 | Деплой | ~70% | Vercel работает, Railway references нужно удалить |
| 8 | Тестирование | ~10% | Vitest настроен, тестов мало |

---

## 9. Структура файлов проекта

### 9.1 Корень репозитория
```
ExoProTrack_new/
├── api/
│   └── seed.ts                  # Vercel Serverless: создание тестовых пользователей
├── exo-protrack/                # React SPA
│   ├── src/
│   │   ├── api/supabase.ts      # Supabase client export + error handler
│   │   ├── lib/
│   │   │   ├── supabase.ts      # createClient (VITE_SUPABASE_URL, ANON_KEY)
│   │   │   ├── utils.ts         # cn() utility
│   │   │   └── constants.ts     # Статусы, роли
│   │   ├── types/database.ts    # TypeScript типы для ВСЕХ 39 таблиц (1917 строк)
│   │   ├── context/AuthContext.tsx
│   │   ├── providers/ThemeProvider.tsx
│   │   ├── hooks/
│   │   │   ├── use-notifications.ts
│   │   │   └── use-media-query.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.tsx        # ТЕКУЩИЙ (минимальный)
│   │   │   │   ├── ModernLayout.tsx  # НОВЫЙ (596 строк, не активен)
│   │   │   │   └── Sidebar.tsx       # Навигация с ролями
│   │   │   ├── shared/
│   │   │   │   ├── ThemeToggle.tsx
│   │   │   │   └── NotificationBell.tsx
│   │   │   └── ui/
│   │   │       └── skeleton.tsx      # Единственный UI компонент
│   │   ├── pages/                    # 16 страниц
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CmLotList.tsx, CmLotCreate.tsx, CmLotDetail.tsx
│   │   │   ├── CultureList.tsx, CultureDetail.tsx
│   │   │   ├── RequestList.tsx, RequestDetail.tsx
│   │   │   ├── PackLotList.tsx, PackLotDetail.tsx
│   │   │   ├── QcPage.tsx, QaPage.tsx
│   │   │   ├── Warehouse.tsx
│   │   │   ├── AdminPage.tsx
│   │   │   ├── ScanPage.tsx
│   │   │   └── Login.tsx
│   │   ├── services/
│   │   │   └── modern-wizard-engine.tsx
│   │   ├── App.tsx               # React Router + lazy loading
│   │   ├── main.tsx              # Entry point
│   │   └── index.css             # Design tokens + component classes (806 строк)
│   ├── tailwind.config.js        # Full design system (341 строка)
│   ├── vite.config.ts
│   └── package.json              # Dependencies (React, Radix, Framer Motion, Sonner...)
├── supabase/
│   ├── setup-missing-tables-and-rls.sql   # Скрипт для первичного создания таблиц
│   ├── setup-database.sql
│   ├── schema-complete.sql
│   └── ... (миграции и диагностика)
├── docs/
│   ├── CHANGELOG.md              # v1.0.0 → v2.4.6
│   ├── SESSION_HANDOFF.md        # Контекст передачи между сессиями
│   ├── ROADMAP.md                # 8 фаз, 4-недельный спринт
│   ├── ARCHITECTURE.md
│   ├── USER_MANUAL.md
│   └── ... (API, DEPLOY, COMPONENTS)
├── vercel.json                   # Vercel конфигурация
├── package.json                  # Root: @vercel/node
└── railway.json                  # НЕ используется (к удалению)
```

### 9.2 Ключевые env-переменные

| Переменная | Где используется |
|------------|-----------------|
| `VITE_SUPABASE_URL` | Frontend (lib/supabase.ts) |
| `VITE_SUPABASE_ANON_KEY` | Frontend (lib/supabase.ts) |
| `SUPABASE_SERVICE_ROLE_KEY` | api/seed.ts (Vercel env) |
| `SUPABASE_DB_PASSWORD` | api/seed.ts (не используется активно) |

---

## 10. SQL для восстановления БД

Если потребуется полная пересборка базы, выполнить в **Supabase SQL Editor** (`https://supabase.com/dashboard/project/bxffrqcnzvnwwekvpurt/sql`):

1. SQL из `supabase/setup-missing-tables-and-rls.sql` — создание таблиц
2. RLS + политики (см. секцию 3.2 выше)
3. Справочники — INSERT из секции 4.2 выше
4. Пользователи — через `/api/seed?key=exoprotrack2026`
5. `NOTIFY pgrst, 'reload schema';` — обновить кэш PostgREST

---

## 11. Решённые проблемы (справочник)

| Проблема | Причина | Решение |
|----------|---------|---------|
| "Database error checking email" | Supabase auth internal error | Serverless function с Admin API |
| setup-db.ts 500 error | Vercel не бандлит pg/postgres npm пакеты | Только fetch-based functions |
| SW перехватывает /api/ роуты | Service Worker кеширует всё | Incognito / unregister SW |
| No SQL execution via REST API | Supabase Cloud не даёт DDL через REST | Ручное выполнение в SQL Editor |
| HTTP 400 на всех таблицах | Схема БД ≠ TypeScript types (UUID vs TEXT PK) | Полное пересоздание 38 таблиц |
| PostgREST stale schema cache | Кэш не обновляется автоматически | `NOTIFY pgrst, 'reload schema'` |

---

*Отчёт составлен: 30.01.2026*
*Следующий шаг: Phase 2 — UI/UX модернизация (активация ModernLayout + компонентная библиотека)*
