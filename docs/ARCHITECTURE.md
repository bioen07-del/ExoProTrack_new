# Архитектура EXO ProTrack v3.4.0

## Содержание

1. [Общее описание](#общее-описание)
2. [Стек технологий](#стек-технологий)
3. [Структура проекта](#структура-проекта)
4. [Архитектурные слои](#архитектурные-слои)
5. [Поток данных](#поток-данных)
6. [PWA и мобильная адаптация](#pwa-и-мобильная-адаптация)
7. [Система уведомлений](#система-уведомлений)
8. [Wizard Engine](#wizard-engine)

---

## Общее описание

EXO ProTrack — это производственная система мониторинга и прослеживаемости для фармацевтического производства (экзосомы). Система обеспечивает:

- Полный цикл производственного процесса (CM Lot → QC → QA → Фасовка → Отгрузка)
- Складской учёт сырья и готовой продукции
- Управление заявками (MTS/MTO)
- Генерацию документов (COA, SDS)
- Прослеживаемость от культуры до отгрузки

### Ключевые характеристики

| Характеристика | Значение |
|----------------|----------|
| Версия | 3.4.0 |
| Дата | 24.01.2026 |
| Тип приложения | Single Page Application (SPA) + PWA |
| Режимы работы | Десктоп, Планшет, Мобильный |
| Темы | Светлая / Тёмная (системная) |
| Offline режим | Да (Service Worker) |

---

## Стек технологий

### Frontend

| Технология | Версия | Назначение |
|------------|--------|------------|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.6.2 | Типизация |
| Vite | 6.0.1 | Build tool |
| TailwindCSS | v3.4.16 | CSS Framework |
| Radix UI | 1.x | Headless компоненты |
| React Router DOM | 6 | Маршрутизация |
| React Hook Form | 7.54.2 | Формы |
| Zod | 3.24.1 | Валидация |
| TanStack Query | 5.x | Серверное состояние |

### Backend (Supabase)

| Технология | Версия | Назначение |
|------------|--------|------------|
| PostgreSQL | 14+ | База данных |
| Supabase JS | 2.90.1 | Client SDK |
| Supabase Realtime | - | WebSocket |

### Инструменты

| Технология | Назначение |
|------------|------------|
| ESLint | Линтинг |
| Prettier | Форматирование |
| Playwright | E2E тестирование |
| jsPDF | Генерация PDF |
| Recharts / ECharts | Графики |
| QRCode.react | QR коды |

---

## Структура проекта

```
exo-protrack/
├── public/
│   ├── favicon.svg
│   ├── manifest.json          # PWA манифест
│   ├── sw.js                  # Service Worker
│   └── use.txt
├── src/
│   ├── api/                   # API слой
│   │   ├── supabase.ts        # Supabase клиент
│   │   ├── cm-lot.ts          # API методы CM
│   │   ├── request.ts         # API методы заявок
│   │   ├── product.ts         # API методы продуктов
│   │   └── notification.ts    # API уведомлений
│   ├── components/            # UI компоненты
│   │   ├── ui/                # Базовые UI (shadcn)
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── ...
│   │   ├── layout/            # Layout компоненты
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── cm-lot/            # Компоненты CM
│   │   │   ├── CmLotCard.tsx
│   │   │   ├── CollectionForm.tsx
│   │   │   ├── ProcessingForm.tsx
│   │   │   └── QcStatus.tsx
│   │   ├── requests/          # Компоненты заявок
│   │   │   ├── RequestCard.tsx
│   │   │   ├── ReservationModal.tsx
│   │   │   └── RequirementsList.tsx
│   │   ├── wizard/            # Wizard компоненты
│   │   │   ├── WizardLayout.tsx
│   │   │   ├── WizardProgress.tsx
│   │   │   └── WizardStep.tsx
│   │   └── shared/            # Переиспользуемые
│   │       ├── StatusBadge.tsx
│   │       ├── ProgressBar.tsx
│   │       ├── NotificationBell.tsx
│   │       └── ThemeToggle.tsx
│   ├── hooks/                 # Custom hooks
│   │   ├── use-cm-lot.ts
│   │   ├── use-request.ts
│   │   ├── use-notifications.ts
│   │   ├── use-device-type.ts
│   │   └── use-theme.ts
│   ├── lib/                   # Утилиты
│   │   ├── utils.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── services/              # Бизнес-логика
│   │   ├── workflow-engine.ts
│   │   ├── notification-service.ts
│   │   └── document-generator.ts
│   ├── types/                 # TypeScript типы
│   │   ├── cm-lot.ts
│   │   ├── request.ts
│   │   ├── notification.ts
│   │   └── common.ts
│   ├── pages/                 # Страницы
│   │   ├── Dashboard.tsx
│   │   ├── CmLotList.tsx
│   │   ├── CmLotDetail.tsx
│   │   ├── CmLotWizard.tsx
│   │   ├── RequestList.tsx
│   │   ├── RequestDetail.tsx
│   │   ├── RequestWizard.tsx
│   │   ├── PackLotDetail.tsx
│   │   ├── PackLotWizard.tsx
│   │   ├── Warehouse.tsx
│   │   ├── AdminPage.tsx
│   │   └── Login.tsx
│   ├── App.tsx
│   └── main.tsx
├── docs/                      # Документация
│   ├── ARCHITECTURE.md
│   ├── ARCHITECTURE_DECISIONS.md
│   ├── API.md
│   ├── USER_MANUAL.md
│   └── CHANGELOG.md
├── supabase/                  # Database
│   ├── migrations/
│   └── schema.sql
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Архитектурные слои

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                     │
│  Pages → Components → UI Elements                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Hook Layer (React Query)                │
│  useQuery → useMutation → Optimistic Updates                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
│  workflow-engine.ts, notification-service.ts                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       API Layer                             │
│  api/cm-lot.ts, api/request.ts                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer (Supabase)                │
│  PostgreSQL + Realtime                                      │
└─────────────────────────────────────────────────────────────┘
```

### Слой 1: Presentation (UI)

Отвечает за отображение данных и взаимодействие с пользователем.

**Принципы:**
- Компоненты "тупые" (не содержат бизнес-логику)
- Получают данные через пропсы
- Генерируют события через колбэки

### Слой 2: Hook Layer (React Query)

Управляет серверным состоянием.

**Функции:**
- Кэширование данных
- Фоновые обновления
- Оптимистичные обновления
- Retry при ошибках

### Слой 3: Service Layer

Бизнес-логика приложения.

**Сервисы:**
- `workflow-engine.ts` — управление workflow
- `notification-service.ts` — уведомления
- `document-generator.ts` — генерация документов

### Слой 4: API Layer

Абстракция над Supabase.

**Принципы:**
- Единая точка входа
- Обработка ошибок
- Типизация ответов

---

## Поток данных

### Чтение данных

```
User Action
    ↓
useQuery Hook (TanStack Query)
    ↓
API Function (api/cm-lot.ts)
    ↓
Supabase Client
    ↓
PostgreSQL
    ↓
Cache в React Query
    ↓
UI Update
```

### Запись данных

```
User Action
    ↓
Form Submit (React Hook Form)
    ↓
Validation (Zod)
    ↓
useMutation Hook
    ↓
API Function
    ↓
Supabase Client
    ↓
PostgreSQL
    ↓
Invalidate Queries
    ↓
UI Update
```

### Realtime обновления

```
Supabase Realtime
    ↓
Subscription (useNotifications hook)
    ↓
Toast Notification
    ↓
Update Cache
    ↓
UI Update
```

---

## PWA и мобильная адаптация

### PWA Конфигурация

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'EXO ProTrack',
        short_name: 'ProTrack',
        description: 'Система мониторинга производства',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});
```

### Адаптивные Breakpoints

```typescript
// hooks/use-device-type.ts
type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDeviceType(): DeviceType {
  const width = useWindowSize();
  
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Использование
function ResponsiveLayout() {
  const device = useDeviceType();
  
  if (device === 'mobile') return <MobileLayout />;
  if (device === 'tablet') return <TabletLayout />;
  return <DesktopLayout />;
}
```

### Layout по устройствам

| Устройство | Ширина | Layout | Navigation |
|------------|--------|--------|------------|
| Mobile | <640px | Single column | Bottom nav, hamburger |
| Tablet | 640-1024px | Two column | Side nav (collapsible) |
| Desktop | >1024px | Full sidebar | Fixed side nav |

---

## Система уведомлений

### Архитектура уведомлений

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification System                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Database (notifications table)                             │
│      ↓                                                      │
│  Database Triggers (auto-generate notifications)            │
│      ↓                                                      │
│  Supabase Realtime                                          │
│      ↓                                                      │
│  Client Hooks (useNotifications)                           │
│      ↓                                                      │
│  UI Components (Bell, Toast)                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Таблица уведомлений

```sql
CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(user_id),
  type VARCHAR(50) NOT NULL,           -- request_created, status_changed, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),             -- cm_lot, request, pack_lot
  entity_id VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  priority VARCHAR(20) DEFAULT 'normal'  -- urgent, normal, low
);
```

### Типы уведомлений

| Тип | Описание | Получатели |
|-----|----------|------------|
| `request_created` | Создана новая заявка MTO | Production |
| `request_status_changed` | Изменён статус заявки | Manager, Production |
| `cm_lot_qc_pending` | CM лот готов к QC | QC |
| `cm_lot_qa_decision` | QA принял решение | Production, Manager |
| `pack_lot_ready_for_filling` | Готов к розливу | Production |
| `expiry_warning` | Срок годности истекает | Manager, Production |

---

## Wizard Engine

### Общая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      Wizard Engine                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  WizardContext                                              │
│  {                                                          │
│    currentStep: number                                      │
│    totalSteps: number                                       │
│    data: Record<string, any>                                │
│    isComplete: boolean                                      │
│    goToStep(step)                                           │
│    updateData(data)                                         │
│    nextStep()                                               │
│    prevStep()                                               │
│    complete()                                               │
│  }                                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Визарды в системе

| Визард | Шаги | Активация |
|--------|------|-----------|
| **CM Lot Wizard** | Сбор → Процессинг → QC → QA | Кнопка "Начать производство" |
| **Request Wizard** | Продукт → Упаковка → QC → Постпроцессинг | Кнопка "Создать заявку" |
| **Pack Lot Wizard** | Резерв → Розлив → QC → Лиофилизация | Кнопка "Начать фасовку" |

### Мобильная версия визарда

На мобильных устройствах визард занимает весь экран:

```tsx
function MobileWizardStep({ step, onNext, onBack }: StepProps) {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <header className="flex-none p-4 border-b">
        <h2 className="text-lg font-semibold">{step.title}</h2>
        <ProgressIndicator />
      </header>
      
      <main className="flex-1 overflow-y-auto p-4">
        <FormFields schema={step.fields} />
      </main>
      
      <footer className="flex-none p-4 border-t grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={onBack}>Назад</Button>
        <Button onClick={onNext}>Далее</Button>
      </footer>
    </div>
  );
}
```

---

## Темная/Светлая тема

### TailwindCSS конфигурация

```typescript
// tailwind.config.js
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Светлая тема (по умолчанию)
        light: {
          background: '#ffffff',
          surface: '#f8fafc',
          border: '#e2e8f0',
          text: '#0f172a',
          textSecondary: '#64748b',
          primary: '#3b82f6',
          primaryHover: '#2563eb',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
        // Тёмная тема
        dark: {
          background: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          text: '#f8fafc',
          textSecondary: '#94a3b8',
          primary: '#3b82f6',
          primaryHover: '#60a5fa',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
    },
  },
};
```

### Theme Provider

```typescript
// providers/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## База данных

### Основные таблицы

| Таблица | Описание | Ключевые поля |
|---------|----------|---------------|
| `product` | Продукты | product_code, frozen_spec |
| `culture` | Культуры клеток | culture_id, cell_type_code |
| `cm_lot` | Производственные лоты | cm_lot_id, status, frozen_spec |
| `collection_event` | Сборы CM | collection_id, volume_ml |
| `processing_step` | Шаги обработки | processing_step_id, method_id |
| `cm_qc_request` | QC запросы | qc_request_id, test_code |
| `request` | Заявки | request_id, status |
| `request_line` | Строки заявок | request_line_id, qty_units |
| `pack_lot` | Партии фасовки | pack_lot_id, qty_produced |
| `container` | Контейнеры | container_id, volume_ml |
| `notifications` | Уведомления | notification_id, user_id |

### ER-диаграмма ключевых связей

```
culture ──► collection_event ──► cm_lot ──► processing_step
     │              │                │
     │              ▼                ▼
     │         collection_vessel   cm_qc_request
     │                            │
     │                            ▼
     │                         cm_qa_release_decision
     │
     ▼
infection_test_result
```

---

## Развёртывание

### Production Build

```bash
pnpm build:prod
# Выход: dist/
```

### Docker (опционально)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .
RUN pnpm build:prod

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Мониторинг и логирование

### Client-side логирование

```typescript
// lib/logger.ts
const logger = {
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.info(`[INFO] ${message}`, data);
    }
    // Отправка в аналитику
  },
  error: (message: string, error: any) => {
    console.error(`[ERROR] ${message}`, error);
    // Отправка в error tracking
  },
};
```

### Performance monitoring

```typescript
// В App.tsx
useEffect(() => {
  const perfData = performance.getEntriesByType('navigation');
  console.log('Page load time:', perfData[0]?.duration);
}, []);
```

---

## Безопасность

### Аутентификация

- Supabase Auth
- JWT токены
- RLS (Row Level Security) на уровне БД

### Роли

| Роль | Права |
|------|-------|
| Production | Создание CM, процессинг |
| QC | Ввод QC результатов |
| QA | QA решения |
| Manager | Заявки, резервирование |
| Admin | Справочники, пользователи |

---

## Ссылки

- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) — Архитектурные решения
- [API.md](API.md) — API документация
- [USER_MANUAL.md](USER_MANUAL.md) — Руководство пользователя
- [CHANGELOG.md](CHANGELOG.md) — История изменений
