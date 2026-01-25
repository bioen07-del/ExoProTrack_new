# Документация по компонентам EXO ProTrack

**Версия:** 1.0  
**Дата:** 25.01.2026

---

## Содержание

1. [Layout Components](#layout-components)
2. [Wizard Engine](#wizard-engine)
3. [Services](#services)
4. [Hooks](#hooks)
5. [Utils](#utils)

---

## Layout Components

### ModernLayout

Адаптивный Layout с поддержкой десктопа и мобильных устройств.

```tsx
import { Layout } from '@/components/layout/ModernLayout';

function App() {
  return (
    <Layout
      userName="Иван Иванов"
      userRole="Production"
      userEmail="ivan@example.com"
    >
      <YourPageContent />
    </Layout>
  );
}
```

#### Props

| Prop | Type | Required | Default | Описание |
|------|------|----------|---------|----------|
| children | ReactNode | Да | - | Содержимое страницы |
| userName | string | Нет | - | Имя пользователя |
| userRole | string | Нет | - | Роль пользователя |
| userEmail | string | Нет | - | Email для уведомлений |

#### Функциональность

- **Desktop:** Collapsible sidebar с навигацией
- **Mobile:** Bottom navigation bar
- **Theme:** Переключение светлой/тёмной темы
- **Notifications:** Индикатор непрочитанных уведомлений
- **Offline:** Индикатор отсутствия интернета

---

## Wizard Engine

### useWizard

Хук для управления состоянием wizard-а.

```tsx
import { useWizard } from '@/services/modern-wizard-engine';

const config: WizardConfig = {
  steps: [
    {
      id: 'step1',
      title: 'Шаг 1',
      component: Step1Component,
      validation: (data) => {
        if (!data.name) return { valid: false, errors: { name: 'Обязательное поле' } };
        return { valid: true };
      },
    },
    {
      id: 'step2',
      title: 'Шаг 2',
      component: Step2Component,
    },
  ],
  onComplete: async (data) => {
    await saveData(data);
  },
  autoSaveInterval: 30,
  validateOnNext: true,
};

const wizard = useWizard(config);
```

#### Return Values

| Property | Type | Описание |
|----------|------|----------|
| currentStep | number | Текущий шаг (0-based) |
| totalSteps | number | Общее количество шагов |
| data | Record<string, unknown> | Данные всех шагов |
| isComplete | boolean | Завершён ли wizard |
| isSubmitting | boolean | Идёт ли отправка |
| errors | Record<string, string> | Ошибки валидации |
| progress | number | Прогресс в процентах |
| nextStep | () => void | Перейти к следующему шагу |
| prevStep | () => void | Перейти к предыдущему шагу |
| goToStep | (step: number) => void | Перейти к конкретному шагу |
| updateData | (stepId, data) => void | Обновить данные шага |
| complete | () => void | Завершить wizard |
| reset | () => void | Сбросить wizard |

### WizardLayout

Компонент для отображения wizard-а.

```tsx
import { WizardLayout, useWizard } from '@/services/modern-wizard-engine';

function MyWizard() {
  const wizard = useWizard(config);

  return (
    <WizardLayout
      config={config}
      state={wizard}
      className="my-wizard"
    />
  );
}
```

### WizardProgressBar

Компонент прогресс-бара.

```tsx
<WizardProgressBar
  progress={wizard.progress}
  steps={config.steps}
  currentStep={wizard.currentStep}
  visitedSteps={wizard.visitedSteps}
  onStepClick={(index) => wizard.goToStep(index)}
  showLabels={true}
/>
```

---

## Services

### notificationService

Сервис для работы с уведомлениями.

```tsx
import { notificationService } from '@/services/notification-service';

// Инициализация (в App.tsx)
notificationService.initialize(supabaseClient, vapidPublicKey);

// Подписка на уведомления
const channel = await notificationService.subscribeToNotifications(
  userId,
  (notification) => {
    console.log('New notification:', notification);
  }
);

// Отписка
await notificationService.unsubscribe();
```

#### Методы

| Метод | Параметры | Возвращает | Описание |
|-------|-----------|------------|----------|
| initialize | supabaseClient, vapidPublicKey? | void | Инициализация сервиса |
| subscribeToNotifications | userId, callback | RealtimeChannel | Подписка на уведомления |
| unsubscribe | - | void | Отписка |
| getNotifications | userId, options? | Notification[] | Получение уведомлений |
| markAsRead | notificationId | void | Отметить как прочитанное |
| markAllAsRead | userId | void | Отметить все как прочитанные |
| createNotification | notification | Notification | Создать уведомление |
| deleteNotification | notificationId | void | Удалить уведомление |
| getUnreadCount | userId | number | Получить количество непрочитанных |

### useNotifications

Хук для работы с уведомлениями в React компонентах.

```tsx
import { useNotifications } from '@/services/notification-service';

function NotificationsBell() {
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications(userEmail);

  return (
    <button className="relative">
      <BellIcon />
      {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
      )}
    </button>
  );
}
```

---

## Hooks

### useApi

Универсальный хук для запросов к API.

```tsx
import { useApi } from '@/hooks/useApi';

function MyComponent() {
  const { data, isLoading, error } = useApi(
    ['my-data', id],
    () => fetchMyData(id),
    { enabled: !!id }
  );

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage />;
  return <DataDisplay data={data} />;
}
```

### usePaginatedApi

Хук для пагинированных запросов.

```tsx
import { usePaginatedApi } from '@/hooks/useApi';

function UsersList() {
  const { data, isLoading, page, setPage } = usePaginatedApi<User>(
    'app_user',
    { page: 1, limit: 20, sortBy: 'created_at', sortOrder: 'desc' },
    { is_active: true }
  );

  return (
    <div>
      <Table data={data?.data} />
      <Pagination
        current={page}
        total={data?.totalPages}
        onChange={setPage}
      />
    </div>
  );
}
```

### useCrud

Хук для CRUD операций.

```tsx
import { useCrud } from '@/hooks/useApi';

function UserManager() {
  const { create, update, remove, isLoading, error } = useCrud<User>('app_user');

  const handleCreate = async () => {
    const newUser = await create({ name: 'Новый пользователь', role: 'Production' });
  };

  const handleUpdate = async (id: string) => {
    await update(id, { name: 'Обновлённое имя' });
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  return (
    <div>
      <button onClick={handleCreate} disabled={isLoading}>
        Создать
      </button>
      {/* ... */}
    </div>
  );
}
```

---

## Utils

### formatters

Утилиты для форматирования данных.

```tsx
import { formatDate, formatNumber, formatVolume, formatStatus } from '@/lib/formatters';

// Даты
formatDate('2026-01-25'); // '25.01.2026'
formatDateTime('2026-01-25T10:30:00'); // '25.01.2026 10:30'
formatRelativeTime('2026-01-25T10:30:00'); // '2 часа назад'

// Числа
formatNumber(1234567.89); // '1 234 567,89'
formatVolume(1500); // '1,50 л'
formatPercent(75.5); // '75,5%'
formatCurrency(15000); // '15 000 ₽'

// Статусы
formatStatus('QA_Approved'); // 'QA одобрен'
formatStatus('In_Processing'); // 'В обработке'
```

#### Все функции formatters

| Функция | Параметры | Описание |
|---------|-----------|----------|
| formatDate | date, format? | Формат даты |
| formatDateTime | date | Дата и время |
| formatRelativeTime | date | Относительное время |
| formatForInput | date | Для input datetime-local |
| formatNumber | value, decimals? | Формат числа |
| formatVolume | volumeMl | Объём (мл → л) |
| formatPercent | value, decimals? | Процент |
| formatCurrency | value | Валюта |
| truncate | str, maxLength? | Обрезка строки |
| capitalize | str | Первый заглавный |
| formatStatus | status | Формат статуса |
| formatLotId | id | Формат ID лота |
| generateLotNumber | prefix, sequence | Генератор номера |

### constants

Константы приложения.

```tsx
import { APP_NAME, APP_VERSION, ROLES, CM_LOT_STATUSES } from '@/lib/constants';

console.log(APP_NAME); // 'EXO ProTrack'
console.log(APP_VERSION); // '3.5.0'

// Роли
ROLES.ADMIN; // 'Admin'
ROLES.PRODUCTION; // 'Production'

// Статусы
CM_LOT_STATUSES.QA_APPROVED; // 'QA_Approved'
CM_LOT_STATUSES.RELEASED; // 'Released'
```

---

## Примеры использования

### Пример 1: Страница с Layout и уведомлениями

```tsx
import { Layout } from '@/components/layout/ModernLayout';
import { useNotifications } from '@/services/notification-service';

export function MyPage() {
  const { unreadCount } = useNotifications(userEmail);

  return (
    <Layout userName="Иван" userRole="Production">
      <div className="page-content">
        <h1>Моя страница</h1>
        <p>Непрочитанных уведомлений: {unreadCount}</p>
      </div>
    </Layout>
  );
}
```

### Пример 2: Wizard для создания заявки

```tsx
import { WizardLayout, useWizard } from '@/services/modern-wizard-engine';

const steps = [
  {
    id: 'product',
    title: 'Выбор продукта',
    component: ProductStep,
    validation: (data) => {
      if (!data.productCode) {
        return { valid: false, errors: { productCode: 'Выберите продукт' } };
      }
      return { valid: true };
    },
  },
  {
    id: 'quantity',
    title: 'Количество',
    component: QuantityStep,
  },
  {
    id: 'review',
    title: 'Проверка',
    component: ReviewStep,
  },
];

const wizard = useWizard({
  steps,
  onComplete: async (data) => {
    await createRequest(data);
  },
  autoSaveInterval: 30,
});

return (
  <WizardLayout
    config={{ steps }}
    state={wizard}
  />
);
```

### Пример 3: Список с пагинацией

```tsx
import { usePaginatedApi } from '@/hooks/useApi';

export function CmLotsList() {
  const { data, isLoading, refetch } = usePaginatedApi<CmLot>(
    'cm_lot',
    { page: 1, limit: 20, sortBy: 'created_at', sortOrder: 'desc' },
    { status: 'Released' }
  );

  if (isLoading) return <Loading />;

  return (
    <div>
      <Table
        data={data.data}
        columns={['id', 'product_code', 'volume_ml', 'status']}
      />
      <Pagination
        current={data.page}
        total={data.totalPages}
        onChange={(page) => refetch()}
      />
    </div>
  );
}
```

---

**Дата создания:** 25.01.2026  
**Версия:** 1.0
