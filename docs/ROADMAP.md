# EXO ProTrack - План улучшений (Roadmap)

**Версия:** 1.0  
**Дата:** 25.01.2026  
**Статус:** В разработке

---

## 1. Введение

Данный документ описывает план модернизации и развития системы EXO ProTrack. Основные цели:

- Модернизация пользовательского интерфейса
- Улучшение мобильной адаптации (PWA)
- Реализация системы уведомлений
- Оптимизация для деплоя на Railway и Vercel

---

## 2. Текущее состояние

### 2.1 Что уже реализовано

| Модуль | Статус | Описание |
|--------|--------|----------|
| Dashboard | ✅ Готов | Диаграммы, графики, FEFO |
| CM Lot Management | ✅ Готов | Сбор, процессинг, QC, QA |
| Pack Lot Management | ✅ Готов | Фасовка, лиофилизация |
| Request Management | ✅ Готов | MTS/MTO, резервирование |
| Culture Management | ✅ Готов | Каталог культур |
| Warehouse | ✅ Готов | Склад сырья и ГП |
| Admin Panel | ✅ Готов | Справочники |
| PWA Basic | ✅ Готов | Service Worker, manifest |

### 2.2 Что требует улучшения

| Область | Проблема | Приоритет |
|---------|----------|-----------|
| UI/UX | Устаревший дизайн | Высокий |
| Mobile | Ограниченная адаптация | Высокий |
| Notifications | Отсутствует | Высокий |
| Wizards | Базовый функционал | Средний |
| Performance | Кэширование | Средний |
| Deployment | Нет конфигурации для Railway/Vercel | Средний |

---

## 3. План работ

### Фаза 1: Инфраструктура и документация

#### 1.1 Создание ROADMAP.md
- [x] Создан данный документ
- [ ] Согласование с командой

#### 1.2 Настройка окружения разработки
- [ ] Обновить `package.json` с современными зависимостями
- [ ] Настроить Husky + lint-staged
- [ ] Добавить Prettier конфигурацию
- [ ] Создать `.env.example`

#### 1.3 Документация для деплоя
- [ ] Создать `DEPLOY.md` с инструкциями
- [ ] Создать `docker-compose.yml` для Railway
- [ ] Создать конфигурацию для Vercel (`vercel.json`)
- [ ] Создать `netlify.toml` как альтернативу

### Фаза 2: UI/UX Модернизация

#### 2.1 Обновление дизайн-системы

**Цель:** Внедрить современную дизайн-систему

**Задачи:**
- [ ] Внедрить Tailwind CSS v4 (если доступен) или обновить до v3.4+
- [ ] Создать единую цветовую схему (brand colors)
- [ ] Определить типографику (Inter, Roboto)
- [ ] Создать дизайн-токены в `tailwind.config.js`
- [ ] Разработать компонентную библиотеку

**Компоненты для обновления:**

| Компонент | Новый дизайн | Приоритет |
|-----------|--------------|-----------|
| Button | Modern, ripple effect, variants | Высокий |
| Card | Glassmorphism, hover effects | Высокий |
| Input | Floating labels, validation states | Высокий |
| Select/Dropdown | Searchable, virtual scroll | Высокий |
| Modal/Dialog | Animated, backdrop blur | Средний |
| Table | Sticky headers, row selection | Высокий |
| Tabs | Animated underline | Средний |
| Badge | Status colors, pulse animation | Средний |
| Sidebar | Collapsible, icons + labels | Высокий |
| Header | Search, notifications, user menu | Высокий |

#### 2.2 Анимации и микровзаимодействия

**Цель:** Улучшить UX через плавные анимации

**Задачи:**
- [ ] Внедрить Framer Motion для анимаций
- [ ] Добавить skeleton loading
- [ ] Реализовать page transitions
- [ ] Добавить toast notifications с анимацией
- [ ] Создать loading states для всех форм

### Фаза 3: Мобильная адаптация (PWA)

#### 3.1 Улучшение responsive дизайна

**Breakpoints:**
```css
/* Текущее */
mobile: < 640px
tablet: 640-1024px
desktop: > 1024px

/* Новое (стандарт Tailwind) */
xs: 0-639px      /* Телефоны */
sm: 640-767px    /* Большие телефоны */
md: 768-1023px   /* Планшеты вертикально */
lg: 1024-1279px  /* Планшеты горизонтально */
xl: 1280-1535px  /* Ноутбуки */
2xl: > 1536px    /* Десктопы */
```

**Задачи:**
- [ ] Переработать Layout для всех breakpoints
- [ ] Создать адаптивные таблицы (горизонтальный скролл)
- [ ] Оптимизировать формы для мобильных
- [ ] Улучшить touch targets (минимум 44px)
- [ ] Добавить pull-to-refresh где уместно

#### 3.2 PWA Улучшения

**Service Worker:**
- [ ] Обновить Workbox до последней версии
- [ ] Настроить runtime caching стратегии
- [ ] Реализовать background sync для офлайн действий
- [ ] Добавить periodic background sync для обновлений

**Manifest:**
- [ ] Обновить иконки (192x192, 512x512)
- [ ] Добавить splash screen
- [ ] Настроить theme_color
- [ ] Добавить shortcut icons

**Push Notifications:**
- [ ] Интегрировать VAPID keys
- [ ] Создать service для push-уведомлений
- [ ] Реализовать обработчик push events
- [ ] Добавить UI для управления уведомлениями

### Фаза 4: Система уведомлений

#### 4.1 Архитектура уведомлений

**Типы уведомлений:**

| Тип | Получатели | Описание |
|-----|------------|----------|
| `request_created` | Production | Новая заявка MTO |
| `request_status_changed` | Production, Manager | Изменён статус |
| `cm_lot_qc_pending` | QC | CM лот готов к QC |
| `cm_lot_qa_decision` | Production, Manager | QA принял решение |
| `pack_lot_ready_for_filling` | Production | Готов к розливу |
| `expiry_warning` | Production, Manager | Скоро истекает срок |
| `qc_result_ready` | Production, QA | Результаты QC готовы |
| `approval_required` | QA, Manager | Требуется одобрение |

#### 4.2 Реализация

**Backend (Supabase):**
- [ ] Создать функцию `send_notification()`
- [ ] Добавить триггеры для автоматических уведомлений
- [ ] Создать таблицу `user_notification_preferences`

**Frontend:**
- [ ] Создать `NotificationService`
- [ ] Реализовать `useNotifications` hook
- [ ] Добавить Notification Bell компонент
- [ ] Создать Notification Center (выдвижная панель)
- [ ] Реализовать toast для новых уведомлений

**Push Notifications:**
- [ ] Запросить permission при входе
- [ ] Сохранить subscription на сервере
- [ ] Обрабатывать push events
- [ ] Показывать notification даже когда приложение закрыто

### Фаза 5: Улучшение Wizard-интерфейсов

#### 5.1 Требования к визардам

**Современный UX для визардов:**
- [ ] Прогресс-бар с шагами
- [ ] Анимация переходов между шагами
- [ ] Валидация формы перед переходом
- [ ] Возможность вернуться назад
- [ ] Auto-save прогресса
- [ ] Отображение времени на выполнение

#### 5.2 Существующие визарды

| Визард | Шаги | Улучшения |
|--------|------|-----------|
| CM Lot Wizard | 4 | Добавить анимации, валидацию |
| Request Wizard | 5 | Добавить автосохранение |
| Pack Lot Wizard | 4 | Мобильная адаптация |

#### 5.3 Новые визарды

- [ ] **Culture Creation Wizard** — создание культуры (5 шагов)
- [ ] **QC Result Wizard** — ввод результатов (3 шага)
- [ ] **Shipment Wizard** — создание отгрузки (4 шага)

#### 5.4 Wizard Engine (улучшенный)

```typescript
interface WizardConfig {
  steps: WizardStep[];
  onComplete: (data: any) => Promise<void>;
  onSaveProgress: (data: any) => void;
  validateStep: (step: number, data: any) => boolean;
  theme: 'modern' | 'classic';
  showTimeline: boolean;
  allowBack: boolean;
  autoSaveInterval: number; // в секундах
}

interface WizardState {
  currentStep: number;
  totalSteps: number;
  data: Record<string, any>;
  isComplete: boolean;
  lastSaved: Date | null;
  errors: Record<string, string>;
}
```

### Фаза 6: Оптимизация производительности

#### 6.1 Кэширование

- [ ] Настроить React Query с оптимальными stale times
- [ ] Внедрить optimistic updates для всех мутаций
- [ ] Добавить useMemo/useCallback где нужно
- [ ] Реализовать виртуализацию для длинных списков

#### 6.2 Bundle Optimization

- [ ] Анализ bundle size (source-map-explorer)
- [ ] Code splitting по маршрутам
- [ ] Lazy loading компонентов
- [ ] Tree shaking неиспользуемого кода

#### 6.3 Database Queries

- [ ] Оптимизировать Supabase запросы
- [ ] Добавить индексы для частых запросов
- [ ] Внедрить пагинацию для списков
- [ ] Кэшировать редко меняющиеся данные

### Фаза 7: Деплой

#### 7.1 Railway

**Конфигурация:**
```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm preview",
    "restartPolicy": "always"
  }
}
```

**Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN pnpm install serve -g
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

#### 7.2 Vercel

**vercel.json:**
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Environment Variables:**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

#### 7.3 Netlify (альтернатива)

**netlify.toml:**
```toml
[build]
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Фаза 8: Тестирование

#### 8.1 Unit Testing
- [ ] Настроить Vitest
- [ ] Покрыть компоненты (50%+)
- [ ] Покрыть хуки (70%+)
- [ ] Покрыть утилиты (80%+)

#### 8.2 Integration Testing
- [ ] Настроить Playwright
- [ ] Тесты критических путей
- [ ] Тесты авторизации
- [ ] Тесты форм

#### 8.3 E2E Testing
- [ ] Тесты пользовательских сценариев
- [ ] Тесты на мобильных (Playwright mobile)
- [ ] Тесты offline режима

---

## 4. Приоритизация задач

### Sprint 1 (Неделя 1)
- [ ] Обновить зависимости
- [ ] Создать план деплоя
- [ ] Улучшить Layout (responsive)
- [ ] Обновить Button и Card компоненты

### Sprint 2 (Неделя 2)
- [ ] Внедрить Framer Motion
- [ ] Улучшить визарды
- [ ] Добавить систему уведомлений
- [ ] Оптимизировать PWA

### Sprint 3 (Неделя 3)
- [ ] Push notifications
- [ ] Мобильная адаптация форм
- [ ] Тестирование
- [ ] Bug fixes

### Sprint 4 (Неделя 4)
- [ ] Деплой на Railway
- [ ] Деплой на Vercel
- [ ] Документация
- [ ] Релиз

---

## 5. Метрики успеха

| Метрика | Текущее | Целевое |
|---------|---------|---------|
| Lighthouse Performance | TBD | > 90 |
| Lighthouse Accessibility | TBD | > 95 |
| First Contentful Paint | TBD | < 1.5s |
| Time to Interactive | TBD | < 3s |
| Bundle Size (gzip) | TBD | < 200KB |
| PWA Score | TBD | > 90 |

---

## 6. Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Задержка деплоя | Среднее | Высокое | Раннее тестирование |
| Обратная совместимость | Среднее | Высокое |渐进ная миграция |
| Производительность PWA | Низкое | Среднее | Оптимизация bundle |
| Push notifications | Среднее | Среднее | Graceful degradation |

---

## 7. Зависимости

### Внешние зависимости
- Supabase (Backend)
- Vercel/Railway (Deployment)
- Cloudflare (CDN)

### Внутренние зависимости
- React Query → Notifications
- Framer Motion → Wizard animations
- Workbox → PWA offline

---

## 8. Чеклист перед релизом

- [ ] Все тесты проходят
- [ ] Lighthouse > 90
- [ ] PWA работает офлайн
- [ ] Push уведомления тестированы
- [ ] Документация обновлена
- [ ] Environment variables настроены
- [ ] Rollback план готов

---

## 9. Контакты

**Менеджер проекта:** [Имя]  
**Tech Lead:** [Имя]  
**QA:** [Имя]

---

**Дата создания:** 25.01.2026  
**Версия:** 1.0  
**Следующий обзор:** 01.02.2026
