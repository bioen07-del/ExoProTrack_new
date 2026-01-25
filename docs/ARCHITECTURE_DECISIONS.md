# Архитектурные решения (ADR)

## Содержание

1. [ADR-001: Использование TanStack Query](#adr-001-использование-tanstack-query)
2. [ADR-002: Snapshot-архитектура (frozen_spec)](#adr-002-snapshot-архитектура-frozen_spec)
3. [ADR-003: PWA для мобильного доступа](#adr-003-pwa-для-мобильного-доступа)
4. [ADR-004: Wizard Engine для мобильных](#adr-004-wizard-engine-для-мобильных)
5. [ADR-005: Система уведомлений через Supabase Realtime](#adr-005-система-уведомлений-через-supabase-realtime)
6. [ADR-006: Темная/светлая тема](#adr-006-темная-светлая-тема)
7. [ADR-007: Компонентная структура](#adr-007-компонентная-структура)
8. [ADR-008: Валидация форм через Zod](#adr-008-валидация-форм-через-zod)

---

## ADR-001: Использование TanStack Query

| Параметр | Значение |
|----------|----------|
| Статус | ✅ Принято |
| Дата | 2026-01-24 |
| Автор | AI Assistant |

### Контекст

Требовалось управлять серверным состоянием в React приложении. Ранее использовались локальные `useState` и `useEffect`, что приводило к:
- Дублированию кода загрузки данных
- Отсутствию кэширования
- Сложности с оптимистичными обновлениями
- Отсутствию retry логики

### Рассмотренные альтернативы

| Альтернатива | Плюсы | Минусы |
|--------------|-------|--------|
| Redux | Мощный, предсказуемый | Сложный, много boilerplate |
| Zustand | Простой, легковесный | Только клиентское состояние |
| SWR | Аналог TanStack Query | Меньше возможностей |
| React Context | Встроенный | Нет кэширования |

### Решение

Использовать **TanStack Query (React Query)** для управления серверным состоянием.

### Обоснование

1. **Автоматическое кэширование** — данные не перезагружаются без необходимости
2. **Background updates** — обновление данных в фоне
3. **Optimistic updates** — мгновенные UI обновления
4. **Retry** — автоматические повторные попытки при ошибках
5. **Типизация** — полная поддержка TypeScript

### Детали реализации

```typescript
// hooks/use-cm-lot.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';

// Query для получения CM лота
export function useCmLot(lotId?: string) {
  return useQuery({
    enabled: !!lotId,
    queryKey: ['cm-lot', lotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cm_lot')
        .select('*, frozen_spec')
        .eq('cm_lot_id', lotId)
        .single();
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 30 * 60 * 1000,   // 30 минут
  });
}

// Mutation для обновления статуса
export function useUpdateCmLotStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lotId, status }: { lotId: string; status: string }) => {
      const { error } = await supabase
        .from('cm_lot')
        .update({ status })
        .eq('cm_lot_id', lotId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cm-lot', variables.lotId] });
      queryClient.invalidateQueries({ queryKey: ['cm-lot-list'] });
    },
  });
}
```

### Последствия

**Положительные:**
- Меньше кода для загрузки данных
- Лучшая производительность
- Автоматическая синхронизация

**Отрицательные:**
- Дополнительная зависимость
- Требуется изучение API

---

## ADR-002: Snapshot-архитектура (frozen_spec)

| Параметр | Значение |
|----------|----------|
| Статус | ✅ Принято |
| Дата | 2026-01-22 |
| Версия | 2.0.0 |

### Контекст

При изменении спецификации продукта уже созданные заявки и лоты должны сохранять свои исходные требования (прослеживаемость).

### Проблема

- Продукт изменяется → требования меняются для всех связанных записей
- Невозможно узнать, какие требования были на момент создания заявки

### Решение

Использовать **Snapshot-архитектуру** с полем `frozen_spec` в ключевых таблицах.

### Структура frozen_spec

```typescript
interface FrozenSpec {
  product_code: string;
  product_name: string;
  product_type: string;
  media: {
    media_spec_id: string;
    name: string;
    base_media: { code: string; name: string };
    additives: Array<{
      code: string;
      name: string;
      concentration: number;
      unit: string;
    }>;
  };
  pack_format: {
    code: string;
    name: string;
    volume_ml: number;
  };
  processing: {
    raw: ProcessingMethod[];
    post: ProcessingMethod[];
  };
  qc: {
    raw: QcTest[];
    product: QcTest[];
  };
  shelf_life_days: number;
  frozen_at: string;
}
```

### Миграция БД

```sql
-- Добавление колонки frozen_spec
ALTER TABLE product ADD COLUMN frozen_spec JSONB;
ALTER TABLE request ADD COLUMN frozen_spec JSONB;
ALTER TABLE cm_lot ADD COLUMN frozen_spec JSONB;
```

### Детали реализации

```typescript
// services/snapshot-service.ts
export function buildFrozenSpec(product: Product): FrozenSpec {
  return {
    product_code: product.product_code,
    product_name: product.product_name,
    product_type: product.product_type,
    media: {
      media_spec_id: product.media_spec_id,
      name: mediaSpec?.name,
      base_media: { code: baseMedia?.code, name: baseMedia?.name },
      additives: enrichedAdditives,
    },
    pack_format: {
      code: packFormat?.pack_format_code,
      name: packFormat?.name,
      volume_ml: packFormat?.nominal_fill_volume_ml,
    },
    processing: {
      raw: enrichedRawProcessing,
      post: enrichedPostProcessing,
    },
    qc: {
      raw: enrichedRawQc,
      product: enrichedProductQc,
    },
    shelf_life_days: product.shelf_life_days_default,
    frozen_at: new Date().toISOString(),
  };
}
```

### Последствия

**Положительные:**
- Полная прослеживаемость требований
- Неизменяемые snapshot-ы
- Соответствие GxP

**Отрицательные:**
- Увеличение размера БД
- Сложность миграции существующих данных

---

## ADR-003: PWA для мобильного доступа

| Параметр | Значение |
|----------|----------|
| Статус | ✅ Принято |
| Дата | 2026-01-24 |

### Контекст

Требовался доступ к приложению с планшетов и телефонов в производственных условиях (цех), где может быть нестабильное интернет-соединение.

### Рассмотренные альтернативы

| Альтернатива | Плюсы | Минусы |
|--------------|-------|--------|
| Нативное приложение | Полный контроль | Дорого, две платформы |
| Responsive Web App | Один код | Нет offline |
| PWA | Offline + установка | Ограничения iOS |

### Решение

Использовать **PWA (Progressive Web App)** с Service Worker для offline-режима.

### Детали реализации

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'EXO ProTrack',
        short_name: 'ProTrack',
        theme_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192' },
          { src: '/icons/icon-512.png', sizes: '512x512', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
});
```

### Последствия

**Положительные:**
- Установка на домашний экран
- Offline режим для критичных функций
- Push уведомления
- Не требуется App Store

**Отрицательные:**
- Ограничения на iOS
- Сложность тестирования

---

## ADR-004: Wizard Engine для мобильных

| Параметр | Значение |
|----------|----------|
| Статус | ✅ Принято |
| Дата | 2026-01-24 |

### Контекст

На мобильных устройствах сложные многоэтапные процессы (создание CM лота, заявки) должны быть интуитивно понятны и удобны.

### Проблема

- Много полей на одной странице
- Сложно ориентироваться
- Легко потерять контекст

### Решение

Использовать **Wizard-режим** — пошаговый интерфейс с прогресс-индикатором.

### Детали реализации

```typescript
// components/wizard/WizardLayout.tsx
interface WizardStep {
  id: string;
  title: string;
  description: string;
  validate: (data: any) => { valid: boolean; errors: string[] };
  fields: FormField[];
}

interface WizardProps {
  steps: WizardStep[];
  initialData: Record<string, any>;
  onComplete: (data: Record<string, any>) => void;
}

export function WizardLayout({ steps, initialData, onComplete }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState(initialData);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    const validation = step.validate(data);
    if (!validation.valid) {
      showErrors(validation.errors);
      return;
    }
    if (isLastStep) {
      onComplete(data);
    } else {
      setCurrentStep(c => c + 1);
    }
  };

  return (
    <div className="wizard">
      <WizardProgress
        steps={steps}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />
      
      <WizardStepContent
        step={step}
        data={data}
        onUpdate={(newData) => setData({ ...data, ...newData })}
      />
      
      <WizardNavigation
        canGoBack={currentStep > 0}
        onBack={() => setCurrentStep(c => c - 1)}
        onNext={handleNext}
        isLastStep={isLastStep}
      />
    </div>
  );
}
```

### Последствия

**Положительные:**
- Улучшенный UX на мобильных
- Пошаговый фокус
- Валидация на каждом шаге

**Отрицательные:**
- Больше кликов для完成
- Требуется сохранять промежуточное состояние

---

## ADR-005: Система уведомлений через Supabase Realtime

| Параметр | Значение |
|----------|----------|
| Статус | ✅ Принято |
| Дата | 2026-01-24 |

### Контекст

Требовалось уведомлять пользователей о:
- Новых заявках
- Изменении статуса
- Готовности QC результатов

### Рассмотренные альтернативы

| Альтернатива | Плюсы | Минусы |
|--------------|-------|--------|
| Polling | Просто | Задержки, нагрузка |
| WebSocket напрямую | Быстро | Сложность |
| Supabase Realtime | Интегрировано | Внешняя зависимость |
| Firebase Cloud Messaging | Надёжно | Две системы |

### Решение

Использовать **Supabase Realtime** для уведомлений.

### Детали реализации

```sql
-- База данных
CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Database trigger для автоматических уведомлений
CREATE OR REPLACE FUNCTION notify_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
    SELECT 
      au.user_id,
      'status_changed',
      'Изменение статуса',
      'Заявка ' || NEW.request_id || ' изменила статус',
      'request',
      NEW.request_id
    FROM app_user au
    WHERE au.role = 'Manager' AND au.is_active;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Клиент

```typescript
// hooks/use-notifications.ts
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Загрузка начальных данных
    loadNotifications();

    // Realtime подписка
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.user_id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        showToast(payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  return { notifications, unreadCount: notifications.filter(n => !n.is_read).length };
}
```

### Последствия

**Положительные:**
- Мгновенные уведомления
- Автоматическая генерация через триггеры
- Интеграция с БД

**Отрицательные:**
- Требуется Supabase Realtime
- Сложность отладки

---

## ADR-006: Темная/светлая тема

| Параметр | Значение |
|----------|----------|
| Статус | ✅ Принято |
| Дата | 2026-01-24 |

### Контекст

Разные условия освещения на производстве:
- Яркий свет в цеху → светлая тема
- Офис/лаборатория → по предпочтению

### Решение

Использовать **CSS variables** + **TailwindCSS** с системной настройкой.

### Детали реализации

```typescript
// providers/ThemeProvider.tsx
type Theme = 'light' | 'dark' | 'system';

export function ThemeProvider({ children }: Props) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(isDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### TailwindCSS конфигурация

```javascript
// tailwind.config.js
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--background)',
          dark: '#0f172a',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          dark: '#1e293b',
        },
      },
    },
  },
};
```

### CSS Variables

```css
/* index.css */
:root {
  --background: #ffffff;
  --surface: #f8fafc;
  --text: #0f172a;
  --primary: #3b82f6;
}

.dark {
  --background: #0f172a;
  --surface: #1e293b;
  --text: #f8fafc;
  --primary: #60a5fa;
}
```

### Последствия

**Положительные:**
- Комфорт в любых условиях
- Системная интеграция
- Выбор пользователя

**Отрицательные:**
- Двойной набор стилей
- Сложность тестирования

---

## ADR-007: Компонентная структура

| Параметр | Значение |
|----------|----------|
| Статус | ✅ Принято |
| Дата | 2026-01-24 |

### Контекст

Ранее страницы содержали 2000+ строк кода (AdminPage.tsx, CmLotDetail.tsx), что затрудняло поддержку.

### Проблема

- Невозможно переиспользовать логику
- Сложно тестировать
- Дублирование кода

### Решение

**Feature-based структура** с разделением на слои.

### Структура папок

```
src/
├── components/
│   ├── ui/              # Базовые (Button, Input, Card...)
│   ├── layout/          # Layout (Sidebar, Header...)
│   ├── cm-lot/          # CM Lot компоненты
│   ├── requests/        # Request компоненты
│   ├── wizard/          # Wizard компоненты
│   └── shared/          # Общие (StatusBadge, ProgressBar...)
├── pages/               # Страницы (композиция)
├── hooks/               # Custom hooks
├── services/            # Бизнес-логика
├── api/                 # API вызовы
└── types/               # TypeScript типы
```

### Принципы

1. **Композиция** — страницы собирают компоненты
2. **Одно назначение** — компонент делает одну вещь
3. **Переиспользование** — общие UI в `/ui`
4. **Слабая связанность** — пропсы + контекст

### Последствия

**Положительные:**
- Легче поддерживать
- Легче тестировать
- Переиспользование

**Отрицательные:**
- Больше файлов
- Требуется дисциплина

---

## ADR-008: Валидация форм через Zod

| Параметр | Значение |
|----------|----------|
| Статус | ✅ Принято |
| Дата | 2026-01-24 |

### Контекст

Требовалась единая система валидации для всех форм с:
- Типизацией TypeScript
- Локализованными сообщениями
- Серверной валидацией

### Рассмотренные альтернативы

| Альтернатива | Плюсы | Минусы |
|--------------|-------|--------|
| Валидация вручную | Полный контроль | Дублирование |
| Yup | Популярный | Отдельная библиотека |
| Zod | TypeScript-first | Меньше примеров |

### Решение

Использовать **Zod** для валидации.

### Детали реализации

```typescript
// lib/validators.ts
import { z } from 'zod';

// Схема CM лота
export const cmLotSchema = z.object({
  mode: z.enum(['MTS', 'MTO']),
  base_product_code: z.string().min(1, 'Выберите продукт'),
  nominal_volume_ml: z.number().min(1, 'Объём должен быть > 0'),
  notes: z.string().optional(),
});

// Схема сбора
export const collectionSchema = z.object({
  culture_id: z.string().min(1, 'Выберите культуру'),
  media_spec_id: z.string().min(1, 'Выберите спецификацию'),
  volume_ml: z.number().min(1, 'Объём должен быть > 0'),
  passage_no: z.number().min(0),
  confluence_start_percent: z.number().min(0).max(100),
  confluence_end_percent: z.number().min(0).max(100),
  media_prep_journal_no: z.string().min(1, 'Укажите журнал'),
  media_prep_journal_date: z.string().min(1, 'Укажите дату'),
});

// Типы из схем
export type CmLotFormData = z.infer<typeof cmLotSchema>;
export type CollectionFormData = z.infer<typeof collectionSchema>;
```

### Использование в форме

```typescript
// components/cm-lot/CollectionForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collectionSchema, CollectionFormData } from '../../lib/validators';

export function CollectionForm({ onSubmit }: Props) {
  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      volume_ml: 0,
      passage_no: 0,
      // ...
    },
  });

  return (
    <Form {...form}>
      <FormField name="volume_ml" control={form.control} />
      <Button onClick={form.handleSubmit(onSubmit)} />
    </Form>
  );
}
```

### Последствия

**Положительные:**
- Единая валидация
- TypeScript типы
- Локализованные сообщения

**Отрицательные:**
- Дополнительная зависимость
- 学习 кривая

---

## История изменений

| ADR | Статус | Дата | Описание |
|-----|--------|------|----------|
| 001 | ✅ | 2026-01-24 | TanStack Query |
| 002 | ✅ | 2026-01-22 | Snapshot-архитектура |
| 003 | ✅ | 2026-01-24 | PWA |
| 004 | ✅ | 2026-01-24 | Wizard Engine |
| 005 | ✅ | 2026-01-24 | Уведомления |
| 006 | ✅ | 2026-01-24 | Темная/светлая тема |
| 007 | ✅ | 2026-01-24 | Компонентная структура |
| 008 | ✅ | 2026-01-24 | Zod валидация |
