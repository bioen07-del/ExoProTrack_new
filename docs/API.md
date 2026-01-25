# API Documentation — EXO ProTrack v3.4.0

## Содержание

1. [Обзор](#обзор)
2. [Аутентификация](#аутентификация)
3. [CM Lot API](#cm-lot-api)
4. [Request API](#request-api)
5. [Notification API](#notification-api)
6. [Pack Lot API](#pack-lot-api)
7. [Warehouse API](#warehouse-api)
8. [Admin API](#admin-api)
9. [WebSocket Realtime](#websocket-realtime)

---

## Обзор

Базовый URL: `https://[project-id].supabase.co`

Все запросы требуют аутентификации через Supabase Auth. Заголовок `apikey` или JWT токен передаётся автоматически через клиент.

### Формат ответов

```typescript
// Успешный ответ
{
  data: T | T[] | null;
  error: null;
}

// Ошибка
{
  data: null;
  error: {
    message: string;
    code?: string;
  }
}
```

### Пагинация

```typescript
interface PaginationParams {
  page?: number;      // По умолчанию: 1
  limit?: number;     // По умолчанию: 20
}

// Ответ включает total count в заголовке
// X-Total-Count: 100
```

---

## Аутентификация

### Регистрация

```typescript
POST /auth/v1/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "options": {
    "data": {
      "full_name": "Иван Иванов",
      "role": "Production"  // Production, QC, QA, Manager, Admin
    }
  }
}
```

### Вход

```typescript
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

// Ответ
{
  "access_token": "...",
  "refresh_token": "...",
  "user": { ... }
}
```

### Выход

```typescript
POST /auth/v1/logout
Authorization: Bearer <token>
```

---

## CM Lot API

### Получить список CM лотов

```typescript
GET /rest/v1/cm_lot
Params (query):
  - status?: string
  - base_product_code?: string
  - created_at.gte?: string
  - order?: string (created_at.desc)
  - limit?: number

Response: CmLot[]
```

### Получить CM лот

```typescript
GET /rest/v1/cm_lot?cm_lot_id=eq.{id}
Response: CmLot
```

### Создать CM лот

```typescript
POST /rest/v1/cm_lot
Body:
{
  "cm_lot_id": "CM-20260124-0001",
  "mode": "MTS" | "MTO",
  "base_product_code": "EXO-MSC-001",
  "nominal_volume_ml": 500,
  "notes": "...",
  "created_by": "uuid"
}
Response: CmLot
```

### Обновить CM лот

```typescript
PATCH /rest/v1/cm_lot?cm_lot_id=eq.{id}
Body:
{
  "status": "Closed_Collected",
  "collection_end_at": "2026-01-24T10:00:00Z"
}
Response: CmLot
```

### Удалить CM лот

```typescript
DELETE /rest/v1/cm_lot?cm_lot_id=eq.{id}
```

### События сбора

```typescript
// Получить события сбора
GET /rest/v1/collection_event?cm_lot_id=eq.{id}
Response: CollectionEvent[]

// Создать событие сбора
POST /rest/v1/collection_event
Body:
{
  "collection_id": "uuid",
  "cm_lot_id": "CM-...",
  "culture_id": "CULT-001",
  "collected_at": "2026-01-24T10:00:00Z",
  "volume_ml": 150,
  "passage_no": 3,
  // ... другие поля
}
```

### Шаги процессинга

```typescript
// Получить шаги
GET /rest/v1/processing_step?cm_lot_id=eq.{id}
Response: ProcessingStep[]

// Создать шаг
POST /rest/v1/processing_step
Body:
{
  "processing_step_id": "uuid",
  "cm_lot_id": "CM-...",
  "method_id": "uuid",
  "input_volume_ml": 100,
  "output_volume_ml": 95,
  "started_at": "2026-01-24T10:00:00Z"
}
```

### QC запросы и результаты

```typescript
// Получить QC запросы
GET /rest/v1/cm_qc_request?cm_lot_id=eq.{id}
Response: CmQcRequest[]

// Создать QC запрос
POST /rest/v1/cm_qc_request
Body:
{
  "qc_request_id": "uuid",
  "cm_lot_id": "CM-...",
  "qc_type": "Raw" | "Product" | "Release",
  "checkpoint_code": "QC_RAW",
  "status": "Opened"
}

// Создать результат QC
POST /rest/v1/cm_qc_result
Body:
{
  "qc_result_id": "uuid",
  "qc_request_id": "uuid",
  "test_code": "STER" | "LAL" | "DLS",
  "result_value": "Negative",
  "pass_fail": "Pass" | "Fail" | "NA",
  "tested_at": "2026-01-24T10:00:00Z"
}
```

### QA решения

```typescript
// Получить QA решения
GET /rest/v1/cm_qa_release_decision?cm_lot_id=eq.{id}
Response: CmQaReleaseDecision[]

// Создать решение
POST /rest/v1/cm_qa_release_decision
Body:
{
  "decision_id": "uuid",
  "cm_lot_id": "CM-...",
  "decision": "Approved" | "Rejected" | "OnHold",
  "shelf_life_days": 365,
  "reason": "..."  // Обязательно если QC неполный
}
```

---

## Request API

### Получить список заявок

```typescript
GET /rest/v1/request
Params:
  - status?: string
  - product_code?: string
  - order?: string

Response: Request[]
```

### Получить заявку с деталями

```typescript
GET /rest/v1/request?request_id=eq.{id}
Response: Request & {
  lines: RequestLine[],
  reserved_cm_lot: CmLot
}
```

### Создать заявку

```typescript
POST /rest/v1/request
Body:
{
  "request_id": "REQ-20260124-0001",
  "customer_ref": "ООО Клиент",
  "due_date": "2026-02-24",
  "status": "Draft"
}
```

### Строки заявки

```typescript
// Получить строки
GET /rest/v1/request_line?request_id=eq.{id}
Response: RequestLine[]

// Создать строку
POST /rest/v1/request_line
Body:
{
  "request_line_id": "uuid",
  "request_id": "REQ-...",
  "finished_product_code": "EXO-MSC-001",
  "pack_format_code": "BOT-500",
  "qty_units": 100,
  "additional_qc_required": false
}
```

### Резервирование

```typescript
// Получить доступные CM лоты для резервирования
GET /rest/v1/cm_lot?status=eq.Approved&select=cm_lot_id,base_product_code,container(current_volume_ml)

// Создать резерв
POST /rest/v1/reservation
Body:
{
  "reservation_id": "uuid",
  "cm_lot_id": "CM-...",
  "request_line_id": "uuid",
  "reserved_volume_ml": 500,
  "reserved_by": "uuid",
  "status": "Active"
}
```

---

## Notification API

### Получить уведомления

```typescript
GET /rest/v1/notifications
Params:
  - user_id=eq.{user_id}
  - is_read=eq.false  // только непрочитанные
  - order: created_at.desc
  - limit: 20

Response: Notification[]
```

### Отметить как прочитанное

```typescript
PATCH /rest/v1/notifications?notification_id=eq.{id}
Body:
{
  "is_read": true,
  "read_at": "2026-01-24T10:00:00Z"
}
```

### Отметить все как прочитанные

```typescript
PATCH /rest/v1/notifications
Body:
{
  "is_read": true,
  "read_at": "2026-01-24T10:00:00Z"
}
Where: user_id=eq.{user_id}, is_read=eq.false
```

### Удалить уведомление

```typescript
DELETE /rest/v1/notifications?notification_id=eq.{id}
```

---

## Pack Lot API

### Получить Pack лоты

```typescript
GET /rest/v1/pack_lot
Params:
  - status?: string
  - source_cm_lot_id?: string
Response: PackLot[]
```

### Создать Pack лот

```typescript
POST /rest/v1/pack_lot
Body:
{
  "pack_lot_id": "PK-20260124-0001",
  "request_line_id": "uuid",
  "source_cm_lot_id": "CM-...",
  "pack_format_code": "BOT-500",
  "qty_planned": 100,
  "has_lyophilization": false
}
```

### Завершить розлив

```typescript
PATCH /rest/v1/pack_lot?pack_lot_id=eq.{id}
Body:
{
  "status": "Filled",
  "qty_produced": 95,
  "total_filled_volume_ml": 475,
  "filled_at": "2026-01-24T10:00:00Z"
}
```

---

## Warehouse API

### Остатки сырья

```typescript
GET /rest/v1/container
Params:
  - owner_entity_type=eq.CM_Lot
  - status=eq.Approved
Response: Container[]
```

### Остатки готовой продукции

```typescript
GET /rest/v1/container
Params:
  - owner_entity_type=eq.PackLot
  - status=eq.Released
Response: Container[]
```

### Движения

```typescript
GET /rest/v1/stock_movement
Params:
  - container_id=eq.{id}
  - order: moved_at.desc
Response: StockMovement[]
```

### Отгрузка

```typescript
// Создать отгрузку
POST /rest/v1/shipment
Body:
{
  "shipment_id": "SHIP-20260124-0001",
  "pack_lot_id": "PK-...",
  "qty_shipped": 50,
  "recipient_name": "ООО Клиент",
  "shipped_by": "uuid"
}
```

---

## Admin API

### Продукты

```typescript
GET /rest/v1/product
POST /rest/v1/product
PATCH /rest/v1/product?product_code=eq.{code}
DELETE /rest/v1/product?product_code=eq.{code}
```

### Справочники

Все справочники поддерживают CRUD операции:
- `cell_type`
- `base_media`
- `media_additive`
- `media_compatibility_spec`
- `pack_format`
- `cm_process_method`
- `qc_test_type`
- `infection_type`

### Пользователи

```typescript
GET /rest/v1/app_user
POST /rest/v1/app_user
PATCH /rest/v1/app_user?user_id=eq.{id}
DELETE /rest/v1/app_user?user_id=eq.{id}
```

---

## WebSocket Realtime

### Подключение

```typescript
const supabase = createClient(url, key);

// Подписка на изменения таблицы
const channel = supabase
  .channel('table-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('New notification:', payload.new);
    }
  )
  .subscribe();
```

### События

| Событие | Описание |
|----------|-----------|
| INSERT | Новая запись |
| UPDATE | Изменение записи |
| DELETE | Удаление записи |

### Отписка

```typescript
supabase.removeChannel(channel);
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| `23505` | Duplicate key (нарушение уникальности) |
| `23503` | Foreign key violation |
| `23514` | Check constraint violation |
| `PGRST301` | Authorization error |

---

## Rate Limiting

- 60 запросов в минуту на IP
- 1000 запросов в час на пользователя

---

## Версии API

| Версия | Дата | Описание |
|--------|------|-----------|
| v3.4.0 | 2026-01-24 | Добавлены уведомления, PWA |
| v2.0.0 | 2026-01-22 | Snapshot-архитектура |
| v1.0.0 | 2026-01-19 | Начальный релиз |
